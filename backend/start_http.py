#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HTTP服务器启动脚本 - 用于本地开发测试
注意：生产环境必须使用HTTPS
"""

import os
import sys

def main():
    """启动HTTP开发服务器"""
    print("=" * 50)
    print("启动HTTP开发服务器")
    print("注意：这仅用于本地开发测试")
    print("生产环境必须使用HTTPS模式")
    print("=" * 50)
    
    # 设置环境变量
    os.environ['USE_HTTPS'] = 'false'
    os.environ['HOST'] = '0.0.0.0'
    os.environ['PORT'] = '5000'
    os.environ['FLASK_ENV'] = 'development'
    os.environ['FLASK_DEBUG'] = 'true'
    
    # HTTP模式的CAS配置
    os.environ['CAS_SERVICE_URL'] = 'http://localhost:5000'
    
    # 导入并运行主程序
    try:
        from run import main as run_main
        run_main()
    except KeyboardInterrupt:
        print("\n服务器已停止")
    except Exception as e:
        print(f"启动失败: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()