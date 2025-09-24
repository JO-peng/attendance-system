package main

import (
	"os"
)

// Config 应用配置
type Config struct {
	Domain      string
	HTTPPort    string
	HTTPSPort   string
	CertFile    string
	KeyFile     string
	DatabaseURL string
}

// GetConfig 获取应用配置
func GetConfig() *Config {
	config := &Config{
		Domain: "kpeak.szu.edu.cn",
		//Domain:      "172.31.171.241",
		//HTTPPort:    "80",
		HTTPSPort:   "443",
		CertFile:    "ca/kpeak.szu.edu.cn-crt.pem",
		KeyFile:     "ca/kpeak.szu.edu.cn-key.pem",
		DatabaseURL: "SZU:sd12#$@tcp(119.91.203.161:3306)/materisals?charset=utf8&parseTime=true&loc=Local",
	}

	// 从环境变量覆盖配置
	if domain := os.Getenv("DOMAIN"); domain != "" {
		config.Domain = domain
	}
	if httpPort := os.Getenv("HTTP_PORT"); httpPort != "" {
		config.HTTPPort = httpPort
	}
	if httpsPort := os.Getenv("HTTPS_PORT"); httpsPort != "" {
		config.HTTPSPort = httpsPort
	}
	if certFile := os.Getenv("CERT_FILE"); certFile != "" {
		config.CertFile = certFile
	}
	if keyFile := os.Getenv("KEY_FILE"); keyFile != "" {
		config.KeyFile = keyFile
	}
	if dbURL := os.Getenv("DATABASE_URL"); dbURL != "" {
		config.DatabaseURL = dbURL
	}

	return config
}
