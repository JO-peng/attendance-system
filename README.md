# 深圳大学考勤签到系统

## 项目简介
基于H5前端和Python后端的考勤签到软件，集成企业微信API，实现智能签到打卡功能。

## 功能特性
- 🔐 企业微信用户信息获取
- 📍 GPS定位签到
- 📷 拍照打卡
- 📊 签到统计与记录
- 🌐 中英文切换
- 📋 数据导出
- 💬 反馈系统

## 技术栈
- 前端：HTML5 + CSS3 + JavaScript
- 后端：Python Flask
- 数据库：SQLite
- API：企业微信API

## 项目结构
```
├── frontend/          # 前端代码
│   ├── index.html     # 签到界面
│   ├── statistics.html # 统计界面
│   ├── records.html   # 记录界面
│   ├── feedback.html  # 反馈界面
│   ├── css/          # 样式文件
│   └── js/           # JavaScript文件
├── backend/          # 后端代码
│   ├── app.py        # Flask应用
│   ├── models.py     # 数据模型
│   └── api/          # API接口
└── requirements.txt  # Python依赖
```

## 安装运行
1. 安装依赖：`pip install -r requirements.txt`
2. 运行后端：`python backend/app.py`
3. 打开前端：访问 `http://localhost:5000`

## 设计理念
- 深圳大学浅红色主色调
- 卡片式布局
- 圆润角设计
- 简约现代风格