package handlers

import (
	"bytes"
	"fmt"
	"github.com/gin-gonic/gin"
	"io/ioutil"
	"materials/auth"
	"materials/utils"
	"net/http"
)

// ScanQRCodeRequest 扫码请求结构体
type ScanQRCodeRequest struct {
	QRCode   string `json:"qr_code" binding:"required"`
	DeviceID string `json:"device_id"`
}

// ScanQRCode 处理二维码扫描
func ScanQRCode(c *gin.Context) {
	var req ScanQRCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误",
		})
		return
	}

	var responseData utils.ResponseData

	// 调用微信二维码解码接口
	utils.GetUserInfoFromWXiaoCode(req.QRCode, &responseData, req.DeviceID)

	if responseData.Code != 200 {
		c.JSON(http.StatusOK, responseData)
		return
	}

	// 检查是否已经完成报到
	if responseData.Status == "已报到" {
		responseData.Msg = "您已完成报到，无法重复报到。如有疑问请联系管理员"
		c.JSON(http.StatusBadRequest, responseData)
		return
	} else {
		responseData.Msg = "扫码成功！您可完成报到"
		c.JSON(http.StatusOK, responseData)
	}
}

// ConfirmReceiveRequest 确认报到请求结构体
type ConfirmReceiveRequest struct {
	CardNumber string `json:"card_number" binding:"required"`
	Name       string `json:"name"`
	Dept       string `json:"dept"`
}

// ManualLookupRequest 手动查询请求结构体
type ManualLookupRequest struct {
	CardNumber string `json:"card_number" binding:"required"`
}

// ManualLookup 手动查询用户信息
func ManualLookup(c *gin.Context) {
	var req ManualLookupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误",
		})
		return
	}

	var responseData utils.ResponseData

	// 直接从数据库查询用户信息
	utils.GetUserInfoFromCardNumber(req.CardNumber, &responseData)

	if responseData.Code != 200 {
		c.JSON(http.StatusOK, responseData)
		return
	}

	// 检查是否已经完成报到
	if responseData.HasReceived {
		responseData.Msg = "您已完成报到，无法重复报到。如有疑问请联系管理员"
		c.JSON(http.StatusOK, responseData)
		return
	} else if responseData.Name == "" {
		responseData.Msg = "非新生，不能完成报到"
		c.JSON(http.StatusOK, responseData)
		return
	}

	responseData.Msg = "查询成功！您可完成报到"
	c.JSON(http.StatusOK, responseData)
}

// ConfirmReceive 确认新生报到
func ConfirmReceive(c *gin.Context) {
	var req ConfirmReceiveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误",
		})
		return
	}

	// 获取当前登录用户信息
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code": 401,
			"msg":  "用户未登录",
		})
		return
	}

	// 类型断言获取用户信息
	user, ok := userInterface.(*auth.CASUser)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "用户信息获取失败",
		})
		return
	}

	SentMessageToYIQing(req.CardNumber)
	// 保存到数据库，包含处理人信息
	if err := utils.UpdateReceiveRecordWithHandler(req.CardNumber, req.Name, req.Dept, user.Username, user.Name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "新生报到成功！",
	})
}
func SentMessageToYIQing(searchData string) {
	//发送消息致电子哨兵后台
	url := "http://210.39.8.33:5024/GetUserInfo"
	client := &http.Client{}

	Body := `{"deviceId":"志愿者扫码","idcard":"","name":"","searchData":"` + searchData + `","type":3,"wlkh":"","wxCode":""}`

	reader := bytes.NewReader([]byte(Body))
	req, err := http.NewRequest("GET", url, reader)
	if err != nil {
		fmt.Println(err)
		return
	}
	req.Header["Content-Type"] = []string{"application/json"}
	resp, err := client.Do(req)
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	fmt.Println("body", string(body))
}
