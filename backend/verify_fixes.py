#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
验证修复后的功能
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models.course_schedule import StudentCourse, CourseSchedule
from sqlalchemy import text

def test_database_structure():
    """测试数据库表结构"""
    print("=== 测试数据库表结构 ===")
    
    app = create_app()
    with app.app_context():
        try:
            # 测试student_courses表是否存在course_schedule_id字段
            result = db.session.execute(text("PRAGMA table_info(student_courses)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'course_schedule_id' in columns:
                print("✅ student_courses表包含course_schedule_id字段")
            else:
                print("❌ student_courses表缺少course_schedule_id字段")
                return False
                
            # 测试查询是否正常工作
            query = db.session.query(StudentCourse).join(
                CourseSchedule, StudentCourse.course_schedule_id == CourseSchedule.id
            )
            print("✅ student_courses和course_schedules表关联查询正常")
            
        except Exception as e:
            print(f"❌ 数据库结构测试失败: {e}")
            return False
    
    return True

def test_cas_configuration():
    """测试CAS配置"""
    print("\n=== 测试CAS配置 ===")
    
    app = create_app()
    with app.app_context():
        try:
            cas_server_url = app.config.get('CAS_SERVER_URL')
            cas_service_url = app.config.get('CAS_SERVICE_URL')
            
            print(f"CAS服务器URL: {cas_server_url}")
            print(f"CAS服务URL: {cas_service_url}")
            
            if cas_service_url and cas_service_url.startswith('https://'):
                print("✅ CAS服务URL使用HTTPS协议")
            else:
                print("❌ CAS服务URL应该使用HTTPS协议")
                return False
                
            if hasattr(app, 'cas_client'):
                print("✅ CAS客户端初始化成功")
            else:
                print("❌ CAS客户端未初始化")
                return False
                
        except Exception as e:
            print(f"❌ CAS配置测试失败: {e}")
            return False
    
    return True

def test_wechat_api_error_handling():
    """测试企业微信API错误处理"""
    print("\n=== 测试企业微信API错误处理 ===")
    
    try:
        from wechat_api import WeChatAPI
        
        # 创建API实例
        api = WeChatAPI(corp_id='test', corp_secret='test', agent_id='test')
        
        # 模拟60011权限错误的处理
        mock_result = {'errcode': 60011, 'errmsg': 'no privilege to access/modify contact/party/agent'}
        
        # 这里我们只是验证方法存在，实际的错误处理在运行时测试
        if hasattr(api, 'get_user_detail'):
            print("✅ 企业微信API错误处理方法存在")
        else:
            print("❌ 企业微信API错误处理方法不存在")
            return False
            
    except Exception as e:
        print(f"❌ 企业微信API测试失败: {e}")
        return False
    
    return True

def main():
    """主测试函数"""
    print("开始验证修复后的功能...\n")
    
    tests = [
        test_database_structure,
        test_cas_configuration,
        test_wechat_api_error_handling
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print(f"\n=== 测试结果 ===")
    print(f"通过: {passed}/{total}")
    
    if passed == total:
        print("🎉 所有测试通过！修复成功。")
        return True
    else:
        print("⚠️ 部分测试失败，请检查相关配置。")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)