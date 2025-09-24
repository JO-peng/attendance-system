#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HTTPS服务器启动脚本
用于启动支持深圳大学CAS认证的HTTPS服务器
"""

import os
import sys

def main():
    """启动HTTPS服务器"""
    # 检查是否为生产环境
    is_production = '--production' in sys.argv or os.environ.get('PRODUCTION', 'false').lower() == 'true'
    
    if is_production:
        # 生产环境配置
        print("=" * 60)
        print("启动生产环境HTTPS服务器")
        print("端口: 443 (HTTPS标准端口)")
        print("域名: kpeak.szu.edu.cn")
        print("=" * 60)
        
        os.environ['USE_HTTPS'] = 'true'
        os.environ['HOST'] = '0.0.0.0'
        os.environ['PORT'] = '443'  # HTTPS标准端口
        os.environ['FLASK_ENV'] = 'production'
        os.environ['FLASK_DEBUG'] = 'false'
        
        # 生产环境的CAS配置
        os.environ['CAS_SERVICE_URL'] = 'https://kpeak.szu.edu.cn'
        
    else:
        # 开发环境配置
        print("=" * 60)
        print("启动开发环境HTTPS服务器")
        print("端口: 5000 (开发端口)")
        print("地址: localhost")
        print("=" * 60)
        
        os.environ['USE_HTTPS'] = 'true'
        os.environ['HOST'] = '0.0.0.0'
        os.environ['PORT'] = '5000'
        os.environ['FLASK_ENV'] = 'development'
        os.environ['FLASK_DEBUG'] = 'true'
        
        # 开发环境的CAS配置
        os.environ['CAS_SERVICE_URL'] = 'https://localhost:5000'
    
    # 导入并运行应用
    from run import main as run_main
    run_main()

if __name__ == '__main__':
    main()