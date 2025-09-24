// 二维码扫描器类
class QRCodeScanner {
    constructor() {
        this.video = null;
        this.stream = null;
        this.scanning = false;
        this.canvas = null;
        this.context = null;
        this.scanInterval = null;
    }

    // 初始化摄像头
    async initCamera() {
        try {
            this.video = document.getElementById('video');

            // 检查浏览器支持
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('浏览器不支持摄像头访问，请使用现代浏览器（Chrome、Firefox、Safari等）');
            }

            console.log('开始初始化摄像头...');
            console.log('用户代理:', navigator.userAgent);
            console.log('当前协议:', window.location.protocol);

            // 添加超时处理
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('摄像头启动超时')), 15000)
            );

            // 检测是否为移动设备
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            // 请求摄像头权限 - 针对移动设备优化
            const constraints = {
                video: {
                    facingMode: { ideal: 'environment' }, // 优先后置摄像头
                    width: isMobile ? { ideal: 1280, max: 1920 } : { ideal: 1280, max: 1920 }, // 提高分辨率
                    height: isMobile ? { ideal: 720, max: 1080 } : { ideal: 720, max: 1080 },
                    frameRate: { ideal: 30, max: 60 }, // 提高帧率
                    aspectRatio: { ideal: 1.333333 } // 4:3 比例，更适合扫码
                }
            };

            try {
                const getUserMedia = navigator.mediaDevices.getUserMedia(constraints);
                this.stream = await Promise.race([getUserMedia, timeout]);
            } catch (error) {
                // 如果后置摄像头失败，尝试前置摄像头
                console.log('后置摄像头不可用，尝试前置摄像头');
                const fallbackConstraints = {
                    video: {
                        facingMode: 'user',
                        width: { ideal: 1280, max: 1920 },
                        height: { ideal: 720, max: 1080 },
                        frameRate: { ideal: 30, max: 60 },
                        aspectRatio: { ideal: 1.333333 }
                    }
                };
                const fallbackGetUserMedia = navigator.mediaDevices.getUserMedia(fallbackConstraints);
                this.stream = await Promise.race([fallbackGetUserMedia, timeout]);
            }

            this.video.srcObject = this.stream;

            // 等待视频加载
            await new Promise((resolve) => {
                this.video.onloadedmetadata = resolve;
            });

            // 创建canvas用于图像处理
            this.canvas = document.createElement('canvas');
            this.context = this.canvas.getContext('2d');

            // 显示移动端提示
            const mobileTips = document.getElementById('mobileTips');
            if (isMobile && mobileTips) {
                mobileTips.style.display = 'block';
            }

            console.log('摄像头初始化成功');
            return true;
        } catch (error) {
            console.error('摄像头初始化失败:', error);
            let errorMessage = '无法访问摄像头';

            if (error.message === '摄像头启动超时') {
                errorMessage = '摄像头启动超时，请重试或检查设备';
            } else if (error.name === 'NotAllowedError') {
                errorMessage = '摄像头权限被拒绝，请允许摄像头访问并刷新页面';
            } else if (error.name === 'NotFoundError') {
                errorMessage = '未找到摄像头设备，请检查设备连接';
            } else if (error.name === 'NotReadableError') {
                errorMessage = '摄像头被其他应用占用，请关闭其他使用摄像头的应用';
            } else if (error.name === 'OverconstrainedError') {
                errorMessage = '摄像头不支持请求的配置，尝试使用其他设置';
            } else if (error.name === 'SecurityError') {
                errorMessage = '安全错误：请确保在HTTPS环境下访问';
            } else {
                errorMessage = `摄像头错误: ${error.name || error.message}`;
            }

            console.log('详细错误信息:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });

            this.showError(errorMessage);
            return false;
        }
    }

    // 开始扫描
    startScanning() {
        if (this.scanning) return;
        
        this.scanning = true;
        // 使用requestAnimationFrame优化性能
        let lastScanTime = 0;
        const scanFrequency = 100; // 提高扫描频率到100ms

        const scanLoop = (timestamp) => {
            if (!this.scanning) return;

            if (timestamp - lastScanTime >= scanFrequency) {
                this.scanFrame();
                lastScanTime = timestamp;
            }

            requestAnimationFrame(scanLoop);
        };

        requestAnimationFrame(scanLoop);
    }

    // 停止扫描
    stopScanning() {
        this.scanning = false;
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    // 扫描当前帧
    scanFrame() {
        if (!this.video || !this.canvas || !this.scanning) return;

        try {
            // 检查视频是否准备好
            if (this.video.readyState !== this.video.HAVE_ENOUGH_DATA) {
                return;
            }

            // 移动端优化：使用较大的扫描区域
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            if (isMobile) {
                // 移动端：使用更大的扫描区域
                const centerX = this.video.videoWidth * 0.1;
                const centerY = this.video.videoHeight * 0.1;
                const scanWidth = this.video.videoWidth * 0.8;
                const scanHeight = this.video.videoHeight * 0.8;

                this.canvas.width = scanWidth;
                this.canvas.height = scanHeight;

                // 绘制更大的扫描区域
                this.context.drawImage(
                    this.video,
                    centerX, centerY, scanWidth, scanHeight,
                    0, 0, scanWidth, scanHeight
                );
            } else {
                // 桌面端：扫描全画面
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                this.context.drawImage(this.video, 0, 0);
            }

            // 获取图像数据
            const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);

            // 尝试解码二维码
            const code = this.decodeQRCode(imageData);
            if (code) {
                this.onQRCodeDetected(code);
            }
        } catch (error) {
            console.error('扫描帧时出错:', error);
        }
    }

    // 使用jsQR库解码二维码 - 增强版
    decodeQRCode(imageData) {
        if (typeof jsQR === 'undefined') {
            console.error('jsQR library not loaded');
            return null;
        }

        try {
            // 尝试多种解码选项以提高成功率
            const options = [
                { inversionAttempts: "dontInvert" },
                { inversionAttempts: "onlyInvert" },
                { inversionAttempts: "attemptBoth" }
            ];

            for (const option of options) {
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    ...option,
                    minSize: 100, // 降低最小尺寸要求
                    maxSize: 1000 // 增加最大尺寸限制
                });
                if (code && code.data) {
                    console.log('二维码解码成功:', code.data);
                    return code.data;
                }
            }

            return null;
        } catch (error) {
            console.error('QR code decoding error:', error);
            return null;
        }
    }

    // 二维码检测成功回调
    onQRCodeDetected(code) {
        if (!this.scanning) return;
        
        this.stopScanning();
        
        // 验证是否为深圳大学二维码
        if (this.isValidSZUQRCode(code)) {
            // 触发扫码成功事件
            const event = new CustomEvent('qrCodeScanned', {
                detail: { code: code }
            });
            document.dispatchEvent(event);
        } else {
            this.showError('请扫描深圳大学个人二维码');
            // 重新开始扫描
            setTimeout(() => {
                if (this.video && this.video.srcObject) {
                    this.startScanning();
                }
            }, 2000);
        }
    }

    // 验证是否为有效的深圳大学二维码
    isValidSZUQRCode(code) {
        // 这里应该实现深圳大学二维码的验证逻辑
        // 例如检查二维码格式、前缀等
        
        // 简单示例：检查是否包含特定标识
        return code && (
            code.includes('szu.edu.cn') || 
            code.includes('深圳大学') ||
            code.length > 10 // 简单长度检查
        );
    }

    // 显示错误信息
    showError(message) {
        const event = new CustomEvent('scanError', {
            detail: { message: message }
        });
        document.dispatchEvent(event);
    }
}

// 导出扫描器类
window.QRCodeScanner = QRCodeScanner;
