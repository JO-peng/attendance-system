package main

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	"materials/handlers"
	"materials/utils"

	"github.com/gin-gonic/gin"
)

func main() {
	// 获取配置
	config := GetConfig()

	// 初始化数据库
	utils.InitDB()

	// 初始化CAS认证系统
	serviceURL := fmt.Sprintf("https://%s", config.Domain)
	handlers.InitAuth(serviceURL)

	// 创建Gin路由器
	r := gin.Default()

	// 认证路由（不需要认证）
	r.GET("/login", handlers.Login)
	r.GET("/logout", handlers.Logout)
	r.GET("/cas/callback", handlers.CASCallback)

	// 应用认证中间件
	r.Use(handlers.AuthMiddleware())

	// 设置静态文件服务（添加缓存控制）
	r.Static("/static", "./static")

	// 为静态文件添加缓存控制头
	r.Use(func(c *gin.Context) {
		path := c.Request.URL.Path
		if strings.HasPrefix(path, "/static/") {
			// 对于CSS和JS文件，设置较短的缓存时间
			if strings.HasSuffix(path, ".css") ||
				strings.HasSuffix(path, ".js") {
				c.Header("Cache-Control", "no-cache, must-revalidate")
				c.Header("Pragma", "no-cache")
				c.Header("Expires", "0")
			}
		}
		// 对于HTML页面也设置无缓存
		if path == "/" || path == "/stats" || path == "/test" ||
			strings.HasSuffix(path, ".html") {
			c.Header("Cache-Control", "no-cache, must-revalidate")
			c.Header("Pragma", "no-cache")
			c.Header("Expires", "0")
		}
		c.Next()
	})

	r.StaticFile("/", "./static/index.html")
	r.StaticFile("/stats", "./static/stats.html")
	r.StaticFile("/test", "./test_stats.html")

	// API路由
	api := r.Group("/api")
	{
		// 用户认证相关（不需要额外认证）
		api.GET("/current-user", handlers.GetCurrentUser)

		// 扫码相关（需要认证）
		api.POST("/scan-qrcode", handlers.RequireAuth(), handlers.ScanQRCode)
		api.POST("/manual-lookup", handlers.RequireAuth(), handlers.ManualLookup)
		api.POST("/confirm-receive", handlers.RequireAuth(), handlers.ConfirmReceive)

		// 企业微信相关（需要认证）
		api.GET("/wework-config", handlers.RequireAuth(), handlers.GetWeworkConfig)
		api.POST("/wework-config-signature", handlers.RequireAuth(), handlers.GetWeWorkConfigSignature)

		// 管理功能（需要认证）
		api.GET("/admin/records", handlers.RequireAuth(), handlers.GetAllRecords)
		api.GET("/admin/stats", handlers.RequireAuth(), handlers.GetReceiveStats)
		api.GET("/admin/handler-stats", handlers.RequireAuth(), handlers.GetHandlerStats)
		api.GET("/admin/user/:cardNumber", handlers.RequireAuth(), handlers.GetUserRecord)
		api.GET("/admin/export", handlers.RequireAuth(), handlers.ExportRecords)

		// 个人记录查询（需要认证）
		api.GET("/my-recent-records", handlers.RequireAuth(), handlers.GetMyRecentRecords)
	}

	// 同时启动HTTP和HTTPS服务器
	go func() {
		log.Printf("HTTP服务器启动在端口 %s", config.HTTPPort)
		log.Printf("HTTP访问地址: http://%s", config.Domain)
		log.Println("注意: HTTP版本无法使用摄像头功能，建议使用HTTPS")
		if err := http.ListenAndServe(":"+config.HTTPPort, r); err != nil {
			log.Printf("HTTP服务器启动失败: %v", err)
		}
	}()

	log.Printf("HTTPS服务器启动在端口 %s", config.HTTPSPort)
	log.Fatal(http.ListenAndServeTLS(":"+config.HTTPSPort, config.CertFile, config.KeyFile, r))
}
