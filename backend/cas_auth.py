#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
深圳大学CAS统一身份认证模块
基于深圳大学CAS接口文档实现
"""

import requests
import xml.etree.ElementTree as ET
import json
import urllib.parse
import secrets
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from flask import session, request, current_app
import ssl
import os

class CASUser:
    """CAS用户信息类"""
    
    def __init__(self, username: str = "", name: str = "", alias: str = "", 
                 org_dn: str = "", container_id: str = ""):
        self.username = username      # 学工号
        self.name = name             # 姓名
        self.alias = alias           # 校园卡号
        self.org_dn = org_dn         # 单位
        self.container_id = container_id  # 用户容器
    
    def get_user_type(self) -> str:
        """根据容器ID获取用户类型"""
        if not self.container_id:
            return "未知"
        
        # 提取容器代码，格式：ou=容器代码,ou=People
        parts = self.container_id.split(",")
        if not parts:
            return "未知"
        
        container_code = parts[0].replace("ou=", "")
        
        user_types = {
            "jzg": "在职教职工",
            "lzjzg": "离职教职工", 
            "txjzg": "退休教职工",
            "bks": "本科生",
            "yjs": "研究生",
            "qtxs": "其他学生",
            "cjyg": "成教员工",
            "xwds": "校外导师",
            "kyry": "科研系统账号",
            "qtry": "其他人员",
            "bybks": "毕业本科生",
            "byyjs": "毕业研究生",
            "byqtxs": "毕业其他学生"
        }
        
        return user_types.get(container_code, container_code)
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'username': self.username,
            'name': self.name,
            'alias': self.alias,
            'org_dn': self.org_dn,
            'container_id': self.container_id,
            'user_type': self.get_user_type()
        }

class CASSession:
    """CAS会话管理类"""
    
    def __init__(self, session_id: str, user: CASUser, timeout: int = 24 * 3600):
        self.session_id = session_id
        self.user = user
        self.created_at = datetime.now()
        self.expires_at = self.created_at + timedelta(seconds=timeout)
    
    def is_expired(self) -> bool:
        """检查会话是否过期"""
        return datetime.now() > self.expires_at
    
    def refresh(self, timeout: int = 24 * 3600):
        """刷新会话过期时间"""
        self.expires_at = datetime.now() + timedelta(seconds=timeout)

class CASSessionManager:
    """CAS会话管理器"""
    
    def __init__(self, timeout: int = 24 * 3600):
        self.sessions: Dict[str, CASSession] = {}
        self.timeout = timeout
    
    def create_session(self, user: CASUser) -> str:
        """创建新会话"""
        session_id = secrets.token_urlsafe(32)
        cas_session = CASSession(session_id, user, self.timeout)
        self.sessions[session_id] = cas_session
        return session_id
    
    def get_session(self, session_id: str) -> Optional[CASSession]:
        """获取会话"""
        cas_session = self.sessions.get(session_id)
        if not cas_session:
            return None
        
        if cas_session.is_expired():
            self.delete_session(session_id)
            return None
        
        return cas_session
    
    def delete_session(self, session_id: str):
        """删除会话"""
        self.sessions.pop(session_id, None)
    
    def refresh_session(self, session_id: str) -> bool:
        """刷新会话"""
        cas_session = self.sessions.get(session_id)
        if not cas_session:
            return False
        
        cas_session.refresh(self.timeout)
        return True
    
    def cleanup_expired_sessions(self):
        """清理过期会话"""
        expired_sessions = [
            session_id for session_id, cas_session in self.sessions.items()
            if cas_session.is_expired()
        ]
        for session_id in expired_sessions:
            self.delete_session(session_id)

class CASClient:
    """深圳大学CAS客户端"""
    
    def __init__(self, server_url: str, service_url: str, 
                 login_path: str = "/cas/login",
                 logout_path: str = "/cas/logout", 
                 callback_path: str = "/cas/callback",
                 ssl_verify: bool = True,
                 ca_bundle_path: Optional[str] = None):
        # 检查必需参数
        if not server_url:
            raise ValueError("CAS server_url is required")
        if not service_url:
            raise ValueError("CAS service_url is required")
            
        self.server_url = server_url.rstrip('/')
        self.service_url = service_url.rstrip('/')
        self.login_path = login_path
        self.logout_path = logout_path
        self.callback_path = callback_path
        self.ssl_verify = ssl_verify
        self.ca_bundle_path = ca_bundle_path
        
        # 配置SSL
        self.session = requests.Session()
        if ca_bundle_path and os.path.exists(ca_bundle_path):
            self.session.verify = ca_bundle_path
        elif not ssl_verify:
            self.session.verify = False
            # 禁用SSL警告
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        else:
            # 尝试使用项目中的证书链文件
            project_ca_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ca', 'kpeak.szu.edu.cn-chain.pem')
            if os.path.exists(project_ca_path):
                self.session.verify = project_ca_path
                try:
                    current_app.logger.info(f"Using project CA bundle: {project_ca_path}")
                except:
                    print(f"Using project CA bundle: {project_ca_path}")
            else:
                # 如果项目证书不存在，禁用SSL验证以避免验证失败
                self.session.verify = False
                import urllib3
                urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
                try:
                    current_app.logger.warning("Project CA bundle not found, disabling SSL verification")
                except:
                    print("Project CA bundle not found, disabling SSL verification")
    
    def get_login_url(self) -> str:
        """获取CAS登录URL"""
        service_url = self.service_url + self.callback_path
        login_url = f"{self.server_url}/login?service={urllib.parse.quote(service_url)}"
        return login_url
    
    def get_logout_url(self) -> str:
        """获取CAS登出URL"""
        service_url = self.service_url
        logout_url = f"{self.server_url}/logout?service={urllib.parse.quote(service_url)}"
        return logout_url
    
    def validate_ticket(self, ticket: str, format_type: str = "xml") -> Optional[CASUser]:
        """验证CAS票据并获取用户信息"""
        service_url = self.service_url + self.callback_path
        validate_url = f"{self.server_url}/serviceValidate?ticket={ticket}&service={urllib.parse.quote(service_url)}"
        
        if format_type == "json":
            validate_url += "&format=json"
        
        try:
            response = self.session.get(validate_url, timeout=30)
            response.raise_for_status()
            
            if format_type == "json":
                return self._parse_json_response(response.text)
            else:
                return self._parse_xml_response(response.text)
                
        except requests.RequestException as e:
            current_app.logger.error(f"CAS票据验证失败: {e}")
            return None
    
    def _parse_json_response(self, response_text: str) -> Optional[CASUser]:
        """解析JSON格式的CAS响应"""
        try:
            data = json.loads(response_text)
            service_response = data.get('serviceResponse', {})
            
            # 检查认证失败
            auth_failure = service_response.get('authenticationFailure')
            if auth_failure:
                current_app.logger.error(f"CAS认证失败: {auth_failure}")
                return None
            
            # 解析认证成功
            auth_success = service_response.get('authenticationSuccess')
            if not auth_success:
                current_app.logger.error("CAS响应中没有认证成功信息")
                return None
            
            user = CASUser()
            user.username = auth_success.get('user', '')
            
            attributes = auth_success.get('attributes', {})
            user.name = self._get_first_value(attributes.get('cn', []))
            user.alias = self._get_first_value(attributes.get('alias', []))
            user.org_dn = self._get_first_value(attributes.get('eduPersonOrgDN', []))
            user.container_id = self._get_first_value(attributes.get('containerId', []))
            
            return user
            
        except (json.JSONDecodeError, KeyError) as e:
            current_app.logger.error(f"解析CAS JSON响应失败: {e}")
            return None
    
    def _parse_xml_response(self, response_text: str) -> Optional[CASUser]:
        """解析XML格式的CAS响应"""
        try:
            # 移除命名空间前缀以简化解析
            response_text = response_text.replace('cas:', '')
            root = ET.fromstring(response_text)
            
            # 检查认证失败
            failure = root.find('.//authenticationFailure')
            if failure is not None:
                error_code = failure.get('code', '')
                error_msg = failure.text or ''
                current_app.logger.error(f"CAS认证失败: {error_code} - {error_msg}")
                return None
            
            # 解析认证成功
            success = root.find('.//authenticationSuccess')
            if success is None:
                current_app.logger.error("CAS响应中没有认证成功信息")
                return None
            
            user = CASUser()
            
            # 获取用户名
            user_elem = success.find('.//user')
            if user_elem is not None:
                user.username = user_elem.text or ''
            
            # 获取属性
            attributes = success.find('.//attributes')
            if attributes is not None:
                cn_elem = attributes.find('.//cn')
                if cn_elem is not None:
                    user.name = cn_elem.text or ''
                
                alias_elem = attributes.find('.//alias')
                if alias_elem is not None:
                    user.alias = alias_elem.text or ''
                
                org_dn_elem = attributes.find('.//eduPersonOrgDN')
                if org_dn_elem is not None:
                    user.org_dn = org_dn_elem.text or ''
                
                container_id_elem = attributes.find('.//containerId')
                if container_id_elem is not None:
                    user.container_id = container_id_elem.text or ''
            
            return user
            
        except ET.ParseError as e:
            current_app.logger.error(f"解析CAS XML响应失败: {e}")
            current_app.logger.debug(f"原始XML响应: {response_text}")
            return None
    
    def _get_first_value(self, value_list):
        """获取列表中的第一个值"""
        if isinstance(value_list, list) and value_list:
            return value_list[0]
        return value_list if value_list else ''

# 全局会话管理器
session_manager = CASSessionManager()

def init_cas_client(app):
    """初始化CAS客户端"""
    # 检查必需的配置
    server_url = app.config.get('CAS_SERVER_URL')
    service_url = app.config.get('CAS_SERVICE_URL')
    
    if not server_url:
        raise ValueError("CAS_SERVER_URL configuration is missing. Please set it in config.py")
    if not service_url:
        raise ValueError("CAS_SERVICE_URL configuration is missing. Please set it in config.py")
    
    try:
        cas_client = CASClient(
            server_url=server_url,
            service_url=service_url,
            login_path=app.config.get('CAS_LOGIN_PATH', '/cas/login'),
            logout_path=app.config.get('CAS_LOGOUT_PATH', '/cas/logout'),
            callback_path=app.config.get('CAS_CALLBACK_PATH', '/cas/callback'),
            ca_bundle_path=app.config.get('SSL_CA_BUNDLE_PATH')
        )
        
        app.cas_client = cas_client
        
        # 设置会话管理器超时时间
        timeout = app.config.get('CAS_SESSION_TIMEOUT', 24 * 3600)
        global session_manager
        session_manager.timeout = timeout
        
        print(f"CAS客户端初始化成功: {server_url}")
        
    except Exception as e:
        print(f"CAS客户端初始化失败: {e}")
        raise
    
    return cas_client

def get_current_user() -> Optional[CASUser]:
    """获取当前登录用户"""
    session_id = session.get('cas_session_id')
    if not session_id:
        return None
    
    cas_session = session_manager.get_session(session_id)
    if not cas_session:
        session.pop('cas_session_id', None)
        return None
    
    return cas_session.user

def login_required(f):
    """CAS登录装饰器"""
    from functools import wraps
    from flask import redirect, url_for
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return redirect(url_for('cas_login'))
        return f(*args, **kwargs)
    return decorated_function

def set_session_cookie(response, session_id: str):
    """设置会话Cookie"""
    response.set_cookie(
        'cas_session',
        session_id,
        max_age=24 * 3600,  # 24小时
        httponly=True,
        secure=request.is_secure,
        samesite='Lax'
    )

def clear_session_cookie(response):
    """清除会话Cookie"""
    response.set_cookie(
        'cas_session',
        '',
        max_age=0,
        httponly=True,
        secure=request.is_secure,
        samesite='Lax'
    )