#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
应用配置文件
"""

import os
from datetime import timedelta

class Config:
    """基础配置类"""
    
    # 基本配置
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # 数据库配置
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_RECORD_QUERIES = True
    
    # 文件上传配置
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    
    # 允许的文件扩展名
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    
    # 企业微信配置
    WECHAT_CORP_ID = os.environ.get('WECHAT_CORP_ID') or 'ww563e8adbd544adf5'
    WECHAT_CORP_SECRET = os.environ.get('WECHAT_CORP_SECRET') or 'ui7lI26sXjVq7BKm_esRm_3s5ZTOpJPpxmf_AO8qPd0'
    WECHAT_AGENT_ID = os.environ.get('WECHAT_AGENT_ID') or '1000265'
    
    # 深圳大学CAS统一身份认证配置
    CAS_SERVER_URL = os.environ.get('CAS_SERVER_URL') or 'https://authserver.szu.edu.cn/authserver'
    CAS_SERVICE_URL = os.environ.get('CAS_SERVICE_URL') or 'https://kpeak.szu.edu.cn'
    CAS_LOGIN_PATH = '/cas/login'
    CAS_LOGOUT_PATH = '/cas/logout'
    CAS_CALLBACK_PATH = '/cas/callback'
    CAS_SESSION_TIMEOUT = 24 * 60 * 60  # 24小时（秒）
    
    # HTTPS证书配置
    SSL_CERT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ca', 'kpeak.szu.edu.cn-crt.pem')
    SSL_KEY_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ca', 'kpeak.szu.edu.cn-key.pem')
    SSL_CA_BUNDLE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ca', 'kpeak.szu.edu.cn-chain.pem')
    
    # API配置
    API_TITLE = '考勤签到系统API'
    API_VERSION = 'v1.0'
    
    # 分页配置
    DEFAULT_PAGE_SIZE = 10
    MAX_PAGE_SIZE = 100
    
    # 签到配置
    SIGN_IN_START_TIME = '07:00'  # 签到开始时间
    SIGN_IN_END_TIME = '18:00'    # 签到结束时间
    LATE_THRESHOLD_MINUTES = 15   # 迟到阈值（分钟）
    
    # 地理位置配置
    LOCATION_RADIUS_METERS = 50000  # 签到有效范围（米）
    
    # 缓存配置
    CACHE_TYPE = 'simple'
    CACHE_DEFAULT_TIMEOUT = 300
    
    @staticmethod
    def init_app(app):
        """初始化应用配置"""
        pass

class DevelopmentConfig(Config):
    """开发环境配置"""
    
    DEBUG = True
    
    # 开发环境数据库 - 使用原来的attendance.db
    SQLALCHEMY_DATABASE_URI = os.environ.get('DEV_DATABASE_URL') or \
        'sqlite:///' + os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance', 'attendance.db')
    
    # 开发环境日志级别
    LOG_LEVEL = 'DEBUG'
    
    # 开发环境CORS设置
    CORS_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000']

class TestingConfig(Config):
    """测试环境配置"""
    
    TESTING = True
    
    # 测试环境数据库（内存数据库）
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL') or 'sqlite:///:memory:'
    
    # 禁用CSRF保护（测试环境）
    WTF_CSRF_ENABLED = False
    
    # 测试环境日志级别
    LOG_LEVEL = 'INFO'

class ProductionConfig(Config):
    """生产环境配置"""
    
    DEBUG = False
    
    # 生产环境数据库
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.db')
    
    # 生产环境日志级别
    LOG_LEVEL = 'WARNING'
    
    # 生产环境安全配置
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        
        # 生产环境特定初始化
        import logging
        from logging.handlers import RotatingFileHandler
        
        # 配置日志文件
        if not os.path.exists('logs'):
            os.mkdir('logs')
        
        file_handler = RotatingFileHandler(
            'logs/attendance.log', maxBytes=10240000, backupCount=10
        )
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        
        app.logger.setLevel(logging.INFO)
        app.logger.info('考勤签到系统启动')

# 配置字典
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

# 获取当前配置
def get_config():
    """获取当前环境配置"""
    config_name = os.environ.get('FLASK_ENV') or 'default'
    return config.get(config_name, DevelopmentConfig)

# 企业微信API配置
WECHAT_API_CONFIG = {
    'base_url': 'https://qyapi.weixin.qq.com/cgi-bin',
    'token_url': '/gettoken',
    'user_info_url': '/user/get',
    'upload_media_url': '/media/upload',
    'send_message_url': '/message/send',
    'jsapi_ticket_url': '/get_jsapi_ticket',
    'timeout': 30  # 请求超时时间（秒）
}

# 地理位置配置
LOCATION_CONFIG = {
    'default_location': {
        'latitude': 22.5431,   # 深圳大学纬度
        'longitude': 113.9364, # 深圳大学经度
        'address': '深圳大学'
    },
    'allowed_locations': [
        {
            'name': '深圳大学',
            'latitude': 22.5431,
            'longitude': 113.9364,
            'radius': 1000  # 允许签到的半径（米）
        }
    ]
}

# 签到时间配置
ATTENDANCE_CONFIG = {
    'time_slots': [
        {'name': '第1-2节', 'start': '08:00', 'end': '09:50'},
        {'name': '第3-4节', 'start': '10:10', 'end': '12:00'},
        {'name': '第5-6节', 'start': '14:00', 'end': '15:50'},
        {'name': '第7-8节', 'start': '16:10', 'end': '18:00'},
        {'name': '第9-10节', 'start': '19:00', 'end': '20:50'}
    ],
    'late_threshold': 15,  # 迟到阈值（分钟）
    'early_threshold': 30  # 早退阈值（分钟）
}

# 文件上传配置
UPLOAD_CONFIG = {
    'max_file_size': 5 * 1024 * 1024,  # 5MB
    'allowed_extensions': ['jpg', 'jpeg', 'png', 'gif'],
    'image_quality': 85,  # 图片压缩质量
    'max_width': 1920,    # 图片最大宽度
    'max_height': 1080,   # 图片最大高度
    'thumbnail_size': (200, 200)  # 缩略图尺寸
}