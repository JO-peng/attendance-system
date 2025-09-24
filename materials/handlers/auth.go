package handlers

import (
	"log"
	"net/http"

	"materials/auth"

	"github.com/gin-gonic/gin"
)

var (
	casClient      *auth.CASClient
	sessionManager *auth.SessionManager
)

// InitAuth 初始化认证系统
func InitAuth(serviceURL string) {
	// 初始化CAS客户端
	casConfig := &auth.CASConfig{
		ServerURL:    "https://authserver.szu.edu.cn/authserver",
		ServiceURL:   serviceURL,
		LoginPath:    "/login",
		LogoutPath:   "/logout",
		CallbackPath: "/cas/callback",
	}
	
	casClient = auth.NewCASClient(casConfig)
	sessionManager = auth.NewSessionManager(0) // 使用默认24小时超时
	
	log.Println("CAS认证系统初始化完成")
	log.Printf("CAS服务器: %s", casConfig.ServerURL)
	log.Printf("应用服务: %s", casConfig.ServiceURL)
}

// Login 处理登录请求
func Login(c *gin.Context) {
	// 检查是否已经登录
	if sessionID, err := auth.GetSessionCookie(c.Request); err == nil {
		if _, exists := sessionManager.GetSession(sessionID); exists {
			// 已登录，重定向到首页
			c.Redirect(http.StatusFound, "/")
			return
		}
	}
	
	// 重定向到CAS登录页面
	loginURL := casClient.GetLoginURL()
	log.Printf("重定向到CAS登录: %s", loginURL)
	c.Redirect(http.StatusFound, loginURL)
}

// Logout 处理注销请求
func Logout(c *gin.Context) {
	// 清除本地session
	if sessionID, err := auth.GetSessionCookie(c.Request); err == nil {
		sessionManager.DeleteSession(sessionID)
	}
	
	// 清除session cookie
	auth.ClearSessionCookie(c.Writer)
	
	// 重定向到CAS注销页面
	logoutURL := casClient.GetLogoutURL()
	log.Printf("重定向到CAS注销: %s", logoutURL)
	c.Redirect(http.StatusFound, logoutURL)
}

// CASCallback 处理CAS回调
func CASCallback(c *gin.Context) {
	ticket := c.Query("ticket")
	if ticket == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "缺少ticket参数",
		})
		return
	}
	
	log.Printf("收到CAS ticket: %s", ticket)
	
	// 验证ticket并获取用户信息
	user, err := casClient.ValidateTicket(c.Request.Context(), ticket, "xml")
	if err != nil {
		log.Printf("CAS ticket验证失败: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{
			"code": 401,
			"msg":  "认证失败: " + err.Error(),
		})
		return
	}
	
	log.Printf("CAS认证成功: 用户=%s, 姓名=%s, 卡号=%s, 单位=%s", 
		user.Username, user.Name, user.Alias, user.OrgDN)
	
	// 创建session
	session, err := sessionManager.CreateSession(user)
	if err != nil {
		log.Printf("创建session失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "创建会话失败",
		})
		return
	}
	
	// 设置session cookie
	isSecure := c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https"
	auth.SetSessionCookie(c.Writer, session.ID, isSecure)
	
	log.Printf("用户登录成功，session ID: %s", session.ID)
	
	// 重定向到首页
	c.Redirect(http.StatusFound, "/")
}

// GetCurrentUser 获取当前登录用户信息
func GetCurrentUser(c *gin.Context) {
	sessionID, err := auth.GetSessionCookie(c.Request)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code": 401,
			"msg":  "未登录",
		})
		return
	}
	
	session, exists := sessionManager.GetSession(sessionID)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code": 401,
			"msg":  "会话已过期",
		})
		return
	}
	
	// 刷新session
	sessionManager.RefreshSession(sessionID)
	
	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "获取成功",
		"data": gin.H{
			"username":     session.User.Username,
			"name":         session.User.Name,
			"alias":        session.User.Alias,
			"org_dn":       session.User.OrgDN,
			"container_id": session.User.ContainerID,
			"user_type":    session.User.GetUserType(),
		},
	})
}

// AuthMiddleware 认证中间件
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 跳过认证相关的路径
		path := c.Request.URL.Path
		if path == "/login" || path == "/logout" || path == "/cas/callback" {
			c.Next()
			return
		}

		// 跳过静态资源（但不跳过首页）
		if path == "/api/current-user" ||
		   (len(path) > 8 && path[:8] == "/static/") {
			c.Next()
			return
		}
		
		// 检查session
		sessionID, err := auth.GetSessionCookie(c.Request)
		if err != nil {
			// 未登录，重定向到登录页面
			c.Redirect(http.StatusFound, "/login")
			c.Abort()
			return
		}
		
		session, exists := sessionManager.GetSession(sessionID)
		if !exists {
			// session无效，重定向到登录页面
			c.Redirect(http.StatusFound, "/login")
			c.Abort()
			return
		}
		
		// 刷新session
		sessionManager.RefreshSession(sessionID)
		
		// 将用户信息添加到上下文
		c.Set("user", session.User)
		c.Next()
	}
}

// RequireAuth 需要认证的中间件（用于API）
func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionID, err := auth.GetSessionCookie(c.Request)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code": 401,
				"msg":  "未登录",
			})
			c.Abort()
			return
		}
		
		session, exists := sessionManager.GetSession(sessionID)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code": 401,
				"msg":  "会话已过期",
			})
			c.Abort()
			return
		}
		
		// 刷新session
		sessionManager.RefreshSession(sessionID)
		
		// 将用户信息添加到上下文
		c.Set("user", session.User)
		c.Next()
	}
}
