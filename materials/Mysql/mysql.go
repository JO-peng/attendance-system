package Mysql

import (
	"fmt"
	"log"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
)

var DB *sqlx.DB

// UserInfo 用户信息结构体，对应userinfo表
type UserInfo struct {
	ID              int       `db:"id" json:"id"`
	CardNumber      string    `db:"card_number" json:"card_number"`
	Name            string    `db:"name" json:"name"`
	Dept            string    `db:"dept" json:"dept"`
	Sex             string    `db:"sex" json:"sex"`
	Status          string    `db:"status" json:"status"`
	HandleName      string    `db:"handleName" json:"handle_name"`            // 处理人姓名
	HandleStudentID string    `db:"handleStudentID" json:"handle_student_id"` // 处理人学工号
	ReceivedAt      time.Time `db:"received_at" json:"received_at"`
	CreatedAt       time.Time `db:"created_at" json:"created_at"`
}

func MysqlInit() (err error) {
	// 可以从环境变量获取数据库连接字符串
	url := "SZU:sd12#$@tcp(119.91.203.161:3306)/materisals?charset=utf8&parseTime=true&loc=Local"

	DB, err = sqlx.Open("mysql", url)
	if err != nil {
		return fmt.Errorf("failed to open database: %v", err)
	}

	// 设置连接池参数
	DB.SetConnMaxLifetime(10 * time.Minute)
	DB.SetMaxOpenConns(100)
	DB.SetMaxIdleConns(10)

	// 尝试与数据库建立连接（校验dsn是否正确）
	err = DB.Ping()
	if err != nil {
		return fmt.Errorf("failed to ping database: %v", err)
	}

	log.Println("MySQL数据库连接成功")
	return nil
}

// CheckIfReceived 检查用户是否已经完成报到

// UpdateReceiveRecord 更新报到记录状态
func UpdateReceiveRecord(cardNumber string) error {
	// 先检查是否已存在
	userInfo := GetUserReceiveRecord(cardNumber)

	if userInfo.Status == "已报到" {
		return fmt.Errorf("用户已完成报到")
	}

	// 更新记录状态
	query := `UPDATE userinfo SET status = '已报到', received_at = NOW()
			  WHERE card_number = ?`

	_, err := DB.Exec(query, cardNumber)
	if err != nil {
		return fmt.Errorf("更新报到状态失败: %v", err)
	}
	return nil
}

// UpdateReceiveRecordWithHandler 更新报到记录状态并记录处理人信息
func UpdateReceiveRecordWithHandler(cardNumber, name, dept, handlerStudentID, handlerName string) error {
	// 先检查是否已存在
	userInfo := GetUserReceiveRecord(cardNumber)

	if userInfo.Status == "已报到" {
		return fmt.Errorf("用户已完成报到")
	}

	// 更新记录状态，包含处理人信息
	query := `UPDATE userinfo SET
				status = '已报到',
				name = ?,
				dept = ?,
				handleName = ?,
				handleStudentID = ?,
				received_at = NOW()
			  WHERE card_number = ?`

	_, err := DB.Exec(query, name, dept, handlerName, handlerStudentID, cardNumber)
	if err != nil {
		return fmt.Errorf("更新报到状态失败: %v", err)
	}
	return nil
}

// GetUserReceiveRecord 获取用户报到记录
func GetUserReceiveRecord(cardNumber string) UserInfo {
	var userInfo UserInfo

	DB.QueryRow("select card_number,name,dept,status from userinfo where card_number = ? LIMIT 1", cardNumber).
		Scan(&userInfo.CardNumber, &userInfo.Name, &userInfo.Dept, &userInfo.Status)
	return userInfo
}

// GetAllReceiveRecords 获取所有报到记录（管理功能）
func GetAllReceiveRecords() ([]UserInfo, error) {
	var records []UserInfo
	query := "SELECT * FROM userinfo ORDER BY created_at DESC"
	err := DB.Select(&records, query)
	if err != nil {
		return nil, fmt.Errorf("查询所有记录失败: %v", err)
	}
	return records, nil
}

// GetReceiveCount 获取报到总数
func GetReceiveCount() (int, error) {
	var count int
	query := "SELECT COUNT(*) FROM userinfo"
	err := DB.Get(&count, query)
	if err != nil {
		return 0, fmt.Errorf("查询报到总数失败: %v", err)
	}
	return count, nil
}

// GetRecentRecordsByHandler 获取指定处理人最近的报到记录
func GetRecentRecordsByHandler(handlerStudentID string, limit int) ([]UserInfo, error) {
	var records []UserInfo

	// 先检查表结构，如果没有handleStudentID字段，则返回空记录
	query := `SELECT card_number, name, dept, sex, status, received_at, created_at
			  FROM userinfo
			  WHERE status = '已报到' AND handleStudentID = ?
			  ORDER BY received_at DESC
			  LIMIT ?`

	err := DB.Select(&records, query, handlerStudentID, limit)
	if err != nil {
		return nil, fmt.Errorf("查询处理人记录失败: %v", err)
	}

	// 如果没有handleStudentID字段，返回空数组（表示该用户还没有处理过任何记录）
	// 这是为了兼容还没有添加处理人字段的数据库
	return records, nil
}

// HandlerStats 处理人统计信息结构体
type HandlerStats struct {
	HandleStudentID string `db:"handleStudentID" json:"handle_student_id"` // 处理人学工号
	HandleName      string `db:"handleName" json:"handle_name"`            // 处理人姓名
	Count           int    `db:"count" json:"count"`                       // 核验数量
}

// GetHandlerStats 获取每个处理人的到统计信息，按数量降序排序
func GetHandlerStats() ([]HandlerStats, error) {
	var stats []HandlerStats

	query := `SELECT
				handleStudentID,
				handleName,
				COUNT(*) as count
			  FROM userinfo
			  WHERE status = '已报到'
				AND handleStudentID IS NOT NULL
				AND handleStudentID != ''
				AND handleName IS NOT NULL
				AND handleName != ''
			  GROUP BY handleStudentID, handleName
			  ORDER BY count DESC`

	err := DB.Select(&stats, query)
	if err != nil {
		return nil, fmt.Errorf("查询处理人统计失败: %v", err)
	}

	return stats, nil
}

// Close 关闭数据库连接
func Close() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}
