#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
企业微信API集成模块
处理企业微信相关的API调用，包括用户认证、信息获取等
"""

import requests
import json
import time
import hashlib
import string
import random
from datetime import datetime, timedelta
from flask import current_app
from functools import wraps

class WeChatAPI:
    """企业微信API封装类"""
    
    def __init__(self, corp_id=None, corp_secret=None, agent_id=None):
        try:
            self.corp_id = corp_id or current_app.config.get('WECHAT_CORP_ID')
            self.corp_secret = corp_secret or current_app.config.get('WECHAT_CORP_SECRET')
            self.agent_id = agent_id or current_app.config.get('WECHAT_AGENT_ID')
        except RuntimeError:
            # 在应用上下文外时使用默认值
            self.corp_id = corp_id
            self.corp_secret = corp_secret
            self.agent_id = agent_id
        self.base_url = 'https://qyapi.weixin.qq.com/cgi-bin'
        self.access_token = None
        self.token_expires_at = None
        self.jsapi_ticket = None
        self.ticket_expires_at = None
    
    def _make_request(self, method, url, **kwargs):
        """统一的HTTP请求方法"""
        try:
            response = requests.request(method, url, timeout=30, **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            current_app.logger.error(f"WeChat API request failed: {e}")
            raise Exception(f"WeChat API request failed: {e}")
    
    def get_access_token(self, force_refresh=False):
        """获取企业微信access_token"""
        # 检查token是否有效
        if not force_refresh and self.access_token and self.token_expires_at:
            if datetime.now() < self.token_expires_at:
                return self.access_token
        
        url = f"{self.base_url}/gettoken"
        params = {
            'corpid': self.corp_id,
            'corpsecret': self.corp_secret
        }
        
        result = self._make_request('GET', url, params=params)
        
        if result.get('errcode') == 0:
            self.access_token = result['access_token']
            # token有效期7200秒，提前5分钟刷新
            expires_in = result.get('expires_in', 7200) - 300
            self.token_expires_at = datetime.now() + timedelta(seconds=expires_in)
            current_app.logger.info("WeChat access token obtained successfully")
            return self.access_token
        else:
            error_msg = f"Failed to get access token: {result.get('errmsg', 'Unknown error')}"
            current_app.logger.error(error_msg)
            raise Exception(error_msg)
    
    def get_user_info_by_code(self, code):
        """通过授权码获取用户信息"""
        access_token = self.get_access_token()
        
        # 1. 通过code获取用户ID
        url = f"{self.base_url}/auth/getuserinfo"
        params = {
            'access_token': access_token,
            'code': code
        }
        
        result = self._make_request('GET', url, params=params)
        
        if result.get('errcode') != 0:
            error_msg = f"Failed to get user info by code: {result.get('errmsg', 'Unknown error')}"
            current_app.logger.error(error_msg)
            raise Exception(error_msg)
        
        userid = result.get('userid')
        if not userid:
            raise Exception("No userid found in response")
        
        # 2. 通过userid获取详细用户信息
        return self.get_user_detail(userid)
    
    def get_user_detail(self, userid):
        """获取用户详细信息"""
        access_token = self.get_access_token()
        
        url = f"{self.base_url}/user/get"
        params = {
            'access_token': access_token,
            'userid': userid
        }
        
        result = self._make_request('GET', url, params=params)
        
        if result.get('errcode') == 0:
            user_info = {
                'userid': result.get('userid'),
                'name': result.get('name'),
                'department': result.get('department', []),
                'position': result.get('position'),
                'mobile': result.get('mobile'),
                'email': result.get('email'),
                'avatar': result.get('avatar'),
                'status': result.get('status'),
                'extattr': result.get('extattr', {})
            }
            current_app.logger.info(f"User info obtained for userid: {userid}")
            return user_info
        else:
            error_msg = f"Failed to get user detail: {result.get('errmsg', 'Unknown error')}"
            current_app.logger.error(error_msg)
            raise Exception(error_msg)
    
    def get_jsapi_ticket(self, force_refresh=False):
        """获取JS-SDK的ticket"""
        # 检查ticket是否有效
        if not force_refresh and self.jsapi_ticket and self.ticket_expires_at:
            if datetime.now() < self.ticket_expires_at:
                return self.jsapi_ticket
        
        access_token = self.get_access_token()
        
        url = f"{self.base_url}/get_jsapi_ticket"
        params = {
            'access_token': access_token
        }
        
        result = self._make_request('GET', url, params=params)
        
        if result.get('errcode') == 0:
            self.jsapi_ticket = result['ticket']
            # ticket有效期7200秒，提前5分钟刷新
            expires_in = result.get('expires_in', 7200) - 300
            self.ticket_expires_at = datetime.now() + timedelta(seconds=expires_in)
            current_app.logger.info("WeChat jsapi ticket obtained successfully")
            return self.jsapi_ticket
        else:
            error_msg = f"Failed to get jsapi ticket: {result.get('errmsg', 'Unknown error')}"
            current_app.logger.error(error_msg)
            raise Exception(error_msg)
    
    def generate_js_config(self, url):
        """生成JS-SDK配置"""
        ticket = self.get_jsapi_ticket()
        
        # 生成随机字符串
        noncestr = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
        
        # 生成时间戳
        timestamp = str(int(time.time()))
        
        # 生成签名
        signature_string = f"jsapi_ticket={ticket}&noncestr={noncestr}&timestamp={timestamp}&url={url}"
        signature = hashlib.sha1(signature_string.encode('utf-8')).hexdigest()
        
        config = {
            'corpId': self.corp_id,
            'agentId': self.agent_id,
            'timestamp': timestamp,
            'nonceStr': noncestr,
            'signature': signature
        }
        
        current_app.logger.info(f"JS config generated for URL: {url}")
        return config
    
    def send_message(self, userid, message, msgtype='text'):
        """发送消息给用户"""
        access_token = self.get_access_token()
        
        url = f"{self.base_url}/message/send"
        
        data = {
            'touser': userid,
            'msgtype': msgtype,
            'agentid': self.agent_id
        }
        
        if msgtype == 'text':
            data['text'] = {'content': message}
        
        headers = {'Content-Type': 'application/json'}
        params = {'access_token': access_token}
        
        result = self._make_request('POST', url, params=params, headers=headers, data=json.dumps(data))
        
        if result.get('errcode') == 0:
            current_app.logger.info(f"Message sent to user: {userid}")
            return True
        else:
            error_msg = f"Failed to send message: {result.get('errmsg', 'Unknown error')}"
            current_app.logger.error(error_msg)
            return False
    
    def upload_media(self, file_path, media_type='image'):
        """上传多媒体文件"""
        access_token = self.get_access_token()
        
        url = f"{self.base_url}/media/upload"
        params = {
            'access_token': access_token,
            'type': media_type
        }
        
        try:
            with open(file_path, 'rb') as f:
                files = {'media': f}
                result = self._make_request('POST', url, params=params, files=files)
            
            if result.get('errcode') == 0:
                media_id = result['media_id']
                current_app.logger.info(f"Media uploaded successfully: {media_id}")
                return media_id
            else:
                error_msg = f"Failed to upload media: {result.get('errmsg', 'Unknown error')}"
                current_app.logger.error(error_msg)
                raise Exception(error_msg)
        except Exception as e:
            current_app.logger.error(f"Error uploading media: {e}")
            raise

# 全局实例 - 延迟初始化
wechat_api = None

def get_wechat_api():
    """获取企业微信API实例"""
    global wechat_api
    if wechat_api is None:
        wechat_api = WeChatAPI()
    return wechat_api

def require_wechat_auth(f):
    """装饰器：要求企业微信认证"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 这里可以添加认证逻辑
        return f(*args, **kwargs)
    return decorated_function