# 深圳大学CAS统一身份认证模块

本模块基于深圳大学CAS接口文档实现，支持深圳大学统一身份认证登录功能。

## 功能特性

- 支持深圳大学CAS统一身份认证
- 支持XML和JSON格式的CAS响应解析
- 会话管理和自动过期清理
- HTTPS证书配置支持
- 用户类型自动识别
- RESTful API接口
- 开发/生产环境自动切换

## 快速开始

### 1. 开发环境启动
```bash
cd backend
python run.py
```
- 默认端口：5000
- 访问地址：https://localhost:5000
- 测试页面：https://localhost:5000/cas_test.html

### 2. 生产环境启动
```bash
cd backend
sudo python run.py --production
```
- 默认端口：443 (HTTPS标准端口)
- 访问地址：https://kpeak.szu.edu.cn
- 需要管理员权限绑定443端口

### 3. HTTP模式启动（仅用于功能测试）
```bash
cd backend
USE_HTTPS=false python run.py
```
- 默认端口：5000
- 访问地址：http://localhost:5000

### 4. 其他命令
```bash
python run.py init-db            # 初始化数据库
python run.py create-sample-data # 创建示例数据
python run.py shell              # 启动交互式shell
python run.py --help             # 查看帮助
```

## 环境变量配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `HOST` | `0.0.0.0` | 监听地址 |
| `PORT` | `5000` (开发) / `443` (生产) | 端口号 |
| `USE_HTTPS` | `false` | 是否启用HTTPS |
| `CAS_SERVICE_URL` | 自动设置 | CAS服务回调URL |
| `PRODUCTION` | `false` | 是否为生产环境 |

## 文件结构

backend/
├── cas_auth.py          # CAS认证核心模块
├── api/cas_api.py       # CAS API路由
├── config.py            # 配置文件
├── run.py               # 主启动脚本
└── app.py               # Flask应用

ca/
├── kpeak.szu.edu.cn-crt.pem    # SSL证书
├── kpeak.szu.edu.cn-key.pem    # SSL私钥
└── kpeak.szu.edu.cn-chain.pem  # 证书链

frontend/
└── cas_test.html        # CAS功能测试页面


## API接口

### CAS认证接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/cas/login` | GET | CAS登录入口 |
| `/cas/callback` | GET | CAS回调处理 |
| `/cas/logout` | POST | CAS登出 |
| `/cas/user` | GET | 获取当前用户信息 |
| `/cas/status` | GET | 获取登录状态 |
| `/cas/refresh` | POST | 刷新会话 |

### 用户信息字段

```json
{
  "username": "学工号",
  "name": "姓名",
  "alias": "别名",
  "org_dn": "组织DN",
  "container_id": "容器ID",
  "user_type": "用户类型"
}
```

## 部署说明

### 开发环境
1. 克隆项目到本地
2. 安装依赖：`pip install -r requirements.txt`
3. 启动服务：`python run.py`
4. 访问测试页面验证功能

### 生产环境
1. 将项目部署到 `kpeak.szu.edu.cn` 服务器
2. 确保SSL证书文件在 `ca/` 目录下
3. 使用管理员权限启动：`sudo python run.py --production`
4. 通过 `https://kpeak.szu.edu.cn` 访问

## 注意事项

1. **证书配置**：生产环境必须使用正确的SSL证书
2. **端口权限**：443端口需要管理员权限
3. **域名匹配**：证书域名必须与访问域名一致
4. **防火墙**：确保443端口对外开放

## 故障排除

### 常见问题

1. **证书错误**：确保证书文件存在且域名匹配
2. **端口占用**：检查443端口是否被其他服务占用
3. **权限不足**：使用sudo运行生产环境
4. **连接重置**：检查HTTPS配置和证书有效性

### 日志查看
服务启动时会显示详细的配置信息，包括：
- 运行模式（开发/生产）
- 端口和地址
- SSL证书路径
- CAS配置状态

## 技术支持

如有问题，请检查：
1. 配置文件是否正确
2. 证书文件是否存在
3. 网络连接是否正常
4. 日志输出的错误信息