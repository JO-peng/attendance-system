#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
留学生课表数据模型
"""

from app import db
from datetime import datetime, time

class Course(db.Model):
    """课程信息表"""
    __tablename__ = 'courses'
    
    id = db.Column(db.Integer, primary_key=True)
    course_code = db.Column(db.String(20), unique=True, nullable=False, index=True)
    course_name = db.Column(db.String(100), nullable=False)
    course_name_en = db.Column(db.String(100), nullable=True)  # 英文课程名
    credit = db.Column(db.Float, nullable=False, default=0)
    teacher_name = db.Column(db.String(50), nullable=False)
    teacher_id = db.Column(db.String(20), nullable=True)
    department = db.Column(db.String(50), nullable=True)
    semester = db.Column(db.String(20), nullable=False)  # 如：2023-2024-1
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 关联
    schedules = db.relationship('CourseSchedule', backref='course', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Course {self.course_code}: {self.course_name}>'


class CourseSchedule(db.Model):
    """课程安排表"""
    __tablename__ = 'course_schedules'
    
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    building_id = db.Column(db.Integer, db.ForeignKey('buildings.id'), nullable=False)
    classroom = db.Column(db.String(20), nullable=False)  # 教室号，如：101
    day_of_week = db.Column(db.Integer, nullable=False)  # 1-7 表示周一到周日
    start_time = db.Column(db.Time, nullable=False)  # 上课时间
    end_time = db.Column(db.Time, nullable=False)  # 下课时间
    week_numbers = db.Column(db.String(100), nullable=False)  # 上课周次，如：1,2,3,5-10
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 关联
    building = db.relationship('Building', backref='course_schedules')
    
    def __repr__(self):
        return f'<CourseSchedule {self.course_id}: {self.day_of_week} {self.start_time}-{self.end_time}>'


class StudentCourse(db.Model):
    """学生选课表"""
    __tablename__ = 'student_courses'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), nullable=False, index=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    status = db.Column(db.String(20), default='active')  # active, dropped, completed
    grade = db.Column(db.String(10), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 关联
    course = db.relationship('Course', backref='student_enrollments')
    
    # 联合唯一约束
    __table_args__ = (
        db.UniqueConstraint('student_id', 'course_id', name='uix_student_course'),
    )
    
    def __repr__(self):
        return f'<StudentCourse {self.student_id}: {self.course_id}>'


# 预设的上课时间段
class TimeSlot:
    """课程时间段定义"""
    SLOTS = [
        (1, time(8, 30), time(10, 5)),   # 第1节：8:30-10:05
        (2, time(10, 25), time(12, 0)),  # 第2节：10:25-12:00
        (3, time(14, 0), time(15, 35)),  # 第3节：14:00-15:35
        (4, time(15, 55), time(17, 30)), # 第4节：15:55-17:30
        (5, time(19, 0), time(20, 35)),  # 第5节：19:00-20:35
        (6, time(20, 45), time(22, 20))  # 第6节：20:45-22:20
    ]
    
    @staticmethod
    def get_slot_by_time(current_time):
        """根据当前时间获取对应的课程时间段"""
        if not isinstance(current_time, time):
            if isinstance(current_time, datetime):
                current_time = current_time.time()
            else:
                raise TypeError("current_time must be datetime.time or datetime.datetime")
                
        for slot_num, start, end in TimeSlot.SLOTS:
            if start <= current_time <= end:
                return slot_num, start, end
        return None