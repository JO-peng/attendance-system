package utils

import (
	"crypto/md5"
	"fmt"
)

// MD5Crypt MD5加密函数
func MD5Crypt(str string) string {
	data := []byte(str)
	has := md5.Sum(data)
	return fmt.Sprintf("%x", has)
}
