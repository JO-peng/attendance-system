#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为学号2023280108创建测试课表数据
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models.course_schedule import Course, CourseSchedule, StudentCourse, TimeSlot
from models.building import Building
from datetime import time

def create_test_schedule():
    """创建测试课表数据"""
    with app.app_context():
        try:
            student_id = "2023280108"
            
            # 获取致艺楼和致理楼的ID
            zhiyi_building = Building.query.filter_by(name="致艺楼").first()
            zhili_building = Building.query.filter_by(name="致理楼").first()
            
            if not zhiyi_building or not zhili_building:
                print("❌ 找不到致艺楼或致理楼，请先初始化建筑数据")
                return False
            
            print(f"✅ 找到建筑: 致艺楼(ID: {zhiyi_building.id}), 致理楼(ID: {zhili_building.id})")
            
            # 删除该学生的现有课表数据
            existing_student_courses = StudentCourse.query.filter_by(student_id=student_id).all()
            for student_course in existing_student_courses:
                db.session.delete(student_course)
            
            # 删除现有的课程安排（避免重复创建）
            existing_schedules = CourseSchedule.query.all()
            for schedule in existing_schedules:
                db.session.delete(schedule)
            
            # 删除现有的课程（避免重复创建）
            existing_courses = Course.query.all()
            for course in existing_courses:
                db.session.delete(course)
            
            db.session.commit()
            print(f"✅ 清理了现有的课程数据")
            
            # 创建足够多的不同课程数据（42个时间段需要42门不同的课程）
            base_courses = [
                ("CS", "计算机", "Computer Science"),
                ("MATH", "数学", "Mathematics"),
                ("ENG", "英语", "English"),
                ("PHY", "物理", "Physics"),
                ("CHEM", "化学", "Chemistry"),
                ("PE", "体育", "Physical Education"),
                ("ART", "艺术", "Art"),
                ("HIST", "历史", "History"),
                ("ECON", "经济学", "Economics"),
                ("PHIL", "哲学", "Philosophy"),
                ("PSYC", "心理学", "Psychology"),
                ("SOC", "社会学", "Sociology"),
                ("BIO", "生物学", "Biology"),
                ("GEOG", "地理学", "Geography"),
                ("POLI", "政治学", "Political Science"),
                ("LAW", "法学", "Law"),
                ("MED", "医学", "Medicine"),
                ("ARCH", "建筑学", "Architecture"),
                ("MECH", "机械工程", "Mechanical Engineering"),
                ("ELEC", "电子工程", "Electronic Engineering"),
                ("CIVIL", "土木工程", "Civil Engineering"),
                ("CHEM_ENG", "化学工程", "Chemical Engineering"),
                ("MATER", "材料科学", "Materials Science"),
                ("ENV", "环境科学", "Environmental Science"),
                ("AGRI", "农学", "Agriculture"),
                ("FOREST", "林学", "Forestry"),
                ("VET", "兽医学", "Veterinary Medicine"),
                ("PHARM", "药学", "Pharmacy"),
                ("NURS", "护理学", "Nursing"),
                ("DENT", "口腔医学", "Dentistry"),
                ("MUSIC", "音乐学", "Music"),
                ("DANCE", "舞蹈学", "Dance"),
                ("DRAMA", "戏剧学", "Drama"),
                ("FILM", "电影学", "Film Studies"),
                ("JOUR", "新闻学", "Journalism"),
                ("COMM", "传播学", "Communication"),
                ("EDUC", "教育学", "Education"),
                ("LING", "语言学", "Linguistics"),
                ("ANTH", "人类学", "Anthropology"),
                ("ARCH_HIST", "考古学", "Archaeology"),
                ("STAT", "统计学", "Statistics"),
                ("INFO", "信息学", "Information Science")
            ]
            
            courses_data = []
            teachers = ["张教授", "李教授", "王教授", "赵教授", "陈教授", "刘教授", "周教授", "吴教授", "孙教授", "朱教授"]
            
            for i, (code, name_cn, name_en) in enumerate(base_courses):
                courses_data.append({
                    "course_code": f"{code}{101 + i}",
                    "course_name": f"{name_cn}基础",
                    "course_name_en": f"Introduction to {name_en}",
                    "credit": 2.0 + (i % 3),
                    "teacher_name": teachers[i % len(teachers)],
                    "teacher_id": f"T{i+1:03d}",
                    "department": f"{name_cn}学院",
                    "semester": "2023-2024-1"
                })
            
            # 课程安排数据 (周一到周日，每天6个时间段，每个时间段使用不同的课程)
            schedule_data = []
            course_idx = 0
            classrooms = ["101", "102", "103", "201", "202", "203", "301", "302", "303", "401", "402", "403", "501", "502", "503", "601", "602", "603", "701", "702", "703", "801", "802", "803"]
            
            for day in range(1, 8):  # 周一到周日
                for slot in range(1, 7):  # 每天6个时间段
                    building = zhiyi_building if course_idx % 2 == 0 else zhili_building
                    classroom = classrooms[course_idx % len(classrooms)]
                    
                    schedule_data.append({
                        "day": day,
                        "slot": slot,
                        "course_idx": course_idx,
                        "building": building,
                        "classroom": classroom
                    })
                    course_idx += 1
            
            # 创建或获取课程
            courses = []
            for course_data in courses_data:
                course = Course.query.filter_by(course_code=course_data["course_code"]).first()
                if not course:
                    course = Course(**course_data)
                    db.session.add(course)
                    db.session.flush()  # 获取ID
                courses.append(course)
            
            print(f"✅ 创建了 {len(courses)} 门课程")
            
            # 创建课程安排和学生选课
            created_schedules = 0
            for schedule_info in schedule_data:
                course = courses[schedule_info["course_idx"]]
                slot_num, start_time, end_time = TimeSlot.SLOTS[schedule_info["slot"] - 1]
                
                # 创建课程安排
                course_schedule = CourseSchedule(
                    course_id=course.id,
                    building_id=schedule_info["building"].id,
                    classroom=schedule_info["classroom"],
                    day_of_week=schedule_info["day"],
                    start_time=start_time,
                    end_time=end_time,
                    week_numbers="1-18"  # 整个学期
                )
                db.session.add(course_schedule)
                db.session.flush()  # 获取ID
                
                # 创建学生选课记录
                student_course = StudentCourse(
                    student_id=student_id,
                    course_id=course.id,
                    course_schedule_id=course_schedule.id,
                    status="active"
                )
                db.session.add(student_course)
                created_schedules += 1
            
            db.session.commit()
            
            print(f"✅ 为学号 {student_id} 创建了 {created_schedules} 个课程安排")
            print("✅ 课表创建完成！")
            print("\n课表安排概览:")
            print("周一到周日，每天6个时间段:")
            print("第1节：8:30-10:05")
            print("第2节：10:25-12:00")
            print("第3节：14:00-15:35")
            print("第4节：15:55-17:30")
            print("第5节：19:00-20:35")
            print("第6节：20:45-22:20")
            print(f"地点：致艺楼和致理楼")
            
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ 创建测试课表失败: {e}")
            return False

if __name__ == "__main__":
    success = create_test_schedule()
    if success:
        print("\n🎉 测试课表数据创建成功！")
    else:
        print("\n💥 测试课表数据创建失败！")