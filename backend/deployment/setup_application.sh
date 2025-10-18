#!/bin/bash

# 考勤签到系统 - 应用程序部署脚本
# 适用于 Ubuntu/Debian 系统

set -e

echo "=== 考勤签到系统应用程序部署 ==="

# 检查是否以root权限运行
if [ "$EUID" -ne 0 ]; then
    echo "请使用 sudo 运行此脚本"
    exit 1
fi

# 更新系统包
echo "更新系统包..."
apt update

# 安装Python和pip
echo "安装Python和相关工具..."
apt install -y python3 python3-pip python3-venv git

# 安装系统依赖
echo "安装系统依赖..."
apt install -y build-essential libmysqlclient-dev pkg-config

# 创建应用目录
APP_DIR="/opt/attendance_system"
echo "创建应用目录: $APP_DIR"
mkdir -p $APP_DIR
cd $APP_DIR

# 克隆代码（如果还没有）
if [ ! -d ".git" ]; then
    echo "请手动将代码复制到 $APP_DIR 目录"
    echo "或者使用: git clone <your-repo-url> ."
fi

# 创建虚拟环境
echo "创建Python虚拟环境..."
python3 -m venv venv
source venv/bin/activate

# 安装Python依赖
echo "安装Python依赖..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    echo "安装基础依赖..."
    pip install flask flask-sqlalchemy pymysql flask-cors python-dotenv
fi

# 创建配置文件
echo "创建配置文件..."
cat > .env << EOF
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=attendance_user
DB_PASSWORD=attendance123456
DB_NAME=attendance_system

# Flask配置
FLASK_ENV=production
SECRET_KEY=your-secret-key-change-this-in-production
EOF

# 设置权限
echo "设置文件权限..."
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR

# 创建systemd服务文件
echo "创建systemd服务..."
cat > /etc/systemd/system/attendance-system.service << EOF
[Unit]
Description=Attendance System Flask App
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=$APP_DIR
Environment=PATH=$APP_DIR/venv/bin
ExecStart=$APP_DIR/venv/bin/python run.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 重新加载systemd并启动服务
echo "启动应用服务..."
systemctl daemon-reload
systemctl enable attendance-system
systemctl start attendance-system

# 检查服务状态
echo "检查服务状态..."
systemctl status attendance-system --no-pager

echo "🎉 应用程序部署完成！"
echo "服务信息："
echo "  - 服务名: attendance-system"
echo "  - 应用目录: $APP_DIR"
echo "  - 默认端口: 5000"
echo ""
echo "管理命令："
echo "  - 查看状态: sudo systemctl status attendance-system"
echo "  - 启动服务: sudo systemctl start attendance-system"
echo "  - 停止服务: sudo systemctl stop attendance-system"
echo "  - 重启服务: sudo systemctl restart attendance-system"
echo "  - 查看日志: sudo journalctl -u attendance-system -f"