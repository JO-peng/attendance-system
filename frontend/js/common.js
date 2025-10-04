// 深圳大学考勤签到系统 - 通用JavaScript

// 全局配置
const CONFIG = {
    API_BASE_URL: window.location.origin || 'http://localhost:5000',
    WECHAT_CORP_ID: 'ww563e8adbd544adf5', // 企业微信CorpID
    WECHAT_AGENT_ID: '1000265', // 企业微信AgentID
    DEFAULT_LANGUAGE: 'zh',
    SUPPORTED_LANGUAGES: ['zh', 'en']
};

// 语言包
const LANGUAGES = {
    zh: {
        // 通用
        loading: '加载中...',
        success: '操作成功',
        error: '操作失败',
        confirm: '确认',
        cancel: '取消',
        submit: '提交',
        save: '保存',
        delete: '删除',
        edit: '编辑',
        view: '查看',
        
        // 签到相关
        signin: '签到',
        signin_success: '签到成功！',
        signin_failed: '签到失败，请重试',
        signin_time_invalid: '当前不在签到时间范围内',
        photo_required: '请先拍照',
        course_required: '请输入课程名称',
        classroom_required: '请输入教室位置',
        location_getting: '正在获取位置信息...',
        location_failed: '获取位置信息失败',
        
        // 表单验证
        field_required: '此字段为必填项',
        invalid_format: '格式不正确',
        
        // 网络错误
        network_error: '网络连接失败，请检查网络设置',
        server_error: '服务器错误，请稍后重试',
        
        // 权限相关
        permission_denied: '权限不足',
        login_required: '请先登录',
        
        // 时间格式
        time_format: 'YYYY-MM-DD HH:mm:ss',
        date_format: 'YYYY-MM-DD'
    },
    en: {
        // Common
        loading: 'Loading...',
        success: 'Success',
        error: 'Error',
        confirm: 'Confirm',
        cancel: 'Cancel',
        submit: 'Submit',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
        view: 'View',
        
        // Sign-in related
        signin: 'Sign in',
        signin_success: 'Sign in successful!',
        signin_failed: 'Sign in failed, please try again',
        signin_time_invalid: 'Not within sign-in time range',
        photo_required: 'Please take a photo first',
        course_required: 'Please enter course name',
        classroom_required: 'Please enter classroom location',
        location_getting: 'Getting location...',
        location_failed: 'Failed to get location',
        
        // Form validation
        field_required: 'This field is required',
        invalid_format: 'Invalid format',
        
        // Network errors
        network_error: 'Network connection failed, please check network settings',
        server_error: 'Server error, please try again later',
        
        // Permission related
        permission_denied: 'Permission denied',
        login_required: 'Please login first',
        
        // Time format
        time_format: 'YYYY-MM-DD HH:mm:ss',
        date_format: 'YYYY-MM-DD'
    }
};

// 应用状态管理
class AppState {
    constructor() {
        this.currentLanguage = this.getStoredLanguage();
        this.userInfo = null;
        this.location = null;
        this.isWeChatReady = false;
    }
    
    getStoredLanguage() {
        return localStorage.getItem('language') || CONFIG.DEFAULT_LANGUAGE;
    }
    
    setLanguage(lang) {
        if (CONFIG.SUPPORTED_LANGUAGES.includes(lang)) {
            this.currentLanguage = lang;
            localStorage.setItem('language', lang);
            this.updateUI();
        }
    }
    
    updateUI() {
        // 更新所有带有多语言属性的元素
        document.querySelectorAll('[data-zh]').forEach(element => {
            const zhText = element.getAttribute('data-zh');
            const enText = element.getAttribute('data-en');
            
            if (this.currentLanguage === 'zh' && zhText) {
                element.textContent = zhText;
            } else if (this.currentLanguage === 'en' && enText) {
                element.textContent = enText;
            }
        });
        
        // 更新placeholder
        document.querySelectorAll('[data-placeholder-zh]').forEach(element => {
            const zhPlaceholder = element.getAttribute('data-placeholder-zh');
            const enPlaceholder = element.getAttribute('data-placeholder-en');
            
            if (this.currentLanguage === 'zh' && zhPlaceholder) {
                element.placeholder = zhPlaceholder;
            } else if (this.currentLanguage === 'en' && enPlaceholder) {
                element.placeholder = enPlaceholder;
            }
        });
        
        // 更新语言切换按钮状态
        document.querySelectorAll('.lang-option').forEach(option => {
            const lang = option.getAttribute('data-lang');
            option.classList.toggle('active', lang === this.currentLanguage);
        });
    }
}

