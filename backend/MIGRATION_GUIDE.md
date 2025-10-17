
# 数据库迁移指南

## 1. 准备工作

### 安装MySQL服务器
```bash
# Windows (使用MySQL Installer)
下载并安装MySQL Community Server

# 或使用Docker
docker run --name mysql-attendance -e MYSQL_ROOT_PASSWORD=password -p 3306:3306 -d mysql:8.0
```

### 安装Python MySQL驱动
```bash
pip install PyMySQL mysqlclient
```

## 2. 配置环境变量

创建 `.env` 文件:
```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=attendance_system
```

## 3. 执行迁移

### 方法1: 使用迁移脚本
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
   mysql -u root -p attendance_system < mysql_schema.sql
   ```

3. 导出SQLite数据:
   ```bash
   sqlite3 instance/attendance.db .dump > sqlite_dump.sql
   ```

4. 转换并导入数据到MySQL

## 4. 更新应用配置

修改 `config.py` 中的数据库连接字符串，或设置环境变量:
```
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/attendance_system
```

## 5. 验证迁移

运行应用并检查:
- 数据库连接是否正常
- 所有表是否存在
- 数据是否完整
- 功能是否正常

## 6. 性能优化

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
