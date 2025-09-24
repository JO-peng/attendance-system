package utils

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"sync"
	"time"
)

// TokenCache 用于缓存access_token和jsapi_ticket
type TokenCache struct {
	AccessToken string
	JsapiTicket string
	ExpiresIn   int64
	LastUpdate  time.Time
	mutex       sync.RWMutex
}

// GetAccessToken 获取access_token
func (tc *TokenCache) GetAccessToken() (string, error) {
	tc.mutex.RLock()
	if tc.AccessToken != "" && time.Now().Unix() < tc.ExpiresIn {
		defer tc.mutex.RUnlock()
		return tc.AccessToken, nil
	}
	tc.mutex.RUnlock()

	// 需要更新token
	tc.mutex.Lock()
	defer tc.mutex.Unlock()

	// 双重检查
	if tc.AccessToken != "" && time.Now().Unix() < tc.ExpiresIn {
		return tc.AccessToken, nil
	}

	// 请求新的access_token
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

	var result struct {
		ErrCode     int    `json:"errcode"`
		ErrMsg      string `json:"errmsg"`
		AccessToken string `json:"access_token"`
		ExpiresIn   int64  `json:"expires_in"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("解析响应失败: %v", err)
	}

	if result.ErrCode != 0 {
		return "", fmt.Errorf("获取access_token错误: %s", result.ErrMsg)
	}

	// 更新缓存
	tc.AccessToken = result.AccessToken
	tc.ExpiresIn = time.Now().Unix() + result.ExpiresIn - 200 // 提前200秒过期
	tc.LastUpdate = time.Now()

	return tc.AccessToken, nil
}

// GetJsapiTicket 获取jsapi_ticket
func (tc *TokenCache) GetJsapiTicket() (string, error) {
	tc.mutex.RLock()
	if tc.JsapiTicket != "" && time.Now().Unix() < tc.ExpiresIn {
		defer tc.mutex.RUnlock()
		return tc.JsapiTicket, nil
	}
	tc.mutex.RUnlock()

	// 需要更新ticket
	tc.mutex.Lock()
	defer tc.mutex.Unlock()

	// 双重检查
	if tc.JsapiTicket != "" && time.Now().Unix() < tc.ExpiresIn {
		return tc.JsapiTicket, nil
	}

	// 获取access_token
	accessToken, err := tc.GetAccessToken()
	if err != nil {
		return "", fmt.Errorf("获取access_token失败: %v", err)
	}

	// 请求新的jsapi_ticket
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

	var result struct {
		ErrCode   int    `json:"errcode"`
		ErrMsg    string `json:"errmsg"`
		Ticket    string `json:"ticket"`
		ExpiresIn int64  `json:"expires_in"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("解析响应失败: %v", err)
	}

	if result.ErrCode != 0 {
		return "", fmt.Errorf("获取jsapi_ticket错误: %s", result.ErrMsg)
	}

	// 更新缓存
	tc.JsapiTicket = result.Ticket
	tc.ExpiresIn = time.Now().Unix() + result.ExpiresIn - 200 // 提前200秒过期
	tc.LastUpdate = time.Now()

	return tc.JsapiTicket, nil
}

// InitWeworkConfig 初始化企业微信配置
func InitWeworkConfig(corpID, corpSecret string) {
	config.CorpID = corpID
	config.CorpSecret = corpSecret
}