// 全局应用状态
const appState = new AppState();

// 工具函数
const Utils = {
    // 获取多语言文本
    t(key) {
        return LANGUAGES[appState.currentLanguage][key] || key;
    },
    
    // 显示消息提示
    showMessage(message, type = 'info', duration = 3000) {
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--error-color)' : 'var(--gray-700)'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 9999;
            box-shadow: var(--shadow-lg);
            animation: slideDown 0.3s ease;
        `;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(messageEl);
            }, 300);
        }, duration);
    },
    
    // 格式化时间
    formatTime(date, format = 'HH:mm:ss') {
        const d = new Date(date);
        const pad = (n) => n.toString().padStart(2, '0');
        
        return format
            .replace('YYYY', d.getFullYear())
            .replace('MM', pad(d.getMonth() + 1))
            .replace('DD', pad(d.getDate()))
            .replace('HH', pad(d.getHours()))
            .replace('mm', pad(d.getMinutes()))
            .replace('ss', pad(d.getSeconds()));
    },
    
    // 格式化日期时间
    formatDateTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
        return this.formatTime(date, format);
    },
    
    // 格式化日期
    formatDate(date, format = 'YYYY-MM-DD') {
        return this.formatTime(date, format);
    },
    
    // 延迟函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    // API请求封装
    async request(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',  // 跳过ngrok警告页面
            },
        };
        
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${url}`, {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers,
                },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    },
    
    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// 企业微信API封装
