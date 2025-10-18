#!/bin/bash

# 考勤签到系统 - 数据库初始化脚本
# 适用于 Ubuntu/Debian 系统

set -e

echo "=== 考勤签到系统数据库初始化 ==="

# 检查是否以root权限运行
if [ "$EUID" -ne 0 ]; then
    echo "请使用 sudo 运行此脚本"
    exit 1
fi

# 更新系统包
echo "更新系统包..."
apt update

# 安装MySQL服务器
echo "安装MySQL服务器..."
apt install -y mysql-server

# 启动MySQL服务
echo "启动MySQL服务..."
systemctl start mysql
systemctl enable mysql

# 设置MySQL root密码
echo "设置MySQL root密码..."
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root123456';"
mysql -e "FLUSH PRIVILEGES;"

# 创建数据库
echo "创建attendance_system数据库..."
mysql -u root -proot123456 -e "CREATE DATABASE IF NOT EXISTS attendance_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 创建专用用户
echo "创建attendance_user用户..."
mysql -u root -proot123456 -e "CREATE USER IF NOT EXISTS 'attendance_user'@'localhost' IDENTIFIED BY 'attendance123456';"
mysql -u root -proot123456 -e "GRANT ALL PRIVILEGES ON attendance_system.* TO 'attendance_user'@'localhost';"
mysql -u root -proot123456 -e "FLUSH PRIVILEGES;"

# 导入数据库结构和数据
echo "导入数据库结构和数据..."
if [ -f "attendance_system_full_backup.sql" ]; then
    mysql -u root -proot123456 attendance_system < attendance_system_full_backup.sql
    echo "✅ 数据库导入成功！"
else
    echo "❌ 找不到数据库备份文件 attendance_system_full_backup.sql"
    exit 1
fi

# 验证数据库
echo "验证数据库..."
mysql -u attendance_user -pattendance123456 -D attendance_system -e "SHOW TABLES;"

echo "🎉 数据库初始化完成！"
echo "数据库信息："
echo "  - 数据库名: attendance_system"
echo "  - 用户名: attendance_user"
echo "  - 密码: attendance123456"
echo "  - 主机: localhost"
echo "  - 端口: 3306"