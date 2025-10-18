# 考勤签到系统 - Windows服务器部署指南

## 概述

本指南将帮助您在远程Windows服务器上部署考勤签到系统，包括MySQL数据库和Flask应用程序的完整安装配置。

## 系统要求

- **操作系统**: Windows Server 2016+ 或 Windows 10/11
- **内存**: 至少 2GB RAM
- **存储**: 至少 10GB 可用空间
- **网络**: 能够访问互联网进行软件包下载
- **权限**: 管理员权限

## 部署步骤

### 第一步：准备服务器

1. **连接到服务器**
   - 使用远程桌面连接 (RDP)
   - 或使用PowerShell远程连接：
   ```powershell
   Enter-PSSession -ComputerName your-server-ip -Credential (Get-Credential)
   ```

2. **检查系统版本**
   ```powershell
   Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion
   ```

### 第二步：上传项目文件

1. **方法一：使用Git（推荐）**
   ```powershell
   # 安装Git（如果未安装）
   winget install Git.Git
   
   # 克隆项目到服务器
   git clone <your-repository-url> C:\attendance_system
   cd C:\attendance_system
   ```

2. **方法二：直接复制文件**
   - 通过远程桌面复制粘贴
   - 或使用PowerShell复制：
   ```powershell
   # 创建目录
   New-Item -ItemType Directory -Path "C:\attendance_system" -Force
   # 然后手动复制项目文件到该目录
   ```

### 第三步：安装MySQL数据库

1. **下载并安装MySQL**
   ```powershell
   # 方法一：使用winget安装
   winget install Oracle.MySQL
   
   # 方法二：手动下载安装
   # 访问 https://dev.mysql.com/downloads/mysql/ 下载MySQL安装包
   ```

2. **配置MySQL服务**
   ```powershell
   # 启动MySQL服务
   Start-Service MySQL84  # 版本号可能不同，请根据实际情况调整
   
   # 设置服务自动启动
   Set-Service -Name MySQL84 -StartupType Automatic
   ```

3. **初始化数据库**
   ```powershell
   # 进入部署目录
   cd C:\attendance_system\deployment
   
   # 运行数据库初始化脚本
   .\setup_database_windows.ps1
   ```

   这个脚本将：
   - 设置MySQL root密码为 `root123456`
   - 创建 `attendance_system` 数据库
   - 创建 `attendance_user` 用户
   - 导入数据库结构和数据

### 第四步：安装Python和应用程序

1. **安装Python**
   ```powershell
   # 使用winget安装Python
   winget install Python.Python.3.11
   
   # 验证安装
   python --version
   pip --version
   ```

2. **部署应用程序**
   ```powershell
   # 运行应用程序部署脚本
   .\setup_application_windows.ps1
   ```

   这个脚本将：
   - 创建虚拟环境
   - 安装Python依赖包
   - 配置环境变量
   - 创建Windows服务
   - 启动应用程序

### 第五步：配置IIS反向代理（可选但推荐）

1. **启用IIS功能**
   ```powershell
   # 启用IIS和相关功能
   Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole, IIS-WebServer, IIS-CommonHttpFeatures, IIS-HttpErrors, IIS-HttpLogging, IIS-RequestFiltering, IIS-StaticContent
   ```

2. **安装URL重写模块**
   - 下载并安装 URL Rewrite Module for IIS
   - 或使用Web Platform Installer安装

3. **配置反向代理**
   - 在IIS管理器中创建新站点
   - 配置反向代理规则指向 `http://localhost:5000`
   - 设置域名或IP地址

### 第六步：配置Windows防火墙

1. **开放必要端口**
   ```powershell
   # 开放HTTP端口
   New-NetFirewallRule -DisplayName "Allow HTTP" -Direction Inbound -Protocol TCP -LocalPort 80
   
   # 开放HTTPS端口
   New-NetFirewallRule -DisplayName "Allow HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443
   
   # 开放应用程序端口（如果直接访问）
   New-NetFirewallRule -DisplayName "Allow Flask App" -Direction Inbound -Protocol TCP -LocalPort 5000
   ```

## 验证部署

