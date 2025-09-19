# 深圳大学考勤签到系统

基于Flask和企业微信的智能考勤签到系统，支持位置验证、课程管理和数据统计。

## 功能特性

- **智能签到**: 基于地理位置的自动签到验证
- **企业微信集成**: 支持企业微信用户身份验证
- **课程管理**: 完整的课程表和教学楼管理
- **数据统计**: 签到记录查询和统计分析
- **反馈系统**: 用户反馈收集和管理
- **响应式设计**: 支持移动端和桌面端访问

## 技术栈

### 后端
- **Flask 2.3.3** - Web框架
- **SQLAlchemy** - 数据库ORM
- **Flask-CORS** - 跨域支持
- **企业微信API** - 用户认证
- **Geopy** - 地理位置处理

### 前端
- **原生JavaScript** - 前端逻辑
- **CSS3** - 样式设计
- **企业微信JSSDK** - 微信功能集成

## 项目结构

```
├── backend/                 # 后端代码
│   ├── app.py              # Flask应用主文件
│   ├── config.py           # 配置文件
│   ├── wechat_api.py       # 企业微信API
│   ├── models/             # 数据模型
│   ├── services/           # 业务逻辑
│   └── requirements.txt    # Python依赖
├── frontend/               # 前端代码
│   ├── index.html         # 主页面
│   ├── css/               # 样式文件
│   └── js/                # JavaScript文件
├── ca/                    # SSL证书目录
└── CAS集成/               # CAS认证集成文档
```

## 快速开始

### 环境要求

- Python 3.8+
- Git

### 1. 克隆项目

```bash
git clone <repository-url>
cd 考勤签到复现
```

### 2. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 3. 配置环境变量

创建 `.env` 文件：

```env
# 企业微信配置
WECHAT_CORP_ID=your_corp_id
WECHAT_CORP_SECRET=your_corp_secret
WECHAT_AGENT_ID=your_agent_id

# 数据库配置
DATABASE_URL=sqlite:///instance/attendance.db

# 应用配置
SECRET_KEY=your_secret_key
DEBUG=True
```

### 4. 初始化数据库

```bash
python run.py
```

### 5. 启动服务

```bash
python run.py
```

访问 http://localhost:5000

## 生产部署

### 1. 服务器要求

- Linux服务器 (推荐Ubuntu 20.04+)
- Python 3.8+
- Nginx (可选，用于反向代理)
- SSL证书 (用于HTTPS)

### 2. 部署步骤

```bash
# 1. 克隆代码
git clone <repository-url>
cd 考勤签到复现

# 2. 安装依赖
cd backend
pip install -r requirements.txt

# 3. 配置SSL证书
# 将证书文件放置在 ca/ 目录下
# cert.pem - SSL证书
# key.pem - 私钥文件

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入正确的配置

# 5. 启动生产服务
python run.py
```

### 3. 使用Gunicorn部署

```bash
# 安装Gunicorn
pip install gunicorn

# 启动服务
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### 4. Nginx配置 (可选)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## API接口

### 核心接口

- `POST /api/v1/location-info` - 获取位置信息
- `POST /api/v1/check-in` - 签到接口
- `POST /api/wechat/config` - 企业微信配置
- `POST /api/wechat/userinfo` - 获取用户信息
- `GET /api/attendance/records` - 签到记录
- `GET /api/attendance/statistics` - 统计数据
- `POST /api/feedback/submit` - 提交反馈

### 响应格式

```json
{
    "success": true,
    "message": "操作成功",
    "data": {}
}
```

## 配置说明

### 企业微信配置

1. 在企业微信管理后台创建应用
2. 获取 CorpID、Secret 和 AgentID
3. 配置可信域名和回调URL
4. 设置应用权限

### 数据库配置

系统默认使用SQLite数据库，生产环境建议使用PostgreSQL或MySQL。

## 开发指南

### 添加新功能

1. 在 `models/` 中定义数据模型
2. 在 `services/` 中实现业务逻辑
3. 在 `app.py` 中添加API路由
4. 在前端添加相应的页面和逻辑

### 代码规范

- 使用Python PEP 8编码规范
- 添加适当的注释和文档
- 编写单元测试

## 故障排除

### 常见问题

1. **企业微信认证失败**
   - 检查CorpID、Secret配置
   - 确认可信域名设置正确

2. **位置验证失败**
   - 检查GPS权限
   - 确认教学楼坐标配置

3. **数据库连接错误**
   - 检查数据库文件权限
   - 确认数据库路径正确

## 许可证

MIT License

## 联系方式

如有问题，请联系开发团队。