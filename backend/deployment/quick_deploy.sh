#!/bin/bash

# 考勤签到系统 - 一键部署脚本
# 适用于 Ubuntu/Debian 系统

set -e

echo "🚀 考勤签到系统一键部署开始..."
echo "=================================="

# 检查是否以root权限运行
if [ "$EUID" -ne 0 ]; then
    echo "❌ 请使用 sudo 运行此脚本"
    exit 1
fi

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="/opt/attendance_system"

echo "📁 脚本目录: $SCRIPT_DIR"
echo "📁 应用目录: $APP_DIR"

# 检查必要文件是否存在
if [ ! -f "$SCRIPT_DIR/attendance_system_full_backup.sql" ]; then
    echo "❌ 找不到数据库备份文件: attendance_system_full_backup.sql"
    echo "请确保该文件在 deployment 目录中"
    exit 1
fi

# 创建应用目录并复制文件
echo "📂 准备应用目录..."
mkdir -p $APP_DIR
cp -r $SCRIPT_DIR/../* $APP_DIR/
cd $APP_DIR

# 步骤1: 数据库初始化
echo ""
echo "🗄️  步骤1: 初始化数据库..."
echo "=================================="
bash $APP_DIR/deployment/setup_database.sh

# 步骤2: 应用程序部署
echo ""
echo "🐍 步骤2: 部署应用程序..."
echo "=================================="
bash $APP_DIR/deployment/setup_application.sh

# 步骤3: 配置Nginx（可选）
echo ""
echo "🌐 步骤3: 配置Nginx..."
echo "=================================="
read -p "是否要安装和配置Nginx? (y/n): " install_nginx

if [ "$install_nginx" = "y" ] || [ "$install_nginx" = "Y" ]; then
    echo "安装Nginx..."
    apt install -y nginx
    
    # 复制Nginx配置
    cp $APP_DIR/deployment/nginx.conf /etc/nginx/sites-available/attendance_system
    
    # 提示用户编辑配置
    echo "⚠️  请编辑Nginx配置文件，修改server_name为您的域名或IP:"
    echo "   sudo nano /etc/nginx/sites-available/attendance_system"
    read -p "配置完成后按回车继续..."
    
    # 启用站点
    ln -sf /etc/nginx/sites-available/attendance_system /etc/nginx/sites-enabled/
    nginx -t
    systemctl restart nginx
    systemctl enable nginx
    
    echo "✅ Nginx配置完成"
else
    echo "⏭️  跳过Nginx配置"
fi

# 步骤4: 配置防火墙
echo ""
echo "🔥 步骤4: 配置防火墙..."
echo "=================================="
read -p "是否要配置UFW防火墙? (y/n): " config_firewall

if [ "$config_firewall" = "y" ] || [ "$config_firewall" = "Y" ]; then
    ufw allow 22    # SSH
    ufw allow 80    # HTTP
    ufw allow 443   # HTTPS
    ufw --force enable
    echo "✅ 防火墙配置完成"
else
    echo "⏭️  跳过防火墙配置"
fi

# 最终验证
echo ""
echo "🔍 最终验证..."
echo "=================================="

# 检查服务状态
echo "检查MySQL服务..."
systemctl is-active --quiet mysql && echo "✅ MySQL服务运行正常" || echo "❌ MySQL服务异常"

echo "检查应用服务..."
systemctl is-active --quiet attendance-system && echo "✅ 应用服务运行正常" || echo "❌ 应用服务异常"

if systemctl is-active --quiet nginx; then
    echo "✅ Nginx服务运行正常"
fi

# 测试数据库连接
echo "测试数据库连接..."
if mysql -u attendance_user -pattendance123456 -D attendance_system -e "SELECT COUNT(*) FROM user;" > /dev/null 2>&1; then
    echo "✅ 数据库连接正常"
else
    echo "❌ 数据库连接异常"
fi

# 测试应用程序
echo "测试应用程序..."
sleep 3  # 等待服务完全启动
if curl -s http://localhost:5000 > /dev/null; then
    echo "✅ 应用程序响应正常"
else
    echo "❌ 应用程序响应异常"
fi

echo ""
echo "🎉 部署完成！"
echo "=================================="
echo "📊 系统信息:"
echo "  - 应用目录: $APP_DIR"
echo "  - 数据库: attendance_system"
echo "  - 数据库用户: attendance_user"
echo "  - 应用端口: 5000"

if systemctl is-active --quiet nginx; then
    echo "  - Web端口: 80 (通过Nginx)"
fi

echo ""
echo "🔧 管理命令:"
echo "  - 查看应用状态: sudo systemctl status attendance-system"
echo "  - 查看应用日志: sudo journalctl -u attendance-system -f"
echo "  - 重启应用: sudo systemctl restart attendance-system"
echo "  - 数据库连接: mysql -u attendance_user -pattendance123456 -D attendance_system"

echo ""
echo "🌐 访问地址:"
if systemctl is-active --quiet nginx; then
    echo "  - http://$(hostname -I | awk '{print $1}')"
else
    echo "  - http://$(hostname -I | awk '{print $1}'):5000"
fi

echo ""
echo "⚠️  安全提醒:"
echo "  1. 请及时修改默认密码"
echo "  2. 配置SSL证书（如果需要HTTPS）"
echo "  3. 定期备份数据库"
echo "  4. 监控系统日志"

echo ""
echo "✨ 部署成功完成！"