package handlers

import (
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"math/rand"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"materials/utils"

	"github.com/gin-gonic/gin"
)

// WeworkConfig 企业微信配置
type WeworkConfig struct {
	CorpID    string `json:"corpId"`
	Timestamp string `json:"timestamp"`
	NonceStr  string `json:"nonceStr"`
	Signature string `json:"signature"`
	AgentID   string `json:"agentId"`
	Secret    string `json:"secret"`
}

// GetWeworkConfig 获取企业微信配置
func GetWeworkConfig(c *gin.Context) {
	// 企业微信配置信息
	config := WeworkConfig{
		CorpID:    "ww563e8adbd544adf5",                          // 替换为你的企业ID
		AgentID:   "1000265",                                     // 替换为你的应用ID
		Secret:    "ui7lI26sXjVq7BKm_esRm_3s5ZTOpJPpxmf_AO8qPd0", // 替换为你的应用密钥
		Timestamp: fmt.Sprintf("%d", time.Now().Unix()),
		NonceStr:  generateNonceStr(),
	}

	// 获取jsapi_ticket
	jsapiTicket, err := utils.GetJsapiTicket()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":  500,
			"msg":   "获取jsapi_ticket失败",
			"error": err.Error(),
		})
		return
	}

	// 生成签名
	config.Signature = generateSignature(jsapiTicket, config.NonceStr, config.Timestamp, getCurrentURL(c))

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "success",
		"data": config,
	})
}

// 生成随机字符串
func generateNonceStr() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 16)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return string(b)
}

// 生成签名
func generateSignature(jsapiTicket, nonceStr, timestamp, url string) string {
	// 按字典序排序
	params := []string{
		fmt.Sprintf("jsapi_ticket=%s", jsapiTicket),
		fmt.Sprintf("noncestr=%s", nonceStr),
		fmt.Sprintf("timestamp=%s", timestamp),
		fmt.Sprintf("url=%s", url),
	}
	sort.Strings(params)

	// 拼接字符串
	str := strings.Join(params, "&")
	// SHA1签名
	h := sha1.New()
	h.Write([]byte(str))
	return hex.EncodeToString(h.Sum(nil))
}

// 获取当前URL
func getCurrentURL(c *gin.Context) string {
	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}
	return fmt.Sprintf("%s://%s%s", scheme, c.Request.Host, c.Request.URL.Path)
}

// WeWorkSignature 企业微信签名结构体
type WeWorkSignature struct {
	Timestamp int64  `json:"timestamp"`
	NonceStr  string `json:"nonceStr"`
	Signature string `json:"signature"`
}

// GetWeWorkConfigSignature 获取企业微信签名
func GetWeWorkConfigSignature(c *gin.Context) {
	var req struct {
		URL  string `json:"url" binding:"required"`
		Type string `json:"type" binding:"required"` // "config" 或 "agent"
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误",
		})
		return
	}

	timestamp := time.Now().Unix()
	nonceStr := generateNonceStr()

	// 获取jsapi_ticket
	jsapiTicket, err := utils.GetJsapiTicket()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":  500,
			"msg":   "获取jsapi_ticket失败",
			"error": err.Error(),
		})
		return
	}

	signature := generateWeWorkSignature(jsapiTicket, nonceStr, timestamp, req.URL)

	signatureData := WeWorkSignature{
		Timestamp: timestamp,
		NonceStr:  nonceStr,
		Signature: signature,
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "获取成功",
		"data": signatureData,
	})
}

// generateWeWorkSignature 生成企业微信JS-SDK签名
func generateWeWorkSignature(jsapiTicket, nonceStr string, timestamp int64, url string) string {
	// 参数排序
	params := []string{
		"jsapi_ticket=" + jsapiTicket,
		"noncestr=" + nonceStr,
		"timestamp=" + strconv.FormatInt(timestamp, 10),
		"url=" + url,
	}
	sort.Strings(params)

	// 拼接字符串
	str := strings.Join(params, "&")

	// SHA1加密
	h := sha1.New()
	h.Write([]byte(str))
	return fmt.Sprintf("%x", h.Sum(nil))
}

// 以下是企业微信API相关的辅助函数
// 在实际项目中需要实现这些函数

// GetAccessToken 获取企业微信access_token
func GetAccessToken(corpId, corpSecret string) (string, error) {
	// TODO: 实现获取access_token的逻辑
	// API: https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=ID&corpsecret=SECRET
	return "", fmt.Errorf("未实现")
}

// GetJSAPITicket 获取企业微信jsapi_ticket
func GetJSAPITicket(accessToken string) (string, error) {
	// TODO: 实现获取jsapi_ticket的逻辑
	// API: https://qyapi.weixin.qq.com/cgi-bin/get_jsapi_ticket?access_token=ACCESS_TOKEN
	return "", fmt.Errorf("未实现")
}

// WeWorkUserInfo 企业微信用户信息
type WeWorkUserInfo struct {
	UserId     string `json:"userid"`
	Name       string `json:"name"`
	Department []int  `json:"department"`
	Position   string `json:"position"`
	Mobile     string `json:"mobile"`
	Email      string `json:"email"`
}

// GetUserInfo 通过code获取企业微信用户信息
func GetUserInfo(accessToken, code string) (*WeWorkUserInfo, error) {
	// TODO: 实现获取用户信息的逻辑
	// 1. 通过code获取userid: https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo
	// 2. 通过userid获取用户详细信息: https://qyapi.weixin.qq.com/cgi-bin/user/get
	return nil, fmt.Errorf("未实现")
}
