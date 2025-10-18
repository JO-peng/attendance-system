# Windows服务配置指南

本文档详细说明如何将考勤签到系统配置为Windows服务，实现开机自启动和后台运行。

## 方法一：使用NSSM（推荐）

### 1. 下载和安装NSSM

NSSM (Non-Sucking Service Manager) 是一个免费的Windows服务管理工具。

1. 访问 [NSSM官网](https://nssm.cc/download) 下载最新版本
2. 解压到 `C:\nssm` 目录
3. 将 `C:\nssm\win64` 添加到系统PATH环境变量

### 2. 创建服务

打开管理员权限的命令提示符或PowerShell，执行以下命令：

```powershell
# 安装服务
nssm install AttendanceSystem

# 配置服务参数
nssm set AttendanceSystem Application "C:\attendance_system\venv\Scripts\python.exe"
nssm set AttendanceSystem AppParameters "C:\attendance_system\app.py"
nssm set AttendanceSystem AppDirectory "C:\attendance_system"
nssm set AttendanceSystem DisplayName "考勤签到系统"
nssm set AttendanceSystem Description "考勤签到系统Web应用服务"
nssm set AttendanceSystem Start SERVICE_AUTO_START

# 配置日志
nssm set AttendanceSystem AppStdout "C:\attendance_system\logs\app.log"
nssm set AttendanceSystem AppStderr "C:\attendance_system\logs\error.log"

# 配置服务重启策略
nssm set AttendanceSystem AppRestartDelay 5000
nssm set AttendanceSystem AppThrottle 1500
```

### 3. 管理服务

```powershell
# 启动服务
nssm start AttendanceSystem

# 停止服务
nssm stop AttendanceSystem

# 重启服务
nssm restart AttendanceSystem

# 查看服务状态
nssm status AttendanceSystem

# 删除服务
nssm remove AttendanceSystem confirm
```

### 4. 使用Windows服务管理器

也可以通过Windows服务管理器管理服务：

1. 按 `Win + R`，输入 `services.msc`
2. 找到"考勤签到系统"服务
3. 右键选择启动、停止、重启等操作

## 方法二：使用Windows Task Scheduler

### 1. 创建启动任务

1. 打开任务计划程序 (`taskschd.msc`)
2. 点击"创建基本任务"
3. 设置任务名称："考勤签到系统"
4. 触发器选择："当计算机启动时"
5. 操作选择："启动程序"
6. 程序/脚本：`C:\attendance_system\start_app.bat`
7. 起始于：`C:\attendance_system`

### 2. 高级配置

在任务属性中进行高级配置：

- **常规**选项卡：
  - 勾选"不管用户是否登录都要运行"
  - 勾选"使用最高权限运行"

- **触发器**选项卡：
  - 延迟任务时间：30秒（等待系统完全启动）

- **设置**选项卡：
  - 勾选"允许按需运行任务"
  - 勾选"如果请求后任务还在运行，强行将其停止"

## 方法三：使用Python服务包装器

### 1. 安装pywin32

```powershell
cd C:\attendance_system
.\venv\Scripts\Activate.ps1
pip install pywin32
```

### 2. 创建服务脚本

创建 `service.py` 文件：

```python
import win32serviceutil
import win32service
import win32event
import socket
import sys
import os
import subprocess

class AttendanceService(win32serviceutil.ServiceFramework):
    _svc_name_ = "AttendanceSystem"
    _svc_display_name_ = "考勤签到系统"
    _svc_description_ = "考勤签到系统Web应用服务"

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
        socket.setdefaulttimeout(60)
        self.process = None

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        if self.process:
            self.process.terminate()
        win32event.SetEvent(self.hWaitStop)

    def SvcDoRun(self):
        import servicemanager
        servicemanager.LogMsg(servicemanager.EVENTLOG_INFORMATION_TYPE,
                              servicemanager.PYS_SERVICE_STARTED,
                              (self._svc_name_, ''))
        
        # 切换到应用目录
        os.chdir(r'C:\attendance_system')
        
        # 启动Flask应用
        python_exe = r'C:\attendance_system\venv\Scripts\python.exe'
        app_script = r'C:\attendance_system\app.py'
        
        self.process = subprocess.Popen([python_exe, app_script])
        
        # 等待停止信号
        win32event.WaitForSingleObject(self.hWaitStop, win32event.INFINITE)

if __name__ == '__main__':
    win32serviceutil.HandleCommandLine(AttendanceService)
```

### 3. 安装和管理服务

```powershell
# 安装服务
python service.py install

# 启动服务
python service.py start

# 停止服务
python service.py stop

# 删除服务
python service.py remove
```

## 日志管理

### 1. 创建日志目录

```powershell
New-Item -ItemType Directory -Path "C:\attendance_system\logs" -Force
```

### 2. 配置日志轮转

创建日志轮转脚本 `rotate_logs.ps1`：

```powershell
$logPath = "C:\attendance_system\logs"
$maxSize = 10MB
$maxFiles = 5

Get-ChildItem "$logPath\*.log" | ForEach-Object {
    if ($_.Length -gt $maxSize) {
        for ($i = $maxFiles; $i -gt 1; $i--) {
            $oldFile = "$($_.BaseName).$($i-1).log"
            $newFile = "$($_.BaseName).$i.log"
            if (Test-Path "$logPath\$oldFile") {
                Move-Item "$logPath\$oldFile" "$logPath\$newFile" -Force
            }
        }
        Move-Item $_.FullName "$logPath\$($_.BaseName).1.log" -Force
        New-Item -ItemType File -Path $_.FullName -Force
    }
}
```

### 3. 设置定时任务执行日志轮转

在任务计划程序中创建每日执行的日志轮转任务。

## 监控和维护

### 1. 健康检查脚本

创建 `health_check.ps1`：

```powershell
$appUrl = "http://localhost:5000"
$serviceName = "AttendanceSystem"

try {
    $response = Invoke-WebRequest -Uri $appUrl -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ 应用运行正常" -ForegroundColor Green
    } else {
        Write-Host "❌ 应用响应异常: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ 应用无法访问: $($_.Exception.Message)" -ForegroundColor Red
    
    # 尝试重启服务
    Write-Host "尝试重启服务..." -ForegroundColor Yellow
    Restart-Service $serviceName -Force
}

# 检查服务状态
$service = Get-Service $serviceName -ErrorAction SilentlyContinue
if ($service -and $service.Status -eq "Running") {
    Write-Host "✅ 服务运行正常" -ForegroundColor Green
} else {
    Write-Host "❌ 服务未运行" -ForegroundColor Red
}
```

### 2. 性能监控

使用Windows性能监视器监控以下指标：

- CPU使用率
- 内存使用量
- 网络连接数
- 磁盘I/O

### 3. 自动重启策略

在服务属性中配置恢复选项：

1. 第一次失败：重新启动服务
2. 第二次失败：重新启动服务
3. 后续失败：重新启动服务
4. 重置失败计数：1天
5. 重新启动服务：延迟1分钟

## 故障排除

### 常见问题

1. **服务无法启动**
   - 检查Python路径是否正确
   - 检查应用目录权限
   - 查看Windows事件日志

2. **应用无法访问**
   - 检查防火墙设置
   - 检查端口占用情况
   - 检查应用日志

3. **数据库连接失败**
   - 检查MySQL服务状态
   - 检查数据库配置
   - 检查网络连接

### 日志位置

- Windows事件日志：事件查看器 → Windows日志 → 应用程序
- 应用日志：`C:\attendance_system\logs\app.log`
- 错误日志：`C:\attendance_system\logs\error.log`
- IIS日志：`C:\inetpub\logs\LogFiles\`

## 安全建议

1. **服务账户**
   - 使用专用服务账户运行服务
   - 限制账户权限

2. **文件权限**
   - 限制应用目录访问权限
   - 保护配置文件

3. **网络安全**
   - 配置防火墙规则
   - 使用HTTPS
   - 限制访问IP

4. **定期维护**
   - 定期更新系统补丁
   - 定期备份数据
   - 监控系统日志