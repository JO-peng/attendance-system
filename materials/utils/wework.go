package utils

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"sync"
	"time"
)

var (
	accessTokenCache struct {
		sync.RWMutex
		token     string
		expiresAt time.Time
	}
	jsapiTicketCache struct {
		sync.RWMutex
		ticket    string
		expiresAt time.Time
	}
	config = struct {
		CorpID     string
		CorpSecret string
	}{
		CorpID:     "ww563e8adbd544adf5",
		CorpSecret: "ui7lI26sXjVq7BKm_esRm_3s5ZTOpJPpxmf_AO8qPd0",
	}
)

// TokenResponse 企业微信token响应
type TokenResponse struct {
	ErrCode     int    `json:"errcode"`
	ErrMsg      string `json:"errmsg"`
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

// TicketResponse 企业微信jsapi_ticket响应
type TicketResponse struct {
	ErrCode    int    `json:"errcode"`
	ErrMsg     string `json:"errmsg"`
	Ticket     string `json:"ticket"`
	ExpiresIn  int    `json:"expires_in"`
}

// GetAccessToken 获取企业微信access_token
func GetAccessToken() (string, error) {
	accessTokenCache.RLock()
	if accessTokenCache.token != "" && time.Now().Before(accessTokenCache.expiresAt) {
		token := accessTokenCache.token
		accessTokenCache.RUnlock()
		return token, nil
	}
	accessTokenCache.RUnlock()

	// 需要重新获取token
	accessTokenCache.Lock()
	defer accessTokenCache.Unlock()

	// 双重检查
	if accessTokenCache.token != "" && time.Now().Before(accessTokenCache.expiresAt) {
		return accessTokenCache.token, nil
	}

	// 调用企业微信API获取access_token
	url := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=%s&corpsecret=%s",
		config.CorpID, config.CorpSecret)

	resp, err := http.Get(url)
	if err != nil {
		return "", fmt.Errorf("获取access_token失败: %v", err)
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("读取响应失败: %v", err)
	}

	var result TokenResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("解析响应失败: %v", err)
	}

	if result.ErrCode != 0 {
		return "", fmt.Errorf("获取access_token失败: %s", result.ErrMsg)
	}

	// 更新缓存
	accessTokenCache.token = result.AccessToken
	accessTokenCache.expiresAt = time.Now().Add(time.Duration(result.ExpiresIn-300) * time.Second)

	return result.AccessToken, nil
}

// GetJsapiTicket 获取企业微信jsapi_ticket
func GetJsapiTicket() (string, error) {
	jsapiTicketCache.RLock()
	if jsapiTicketCache.ticket != "" && time.Now().Before(jsapiTicketCache.expiresAt) {
		ticket := jsapiTicketCache.ticket
		jsapiTicketCache.RUnlock()
		return ticket, nil
	}
	jsapiTicketCache.RUnlock()

	// 需要重新获取ticket
	jsapiTicketCache.Lock()
	defer jsapiTicketCache.Unlock()

	// 双重检查
	if jsapiTicketCache.ticket != "" && time.Now().Before(jsapiTicketCache.expiresAt) {
		return jsapiTicketCache.ticket, nil
	}

	// 获取access_token
	accessToken, err := GetAccessToken()
	if err != nil {
		return "", fmt.Errorf("获取access_token失败: %v", err)
	}

	// 调用企业微信API获取jsapi_ticket
	url := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/get_jsapi_ticket?access_token=%s", accessToken)

	resp, err := http.Get(url)
	if err != nil {
		return "", fmt.Errorf("获取jsapi_ticket失败: %v", err)
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("读取响应失败: %v", err)
	}

	var result TicketResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("解析响应失败: %v", err)
	}

	if result.ErrCode != 0 {
		return "", fmt.Errorf("获取jsapi_ticket失败: %s", result.ErrMsg)
	}

	// 更新缓存
	jsapiTicketCache.ticket = result.Ticket
	jsapiTicketCache.expiresAt = time.Now().Add(time.Duration(result.ExpiresIn-300) * time.Second)

	return result.Ticket, nil
} 