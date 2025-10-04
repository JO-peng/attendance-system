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
        
        # 通过code获取用户信息（不需要通讯录权限）
        url = f"{self.base_url}/auth/getuserinfo"
        params = {
            'access_token': access_token,
            'code': code
        }
        
        result = self._make_request('GET', url, params=params)
        
        # 处理不同的错误码
        errcode = result.get('errcode', 0)
        if errcode != 0:
            errmsg = result.get('errmsg', 'Unknown error')
            
            # 特殊处理授权码相关错误
            if errcode == 40029:  # invalid code
                error_msg = "授权码已失效或无效，请重新授权"
                current_app.logger.warning(f"Invalid authorization code: {code}")
                raise Exception(error_msg)
            elif errcode == 40001:  # invalid credential
                error_msg = "access_token无效，请检查应用配置"
                current_app.logger.error(f"Invalid access token")
                raise Exception(error_msg)
            elif errcode == 60011:  # no privilege
                error_msg = "应用无权限访问用户信息，请检查应用权限配置"
                current_app.logger.error(f"No privilege to access user info")
                raise Exception(error_msg)
            else:
                error_msg = f"获取用户信息失败 (错误码: {errcode}): {errmsg}"
                current_app.logger.error(error_msg)
                raise Exception(error_msg)
        
        userid = result.get('userid')
        if not userid:
            raise Exception("响应中未找到用户ID")
        
        # 记录完整的getuserinfo响应以便调试
        current_app.logger.info(f"getuserinfo response: {result}")
        
        # 构造用户信息（使用getuserinfo接口返回的基础信息）
        # getuserinfo接口可能返回: userid, name, avatar, qr_code等字段
        user_info = {
            'userid': userid,
            'name': result.get('name', userid),  # 优先使用返回的name，否则使用userid
            'department': [],
            'position': '',
            'mobile': '',
            'email': '',
            'avatar': result.get('avatar', ''),  # 使用返回的头像
            'status': 1,
            'extattr': {}
        }
        
        # 如果userid看起来像学号，尝试从中提取更友好的显示名称
        if user_info['name'] == userid and userid.isdigit():
            # 如果userid是纯数字（可能是学号），生成一个更友好的显示名称
            user_info['name'] = f"学生{userid[-4:]}"  # 使用学号后4位
        
        # 尝试获取详细信息（如果有权限的话）
        try:
            detailed_info = self.get_user_detail(userid)
            user_info.update(detailed_info)
            current_app.logger.info(f"Successfully got detailed user info for userid: {userid}")
        except Exception as e:
            current_app.logger.warning(f"Failed to get detailed user info, using basic info only: {e}")
            # 如果获取详细信息失败，使用基础信息
            current_app.logger.info(f"Using basic user info for userid: {userid}")
        
        return user_info
    
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
        elif result.get('errcode') == 60011:
            # 权限不足，返回基础用户信息
            current_app.logger.warning(f"No privilege to access detailed user info for userid: {userid}, using basic info")
            return {
                'userid': userid,
                'name': userid,  # 使用userid作为默认名称
                'department': [],
                'position': None,
                'mobile': None,
                'email': None,
                'avatar': None,
                'status': 1,
                'extattr': {}
            }
        else:
            error_msg = f"Failed to get user detail: errcode={result.get('errcode')}, errmsg={result.get('errmsg', 'Unknown error')}"
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