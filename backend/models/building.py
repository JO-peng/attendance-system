#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
深圳大学建筑信息数据模型
"""

from app import db
from datetime import datetime
import json

class Building(db.Model):
    """建筑信息表"""
    __tablename__ = 'buildings'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)  # 中文名称
    name_en = db.Column(db.String(50), nullable=False)  # 英文名称
    campus = db.Column(db.String(50), nullable=False)  # 校区
    address = db.Column(db.String(100), nullable=False)  # 地址
    longitude = db.Column(db.Float, nullable=False)  # 经度
    latitude = db.Column(db.Float, nullable=False)  # 纬度
    description = db.Column(db.Text, nullable=True)  # 描述
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    def __repr__(self):
        return f'<Building {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'name_en': self.name_en,
            'campus': self.campus,
            'address': self.address,
            'longitude': self.longitude,
            'latitude': self.latitude,
            'description': self.description
        }
    
    @staticmethod
    def init_buildings(db_session):
        """初始化建筑数据"""
        # 检查是否已有数据
        if db_session.query(Building).count() > 0:
            return
        
        # 深大建筑数据
        buildings_data = [
            {
                "name": "致腾楼",
                "name_en": "Zhiteng Building",
                "campus": "沧海校区",
                "address": "深圳大学沧海校区",
                "longitude": 113.93677,
                "latitude": 22.52601,
                "description": "深圳大学沧海校区教学楼"
            },
            {
                "name": "致远楼",
                "name_en": "Zhiyuan Building",
                "campus": "沧海校区",
                "address": "深圳大学沧海校区",
                "longitude": 113.937826,
                "latitude": 22.525709,
                "description": "深圳大学沧海校区教学楼"
            },
            {
                "name": "致工楼",
                "name_en": "Zhigong Building",
                "campus": "沧海校区",
                "address": "深圳大学沧海校区",
                "longitude": 113.93861,
                "latitude": 22.526338,
                "description": "深圳大学沧海校区教学楼"
            },
            {
                "name": "致信楼",
                "name_en": "Zhixin Building",
                "campus": "沧海校区",
                "address": "深圳大学沧海校区",
                "longitude": 113.93758,
                "latitude": 22.527523,
                "description": "深圳大学沧海校区教学楼"
            },
            {
                "name": "致知楼",
                "name_en": "Zhizhi Building",
                "campus": "沧海校区",
                "address": "深圳大学沧海校区",
                "longitude": 113.939055,
                "latitude": 22.527002,
                "description": "深圳大学沧海校区教学楼"
            },
            {
                "name": "致艺楼",
                "name_en": "Zhiyi Building",
                "campus": "沧海校区",
                "address": "深圳大学沧海校区",
                "longitude": 113.939763,
                "latitude": 22.529297,
                "description": "深圳大学沧海校区教学楼"
            },
            {
                "name": "致理楼",
                "name_en": "Zhili Building",
                "campus": "沧海校区",
                "address": "深圳大学沧海校区",
                "longitude": 113.939913,
                "latitude": 22.528048,
                "description": "深圳大学沧海校区教学楼"
            },
            {
                "name": "致真楼",
                "name_en": "Zhizhen Building",
                "campus": "沧海校区",
                "address": "深圳大学沧海校区",
                "longitude": 113.94097,
                "latitude": 22.5295,
                "description": "深圳大学沧海校区教学楼"
            },
            {
                "name": "汇智楼",
                "name_en": "Huizhi Building",
                "campus": "沧海校区",
                "address": "深圳大学沧海校区",
                "longitude": 113.935938,
                "latitude": 22.531457,
                "description": "深圳大学沧海校区教学楼"
            },
            {
                "name": "汇子楼",
                "name_en": "Huizi Building",
                "campus": "沧海校区",
                "address": "深圳大学沧海校区",
                "longitude": 113.936557,
                "latitude": 22.532779,
                "description": "深圳大学沧海校区教学楼"
            },
            {
                "name": "汇典楼",
                "name_en": "Huidian Building",
                "campus": "沧海校区",
                "address": "深圳大学沧海校区",
                "longitude": 113.935447,
                "latitude": 22.533408,
                "description": "深圳大学沧海校区教学楼"
            },
            {
                "name": "汇文楼",
                "name_en": "Huiwen Building",
                "campus": "沧海校区",
                "address": "深圳大学沧海校区",
                "longitude": 113.934642,
                "latitude": 22.537704,
                "description": "深圳大学沧海校区教学楼"
            },
            {
                "name": "汇行楼",
                "name_en": "Huixing Building",
                "campus": "沧海校区",
                "address": "深圳大学沧海校区",
                "longitude": 113.9366,
                "latitude": 22.535152,
                "description": "深圳大学沧海校区教学楼"
            },
            {
                "name": "汇德楼",
                "name_en": "Huide Building",
                "campus": "沧海校区",
                "address": "深圳大学沧海校区",
                "longitude": 113.933001,
                "latitude": 22.534245,
                "description": "深圳大学沧海校区教学楼"
            },
            {
                "name": "汇园楼",
                "name_en": "Huiyuan Building",
                "campus": "沧海校区",
                "address": "深圳大学沧海校区",
                "longitude": 113.933001,
                "latitude": 22.534245,
                "description": "深圳大学沧海校区教学楼"
            },
            {
                "name": "四方楼",
                "name_en": "Sifang Building",
                "campus": "丽湖校区",
                "address": "深圳大学丽湖校区",
                "longitude": 113.991746,
                "latitude": 22.602008,
                "description": "深圳大学丽湖校区教学楼"
            },
            {
                "name": "明理楼",
                "name_en": "Mingli Building",
                "campus": "丽湖校区",
                "address": "深圳大学丽湖校区",
                "longitude": 113.993462,
                "latitude": 22.601239,
                "description": "深圳大学丽湖校区教学楼"
            },
            {
                "name": "守正楼",
                "name_en": "Shouzheng Building",
                "campus": "丽湖校区",
                "address": "深圳大学丽湖校区",
                "longitude": 113.994057,
                "latitude": 22.600552,
                "description": "深圳大学丽湖校区教学楼"
            },
            {
                "name": "文韬楼",
                "name_en": "Wentao Building",
                "campus": "丽湖校区",
                "address": "深圳大学丽湖校区",
                "longitude": 113.994775,
                "latitude": 22.599209,
                "description": "深圳大学丽湖校区教学楼"
            }
        ]
        
        # 添加建筑数据
        for building_data in buildings_data:
            building = Building(**building_data)
            db_session.add(building)
        
        db_session.commit()