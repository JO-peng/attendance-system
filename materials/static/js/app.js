// 应用主逻辑
class MaterialApp {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.showPage('homePage');
        // 检测移动设备
        this.detectMobile();
        // 加载用户信息
        this.loadUserInfo();
        // 加载最近核验记录
        this.loadRecentRecords();
        // 初始化企业微信功能
        this.initWeworkConfig();
    }

    // 检测移动设备
    detectMobile() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            console.log('检测到移动设备，启用移动端优化');
            // 显示移动端提示
            document.addEventListener('DOMContentLoaded', () => {
                const mobileTips = document.getElementById('mobileTips');
                if (mobileTips) {
                    mobileTips.style.display = 'block';
                }
            });
        }
    }

    // 加载用户信息
    async loadUserInfo() {
        try {
            const response = await fetch('/api/current-user');
            const data = await response.json();

            if (data.code === 200) {
                this.displayUserInfo(data.data);
            } else {
                console.log('用户未登录或会话已过期');
                // 不显示用户信息，但不影响其他功能
            }
        } catch (error) {
            console.error('加载用户信息失败:', error);
            // 网络错误，不影响其他功能
        }
    }

    // 显示用户信息
    displayUserInfo(user) {
        const userInfoHeader = document.getElementById('userInfoHeader');
        const userName = document.getElementById('userName');
        const userType = document.getElementById('userType');

        if (userInfoHeader && userName) {
            userName.textContent = user.name || user.username;
            if (userType) {
                userType.textContent = user.user_type || '';
            }
            userInfoHeader.style.display = 'flex';

            console.log('用户信息显示成功:', user);
        }
    }

    // 加载最近核验记录
    async loadRecentRecords() {
        try {
            const response = await fetch('/api/my-recent-records');
            const data = await response.json();

            if (data.code === 200) {
                this.displayRecentRecords(data.data);
            } else {
                console.log('加载最近记录失败:', data.msg);
                this.showNoRecords();
            }
        } catch (error) {
            console.error('加载最近记录失败:', error);
            this.showNoRecords();
        }
    }

    // 显示最近报到记录
    displayRecentRecords(records) {
        const recordsList = document.getElementById('recentRecordsList');

        if (!recordsList) return;

        if (!records || records.length === 0) {
            recordsList.innerHTML = '<div class="no-records">暂无报到记录</div>';
            return;
        }

        let html = '';
        records.forEach(record => {
            const receivedTime = new Date(record.received_at).toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });

            html += `
                <div class="record-item">
                    <div class="record-name">${record.name}</div>
                    <div class="record-dept">${record.dept || '未知部门'}</div>
                    <div class="record-time">${receivedTime}</div>
                </div>
            `;
        });

        recordsList.innerHTML = html;
        console.log('最近记录显示成功:', records);
    }

    // 显示无记录状态
    showNoRecords() {
        const recordsList = document.getElementById('recentRecordsList');
        if (recordsList) {
            recordsList.innerHTML = '<div class="no-records">暂无报到记录</div>';
        }
    }

    // 初始化企业微信配置
    async initWeworkConfig() {
        // 等待SDK加载完成
        await this.waitForWeWorkSDK();

        try {
            // 检查是否在企业微信环境中
            if (!this.isInWeWork()) {
                console.warn('非企业微信环境，企业微信扫码功能将不可用');
                // 禁用企业微信扫码按钮
                const weworkButton = document.getElementById('weworkScanButton');
                if (weworkButton) {
                    weworkButton.disabled = true;
                    weworkButton.innerHTML = `
                        <div class="wework-icon">🏢</div>
                        <span>企业微信扫码</span>
                        <small>请在企业微信中打开</small>
                    `;
                }
                return;
            }

            // 检查ww对象是否存在
            if (typeof ww === 'undefined') {
                console.error('企业微信JS-SDK未加载');
                throw new Error('企业微信JS-SDK未加载，请检查网络连接');
            }

            console.log('开始初始化企业微信JS-SDK...', {
                corpId: 'ww563e8adbd544adf5',
                agentId: 1000265,
                currentUrl: window.location.href,
                sdkVersion: ww.SDK_VERSION
            });

            // 使用新版企业微信JS-SDK
            ww.register({
                corpId: 'ww563e8adbd544adf5',
                agentId: 1000265,
                jsApiList: ['scanQRCode'],
                getConfigSignature: async (url) => {
                    console.log('获取企业签名，URL:', url);
                    // 调用后台获取企业签名
                    const response = await fetch('/api/wework-config-signature', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            url: url,
                            type: 'config'
                        })
                    });
                    const data = await response.json();
                    if (data.code !== 200) {
                        throw new Error(data.msg);
                    }
                    console.log('企业签名获取成功:', data.data);
                    return {
                        timestamp: data.data.timestamp,
                        nonceStr: data.data.nonceStr,
                        signature: data.data.signature
                    };
                }
            });

            console.log('企业微信JS-SDK注册成功');

        } catch (error) {
            console.error('企业微信JS-SDK初始化失败:', error);
            // 禁用企业微信扫码按钮
            const weworkButton = document.getElementById('weworkScanButton');
            if (weworkButton) {
                weworkButton.disabled = true;
                weworkButton.innerHTML = `
                    <div class="wework-icon">❌</div>
                    <span>企业微信扫码</span>
                    <small>初始化失败</small>
                `;
            }
        }
    }

    // 等待企业微信SDK加载完成
    async waitForWeWorkSDK() {
        return new Promise((resolve) => {
            const checkSDK = () => {
                if (typeof ww !== 'undefined') {
                    console.log('企业微信SDK已加载，版本:', ww.SDK_VERSION);
                    resolve();
                } else {
                    console.log('等待企业微信SDK加载...');
                    setTimeout(checkSDK, 100);
                }
            };
            checkSDK();
        });
    }

    // 检查是否在企业微信环境中
    isInWeWork() {
        const ua = navigator.userAgent.toLowerCase();
        const isWxWork = ua.includes('wxwork');
        const isWeChat = ua.includes('micromessenger');
        console.log('当前环境:', {
            userAgent: ua,
            isWxWork: isWxWork,
            isWeChat: isWeChat,
            isSecure: window.location.protocol === 'https:',
            currentUrl: window.location.href
        });
        return isWxWork || isWeChat;
    }

    // 绑定事件
    bindEvents() {
        // 报到方式选择标签
        document.getElementById('scanTab').addEventListener('click', () => {
            this.switchMethod('scan');
        });
        document.getElementById('manualTab').addEventListener('click', () => {
            this.switchMethod('manual');
        });

        // 企业微信扫码按钮
        document.getElementById('weworkScanButton').addEventListener('click', () => {
            this.startWeworkScan();
        });

        // 手动查询按钮
        document.getElementById('manualLookupButton').addEventListener('click', () => {
            this.startManualLookup();
        });

        // 学工号输入框回车事件
        document.getElementById('cardNumberInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.startManualLookup();
            }
        });

        // 确认报到按钮
        document.getElementById('confirmButton').addEventListener('click', () => {
            this.confirmReceive();
        });

        // 返回首页按钮
        document.getElementById('backToHomeButton').addEventListener('click', () => {
            this.goHome();
        });

        // 错误模态框确定按钮
        document.getElementById('errorOkButton').addEventListener('click', () => {
            this.hideError();
        });
    }

    // 显示页面
    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageId).classList.add('active');
    }

    // 切换报到方式
    switchMethod(method) {
        // 更新标签状态
        document.querySelectorAll('.method-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(method + 'Tab').classList.add('active');

        // 更新内容区域
        document.querySelectorAll('.method-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(method + 'Section').classList.add('active');

        console.log('切换到报到方式:', method);
    }

    // 开始手动查询
    async startManualLookup() {
        const cardNumberInput = document.getElementById('cardNumberInput');
        const cardNumber = cardNumberInput.value.trim();

        if (!cardNumber) {
            this.showError('请输入学工号');
            cardNumberInput.focus();
            return;
        }

        // 简单验证学工号格式
        if (cardNumber.length < 6) {
            this.showError('学工号长度不能少于6位');
            cardNumberInput.focus();
            return;
        }

        this.showLoading();

        try {
            const response = await fetch('/api/manual-lookup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    card_number: cardNumber
                })
            });

            const data = await response.json();
            this.hideLoading();

            if (data.code === 200) {
                this.currentUser = data;
                this.showResult(data);
            } else {
                this.showError(data.msg || '查询失败，请检查学工号是否正确');
                cardNumberInput.focus();
            }
        } catch (error) {
            this.hideLoading();
            this.showError('网络错误，请检查网络连接');
            cardNumberInput.focus();
        }
    }

    // 开始企业微信扫码
    startWeworkScan() {
        if (!this.isInWeWork()) {
            this.showError('请在企业微信中打开此页面');
            return;
        }

        if (typeof ww === 'undefined') {
            this.showError('企业微信SDK未加载，请刷新页面重试');
            return;
        }

        try {
            ww.scanQRCode({
                needResult: 1,  // 返回扫描结果
                scanType: ["qrCode", "barCode"],  // 支持二维码和条形码
                success: (res) => {
                    console.log('企业微信扫码成功:', res);
                    if (res.resultStr) {
                        this.handleQRCodeScanned(res.resultStr);
                    }
                },
                fail: (err) => {
                    console.error('企业微信扫码失败:', err);
                    let errorMessage = '扫码失败，请重试';

                    if (err.errMsg) {
                        if (err.errMsg.indexOf('function_not_exist') > -1) {
                            errorMessage = '请在企业微信中打开此页面';
                        } else if (err.errMsg.indexOf('permission denied') > -1) {
                            errorMessage = '摄像头权限被拒绝，请允许摄像头访问';
                        } else if (err.errMsg.indexOf('invalid signature') > -1) {
                            errorMessage = '签名验证失败，请刷新页面重试';
                        } else {
                            errorMessage = `扫码失败: ${err.errMsg}`;
                        }
                    }

                    this.showError(errorMessage);
                },
                cancel: () => {
                    console.log('用户取消扫码');
                }
            });
        } catch (error) {
            console.error('调用企业微信扫码异常:', error);
            this.showError('扫码功能异常，请重试');
        }
    }

    // 处理二维码扫描结果
    async handleQRCodeScanned(code) {
        this.showLoading();
        
        try {
            const response = await fetch('/api/scan-qrcode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    qr_code: code,
                    device_id: this.getDeviceId()
                })
            });

            const data = await response.json();
            this.hideLoading();

            if (data.code === 200) {
                this.currentUser = data;
                this.showResult(data);
            } else {
                this.showError(data.msg || '二维码识别失败，请重试');
                this.goBack();
            }
        } catch (error) {
            this.hideLoading();
            this.showError('网络错误，请检查网络连接');
            this.goBack();
        }
    }

    // 显示扫描结果
    showResult(data) {
        this.showPage('resultPage');
        
        const resultIcon = document.getElementById('resultIcon');
        const resultMessage = document.getElementById('resultMessage');
        const userInfo = document.getElementById('userInfo');
        const confirmButton = document.getElementById('confirmButton');

        if (data.has_received) {
            // 已报到
            resultIcon.textContent = '⚠️';
            resultIcon.style.color = '#ffc107';
            resultMessage.innerHTML = `<strong>${data.name}（${data.credential_no}）</strong><br>您已完成报到，无法重复报到<br><small>如有疑问请联系管理员</small>`;
            confirmButton.style.display = 'none';
        } else {
            // 可以报到
            resultIcon.textContent = '✅';
            resultIcon.style.color = '#28a745';
            resultMessage.innerHTML = `<strong>扫码成功！</strong><br>${data.name}（${data.credential_no}）<br>您可完成报到`;
            confirmButton.style.display = 'block';
        }

        // 显示用户信息
        userInfo.innerHTML = `
            <p><strong>姓名：</strong>${data.name}</p>
            <p><strong>工号：</strong>${data.credential_no}</p>
            ${data.dept ? `<p><strong>部门：</strong>${data.dept}</p>` : ''}
        `;
    }

    // 确认报到
    async confirmReceive() {
        if (!this.currentUser) return;

        this.showLoading();

        try {
            const response = await fetch('/api/confirm-receive', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    card_number: this.currentUser.credential_no,
                    name: this.currentUser.name,
                    dept: this.currentUser.dept || ''
                })
            });

            const data = await response.json();
            this.hideLoading();

            if (data.code === 200) {
                // 报到成功
                const resultIcon = document.getElementById('resultIcon');
                const resultMessage = document.getElementById('resultMessage');
                const confirmButton = document.getElementById('confirmButton');

                resultIcon.textContent = '🎉';
                resultIcon.style.color = '#28a745';
                resultMessage.innerHTML = `<strong>新生报到成功！</strong><br>感谢您的参与`;
                confirmButton.style.display = 'none';

                // 刷新最近报到记录
                this.loadRecentRecords();
            } else {
                this.showError(data.msg || '报到失败，请重试');
            }
        } catch (error) {
            this.hideLoading();
            this.showError('网络错误，请重试');
        }
    }

    // 返回首页
    goBack() {
        this.showPage('homePage');
    }

    // 返回首页
    goHome() {
        this.currentUser = null;
        this.showPage('homePage');
        // 清空手动输入框
        const cardNumberInput = document.getElementById('cardNumberInput');
        if (cardNumberInput) {
            cardNumberInput.value = '';
        }
    }

    // 处理物理返回键
    handleBackKey() {
        const activePage = document.querySelector('.page.active');
        if (activePage.id === 'scanPage') {
            this.goBack();
        } else if (activePage.id === 'resultPage') {
            this.goHome();
        }
    }

    // 显示加载状态
    showLoading() {
        document.getElementById('loading').classList.add('show');
    }

    // 隐藏加载状态
    hideLoading() {
        document.getElementById('loading').classList.remove('show');
    }

    // 显示错误信息
    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorModal').classList.add('show');
    }

    // 隐藏错误信息
    hideError() {
        document.getElementById('errorModal').classList.remove('show');
    }

    // 获取设备ID
    getDeviceId() {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = 'device-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    }
}

// 应用启动
document.addEventListener('DOMContentLoaded', () => {
    new MaterialApp();
});
