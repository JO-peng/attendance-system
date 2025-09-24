package utils

import (
	"log"
	"materials/Mysql"
)

// InitDB 初始化数据库（使用MySQL）
func InitDB() {
	err := Mysql.MysqlInit()
	if err != nil {
		log.Fatal("Failed to initialize MySQL database:", err)
	}
	log.Println("Database initialized successfully")
}

// SaveReceiveRecord 保存报到记录
func UpdateReceiveRecord(cardNumber string) error {
	return Mysql.UpdateReceiveRecord(cardNumber)
}

// UpdateReceiveRecordWithHandler 更新报到记录并记录处理人信息
func UpdateReceiveRecordWithHandler(cardNumber, name, dept, handlerStudentID, handlerName string) error {
	return Mysql.UpdateReceiveRecordWithHandler(cardNumber, name, dept, handlerStudentID, handlerName)
}
