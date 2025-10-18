# 考勤签到系统 - Windows应用部署脚本
# 适用于 Windows Server 2016+ 或 Windows 10/11

param(
    [string]$AppPath = "C:\attendance_system",
    [string]$DBHost = "localhost",
    [string]$DBPort = "3306",
    [string]$DBUser = "attendance_user",
    [string]$DBPassword = "attendance123456",
    [string]$DBName = "attendance_system",
    [string]$FlaskSecretKey = "your-secret-key-change-this-in-production"
)

Write-Host "=== 考勤签到系统应用部署 ===" -ForegroundColor Green

# 检查是否以管理员权限运行
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "请以管理员权限运行此脚本" -ForegroundColor Red
    exit 1
}

# 检查Python是否已安装
try {
    $pythonVersion = python --version 2>&1
    Write-Host "找到Python: $pythonVersion" -ForegroundColor Green
}
catch {
    Write-Host "Python未安装，正在安装Python..." -ForegroundColor Yellow
    try {
        winget install Python.Python.3.11
        Write-Host "Python安装完成，请重新运行此脚本" -ForegroundColor Green
        exit 0
    }
    catch {
        Write-Host "自动安装Python失败，请手动下载安装：https://www.python.org/downloads/" -ForegroundColor Red
        exit 1
    }
}

# 检查Git是否已安装
try {
    $gitVersion = git --version 2>&1
    Write-Host "找到Git: $gitVersion" -ForegroundColor Green
}
catch {
    Write-Host "Git未安装，正在安装Git..." -ForegroundColor Yellow
    try {
        winget install Git.Git
        Write-Host "Git安装完成" -ForegroundColor Green
    }
    catch {
        Write-Host "自动安装Git失败，请手动下载安装：https://git-scm.com/download/win" -ForegroundColor Red
    }
}

# 创建应用目录
Write-Host "创建应用目录: $AppPath" -ForegroundColor Yellow
if (-not (Test-Path $AppPath)) {
    New-Item -ItemType Directory -Path $AppPath -Force | Out-Null
    Write-Host "应用目录创建成功" -ForegroundColor Green
} else {
    Write-Host "应用目录已存在" -ForegroundColor Yellow
}

# 复制应用文件（假设当前目录包含应用代码）
Write-Host "复制应用文件..." -ForegroundColor Yellow
$sourceDir = Get-Location
$excludeItems = @(".git", "__pycache__", "*.pyc", "venv", ".env", "deployment")

