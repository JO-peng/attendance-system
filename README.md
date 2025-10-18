# 深圳大学考勤签到系统

## 项目简介
基于H5前端和Python Flask后端的智能考勤签到系统，集成企业微信API，支持GPS定位验证、课程表管理、建筑识别等功能，为深圳大学提供完整的考勤解决方案。

## 功能特性
- 🔐 企业微信用户身份验证
- 📍 GPS定位签到与建筑识别
- 📷 拍照打卡功能
- 📚 课程表管理与课程匹配
- 🏢 建筑信息管理与位置验证
- 📊 签到统计与记录查询
- 🌐 中英文双语支持
- 📋 数据导出功能
- 💬 用户反馈系统
- 🔒 HTTPS安全访问

## 技术栈
- **前端**: HTML5 + CSS3 + JavaScript (ES6+)
- **后端**: Python 3.8+ + Flask 2.3.3
- **数据库**: MySQL 9.4.0
- **API集成**: 企业微信API
- **地理位置**: Geopy + Haversine
- **安全**: HTTPS + SSL证书
- **部署**: Gunicorn + Waitress

## 项目结构
```
├── frontend/                 # 前端代码
│   ├── index.html           # 签到主界面
│   ├── statistics.html      # 统计分析界面
│   ├── records.html         # 签到记录界面
│   ├── feedback.html        # 用户反馈界面
│   ├── css/                 # 样式文件
│   │   ├── common.css       # 通用样式
│   │   ├── index.css        # 签到页面样式
│   │   └── ...
│   └── js/                  # JavaScript文件
│       ├── common.js        # 通用功能
│       ├── index.js         # 签到页面逻辑
│       └── ...
├── backend/                 # 后端代码
│   ├── app.py              # Flask主应用
│   ├── config.py           # 配置文件
│   ├── run.py              # 数据库初始化脚本
│   ├── wechat_api.py       # 企业微信API
│   ├── api/                # API接口
│   │   └── attendance_api.py # 考勤相关API
│   ├── models/             # 数据模型
│   │   ├── building.py     # 建筑模型
│   │   └── course_schedule.py # 课程表模型
│   ├── services/           # 业务逻辑
│   │   └── attendance_service.py # 考勤服务
│   ├── uploads/            # 文件上传目录
│   └── instance/           # 数据库文件
├── ca/                     # SSL证书目录
├── CAS集成/                # CAS认证集成文档
└── requirements.txt        # Python依赖
```

## 安装部署

### 环境要求
- Python 3.8+
- pip 包管理器
- SSL证书（生产环境）

### 本地开发
1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd 考勤签到复现
   ```

2. **安装依赖**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **初始化数据库**
   ```bash
   python run.py
   ```

4. **启动服务**
   ```bash
   python app.py
   ```

5. **访问应用**
   - 开发环境: http://localhost:5000
   - 生产环境: https://kpeak.szu.edu.cn

### 生产部署
1. **配置SSL证书**
   - 将证书文件放置在 `ca/` 目录下
   - 配置 `config.py` 中的证书路径

2. **配置企业微信**
   - 设置企业微信可信域名: `kpeak.szu.edu.cn`
   - 配置企业微信应用参数

3. **启动HTTPS服务**
   ```bash
   python app.py --port 443 --ssl
   ```

## API接口

### 考勤相关
- `POST /api/v1/check-in` - 位置检查与课程匹配
- `POST /api/v1/location-info` - 获取位置信息

### 企业微信
- `POST /api/wechat/config` - 获取微信配置
- `POST /api/wechat/userinfo` - 获取用户信息

### 签到管理
- `GET /api/attendance/records` - 获取签到记录
- `GET /api/attendance/statistics` - 获取签到统计

### 反馈系统
- `POST /api/feedback/submit` - 提交用户反馈

## 配置说明

### 企业微信配置
```python
WECHAT_CORP_ID = 'ww563e8adbd544adf5'
WECHAT_AGENT_ID = '1000265'
WECHAT_SECRET = 'ui7lI26sXjVq7BKm_esRm_3s5ZTOpJPpxmf_AO8qPd0'
```

### 数据库配置
```python
# MySQL数据库配置
SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://attendance_user:attendance123456@localhost:3306/attendance_system?charset=utf8mb4'
SQLALCHEMY_TRACK_MODIFICATIONS = False

# 备用SQLite配置（如需回退）
# SQLALCHEMY_DATABASE_URI = 'sqlite:///instance/attendance.db'
```

### HTTPS配置
```python
SSL_CERT_PATH = 'ca/cert.pem'
SSL_KEY_PATH = 'ca/key.pem'
```

## 功能模块

### 1. 用户认证
- 企业微信OAuth2.0认证
- 用户信息自动获取
- 权限验证

### 2. 位置服务
- GPS定位获取
- 建筑范围判断
- 距离计算验证

### 3. 课程管理
- 课程表导入
- 时间段匹配
- 课程状态检查

### 4. 签到流程
- 拍照验证
- 位置验证
- 时间验证
- 数据存储

## 开发指南

### 添加新建筑
1. 在 `run.py` 中添加建筑数据
2. 设置建筑坐标和范围
3. 重新运行初始化脚本

### 添加新课程
1. 修改 `models/course_schedule.py`
2. 在 `run.py` 中添加课程数据
3. 配置时间段和教室

### 自定义API
1. 在 `api/` 目录创建新模块
2. 在 `app.py` 中注册蓝图
3. 添加相应的服务逻辑

## 故障排除

### 常见问题
1. **企业微信配置错误**: 检查域名和应用配置
2. **GPS定位失败**: 确认浏览器定位权限
3. **数据库连接失败**: 检查数据库文件权限
4. **SSL证书问题**: 验证证书文件路径和格式

### 日志查看
```bash
tail -f backend/logs/app.log
```

## 贡献指南
1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

## 许可证
本项目采用 MIT 许可证

## 联系方式
- 项目维护: 深圳大学信息中心
- 技术支持: kpeak.szu.edu.cn
- 文档更新: 2024年9月