const WeChatAPI = {
    // 初始化企业微信JS-SDK
    async init() {
        return new Promise((resolve, reject) => {
            if (typeof wx === 'undefined') {
                reject(new Error('WeChat JS-SDK not loaded'));
                return;
            }
            
            // 获取签名等配置信息
            this.getConfig().then(config => {
                wx.config({
                    beta: true,
                    debug: false,
                    appId: config.corpId,
                    timestamp: config.timestamp,
                    nonceStr: config.nonceStr,
                    signature: config.signature,
                    jsApiList: [
                        'getLocation',
                        'chooseImage',
                        'uploadImage',
                        'downloadImage'
                    ]
                });
                
                wx.ready(() => {
                    appState.isWeChatReady = true;
                    resolve();
                });
                
                wx.error((res) => {
                    console.error('WeChat JS-SDK Error:', res);
                    reject(new Error('WeChat JS-SDK initialization failed'));
                });
            }).catch(reject);
        });
    },
    
    // 获取配置信息
    async getConfig() {
        try {
            return await Utils.request('/api/wechat/config', {
                method: 'POST',
                body: JSON.stringify({
                    url: window.location.href.split('#')[0]
                })
            });
        } catch (error) {
            console.error('Failed to get WeChat config:', error);
            throw error;
        }
    },
    
    // 获取用户信息
    async getUserInfo() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            
            if (code) {
                try {
                    const response = await Utils.request('/api/wechat/userinfo', {
                        method: 'POST',
                        body: JSON.stringify({ code })
                    });
                    
                    if (response.success) {
                        appState.userInfo = response.data;
                        console.log('Successfully got user info from WeChat:', response.data);
                        return response.data;
                    } else {
                        console.error('WeChat API returned error:', response.message);
                        
                        // 检查是否是授权码失效错误
                        if (response.message && response.message.includes('授权码已失效')) {
                            console.log('Authorization code expired, redirecting to re-authorize...');
                            this._redirectToWeChatAuth();
                            return null;
                        }
                        
                        // 在企业微信环境中，即使API失败也不使用模拟数据
                        if (this.isInWeChatWork()) {
                            // 创建基础用户信息，使用code作为标识
                            const basicUserInfo = {
                                student_id: code.substring(0, 10), // 使用code的前10位作为临时学号
                                name: '企业微信用户',
                                wechat_userid: code,
                                department: '未知部门'
                            };
                            appState.userInfo = basicUserInfo;
                            console.log('Using basic user info in WeChat environment:', basicUserInfo);
                            return basicUserInfo;
                        }
                        throw new Error(response.message || '获取用户信息失败');
                    }
                } catch (apiError) {
                    console.error('WeChat API request failed:', apiError);
                    
                    // 检查是否是网络错误或授权码相关错误
                    if (apiError.message && apiError.message.includes('授权码')) {
                        console.log('Authorization code related error, redirecting to re-authorize...');
                        this._redirectToWeChatAuth();
                        return null;
                    }
                    
                    // 在企业微信环境中，即使API失败也不使用模拟数据
                    if (this.isInWeChatWork()) {
                        const basicUserInfo = {
                            student_id: code.substring(0, 10),
                            name: '企业微信用户',
                            wechat_userid: code,
                            department: '未知部门'
                        };
                        appState.userInfo = basicUserInfo;
                        console.log('Using basic user info due to API error:', basicUserInfo);
                        return basicUserInfo;
                    }
                    throw apiError;
                }
            } else if (this.isInWeChatWork()) {
                // 重定向到企业微信授权页面
                this._redirectToWeChatAuth();
                return null;
            }
            
            // 非企业微信环境时，尝试CAS认证
            console.log('Not in WeChat environment, trying CAS authentication...');
            return await this._handleCASAuthentication();
        } catch (error) {
            console.error('Failed to get user info:', error);
            // 无论在什么环境中，都不使用模拟数据
            if (this.isInWeChatWork()) {
                // 企业微信环境中出错时，返回基础信息
                const errorUserInfo = {
                    student_id: '未知',
                    name: '企业微信用户',
                    wechat_userid: 'unknown',
                    department: '未知部门'
                };
                appState.userInfo = errorUserInfo;
                return errorUserInfo;
            } else {
                // 非企业微信环境中出错时，返回null
                return null;
            }
        }
    },
    
    _getMockUserInfo() {
        // 提供模拟用户数据
        console.warn('Using mock user data');
        const mockUserInfo = {
            student_id: '2020000319',
            name: '胡凯峰',
            wechat_userid: 'mock_user',
            department: '计算机学院'
        };
        appState.userInfo = mockUserInfo;
        return mockUserInfo;
    },

    // 处理CAS认证
    async _handleCASAuthentication() {
        try {
            // 首先检查是否已经登录
            const statusResponse = await fetch(`${CONFIG.API_BASE_URL}/cas/status`);
            const statusData = await statusResponse.json();
            
            if (statusData.success && statusData.logged_in && statusData.user) {
                // 已经登录，返回用户信息
                console.log('User already logged in via CAS:', statusData.user);
                const userInfo = {
                    student_id: statusData.user.username || statusData.user.student_id,
                    name: statusData.user.name,
                    wechat_userid: statusData.user.username,
                    department: statusData.user.org_dn || '未知部门'
                };
                appState.userInfo = userInfo;
                return userInfo;
            } else {
                // 未登录，重定向到CAS登录页面
                console.log('User not logged in, redirecting to CAS login...');
                const loginResponse = await fetch(`${CONFIG.API_BASE_URL}/cas/login`, {
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                const loginData = await loginResponse.json();
                
                if (loginData.success && loginData.login_url) {
                    // 重定向到CAS登录页面
                    window.location.href = loginData.login_url;
                    return null; // 重定向后不会执行到这里
                } else {
                    throw new Error(loginData.message || 'CAS登录失败');
                }
            }
        } catch (error) {
            console.error('CAS authentication failed:', error);
            throw new Error('CAS认证失败: ' + error.message);
        }
    },
    
    // 重定向到企业微信授权页面
    _redirectToWeChatAuth() {
        const redirectUrl = encodeURIComponent(window.location.href.split('?')[0]);
        const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${CONFIG.WECHAT_CORP_ID}&redirect_uri=${redirectUrl}&response_type=code&scope=snsapi_base&state=attendance#wechat_redirect`;
        window.location.href = authUrl;
    },
    
    // 检查是否在企业微信环境中
    isInWeChatWork() {
        const ua = navigator.userAgent.toLowerCase();
        return ua.includes('wxwork') || ua.includes('micromessenger');
    },
    
    // 获取地理位置
    async getLocation() {
        return new Promise((resolve, reject) => {
            if (!appState.isWeChatReady) {
                console.error('WeChat JS-SDK not ready for location');
                reject(new Error('WeChat JS-SDK not ready'));
                return;
            }
            
            console.log('Attempting to get location via WeChat JS-SDK...');
            
            wx.getLocation({
                type: 'gcj02',
                success: (res) => {
                    console.log('WeChat location success:', res);
                    const location = {
                        latitude: res.latitude,
                        longitude: res.longitude,
                        accuracy: res.accuracy,
                        speed: res.speed,
                        altitude: res.altitude
                    };
                    appState.location = location;
                    resolve(location);
                },
                fail: (error) => {
                    console.error('WeChat getLocation failed:', error);
                    // 尝试使用浏览器原生定位API作为备选
                    this._getBrowserLocation().then(resolve).catch(() => {
                        reject(new Error(`WeChat location failed: ${JSON.stringify(error)}`));
                    });
                }
            });
        });
    },
    
    // 浏览器原生定位API备选方案
    async _getBrowserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Browser geolocation not supported'));
                return;
            }
            
            console.log('Trying browser geolocation as fallback...');
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('Browser location success:', position);
                    const location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        altitude: position.coords.altitude,
                        speed: position.coords.speed
                    };
                    appState.location = location;
                    resolve(location);
                },
                (error) => {
                    console.error('Browser geolocation failed:', error);
                    reject(new Error(`Browser location failed: ${error.message}`));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        });
    },
    
    // 拍照或选择图片
    async chooseImage() {
        return new Promise((resolve, reject) => {
            if (!appState.isWeChatReady) {
                reject(new Error('WeChat JS-SDK not ready'));
                return;
            }
            
            wx.chooseImage({
                count: 1,
                sizeType: ['compressed'],
                sourceType: ['camera', 'album'],
                success: (res) => {
                    resolve(res.localIds[0]);
                },
                fail: (error) => {
                    console.error('Failed to choose image:', error);
                    reject(new Error('Failed to choose image'));
                }
            });
        });
    },
    
    // 上传图片
    async uploadImage(localId) {
        return new Promise((resolve, reject) => {
            if (!appState.isWeChatReady) {
                reject(new Error('WeChat JS-SDK not ready'));
                return;
            }
            
            wx.uploadImage({
                localId: localId,
                isShowProgressTips: 1,
                success: (res) => {
                    resolve(res.serverId);
                },
                fail: (error) => {
                    console.error('Failed to upload image:', error);
                    reject(new Error('Failed to upload image'));
                }
            });
        });
    }
};

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 初始化UI语言
    appState.updateUI();
    
    // 绑定语言切换事件
    document.querySelectorAll('.lang-option').forEach(option => {
        option.addEventListener('click', () => {
            const lang = option.getAttribute('data-lang');
            appState.setLanguage(lang);
        });
    });
    
    // 初始化企业微信
    try {
        await WeChatAPI.init();
        console.log('WeChat JS-SDK initialized successfully');
    } catch (error) {
        console.warn('WeChat JS-SDK initialization failed:', error);
        // 在非企业微信环境下继续运行
    }
    
    // 获取用户信息
    try {
        await WeChatAPI.getUserInfo();
        console.log('User info loaded:', appState.userInfo);
    } catch (error) {
        console.warn('Failed to load user info:', error);
    }
});

// 导出全局对象
window.AppState = appState;
window.Utils = Utils;
window.WeChatAPI = WeChatAPI;
window.CONFIG = CONFIG;