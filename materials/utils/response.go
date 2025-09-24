package utils

// ResponseData 通用响应结构体
type ResponseData struct {
	Code             int    `json:"code"`
	Msg              string `json:"msg"`
	Name             string `json:"name,omitempty"`
	Dept             string `json:"dept,omitempty"`
	Xgh              string `json:"xgh,omitempty"`
	PassCode         int    `json:"pass_code,omitempty"`
	CredentialNo     string `json:"credential_no,omitempty"`
	IsNeedHealthData bool   `json:"is_need_health_data,omitempty"`
	HasReceived      bool   `json:"has_received,omitempty"`
	Status           string `json:"status,omitempty"` // 用户状态：已报到/未报到
}

// WxDataRequest 微信二维码请求结构体
type WxDataRequest struct {
	App_key     string `json:"app_key"`
	Timestamp   string `json:"timestamp"`
	Nonce       string `json:"nonce"`
	Signature   string `json:"signature"`
	School_code string `json:"school_code"`
	Auth_code   string `json:"auth_code"`
	Scene       string `json:"scene"`
	Device_no   string `json:"device_no"`
	Location    string `json:"location"`
}

// WxDataResponse 微信二维码响应结构体
type WxDataResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	User    struct {
		Card_number   string `json:"card_number"`
		Identity_type string `json:"identity_type"`
		Name          string `json:"name"`
	} `json:"user"`
}

// MaterialReceiveRecord 新生报到记录
type MaterialReceiveRecord struct {
	ID         int    `json:"id" gorm:"primaryKey"`
	CardNumber string `json:"card_number" gorm:"uniqueIndex"`
	Name       string `json:"name"`
	Dept       string `json:"dept"`
	ReceivedAt string `json:"received_at"`
	CreatedAt  string `json:"created_at"`
}
