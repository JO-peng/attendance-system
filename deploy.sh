#!/bin/bash

# 深圳大学考勤签到系统部署脚本
# 使用方法: ./deploy.sh

set -e

echo "=== 深圳大学考勤签到系统部署脚本 ==="

# 检查Python版本
echo "检查Python版本..."
python3 --version

# 检查是否存在虚拟环境
if [ ! -d "venv" ]; then
    echo "创建Python虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "激活虚拟环境..."
source venv/bin/activate

# 升级pip
echo "升级pip..."
pip install --upgrade pip

# 安装依赖
echo "安装Python依赖..."
cd backend
pip install -r requirements.txt

# 检查环境变量配置
if [ ! -f ".env" ]; then
    echo "复制环境变量配置模板..."
    cp .env.example .env
    echo "请编辑 backend/.env 文件，填入正确的配置信息"
    echo "配置完成后，请重新运行此脚本"
    exit 1
fi

# 创建必要的目录
echo "创建必要的目录..."
mkdir -p uploads/photos
mkdir -p uploads/feedback
mkdir -p instance
mkdir -p logs

# 设置目录权限
echo "设置目录权限..."
chmod 755 uploads
chmod 755 uploads/photos
chmod 755 uploads/feedback
chmod 755 instance
chmod 755 logs

# 初始化数据库
echo "初始化数据库..."
python run.py --init-db

# 检查SSL证书
if [ -f "../ca/cert.pem" ] && [ -f "../ca/key.pem" ]; then
    echo "发现SSL证书，将使用HTTPS模式启动"
    SSL_MODE=true
else
    echo "未发现SSL证书，将使用HTTP模式启动"
    echo "如需HTTPS，请将证书文件放置在 ca/ 目录下："
    echo "  - ca/cert.pem (SSL证书)"
    echo "  - ca/key.pem (私钥文件)"
    SSL_MODE=false
fi

echo "=== 部署完成 ==="
echo ""
echo "启动服务："
echo "  开发模式: python run.py"
echo "  生产模式: gunicorn -w 4 -b 0.0.0.0:5000 app:app"
echo ""
echo "访问地址："
if [ "$SSL_MODE" = true ]; then
    echo "  HTTPS: https://your-domain.com"
else
    echo "  HTTP: http://your-domain.com:5000"
fi
echo ""
echo "配置文件："
echo "  环境变量: backend/.env"
echo "  SSL证书: ca/cert.pem, ca/key.pem"
echo ""
echo "日志文件："
echo "  应用日志: backend/logs/app.log"
echo ""
echo "数据库："
echo "  SQLite: backend/instance/attendance.db"