### 检查服务状态

1. **检查MySQL服务**
   ```powershell
   Get-Service MySQL84  # 版本号可能不同
   ```

2. **检查应用程序服务**
   ```powershell
   Get-Service AttendanceSystem
   ```

3. **检查IIS服务**
   ```powershell
   Get-Service W3SVC
   ```

### 测试数据库连接

```powershell
# 添加MySQL到PATH（如果需要）
$env:PATH += ";C:\Program Files\MySQL\MySQL Server 8.4\bin"

# 测试数据库连接
mysql -u attendance_user -pattendance123456 -D attendance_system -e "SHOW TABLES;"
```

### 测试应用程序

1. **本地测试**
   ```powershell
   # 使用PowerShell测试
   Invoke-WebRequest -Uri "http://localhost:5000" -Method GET
   
   # 或使用curl（如果已安装）
   curl http://localhost:5000
   ```

2. **通过IIS测试**
   ```powershell
   Invoke-WebRequest -Uri "http://your-server-ip" -Method GET
   ```

## 常用管理命令

### 应用程序管理

```powershell
# 查看应用状态
Get-Service AttendanceSystem

# 启动应用
Start-Service AttendanceSystem

# 停止应用
Stop-Service AttendanceSystem

# 重启应用
Restart-Service AttendanceSystem

# 查看应用日志
Get-EventLog -LogName Application -Source "AttendanceSystem" -Newest 50
```

### 数据库管理

```powershell
# 连接数据库
mysql -u attendance_user -pattendance123456 -D attendance_system

# 备份数据库
$date = Get-Date -Format "yyyyMMdd_HHmmss"
mysqldump -u root -proot123456 attendance_system > "backup_$date.sql"

# 恢复数据库
mysql -u root -proot123456 attendance_system < backup_file.sql
```

## 故障排除

### 常见问题

1. **应用无法启动**
   - 检查日志：`Get-EventLog -LogName Application -Source "AttendanceSystem" -Newest 50`
   - 检查配置文件：确保 `.env` 文件存在且配置正确
   - 检查权限：确保应用程序有访问文件和数据库的权限

2. **数据库连接失败**
   - 检查MySQL服务：`Get-Service MySQL84`
   - 验证用户权限：`mysql -u attendance_user -pattendance123456`
   - 检查Windows防火墙设置

3. **IIS 502错误**
   - 检查应用是否运行：`Get-Service AttendanceSystem`
   - 检查端口占用：`netstat -an | findstr :5000`
   - 检查IIS配置和URL重写规则

### 日志文件位置

- **应用日志**: Windows事件查看器 → Windows日志 → 应用程序
- **IIS日志**: `C:\inetpub\logs\LogFiles\W3SVC1\`
- **MySQL日志**: `C:\ProgramData\MySQL\MySQL Server 8.4\Data\*.err`
- **Python应用日志**: `C:\attendance_system\logs\` (如果配置了文件日志)

## 安全建议

1. **更改默认密码**
   - 修改MySQL root密码
   - 修改应用数据库用户密码
   - 更新 `.env` 文件中的 `SECRET_KEY`

2. **配置SSL证书**
   - 在IIS中配置SSL证书
   - 配置HTTPS重定向

3. **定期备份**
   - 使用Windows任务计划程序设置定时备份
   - 备份应用程序文件和数据库

4. **监控和日志**
   - 配置Windows事件日志
   - 设置性能监控

## 更新应用

1. **拉取最新代码**
   ```powershell
   cd C:\attendance_system
   git pull origin main
   ```

2. **更新依赖**
   ```powershell
   # 激活虚拟环境
   .\venv\Scripts\Activate.ps1
   
   # 更新依赖
   pip install -r requirements.txt
   ```

3. **重启服务**
   ```powershell
   Restart-Service AttendanceSystem
   ```

## 联系支持

如果在部署过程中遇到问题，请检查：
1. 系统日志和错误信息
2. 网络连接和防火墙设置
3. 文件权限和路径配置

---

**注意**: 请根据您的具体环境调整配置参数，特别是域名、IP地址和密码等信息。