package auth

import (
	"context"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// CASConfig holds the configuration for CAS authentication
type CASConfig struct {
	ServerURL   string // CAS server URL, e.g., https://authserver.szu.edu.cn/authserver
	ServiceURL  string // Your application URL
	LoginPath   string // Path for login endpoint, default: /login
	LogoutPath  string // Path for logout endpoint, default: /logout
	CallbackPath string // Path for CAS callback, default: /cas/callback
}

// CASUser represents the user information returned by CAS
type CASUser struct {
	Username     string `json:"user" xml:"cas:user"`           // 学工号
	Name         string `json:"cn" xml:"cas:cn"`               // 姓名
	Alias        string `json:"alias" xml:"cas:alias"`         // 校园卡号
	OrgDN        string `json:"eduPersonOrgDN" xml:"cas:eduPersonOrgDN"` // 单位
	ContainerID  string `json:"containerId" xml:"cas:containerId"`       // 用户容器
}

// CASAuthenticationSuccess represents the successful authentication response
type CASAuthenticationSuccess struct {
	User       string                 `xml:"cas:user"`
	Attributes map[string]interface{} `xml:"cas:attributes"`
}

// CASServiceResponse represents the CAS service validation response
// 支持带命名空间和不带命名空间的XML格式
type CASServiceResponse struct {
	XMLName xml.Name `xml:"serviceResponse"`
	Success *struct {
		User       string `xml:"user"`
		Attributes struct {
			CN              string `xml:"cn"`
			Alias           string `xml:"alias"`
			EduPersonOrgDN  string `xml:"eduPersonOrgDN"`
			ContainerID     string `xml:"containerId"`
		} `xml:"attributes"`
	} `xml:"authenticationSuccess"`
	Failure *struct {
		Code    string `xml:"code,attr"`
		Message string `xml:",chardata"`
	} `xml:"authenticationFailure"`
}

// CASServiceResponseWithNS represents the CAS service validation response with namespace
type CASServiceResponseWithNS struct {
	XMLName xml.Name `xml:"cas:serviceResponse"`
	Success *struct {
		User       string `xml:"cas:user"`
		Attributes struct {
			CN              string `xml:"cas:cn"`
			Alias           string `xml:"cas:alias"`
			EduPersonOrgDN  string `xml:"cas:eduPersonOrgDN"`
			ContainerID     string `xml:"cas:containerId"`
		} `xml:"cas:attributes"`
	} `xml:"cas:authenticationSuccess"`
	Failure *struct {
		Code    string `xml:"code,attr"`
		Message string `xml:",chardata"`
	} `xml:"cas:authenticationFailure"`
}

// CASClient handles CAS authentication
type CASClient struct {
	config *CASConfig
	client *http.Client
}

// NewCASClient creates a new CAS client
func NewCASClient(config *CASConfig) *CASClient {
	if config.LoginPath == "" {
		config.LoginPath = "/login"
	}
	if config.LogoutPath == "" {
		config.LogoutPath = "/logout"
	}
	if config.CallbackPath == "" {
		config.CallbackPath = "/cas/callback"
	}
	
	return &CASClient{
		config: config,
		client: &http.Client{},
	}
}

// GetLoginURL returns the CAS login URL
func (c *CASClient) GetLoginURL() string {
	loginURL := fmt.Sprintf("%s/login?service=%s", 
		c.config.ServerURL, 
		url.QueryEscape(c.config.ServiceURL+c.config.CallbackPath))
	return loginURL
}

// GetLogoutURL returns the CAS logout URL
func (c *CASClient) GetLogoutURL() string {
	logoutURL := fmt.Sprintf("%s/logout?service=%s", 
		c.config.ServerURL, 
		url.QueryEscape(c.config.ServiceURL))
	return logoutURL
}

// ValidateTicket validates the CAS ticket and returns user information
func (c *CASClient) ValidateTicket(ctx context.Context, ticket string, format string) (*CASUser, error) {
	validateURL := fmt.Sprintf("%s/serviceValidate?ticket=%s&service=%s", 
		c.config.ServerURL, 
		ticket, 
		url.QueryEscape(c.config.ServiceURL+c.config.CallbackPath))
	
	if format == "json" {
		validateURL += "&format=json"
	}
	
	req, err := http.NewRequestWithContext(ctx, "GET", validateURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	
	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to validate ticket: %w", err)
	}
	defer resp.Body.Close()
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}
	
	if format == "json" {
		return c.parseJSONResponse(body)
	}
	
	return c.parseXMLResponse(body)
}

