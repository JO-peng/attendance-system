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
    
    @staticmethod
    def get_student_schedule(student_id, date=None, days=7):
        """
        获取学生课程表信息
        
        Args:
            student_id: 学生ID
            date: 开始日期（YYYY-MM-DD格式），默认为今天
            days: 获取天数，默认为7天
            
        Returns:
            dict: 课程表信息
                {
                    'schedule': 课程列表,
                    'total_courses': 总课程数,
                    'date_range': 日期范围
                }
        """
        # 设置时区
        tz = pytz.timezone('Asia/Shanghai')
        
        # 处理日期参数
        if date:
            start_date = datetime.strptime(date, '%Y-%m-%d').date()
        else:
            start_date = datetime.now(tz).date()
        
        end_date = start_date + timedelta(days=days-1)
        
        # 获取学生的所有课程
        student_courses = db.session.query(StudentCourse).join(
            CourseSchedule, StudentCourse.course_schedule_id == CourseSchedule.id
        ).join(
            Course, StudentCourse.course_id == Course.id
        ).filter(
            StudentCourse.student_id == student_id
        ).all()
        
        # 构建课程表数据
        schedule = []
        current_date = start_date
        
        while current_date <= end_date:
            weekday = current_date.weekday()  # 0-6, 0是星期一
            
            # 获取当天的课程
            daily_courses = []
            for student_course in student_courses:
                course_schedule = student_course.course_schedule
                if course_schedule.day_of_week == weekday:
                    # 获取建筑信息
                    building = db.session.query(Building).filter_by(
                        name_en=course_schedule.building
                    ).first()
                    
                    # 构建课程信息
                    course_info = {
                        'course_id': student_course.course.id,
                        'course_name': student_course.course.name,
                        'course_code': student_course.course.code,
                        'teacher': student_course.course.teacher,
                        'classroom': course_schedule.classroom,
                        'building': course_schedule.building,
                        'building_name': building.name if building else course_schedule.building,
                        'building_name_en': building.name_en if building else course_schedule.building,
                        'start_time': course_schedule.start_time.strftime('%H:%M'),
                        'end_time': course_schedule.end_time.strftime('%H:%M'),
                        'time_slot': course_schedule.time_slot,
                        'day_of_week': weekday,
                        'date': current_date.strftime('%Y-%m-%d'),
                        'status': AttendanceService._get_course_status(current_date, course_schedule.start_time, tz)
                    }
                    daily_courses.append(course_info)
            
            # 按时间排序
            daily_courses.sort(key=lambda x: x['start_time'])
            
            # 添加到课程表
            if daily_courses:  # 只添加有课的日期
                schedule.extend(daily_courses)
            
            current_date += timedelta(days=1)
        
        return {
            'schedule': schedule,
            'total_courses': len(schedule),
            'date_range': {
                'start_date': start_date.strftime('%Y-%m-%d'),
                'end_date': end_date.strftime('%Y-%m-%d')
            }
        }
    
    @staticmethod
    def _get_course_status(course_date, start_time, tz):
        """
        获取课程状态
        
        Args:
            course_date: 课程日期
            start_time: 开始时间
            tz: 时区
            
        Returns:
            str: 课程状态 ('upcoming', 'current', 'past')
        """
        now = datetime.now(tz)
        course_datetime = datetime.combine(course_date, start_time)
        course_datetime = tz.localize(course_datetime)
        
        # 计算时间差
        time_diff = (course_datetime - now).total_seconds()
        
        if time_diff > 3600:  # 超过1小时
            return 'upcoming'
        elif time_diff > -3600:  # 1小时内（包括正在进行的课程）
            return 'current'
        else:
            return 'past'