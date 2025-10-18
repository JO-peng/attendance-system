
# 数据库迁移指南

## 1. 准备工作

### 安装MySQL服务器
```bash
# Windows (使用MySQL Installer)
下载并安装MySQL Community Server 9.4.0
# 推荐下载地址: https://dev.mysql.com/downloads/mysql/

# 或使用Docker
docker run --name mysql-attendance -e MYSQL_ROOT_PASSWORD=password -p 3306:3306 -d mysql:8.0
```

### 安装Python MySQL驱动
```bash
pip install PyMySQL mysqlclient
```

## 2. MySQL服务器配置

### 启动MySQL服务
```bash
# Windows服务方式
net start mysql84

# 或直接启动（如当前项目）
mysqld --datadir="C:\ProgramData\MySQL\MySQL Server 9.4\Data" --console
```

### 设置root密码和创建数据库
```sql
-- 设置root密码
ALTER USER 'root'@'localhost' IDENTIFIED BY 'root123456';

-- 创建数据库
CREATE DATABASE IF NOT EXISTS attendance_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建专用用户
CREATE USER 'attendance_user'@'localhost' IDENTIFIED BY 'attendance123456';
GRANT ALL PRIVILEGES ON attendance_system.* TO 'attendance_user'@'localhost';
FLUSH PRIVILEGES;
```

## 3. 执行迁移

### 方法1: 使用自动迁移脚本（推荐）
```bash
python migrate_to_mysql.py
```

### 方法2: 手动迁移
1. 创建MySQL数据库:
   ```sql
   CREATE DATABASE attendance_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. 执行建表语句:
   ```bash
   mysql -u attendance_user -p attendance_system < mysql_schema.sql
   ```

3. 使用迁移脚本导入数据:
   ```bash
   python migrate_to_mysql.py
   ```

## 4. 更新应用配置

### 修改config.py
```python
# 开发环境数据库 - 使用MySQL
SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://attendance_user:attendance123456@localhost:3306/attendance_system?charset=utf8mb4'

# 备用SQLite数据库配置（如果需要回退）
SQLITE_DATABASE_URI = 'sqlite:///' + os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance', 'attendance.db')
```

### 或使用环境变量
```bash
export DEV_DATABASE_URL="mysql+pymysql://attendance_user:attendance123456@localhost:3306/attendance_system?charset=utf8mb4"
```

## 5. 验证迁移

### 运行测试脚本
```bash
python test_mysql_integration.py
```

### 手动验证
```bash
# 检查数据库连接
python -c "from app import app, db; from sqlalchemy import text; app.app_context().push(); result = db.session.execute(text('SELECT VERSION()')); print('MySQL版本:', result.fetchone()[0])"

# 检查数据
mysql -u attendance_user -p"attendance123456" -e "USE attendance_system; SHOW TABLES; SELECT COUNT(*) FROM courses; SELECT COUNT(*) FROM user; SELECT COUNT(*) FROM attendance;"
```

## 6. MySQL数据库文件位置

### 与SQLite的区别
- **SQLite**: 数据存储在单个文件中 (`instance/attendance.db`)
- **MySQL**: 数据存储在MySQL服务器的数据目录中，不是单个文件

### MySQL数据文件位置
```
Windows默认位置: C:\ProgramData\MySQL\MySQL Server 9.4\Data\attendance_system\
包含文件:
├── attendance.ibd          # 考勤记录表数据
├── buildings.ibd           # 建筑表数据
├── courses.ibd             # 课程表数据
├── user.ibd                # 用户表数据
├── course_schedules.ibd    # 课程安排表数据
├── student_courses.ibd     # 学生课程关联表数据
├── feedback.ibd            # 反馈表数据
└── 其他系统文件...
```

## 7. MySQL可视化管理工具

### 推荐工具（类似SQLite Viewer）

#### 1. IDE内置MySQL插件（推荐）
```bash
# 在IDE中使用MySQL插件查看数据库
# 连接信息:
# Host: localhost
# Port: 3306
# Username: attendance_user
# Password: attendance123456
# Database: attendance_system
```

**IDE MySQL插件使用步骤：**
1. 在IDE中找到数据库插件或Database工具窗口
2. 添加新的MySQL数据源
3. 填写连接信息：
   - Host: localhost
   - Port: 3306
   - User: attendance_user
   - Password: attendance123456
   - Database: attendance_system
4. 测试连接并保存
5. 展开数据库结构，查看表和数据

#### 2. phpMyAdmin（Web界面）
```bash
# 安装: 下载phpMyAdmin或使用XAMPP
# 访问: http://localhost/phpmyadmin
# 登录: attendance_user / attendance123456
```

#### 3. DBeaver（通用数据库工具）
```bash
# 下载地址: https://dbeaver.io/
# 特点: 支持多种数据库、免费、功能强大
```

#### 4. Navicat（商业软件）
```bash
# 下载地址: https://www.navicat.com/
# 特点: 界面友好、功能全面（需付费）
```

## 8. 性能优化

### 建议的MySQL配置
```ini
[mysqld]
innodb_buffer_pool_size = 256M
innodb_log_file_size = 64M
max_connections = 200
query_cache_size = 32M
```

### 索引优化
- 为经常查询的字段添加索引
- 定期分析表性能
- 使用EXPLAIN分析查询计划

## 7. 备份策略

### 定期备份
```bash
# 每日备份
mysqldump -u root -p attendance_system > backup_$(date +%Y%m%d).sql

# 增量备份
mysqlbinlog --start-datetime="2024-01-01 00:00:00" /var/log/mysql/mysql-bin.000001
```

## 8. 监控和维护

- 监控数据库性能
- 定期清理日志
- 更新统计信息
- 检查表完整性

## 注意事项

1. **字符集**: 确保使用utf8mb4字符集支持emoji等特殊字符
2. **时区**: 注意MySQL和应用的时区设置
3. **连接池**: 生产环境建议使用连接池
4. **安全性**: 设置强密码，限制访问权限
5. **备份**: 迁移前务必备份原数据
