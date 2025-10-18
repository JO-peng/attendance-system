# 考勤签到系统 - Windows一键部署脚本
# 适用于 Windows Server 2016+ 或 Windows 10/11

param(
    [string]$AppPath = "C:\attendance_system",
    [string]$MySQLRootPassword = "root123456",
    [string]$AppDBPassword = "attendance123456",
    [string]$FlaskSecretKey = "your-secret-key-change-this-in-production-$(Get-Random)"
)

Write-Host "=== 考勤签到系统一键部署 ===" -ForegroundColor Green
Write-Host "目标路径: $AppPath" -ForegroundColor Cyan

# 检查是否以管理员权限运行
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ 请以管理员权限运行此脚本" -ForegroundColor Red
    Write-Host "右键点击PowerShell，选择'以管理员身份运行'" -ForegroundColor Yellow
    Read-Host "按任意键退出"
    exit 1
}

# 检查数据库备份文件
$backupFile = "attendance_system_full_backup.sql"
if (-not (Test-Path $backupFile)) {
    Write-Host "❌ 找不到数据库备份文件: $backupFile" -ForegroundColor Red
    Write-Host "请确保在包含数据库备份文件的目录中运行此脚本" -ForegroundColor Yellow
    Read-Host "按任意键退出"
    exit 1
}

Write-Host "✅ 找到数据库备份文件" -ForegroundColor Green

# 步骤1: 数据库初始化
Write-Host ""
Write-Host "📊 步骤1: 初始化数据库..." -ForegroundColor Cyan
try {
    & ".\setup_database_windows.ps1" -MySQLRootPassword $MySQLRootPassword -AppDBPassword $AppDBPassword
    if ($LASTEXITCODE -ne 0) {
        throw "数据库初始化失败"
    }
    Write-Host "✅ 数据库初始化完成" -ForegroundColor Green
}
catch {
    Write-Host "❌ 数据库初始化失败: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "按任意键退出"
    exit 1
}

# 步骤2: 应用部署
Write-Host ""
Write-Host "🚀 步骤2: 部署应用..." -ForegroundColor Cyan
try {
    & ".\setup_application_windows.ps1" -AppPath $AppPath -DBPassword $AppDBPassword -FlaskSecretKey $FlaskSecretKey
    if ($LASTEXITCODE -ne 0) {
        throw "应用部署失败"
    }
    Write-Host "✅ 应用部署完成" -ForegroundColor Green
}
catch {
    Write-Host "❌ 应用部署失败: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "按任意键退出"
    exit 1
}

# 步骤3: 验证部署
Write-Host ""
Write-Host "🔍 步骤3: 验证部署..." -ForegroundColor Cyan

# 验证MySQL服务
Write-Host "检查MySQL服务..." -ForegroundColor Yellow
$mysqlService = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue
if ($mysqlService -and $mysqlService.Status -eq "Running") {
    Write-Host "✅ MySQL服务运行正常" -ForegroundColor Green
} else {
    Write-Host "❌ MySQL服务未运行" -ForegroundColor Red
}

# 验证应用文件
Write-Host "检查应用文件..." -ForegroundColor Yellow
if (Test-Path "$AppPath\app.py") {
    Write-Host "✅ 应用文件存在" -ForegroundColor Green
} else {
    Write-Host "❌ 应用文件不存在" -ForegroundColor Red
}

# 验证虚拟环境
Write-Host "检查Python虚拟环境..." -ForegroundColor Yellow
if (Test-Path "$AppPath\venv\Scripts\python.exe") {
    Write-Host "✅ Python虚拟环境创建成功" -ForegroundColor Green
} else {
    Write-Host "❌ Python虚拟环境创建失败" -ForegroundColor Red
}

# 验证配置文件
Write-Host "检查配置文件..." -ForegroundColor Yellow
if (Test-Path "$AppPath\.env") {
    Write-Host "✅ 配置文件存在" -ForegroundColor Green
} else {
    Write-Host "❌ 配置文件不存在" -ForegroundColor Red
}

# 测试数据库连接
Write-Host "测试数据库连接..." -ForegroundColor Yellow
try {
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

    if ($mysqlBinPath) {
        & "$mysqlBinPath\mysql.exe" -u attendance_user -p$AppDBPassword -D attendance_system -e "SELECT 1;" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ 数据库连接测试成功" -ForegroundColor Green
        } else {
            Write-Host "❌ 数据库连接测试失败" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️  无法找到MySQL客户端，跳过连接测试" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❌ 数据库连接测试失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 部署完成信息
Write-Host ""
Write-Host "🎉 部署完成！" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "📋 系统信息：" -ForegroundColor Cyan
Write-Host "  操作系统: $((Get-WmiObject Win32_OperatingSystem).Caption)" -ForegroundColor White
Write-Host "  PowerShell版本: $($PSVersionTable.PSVersion)" -ForegroundColor White
Write-Host "  部署时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White

Write-Host ""
Write-Host "🗂️  文件位置：" -ForegroundColor Cyan
Write-Host "  应用目录: $AppPath" -ForegroundColor White
Write-Host "  配置文件: $AppPath\.env" -ForegroundColor White
Write-Host "  启动脚本: $AppPath\start_app.bat" -ForegroundColor White
Write-Host "  服务配置: $AppPath\service_setup.txt" -ForegroundColor White

Write-Host ""
Write-Host "🔧 管理命令：" -ForegroundColor Cyan
Write-Host "  启动应用: cd $AppPath && .\start_app.bat" -ForegroundColor White
Write-Host "  检查MySQL: Get-Service MySQL*" -ForegroundColor White
Write-Host "  查看日志: Get-Content $AppPath\app.log -Tail 50" -ForegroundColor White

Write-Host ""
Write-Host "🌐 访问地址：" -ForegroundColor Cyan
Write-Host "  本地访问: http://localhost:5000" -ForegroundColor White
Write-Host "  网络访问: http://$(hostname):5000" -ForegroundColor White

Write-Host ""
Write-Host "🔐 数据库信息：" -ForegroundColor Cyan
Write-Host "  数据库名: attendance_system" -ForegroundColor White
Write-Host "  用户名: attendance_user" -ForegroundColor White
Write-Host "  密码: $AppDBPassword" -ForegroundColor White
Write-Host "  主机: localhost" -ForegroundColor White
Write-Host "  端口: 3306" -ForegroundColor White

Write-Host ""
Write-Host "⚠️  安全提醒：" -ForegroundColor Yellow
Write-Host "  1. 请修改默认密码" -ForegroundColor White
Write-Host "  2. 配置防火墙规则" -ForegroundColor White
Write-Host "  3. 定期备份数据库" -ForegroundColor White
Write-Host "  4. 监控系统日志" -ForegroundColor White

Write-Host ""
Write-Host "📖 更多信息请参考: DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

Read-Host "按任意键退出"