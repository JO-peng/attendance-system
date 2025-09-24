#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
应用启动脚本
"""

import os
import sys
from app import app, db
from config import get_config

def create_app():
    """创建应用实例"""
    # 获取配置
    config_class = get_config()
    app.config.from_object(config_class)
    
    # 初始化配置
    config_class.init_app(app)
    
    return app

def init_database():
    """初始化数据库"""
    with app.app_context():
        # 创建所有表
        db.create_all()
        print("数据库初始化完成")
        
        # 不自动创建示例数据，保护用户的真实数据
        # 如需创建示例数据，请使用: python run.py create-sample-data

def create_sample_data():
    """创建示例数据"""
    from app import User, Attendance, Feedback
    from datetime import datetime, timedelta
    import random
    
    # 检查是否已有数据
    if User.query.first():
        print("数据库已有数据，跳过示例数据创建")
        return
    
    print("创建示例数据...")
    
    # 创建示例用户
    users_data = [
        {'student_id': '2020000319', 'name': '胡凯峰'},
        {'student_id': '2020000320', 'name': '张三'},
        {'student_id': '2020000321', 'name': '李四'},
        {'student_id': '2020000322', 'name': '王五'},
        {'student_id': '2020000323', 'name': '赵六'}
    ]
    
    users = []
    for user_data in users_data:
        user = User(
            student_id=user_data['student_id'],
            name=user_data['name'],
            wechat_userid=f"wechat_{user_data['student_id']}"
        )
        users.append(user)
        db.session.add(user)
    
    db.session.commit()
    
    # 创建示例签到记录
    courses = ['高等数学', '大学英语', '计算机基础', '数据结构', '操作系统']
    classrooms = ['教学楼A101', '教学楼B203', '实验楼C305', '图书馆D401']
    statuses = ['attended', 'late', 'absent']
    status_weights = [0.7, 0.2, 0.1]  # 出勤概率权重
    
    # 生成过去30天的签到记录
    for i in range(30):
        date = datetime.utcnow() - timedelta(days=i)
        
        # 每天随机生成1-3条记录
        daily_records = random.randint(1, 3)
        
        for j in range(daily_records):
            user = random.choice(users)
            course = random.choice(courses)
            classroom = random.choice(classrooms)
            
            # 根据权重随机选择状态
            status = random.choices(statuses, weights=status_weights)[0]
            
            # 随机生成签到时间
            sign_time = date.replace(
                hour=random.randint(8, 17),
                minute=random.randint(0, 59),
                second=random.randint(0, 59)
            )
            
            attendance = Attendance(
                user_id=user.id,
                course_name=course,
                classroom=classroom,
                latitude=22.5431 + random.uniform(-0.01, 0.01),  # 深圳大学附近
                longitude=113.9364 + random.uniform(-0.01, 0.01),
                location_address='深圳大学',
                status=status,
                signed_at=sign_time
            )
            
            db.session.add(attendance)
    
    # 创建示例反馈
    feedback_types = ['bug', 'suggestion', 'praise', 'other']
    feedback_contents = [
        '系统运行很流畅，界面设计也很美观！',
        '希望能增加课程表同步功能',
        '签到照片上传有时会失败，建议优化',
        '统计页面的数据展示很直观，很棒！',
        '建议增加签到提醒功能'
    ]
    
    for i in range(10):
        feedback = Feedback(
            rating=random.randint(3, 5),
            feedback_type=random.choice(feedback_types),
            content=random.choice(feedback_contents),
            contact_info=f"user{i}@example.com" if random.random() > 0.5 else None,
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ip_address=f"192.168.1.{random.randint(1, 254)}"
        )
        db.session.add(feedback)
    
    db.session.commit()
    print(f"示例数据创建完成：{len(users)}个用户，{Attendance.query.count()}条签到记录，{Feedback.query.count()}条反馈")

def run_server():
    """运行服务器"""
    # 检查是否为生产环境
    is_production = '--production' in sys.argv or os.environ.get('PRODUCTION', 'false').lower() == 'true'
    
    # 获取环境变量
    if is_production:
        host = os.environ.get('HOST', '0.0.0.0')
        port = int(os.environ.get('PORT', 443))  # 生产环境默认443端口
        debug = False
        os.environ['FLASK_ENV'] = 'production'
        os.environ['USE_HTTPS'] = 'true'
        # 设置生产环境的CAS服务URL
        if not os.environ.get('CAS_SERVICE_URL'):
            os.environ['CAS_SERVICE_URL'] = 'https://kpeak.szu.edu.cn'
        
        print("=" * 60)
        print("生产环境模式")
        print(f"端口: {port} (HTTPS标准端口)")
        print("域名: kpeak.szu.edu.cn")
        if port == 443:
            print("注意: 需要管理员权限运行以绑定443端口")
        print("=" * 60)
    else:
        host = os.environ.get('HOST', '0.0.0.0')
        port = int(os.environ.get('PORT', 5000))
        debug = os.environ.get('FLASK_ENV') == 'development'
        
        print("=" * 60)
        print("开发环境模式")
        print(f"端口: {port}")
        print("使用 --production 参数启动生产环境")
        print("=" * 60)
    
    # HTTPS配置
    ssl_context = None
    use_https = os.environ.get('USE_HTTPS', 'false').lower() == 'true'
    
    if use_https:
        ssl_cert = app.config.get('SSL_CERT_PATH')
        ssl_key = app.config.get('SSL_KEY_PATH')
        
        if ssl_cert and ssl_key and os.path.exists(ssl_cert) and os.path.exists(ssl_key):
            ssl_context = (ssl_cert, ssl_key)
            print(f"启动HTTPS服务器: https://{host}:{port}")
            print(f"SSL证书: {ssl_cert}")
            print(f"SSL密钥: {ssl_key}")
        else:
            print("SSL证书文件不存在，使用HTTP模式")
            print(f"启动HTTP服务器: http://{host}:{port}")
    else:
        print(f"启动HTTP服务器: http://{host}:{port}")
    
    print(f"调试模式: {debug}")
    print(f"环境: {os.environ.get('FLASK_ENV', 'development')}")
    
    app.run(host=host, port=port, debug=debug, ssl_context=ssl_context)

def main():
    """主函数"""
    # 创建应用
    create_app()
    
    # 处理命令行参数
    if len(sys.argv) > 1:
        # 过滤掉 --production 参数，因为它在 run_server 中处理
        args = [arg for arg in sys.argv[1:] if arg != '--production']
        
        if args:
            command = args[0]
            
            if command == 'init-db':
                init_database()
            elif command == 'create-sample-data':
                with app.app_context():
                    create_sample_data()
            elif command == 'shell':
                # 启动交互式shell
                import code
                with app.app_context():
                    code.interact(local=dict(globals(), **locals()))
            elif command == '--help' or command == '-h':
                print("考勤签到系统启动脚本")
                print("使用方法:")
                print("  python run.py                    # 开发环境启动")
                print("  python run.py --production       # 生产环境启动(443端口)")
                print("  python run.py init-db            # 初始化数据库")
                print("  python run.py create-sample-data # 创建示例数据")
                print("  python run.py shell              # 启动交互式shell")
                print("")
                print("环境变量:")
                print("  HOST=0.0.0.0                    # 监听地址")
                print("  PORT=5000                       # 端口号")
                print("  USE_HTTPS=true                  # 启用HTTPS")
                print("  CAS_SERVICE_URL=https://...     # CAS服务URL")
                return
            else:
                print(f"未知命令: {command}")
                print("使用 'python run.py --help' 查看帮助")
                return
        else:
            # 只有 --production 参数的情况
            pass
    
    # 如果没有其他命令，则启动服务器
    if not any(arg in ['init-db', 'create-sample-data', 'shell', '--help', '-h'] for arg in sys.argv[1:]):
        # 初始化数据库
        init_database()
        
        # 运行服务器
        run_server()

if __name__ == '__main__':
    main()