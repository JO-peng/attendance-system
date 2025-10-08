#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
语言工具函数，支持中英文位置信息生成
"""

def format_location_info(building_name, building_name_en, distance, is_valid, language='zh'):
    """
    根据语言格式化位置信息
    
    Args:
        building_name: 中文建筑名称
        building_name_en: 英文建筑名称
        distance: 距离（米）
        is_valid: 是否在有效范围内
        language: 语言代码 ('zh' 或 'en')
    
    Returns:
        str: 格式化的位置信息
    """
    if language == 'en':
        # 英文格式
        building_display = building_name_en or building_name
        if is_valid:
            status_text = "Within range"
        else:
            status_text = "Out of range"
        return f"{distance}m from {building_display} ({status_text})"
    else:
        # 中文格式（默认）
        building_display = building_name
        if is_valid:
            status_text = "位置已知"
        else:
            status_text = "位置未知"
        return f"距离{building_display}{distance}米（{status_text}）"

def format_unknown_location(language='zh'):
    """
    格式化未知位置信息
    
    Args:
        language: 语言代码 ('zh' 或 'en')
    
    Returns:
        str: 格式化的未知位置信息
    """
    if language == 'en':
        return "Unknown location (out of range)"
    else:
        return "未知位置（超出范围）"

def get_status_text(is_valid, language='zh'):
    """
    获取位置状态文本
    
    Args:
        is_valid: 是否在有效范围内
        language: 语言代码 ('zh' 或 'en')
    
    Returns:
        str: 状态文本
    """
    if language == 'en':
        return "Within range" if is_valid else "Out of range"
    else:
        return "位置已知" if is_valid else "位置未知"