try {
    # 复制所有文件，排除特定目录和文件
    Get-ChildItem -Path $sourceDir -Recurse | Where-Object {
        $relativePath = $_.FullName.Substring($sourceDir.Path.Length + 1)
        $shouldExclude = $false
        foreach ($exclude in $excludeItems) {
            if ($relativePath -like $exclude -or $relativePath.StartsWith($exclude.TrimEnd('*'))) {
                $shouldExclude = $true
                break
            }
        }
        -not $shouldExclude
    } | ForEach-Object {
        $destPath = $_.FullName.Replace($sourceDir.Path, $AppPath)
        $destDir = Split-Path $destPath -Parent
        
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        if (-not $_.PSIsContainer) {
            Copy-Item $_.FullName $destPath -Force
        }
    }
    Write-Host "应用文件复制成功" -ForegroundColor Green
}
catch {
    Write-Host "复制应用文件失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 进入应用目录
Set-Location $AppPath

# 创建虚拟环境
Write-Host "创建Python虚拟环境..." -ForegroundColor Yellow
try {
    python -m venv venv
    Write-Host "虚拟环境创建成功" -ForegroundColor Green
}
catch {
    Write-Host "创建虚拟环境失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 激活虚拟环境并安装依赖
Write-Host "安装Python依赖..." -ForegroundColor Yellow
try {
    & ".\venv\Scripts\Activate.ps1"
    
    # 升级pip
    python -m pip install --upgrade pip
    
    # 安装依赖
    if (Test-Path "requirements.txt") {
        pip install -r requirements.txt
    } else {
        # 如果没有requirements.txt，安装基本依赖
        pip install Flask Flask-SQLAlchemy PyMySQL python-dotenv
    }
    
    Write-Host "依赖安装成功" -ForegroundColor Green
}
catch {
    Write-Host "安装依赖失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 创建.env配置文件
Write-Host "创建配置文件..." -ForegroundColor Yellow
$envContent = @"
# 数据库配置
DB_HOST=$DBHost
DB_PORT=$DBPort
DB_USER=$DBUser
DB_PASSWORD=$DBPassword
DB_NAME=$DBName

# Flask配置
FLASK_ENV=production
SECRET_KEY=$FlaskSecretKey
DEBUG=False

# 应用配置
HOST=0.0.0.0
PORT=5000

# 时区配置
TIMEZONE=Asia/Shanghai
"@

try {
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "配置文件创建成功" -ForegroundColor Green
}
catch {
    Write-Host "创建配置文件失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 创建启动脚本
Write-Host "创建启动脚本..." -ForegroundColor Yellow
$startScript = @"
@echo off
cd /d "$AppPath"
call venv\Scripts\activate.bat
python app.py
"@

try {
    $startScript | Out-File -FilePath "start_app.bat" -Encoding ASCII
    Write-Host "启动脚本创建成功" -ForegroundColor Green
}
catch {
    Write-Host "创建启动脚本失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 创建Windows服务配置文件
Write-Host "创建Windows服务配置..." -ForegroundColor Yellow
$serviceScript = @"
# 安装NSSM (Non-Sucking Service Manager)
# 下载地址: https://nssm.cc/download

# 使用NSSM创建Windows服务的命令：
# nssm install AttendanceSystem
# nssm set AttendanceSystem Application "$AppPath\venv\Scripts\python.exe"
# nssm set AttendanceSystem AppParameters "$AppPath\app.py"
# nssm set AttendanceSystem AppDirectory "$AppPath"
# nssm set AttendanceSystem DisplayName "考勤签到系统"
# nssm set AttendanceSystem Description "考勤签到系统Web应用"
# nssm set AttendanceSystem Start SERVICE_AUTO_START

# 启动服务：
# nssm start AttendanceSystem

# 停止服务：
# nssm stop AttendanceSystem

# 删除服务：
# nssm remove AttendanceSystem confirm
"@

try {
    $serviceScript | Out-File -FilePath "service_setup.txt" -Encoding UTF8
    Write-Host "服务配置说明创建成功" -ForegroundColor Green
}
catch {
    Write-Host "创建服务配置失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 测试应用启动
Write-Host "测试应用启动..." -ForegroundColor Yellow
try {
    # 激活虚拟环境
    & ".\venv\Scripts\Activate.ps1"
    
    # 测试导入主要模块
    python -c "import flask; print('Flask导入成功')"
    python -c "import pymysql; print('PyMySQL导入成功')"
    
    Write-Host "应用依赖测试通过" -ForegroundColor Green
}
catch {
    Write-Host "应用测试失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "请检查依赖安装是否正确" -ForegroundColor Yellow
}

# 设置防火墙规则
Write-Host "配置Windows防火墙..." -ForegroundColor Yellow
try {
    # 允许端口5000入站
    New-NetFirewallRule -DisplayName "考勤系统-Flask" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow -ErrorAction SilentlyContinue
    
    # 允许端口80入站（如果使用IIS）
    New-NetFirewallRule -DisplayName "考勤系统-HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -ErrorAction SilentlyContinue
    
    Write-Host "防火墙规则配置成功" -ForegroundColor Green
}
catch {
    Write-Host "配置防火墙失败: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "请手动在Windows防火墙中开放端口5000和80" -ForegroundColor Yellow
}

Write-Host "🎉 应用部署完成！" -ForegroundColor Green
Write-Host ""
Write-Host "部署信息：" -ForegroundColor Cyan
Write-Host "  - 应用路径: $AppPath" -ForegroundColor White
Write-Host "  - 配置文件: $AppPath\.env" -ForegroundColor White
Write-Host "  - 启动脚本: $AppPath\start_app.bat" -ForegroundColor White
Write-Host "  - 服务配置: $AppPath\service_setup.txt" -ForegroundColor White
Write-Host ""
Write-Host "下一步操作：" -ForegroundColor Cyan
Write-Host "  1. 手动启动应用测试: .\start_app.bat" -ForegroundColor White
Write-Host "  2. 访问应用: http://localhost:5000" -ForegroundColor White
Write-Host "  3. 配置Windows服务（可选）: 参考 service_setup.txt" -ForegroundColor White
Write-Host "  4. 配置IIS反向代理（可选）" -ForegroundColor White