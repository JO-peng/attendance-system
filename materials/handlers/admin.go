package handlers

import (
	"log"
	"materials/auth"
	"net/http"
	"strconv"

	"materials/Mysql"

	"github.com/gin-gonic/gin"
)

// GetAllRecords 获取所有报到记录（管理功能）
func GetAllRecords(c *gin.Context) {
	records, err := Mysql.GetAllReceiveRecords()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":  500,
			"msg":   "查询记录失败",
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":  200,
		"msg":   "查询成功",
		"data":  records,
		"total": len(records),
	})
}

// GetReceiveStats 获取报到统计信息
func GetReceiveStats(c *gin.Context) {
	count, err := Mysql.GetReceiveCount()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":  500,
			"msg":   "查询统计失败",
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "查询成功",
		"data": gin.H{
			"total_received": count,
		},
	})
}

// GetUserRecord 获取特定用户的报到记录
func GetUserRecord(c *gin.Context) {
	cardNumber := c.Param("cardNumber")
	if cardNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "参数错误",
		})
		return
	}

	record := Mysql.GetUserReceiveRecord(cardNumber)
	if record.Name != "" {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "查询失败",
		})
		return
	}

	if record.Status == "" {
		c.JSON(http.StatusOK, gin.H{
			"code":         200,
			"msg":          "用户未报到",
			"data":         nil,
			"has_received": false,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":         200,
		"msg":          "查询成功",
		"data":         record,
		"has_received": true,
	})
}

// ExportRecords 导出报到记录（CSV格式）
func ExportRecords(c *gin.Context) {
	records, err := Mysql.GetAllReceiveRecords()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "查询记录失败",
		})
		return
	}

	// 设置CSV响应头
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=freshman_registration_records.csv")

	// 写入CSV头部
	csvContent := "ID,工号,姓名,部门,报到时间,创建时间\n"

	// 写入数据
	for _, record := range records {
		csvContent += strconv.Itoa(record.ID) + "," +
			record.CardNumber + "," +
			record.Name + "," +
			record.Dept + "," +
			record.ReceivedAt.Format("2006-01-02 15:04:05") + "," +
			record.CreatedAt.Format("2006-01-02 15:04:05") + "\n"
	}

	c.String(http.StatusOK, csvContent)
}

// GetMyRecentRecords 获取当前登录用户最近报到的记录
func GetMyRecentRecords(c *gin.Context) {
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

	// 获取该用户最近报到的10条记录
	records, err := Mysql.GetRecentRecordsByHandler(user.Username, 10)
	if err != nil {
		log.Printf("查询用户 %s 的最近记录失败: %v", user.Username, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":  500,
			"msg":   "查询记录失败",
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":  200,
		"msg":   "查询成功",
		"data":  records,
		"total": len(records),
	})
}

// GetHandlerStats 获取处理人统计信息
func GetHandlerStats(c *gin.Context) {
	stats, err := Mysql.GetHandlerStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":  500,
			"msg":   "查询统计失败",
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":  200,
		"msg":   "查询成功",
		"data":  stats,
		"total": len(stats),
	})
}
