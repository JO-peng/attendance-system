#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
签到API接口，包含位置验证与教学楼匹配功能
"""

from flask import Blueprint, request, jsonify, current_app
from services.attendance_service import AttendanceService
from models.building import Building
from models.course_schedule import Course, CourseSchedule, StudentCourse
from app import db
import time

# 创建蓝图
attendance_api = Blueprint('attendance_api', __name__)

@attendance_api.route('/check-in', methods=['POST'])
def check_in():
    """
    学生签到接口
    
    请求参数:
        longitude: 经度
        latitude: 纬度
        timestamp: 时间戳（可选，默认为当前时间）
    
    返回:
        签到结果，包含状态和消息
    """
    try:
        # 获取请求参数
        data = request.get_json()
        longitude = data.get('longitude')
        latitude = data.get('latitude')
        timestamp = data.get('timestamp', int(time.time()))
        student_id = data.get('student_id', '2020000319')  # 默认测试学生ID
        
        # 参数验证
        if not all([longitude, latitude]):
            return jsonify({
                'success': False,
                'message': '缺少必要参数'
            }), 400
        
        # 调用签到服务
        result = AttendanceService.check_attendance_status(
            student_id, 
            timestamp, 
            [float(longitude), float(latitude)]
        )
        
        # 根据签到状态返回结果
        if result['status'] == 'no_class':
            return jsonify({
                'success': False,
                'message': result['message'],
                'data': {
                    'status': 'no_class'
                }
            }), 200
        
        # 返回签到结果
        return jsonify({
            'success': True,
            'message': result['message'],
            'data': {
                'status': result['status'],
                'course': result['course'],
                'building': result['building']
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"签到失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'签到失败: {str(e)}'
        }), 500



@attendance_api.route('/location-info', methods=['POST'])
def get_location_info():
    """
    获取位置信息，包括最近的建筑和课程状态
    
    请求参数:
        longitude: 经度
        latitude: 纬度
        timestamp: 时间戳（可选，默认为当前时间）
        student_id: 学生ID（可选，默认为测试学生）
    
    返回:
        位置信息，包括最近的建筑、距离、课程状态等
    """
    try:
        # 获取请求参数
        data = request.get_json()
        longitude = data.get('longitude')
        latitude = data.get('latitude')
        timestamp = data.get('timestamp', int(time.time()))
        student_id = data.get('student_id', '2020000319')  # 默认测试学生ID
        
        # 参数验证
        if not all([longitude, latitude]):
            return jsonify({
                'success': False,
                'message': '缺少必要参数：经度和纬度'
            }), 400
        
        # 调用位置信息服务
        location_info = AttendanceService.get_location_info(
            student_id, 
            timestamp, 
            [float(longitude), float(latitude)]
        )
        
        # 返回位置信息
        return jsonify({
            'success': True,
            'data': {
                'building': location_info['building'],
                'distance': round(location_info['distance'], 2),
                'is_valid_location': location_info['is_valid_location'],
                'course': location_info['course'],
                'status': location_info['status'],
                'message': location_info['message']
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"获取位置信息失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'获取位置信息失败: {str(e)}'
        }), 500