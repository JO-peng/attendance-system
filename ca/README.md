# SSL证书配置说明

此文件夹用于存放SSL证书文件，以支持HTTPS访问。

## 证书文件要求

请将以下证书文件放置在此目录中：

1. **cert.pem** - SSL证书文件
2. **key.pem** - 私钥文件

## 证书获取方式

### 1. 从证书颁发机构获取
- 向可信的证书颁发机构（如Let's Encrypt、DigiCert等）申请证书
- 确保证书域名为 `kpeak.szu.edu.cn`

### 2. 自签名证书（仅用于测试）
```bash
# 生成私钥
openssl genrsa -out key.pem 2048

# 生成证书签名请求
openssl req -new -key key.pem -out cert.csr

# 生成自签名证书
openssl x509 -req -days 365 -in cert.csr -signkey key.pem -out cert.pem
```

## 文件权限
确保证书文件具有适当的权限：
- cert.pem: 644 (可读)
- key.pem: 600 (仅所有者可读)

## 配置验证
证书配置完成后，应用将自动使用HTTPS协议在443端口运行。

## 注意事项
- 请勿将私钥文件提交到版本控制系统
- 定期更新证书以确保安全性
- 确保证书域名与访问域名一致