package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
	"time"

	"materials/Mysql"
)

// GetUserInfoFromWXiaoCode 从微信小程序二维码获取用户信息
func GetUserInfoFromWXiaoCode(wxCode string, responseData *ResponseData, deviceId string) {
	url := "https://weixiao.qq.com/apps/school-api/campus-code"
	client := &http.Client{
		Timeout: 3 * time.Second,
	}

	timestamp := strconv.Itoa(int(time.Now().Unix()))
	row := "app_key=294D49AA3C42288C" +
		"&auth_code=" + wxCode +
		"&device_no=device-1213" +
		"&location=电子哨兵" +
		"&nonce=5K8264ILTKCH16CQ2502SI8ZNMTM67VS" +
		"&scene=1&school_code=4144010590&timestamp=" + timestamp +
		"&key=7B1E3CE1E0EB5221119E8380397554C7"
	signature := strings.ToUpper(MD5Crypt(row))

	var wxDataRequest WxDataRequest
	wxDataRequest.App_key = "294D49AA3C42288C"
	wxDataRequest.Timestamp = timestamp
	wxDataRequest.Nonce = "5K8264ILTKCH16CQ2502SI8ZNMTM67VS"
	wxDataRequest.Signature = signature
	wxDataRequest.School_code = "4144010590"
	wxDataRequest.Auth_code = wxCode
	wxDataRequest.Scene = "1"
	wxDataRequest.Device_no = "device-1213"
	wxDataRequest.Location = "电子哨兵"

	Body, err := json.Marshal(wxDataRequest)
	if err != nil {
		responseData.Code = 400
		responseData.Msg = "二维码已失效"
		fmt.Println(err)
		return
	}

	reader := bytes.NewReader([]byte(Body))

	req, err := http.NewRequest("POST", url, reader)
	if err != nil {
		responseData.Code = 400
		responseData.Msg = "二维码已失效"
		fmt.Println(err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Connection", "keep-alive")
	resp, err := client.Do(req)
	if err != nil {
		responseData.Code = 400
		responseData.Msg = "二维码已失效"
		fmt.Println(err)
		return
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		responseData.Code = 400
		responseData.Msg = "二维码已失效"
		fmt.Println(err)
		return
	}
	fmt.Println(string(body))
	var wxDataResponse WxDataResponse
	err = json.Unmarshal(body, &wxDataResponse)
	if err != nil {
		responseData.Code = 400
		responseData.Msg = "二维码已失效"
		fmt.Println(err)
		return
	}
	responseData.Xgh = wxDataResponse.User.Card_number

	//wxDataResponse.Code = 0
	//wxDataResponse.User.Card_number = "2210244134"

	userInfo := Mysql.GetUserReceiveRecord(wxDataResponse.User.Card_number)
	wxDataResponse.User.Name = userInfo.Name
	fmt.Println("userInfo.CardNumber", userInfo.CardNumber)
	fmt.Println("wxDataResponse.User.Card_number", wxDataResponse.User.Card_number)
	if userInfo.CardNumber != wxDataResponse.User.Card_number {
		responseData.HasReceived = false
		responseData.Code = 400
		responseData.Msg = "非新生，不能完成报到"
		return
	} else if wxDataResponse.Code == 0 {
		if userInfo.Status == "已报到" {
			userRecord := Mysql.GetUserReceiveRecord(wxDataResponse.User.Card_number)
			responseData.Name = userRecord.Name
			responseData.Dept = userRecord.Dept
			responseData.Status = "已报到"
			responseData.HasReceived = true
		} else {
			responseData.Name = userInfo.Name
			responseData.Dept = userInfo.Dept
			responseData.Status = "未报到"
			responseData.HasReceived = false
		}

		responseData.CredentialNo = wxDataResponse.User.Card_number
		responseData.Code = 200
		responseData.Msg = "查询成功"
		responseData.PassCode = 1
		responseData.IsNeedHealthData = false

		// 这里可以添加从其他API获取更详细用户信息的逻辑
		// GetUserInfoFromAPI(wxDataResponse.User.Card_number, responseData)
	} else {
		responseData.Code = 400
		responseData.Msg = wxDataResponse.Message
	}

	return
}

// GetUserInfoFromCardNumber 根据学工号直接查询用户信息
func GetUserInfoFromCardNumber(cardNumber string, responseData *ResponseData) {
	// 从数据库查询用户信息
	userInfo := Mysql.GetUserReceiveRecord(cardNumber)

	// 检查用户是否存在
	if userInfo.Name == "" {
		responseData.Code = 400
		responseData.Msg = "未找到该学工号对应的用户信息，请检查学工号是否正确"
		return
	}

	// 设置响应数据
	responseData.CredentialNo = cardNumber
	responseData.Name = userInfo.Name
	responseData.Dept = userInfo.Dept
	responseData.Status = userInfo.Status
	responseData.Code = 200
	responseData.Msg = "查询成功"
	responseData.PassCode = 1
	responseData.IsNeedHealthData = false

	// 检查是否已经完成报到
	if userInfo.Status == "已报到" {
		responseData.HasReceived = true
	} else {
		responseData.HasReceived = false
	}

	return
}