// parseJSONResponse parses JSON response from CAS
func (c *CASClient) parseJSONResponse(body []byte) (*CASUser, error) {
	var response struct {
		ServiceResponse struct {
			AuthenticationSuccess struct {
				User       string `json:"user"`
				Attributes struct {
					CN             []string `json:"cn"`
					Alias          []string `json:"alias"`
					EduPersonOrgDN []string `json:"eduPersonOrgDN"`
					ContainerID    []string `json:"containerId"`
				} `json:"attributes"`
			} `json:"authenticationSuccess"`
			AuthenticationFailure struct {
				Code        string `json:"code"`
				Description string `json:"description"`
			} `json:"authenticationFailure"`
		} `json:"serviceResponse"`
	}
	
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("failed to parse JSON response: %w", err)
	}
	
	if response.ServiceResponse.AuthenticationFailure.Code != "" {
		return nil, fmt.Errorf("authentication failed: %s - %s", 
			response.ServiceResponse.AuthenticationFailure.Code,
			response.ServiceResponse.AuthenticationFailure.Description)
	}
	
	success := response.ServiceResponse.AuthenticationSuccess
	user := &CASUser{
		Username: success.User,
	}
	
	if len(success.Attributes.CN) > 0 {
		user.Name = success.Attributes.CN[0]
	}
	if len(success.Attributes.Alias) > 0 {
		user.Alias = success.Attributes.Alias[0]
	}
	if len(success.Attributes.EduPersonOrgDN) > 0 {
		user.OrgDN = success.Attributes.EduPersonOrgDN[0]
	}
	if len(success.Attributes.ContainerID) > 0 {
		user.ContainerID = success.Attributes.ContainerID[0]
	}
	
	return user, nil
}

// parseXMLResponse parses XML response from CAS
func (c *CASClient) parseXMLResponse(body []byte) (*CASUser, error) {
	// 先尝试不带命名空间的格式（深圳大学使用的格式）
	var response CASServiceResponse

	if err := xml.Unmarshal(body, &response); err != nil {
		// 如果失败，尝试带命名空间的格式
		var responseWithNS CASServiceResponseWithNS
		if err2 := xml.Unmarshal(body, &responseWithNS); err2 != nil {
			// 输出原始XML用于调试
			fmt.Printf("原始XML响应: %s\n", string(body))
			return nil, fmt.Errorf("failed to parse XML response (both formats): %w, %w", err, err2)
		}

		// 转换带命名空间的响应
		if responseWithNS.Failure != nil {
			return nil, fmt.Errorf("authentication failed: %s - %s",
				responseWithNS.Failure.Code, responseWithNS.Failure.Message)
		}

		if responseWithNS.Success == nil {
			return nil, fmt.Errorf("no authentication success or failure in response")
		}

		user := &CASUser{
			Username:    responseWithNS.Success.User,
			Name:        responseWithNS.Success.Attributes.CN,
			Alias:       responseWithNS.Success.Attributes.Alias,
			OrgDN:       responseWithNS.Success.Attributes.EduPersonOrgDN,
			ContainerID: responseWithNS.Success.Attributes.ContainerID,
		}

		return user, nil
	}

	// 处理不带命名空间的响应
	if response.Failure != nil {
		return nil, fmt.Errorf("authentication failed: %s - %s",
			response.Failure.Code, response.Failure.Message)
	}

	if response.Success == nil {
		return nil, fmt.Errorf("no authentication success or failure in response")
	}

	user := &CASUser{
		Username:    response.Success.User,
		Name:        response.Success.Attributes.CN,
		Alias:       response.Success.Attributes.Alias,
		OrgDN:       response.Success.Attributes.EduPersonOrgDN,
		ContainerID: response.Success.Attributes.ContainerID,
	}

	return user, nil
}

// GetUserType returns the user type based on container ID
func (u *CASUser) GetUserType() string {
	if u.ContainerID == "" {
		return "未知"
	}
	
	// Extract container code from format: ou=容器代码,ou=People
	parts := strings.Split(u.ContainerID, ",")
	if len(parts) == 0 {
		return "未知"
	}
	
	containerCode := strings.TrimPrefix(parts[0], "ou=")
	
	switch containerCode {
	case "jzg":
		return "在职教职工"
	case "lzjzg":
		return "离职教职工"
	case "txjzg":
		return "退休教职工"
	case "bks":
		return "本科生"
	case "yjs":
		return "研究生"
	case "qtxs":
		return "其他学生"
	case "cjyg":
		return "成教员工"
	case "xwds":
		return "校外导师"
	case "kyry":
		return "科研系统账号"
	case "qtry":
		return "其他人员"
	case "bybks":
		return "毕业本科生"
	case "byyjs":
		return "毕业研究生"
	case "byqtxs":
		return "毕业其他学生"
	default:
		return containerCode
	}
}
