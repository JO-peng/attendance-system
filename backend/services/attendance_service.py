#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
签到服务逻辑，包含与课表联动的功能
"""

from datetime import datetime, timedelta
import pytz
from geopy.distance import geodesic
from models.course_schedule import Course, CourseSchedule, StudentCourse, TimeSlot
from models.building import Building
from app import db

class AttendanceService:
    """签到服务类，处理签到逻辑与课表联动"""
    
    @staticmethod
    def check_attendance_status(student_id, timestamp, location):
        """
        检查学生签到状态
        
        Args:
            student_id: 学生ID
            timestamp: 签到时间戳
            location: 签到位置，格式为 [longitude, latitude]
            
        Returns:
            dict: 包含签到状态信息
                {
                    'status': 'present'|'late'|'absent'|'no_class',
                    'course': 课程信息,
                    'building': 建筑信息,
                    'message': 提示信息
                }
        """
        # 转换时间戳为datetime对象
        tz = pytz.timezone('Asia/Shanghai')
        check_time = datetime.fromtimestamp(timestamp, tz)
        
        # 获取当前日期是星期几 (0-6, 0是星期一)
        weekday = check_time.weekday()
        
        # 查找学生当前时间应该上的课
        current_course = AttendanceService._get_current_course(student_id, weekday, check_time)
        
        # 如果没有课程，返回无课状态
        if not current_course:
            return {
                'status': 'no_class',
                'course': None,
                'building': None,
                'message': '当前时间没有安排课程'
            }
        
        # 获取课程对应的教学楼
        building = db.session.query(Building).filter_by(
            name_en=current_course.course_schedule.building
        ).first()
        
        if not building:
            return {
                'status': 'error',
                'course': current_course.course.to_dict(),
                'building': None,
                'message': '未找到对应的教学楼信息'
            }
        
        # 检查位置是否在教学楼附近
        is_in_location = AttendanceService._check_location(
            location, 
            [building.longitude, building.latitude]
        )
        
        if not is_in_location:
            return {
                'status': 'absent',
                'course': current_course.course.to_dict(),
                'building': building.to_dict(),
                'message': '不在教学楼附近，签到无效'
            }
        
        # 检查是否迟到
        time_slot = TimeSlot.get_time_slot(current_course.course_schedule.time_slot)
        start_time = datetime.combine(check_time.date(), time_slot.start_time)
        start_time = tz.localize(start_time)
        
        # 迟到时间阈值（15分钟）
        late_threshold = start_time + timedelta(minutes=15)
        
        if check_time <= late_threshold:
            status = 'present'
            message = '签到成功'
        else:
            status = 'late'
            message = '迟到签到'
        
        return {
            'status': status,
            'course': current_course.course.to_dict(),
            'building': building.to_dict(),
            'message': message
        }
    
    @staticmethod
    def _get_current_course(student_id, weekday, check_time):
        """
        获取学生当前时间应该上的课程
        
        Args:
            student_id: 学生ID
            weekday: 星期几 (0-6)
            check_time: 签到时间
            
        Returns:
            StudentCourse: 学生课程对象，如果没有则返回None
        """
        # 获取当前时间的小时和分钟
        current_hour = check_time.hour
        current_minute = check_time.minute
        current_time = current_hour * 60 + current_minute  # 转换为分钟计数
        
        # 查询学生当天的所有课程
        student_courses = db.session.query(StudentCourse).join(
            CourseSchedule, StudentCourse.course_schedule_id == CourseSchedule.id
        ).filter(
            StudentCourse.student_id == student_id,
            CourseSchedule.day_of_week == weekday
        ).all()
        
        # 检查当前时间是否在某个课程的时间段内
        for student_course in student_courses:
            schedule = student_course.course_schedule
            
            # 转换上课和下课时间为分钟计数
            start_minutes = schedule.start_time.hour * 60 + schedule.start_time.minute
            end_minutes = schedule.end_time.hour * 60 + schedule.end_time.minute
            
            # 检查当前时间是否在课程时间段内
            if start_minutes <= current_time <= end_minutes:
                return student_course
        
        return None
    
    @staticmethod
    def _check_location(user_location, building_location, max_distance=100):
        """
        检查用户是否在建筑物附近
        
        Args:
            user_location: 用户位置 [longitude, latitude]
            building_location: 建筑物位置 [longitude, latitude]
            max_distance: 最大允许距离（米）
            
        Returns:
            bool: 是否在建筑物附近
        """
        # 转换坐标格式为 (latitude, longitude)，因为geodesic函数需要这种格式
        user_coords = (user_location[1], user_location[0])
        building_coords = (building_location[1], building_location[0])
        
        # 计算距离（米）
        distance = geodesic(user_coords, building_coords).meters
        
        return distance <= max_distance
    
    @staticmethod
    def find_nearest_building(location):
        """
        根据GPS位置找到最近的建筑
        
        Args:
            location: 用户位置 [longitude, latitude]
            
        Returns:
            dict: 包含最近建筑信息和距离
                {
                    'building': 建筑信息,
                    'distance': 距离（米）,
                    'is_valid': 是否在有效范围内
                }
        """
        # 获取所有建筑
        buildings = db.session.query(Building).all()
        
        if not buildings:
            return {
                'building': None,
                'distance': float('inf'),
                'is_valid': False
            }
        
        user_coords = (location[1], location[0])  # (latitude, longitude)
        nearest_building = None
        min_distance = float('inf')
        
        # 找到最近的建筑
        for building in buildings:
            building_coords = (building.latitude, building.longitude)
            distance = geodesic(user_coords, building_coords).meters
            
            if distance < min_distance:
                min_distance = distance
                nearest_building = building
        
        # 判断是否在有效范围内（200米内）
        is_valid = min_distance <= 200
        
        return {
            'building': nearest_building.to_dict() if nearest_building else None,
            'distance': min_distance,
            'is_valid': is_valid
        }
    
    @staticmethod
    def get_location_info(student_id, timestamp, location):
        """
        获取位置信息，包括最近的建筑和课程状态
        
        Args:
            student_id: 学生ID
            timestamp: 时间戳
            location: 位置 [longitude, latitude]
            
        Returns:
            dict: 位置和课程信息
        """
        # 获取最近的建筑
        building_info = AttendanceService.find_nearest_building(location)
        
        # 获取签到状态（包括课程信息）
        attendance_status = AttendanceService.check_attendance_status(
            student_id, timestamp, location
        )
        
        return {
            'building': building_info['building'],
            'distance': building_info['distance'],
            'is_valid_location': building_info['is_valid'],
            'course': attendance_status.get('course'),
            'status': attendance_status.get('status'),
            'message': attendance_status.get('message')
        }