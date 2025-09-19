# 部署指南

本文档详细说明了深圳大学考勤签到系统的部署流程。

## 服务器要求

### 最低配置
- **CPU**: 2核
- **内存**: 4GB RAM
- **存储**: 20GB 可用空间
- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / Debian 10+
- **网络**: 公网IP，开放80和443端口

### 推荐配置
- **CPU**: 4核
- **内存**: 8GB RAM
- **存储**: 50GB SSD
- **操作系统**: Ubuntu 22.04 LTS

## 部署方式

### 方式一：传统部署

#### 1. 环境准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Python 3.9+
sudo apt install python3 python3-pip python3-venv -y

# 安装Git
sudo apt install git -y

# 安装Nginx (可选)
sudo apt install nginx -y
```

#### 2. 克隆代码

```bash
# 克隆项目
git clone <repository-url>
cd 考勤签到复现

# 给部署脚本执行权限
chmod +x deploy.sh
```

#### 3. 运行部署脚本

```bash
# 运行自动部署脚本
./deploy.sh
```

#### 4. 配置环境变量

编辑 `backend/.env` 文件：

```bash
cd backend
cp .env.example .env
nano .env
```

填入正确的配置信息：

```env
# 企业微信配置
WECHAT_CORP_ID=wwf06fd389f66f0e0d
WECHAT_CORP_SECRET=your_actual_secret
WECHAT_AGENT_ID=1000003

# 数据库配置
DATABASE_URL=sqlite:///instance/attendance.db

# 应用配置
SECRET_KEY=your_random_secret_key
DEBUG=False
FLASK_ENV=production
```

#### 5. 配置SSL证书

```bash
# 将SSL证书文件放置在ca目录
cp your_cert.pem ca/cert.pem
cp your_key.pem ca/key.pem

# 设置证书文件权限
chmod 644 ca/cert.pem
chmod 600 ca/key.pem
```

#### 6. 启动服务

```bash
# 开发模式
python run.py

# 生产模式
gunicorn -w 4 -b 0.0.0.0:5000 app:app

# 后台运行
nohup gunicorn -w 4 -b 0.0.0.0:5000 app:app > logs/gunicorn.log 2>&1 &
```

### 方式二：Docker部署

#### 1. 安装Docker

```bash
# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装Docker Compose
sudo apt install docker-compose -y

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker
```

#### 2. 配置环境

```bash
# 克隆项目
git clone <repository-url>
cd 考勤签到复现

# 配置环境变量
cd backend
cp .env.example .env
# 编辑.env文件填入正确配置

# 配置SSL证书
cp your_cert.pem ../ca/cert.pem
cp your_key.pem ../ca/key.pem
```

#### 3. 启动服务

```bash
# 构建并启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

## 企业微信配置

### 1. 创建企业微信应用

1. 登录企业微信管理后台
2. 进入"应用管理" → "自建应用"
3. 创建新应用，记录以下信息：
   - **CorpID**: 企业ID
   - **AgentID**: 应用ID
   - **Secret**: 应用密钥

### 2. 配置可信域名

在应用设置中配置可信域名：
- **域名**: `your-domain.com`
- **验证文件**: 下载验证文件并放置在网站根目录

### 3. 设置应用权限

- **可见范围**: 设置可使用应用的用户
- **功能权限**: 开启所需的API权限

## 域名和SSL配置

### 1. 域名解析

将域名解析到服务器IP：

```
A记录: your-domain.com → 服务器IP
```

### 2. SSL证书获取

#### 使用Let's Encrypt免费证书

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet
```

#### 使用自签名证书（仅测试）

```bash
# 生成私钥
openssl genrsa -out ca/key.pem 2048

# 生成证书
openssl req -new -x509 -key ca/key.pem -out ca/cert.pem -days 365
```

## 监控和维护

### 1. 系统监控

```bash
# 查看应用状态
ps aux | grep gunicorn

# 查看端口占用
netstat -tlnp | grep :5000

# 查看系统资源
htop
df -h
```

### 2. 日志管理

```bash
# 查看应用日志
tail -f backend/logs/app.log

# 查看Nginx日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 查看系统日志
sudo journalctl -f
```

### 3. 数据备份

```bash
# 备份数据库
cp backend/instance/attendance.db backup/attendance_$(date +%Y%m%d).db

# 备份上传文件
tar -czf backup/uploads_$(date +%Y%m%d).tar.gz backend/uploads/

# 自动备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p backup
cp backend/instance/attendance.db backup/attendance_$DATE.db
tar -czf backup/uploads_$DATE.tar.gz backend/uploads/
# 删除7天前的备份
find backup/ -name "*.db" -mtime +7 -delete
find backup/ -name "*.tar.gz" -mtime +7 -delete
```

## 故障排除

### 常见问题

#### 1. 服务无法启动

```bash
# 检查端口占用
sudo lsof -i :5000

# 检查Python环境
which python3
python3 --version

# 检查依赖
pip list
```

#### 2. 企业微信认证失败

- 检查CorpID、Secret、AgentID配置
- 确认可信域名设置正确
- 检查网络连接

#### 3. SSL证书问题

```bash
# 检查证书文件
ls -la ca/
openssl x509 -in ca/cert.pem -text -noout

# 测试SSL连接
openssl s_client -connect your-domain.com:443
```

#### 4. 数据库问题

```bash
# 检查数据库文件
ls -la backend/instance/
sqlite3 backend/instance/attendance.db ".tables"

# 重新初始化数据库
rm backend/instance/attendance.db
python backend/run.py
```

### 性能优化

#### 1. 应用优化

```bash
# 增加Gunicorn工作进程
gunicorn -w 8 -b 0.0.0.0:5000 app:app

# 使用更高性能的WSGI服务器
pip install uwsgi
uwsgi --http :5000 --wsgi-file app.py --callable app --processes 4 --threads 2
```

#### 2. 数据库优化

- 定期清理过期数据
- 添加数据库索引
- 考虑使用PostgreSQL或MySQL

#### 3. 静态文件优化

- 使用CDN加速静态资源
- 启用Gzip压缩
- 设置合适的缓存策略

## 安全建议

1. **定期更新系统和依赖包**
2. **使用强密码和密钥**
3. **限制服务器访问权限**
4. **启用防火墙**
5. **定期备份数据**
6. **监控系统日志**

## 联系支持

如遇到部署问题，请联系技术支持团队。