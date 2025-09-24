#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CAS统一身份认证API
"""

from flask import Blueprint, request, jsonify, redirect, session, current_app, url_for
from cas_auth import get_current_user, session_manager, login_required
import logging

cas_api = Blueprint('cas_api', __name__)

@cas_api.route('/login', methods=['GET'])
def cas_login():
    """CAS登录入口"""
    try:
        # 检查是否已经登录
        user = get_current_user()
        if user:
            return jsonify({
                'success': True,
                'message': '用户已登录',
                'user': user.to_dict()
            })
        
        # 获取CAS登录URL
        login_url = current_app.cas_client.get_login_url()
        
        # 如果是AJAX请求，返回JSON
        if request.headers.get('Content-Type') == 'application/json' or \
           request.headers.get('Accept') == 'application/json':
            return jsonify({
                'success': True,
                'login_url': login_url
            })
        
        # 否则直接重定向
        return redirect(login_url)
        
    except Exception as e:
        current_app.logger.error(f"CAS登录失败: {e}")
        return jsonify({
            'success': False,
            'message': '登录失败，请稍后重试'
        }), 500

@cas_api.route('/callback', methods=['GET'])
def cas_callback():
    """CAS回调处理"""
    try:
        ticket = request.args.get('ticket')
        if not ticket:
            return jsonify({
                'success': False,
                'message': '缺少CAS票据'
            }), 400
        
        # 验证票据
        user = current_app.cas_client.validate_ticket(ticket)
        if not user:
            return jsonify({
                'success': False,
                'message': 'CAS票据验证失败'
            }), 401
        
        # 创建会话
        session_id = session_manager.create_session(user)
        session['cas_session_id'] = session_id
        
        current_app.logger.info(f"用户 {user.username} ({user.name}) 登录成功")
        
        # 重定向到前端首页
        return redirect('/')
        
    except Exception as e:
        current_app.logger.error(f"CAS回调处理失败: {e}")
        return jsonify({
            'success': False,
            'message': '登录处理失败，请稍后重试'
        }), 500

@cas_api.route('/logout', methods=['GET', 'POST'])
def cas_logout():
    """CAS登出"""
    try:
        # 清除本地会话
        session_id = session.get('cas_session_id')
        if session_id:
            session_manager.delete_session(session_id)
            session.pop('cas_session_id', None)
        
        # 获取CAS登出URL
        logout_url = current_app.cas_client.get_logout_url()
        
        # 如果是AJAX请求，返回JSON
        if request.headers.get('Content-Type') == 'application/json' or \
           request.headers.get('Accept') == 'application/json':
            return jsonify({
                'success': True,
                'logout_url': logout_url
            })
        
        # 否则直接重定向
        return redirect(logout_url)
        
    except Exception as e:
        current_app.logger.error(f"CAS登出失败: {e}")
        return jsonify({
            'success': False,
            'message': '登出失败，请稍后重试'
        }), 500

@cas_api.route('/user', methods=['GET'])
@login_required
def get_user_info():
    """获取当前用户信息"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({
                'success': False,
                'message': '用户未登录'
            }), 401
        
        return jsonify({
            'success': True,
            'user': user.to_dict()
        })
        
    except Exception as e:
        current_app.logger.error(f"获取用户信息失败: {e}")
        return jsonify({
            'success': False,
            'message': '获取用户信息失败'
        }), 500

@cas_api.route('/status', methods=['GET'])
def get_login_status():
    """获取登录状态"""
    try:
        user = get_current_user()
        
        return jsonify({
            'success': True,
            'logged_in': user is not None,
            'user': user.to_dict() if user else None
        })
        
    except Exception as e:
        current_app.logger.error(f"获取登录状态失败: {e}")
        return jsonify({
            'success': False,
            'message': '获取登录状态失败'
        }), 500

@cas_api.route('/refresh', methods=['POST'])
@login_required
def refresh_session():
    """刷新会话"""
    try:
        session_id = session.get('cas_session_id')
        if not session_id:
            return jsonify({
                'success': False,
                'message': '会话不存在'
            }), 401
        
        success = session_manager.refresh_session(session_id)
        if not success:
            return jsonify({
                'success': False,
                'message': '会话刷新失败'
            }), 401
        
        return jsonify({
            'success': True,
            'message': '会话已刷新'
        })
        
    except Exception as e:
        current_app.logger.error(f"刷新会话失败: {e}")
        return jsonify({
            'success': False,
            'message': '刷新会话失败'
        }), 500