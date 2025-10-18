# 考勤签到系统 - Windows数据库初始化脚本
# 适用于 Windows Server 2016+ 或 Windows 10/11

param(
    [string]$MySQLRootPassword = "root123456",
    [string]$AppDBPassword = "attendance123456"
)

Write-Host "=== 考勤签到系统数据库初始化 ===" -ForegroundColor Green

# 检查是否以管理员权限运行
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "请以管理员权限运行此脚本" -ForegroundColor Red
    exit 1
}

# 检查MySQL是否已安装
$mysqlService = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue
if (-not $mysqlService) {
    Write-Host "MySQL服务未找到，正在安装MySQL..." -ForegroundColor Yellow
    
    # 尝试使用winget安装MySQL
    try {
        winget install Oracle.MySQL
        Write-Host "MySQL安装完成，请重新运行此脚本" -ForegroundColor Green
        exit 0
    }
    catch {
        Write-Host "自动安装MySQL失败，请手动下载安装：https://dev.mysql.com/downloads/mysql/" -ForegroundColor Red
        exit 1
    }
}

# 获取MySQL服务名称
$mysqlServiceName = $mysqlService.Name
Write-Host "找到MySQL服务: $mysqlServiceName" -ForegroundColor Green

# 启动MySQL服务
Write-Host "启动MySQL服务..." -ForegroundColor Yellow
try {
    Start-Service -Name $mysqlServiceName
    Set-Service -Name $mysqlServiceName -StartupType Automatic
    Write-Host "MySQL服务启动成功" -ForegroundColor Green
}
catch {
    Write-Host "MySQL服务启动失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 等待MySQL服务完全启动
Start-Sleep -Seconds 5

# 查找MySQL安装路径
$mysqlPaths = @(
    "C:\Program Files\MySQL\MySQL Server 8.4\bin",
    "C:\Program Files\MySQL\MySQL Server 8.0\bin",
    "C:\Program Files\MySQL\MySQL Server 9.0\bin",
    "C:\Program Files\MySQL\MySQL Server 9.4\bin"
)

$mysqlBinPath = $null
foreach ($path in $mysqlPaths) {
    if (Test-Path "$path\mysql.exe") {
        $mysqlBinPath = $path
        break
    }
}

if (-not $mysqlBinPath) {
    Write-Host "找不到MySQL安装路径，请手动添加MySQL bin目录到PATH环境变量" -ForegroundColor Red
    exit 1
}

# 临时添加MySQL到PATH
$env:PATH = "$mysqlBinPath;$env:PATH"
Write-Host "MySQL路径: $mysqlBinPath" -ForegroundColor Green

# 设置MySQL root密码
Write-Host "设置MySQL root密码..." -ForegroundColor Yellow
try {
    # 尝试无密码连接并设置密码
    $setPasswordCmd = "ALTER USER 'root'@'localhost' IDENTIFIED BY '$MySQLRootPassword'; FLUSH PRIVILEGES;"
    & "$mysqlBinPath\mysql.exe" -u root -e $setPasswordCmd 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "MySQL root密码设置成功" -ForegroundColor Green
    } else {
        # 如果失败，可能密码已经设置过了
        Write-Host "MySQL root密码可能已经设置，继续下一步..." -ForegroundColor Yellow
    }
}
catch {
    Write-Host "设置MySQL root密码时出现错误，继续下一步..." -ForegroundColor Yellow
}

# 创建数据库
Write-Host "创建attendance_system数据库..." -ForegroundColor Yellow
try {
    $createDBCmd = "CREATE DATABASE IF NOT EXISTS attendance_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    & "$mysqlBinPath\mysql.exe" -u root -p$MySQLRootPassword -e $createDBCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "数据库创建成功" -ForegroundColor Green
    } else {
        throw "数据库创建失败"
    }
}
catch {
    Write-Host "创建数据库失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 创建专用用户
Write-Host "创建attendance_user用户..." -ForegroundColor Yellow
try {
    $createUserCmd = @"
CREATE USER IF NOT EXISTS 'attendance_user'@'localhost' IDENTIFIED BY '$AppDBPassword';
GRANT ALL PRIVILEGES ON attendance_system.* TO 'attendance_user'@'localhost';
FLUSH PRIVILEGES;
"@
    & "$mysqlBinPath\mysql.exe" -u root -p$MySQLRootPassword -e $createUserCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "用户创建成功" -ForegroundColor Green
    } else {
        throw "用户创建失败"
    }
}
catch {
    Write-Host "创建用户失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 导入数据库结构和数据
$backupFile = "attendance_system_full_backup.sql"
if (Test-Path $backupFile) {
    Write-Host "导入数据库结构和数据..." -ForegroundColor Yellow
    try {
        & "$mysqlBinPath\mysql.exe" -u root -p$MySQLRootPassword attendance_system < $backupFile
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ 数据库导入成功！" -ForegroundColor Green
        } else {
            throw "数据库导入失败"
        }
    }
    catch {
        Write-Host "❌ 数据库导入失败: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ 找不到数据库备份文件: $backupFile" -ForegroundColor Red
    exit 1
}

# 验证数据库
Write-Host "验证数据库..." -ForegroundColor Yellow
try {
    & "$mysqlBinPath\mysql.exe" -u attendance_user -p$AppDBPassword -D attendance_system -e "SHOW TABLES;"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "数据库验证成功" -ForegroundColor Green
    } else {
        throw "数据库验证失败"
    }
}
catch {
    Write-Host "数据库验证失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 数据库初始化完成！" -ForegroundColor Green
Write-Host "数据库信息：" -ForegroundColor Cyan
Write-Host "  - 数据库名: attendance_system" -ForegroundColor White
Write-Host "  - 用户名: attendance_user" -ForegroundColor White
Write-Host "  - 密码: $AppDBPassword" -ForegroundColor White
Write-Host "  - 主机: localhost" -ForegroundColor White
Write-Host "  - 端口: 3306" -ForegroundColor White