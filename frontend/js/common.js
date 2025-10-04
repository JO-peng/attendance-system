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
        this.userInfo = this.getStoredUserInfo();
        this.location = this.getStoredLocation();
        this.isWeChatReady = false;
        this.cache = {
            userInfo: { data: null, timestamp: 0, ttl: 5 * 60 * 1000 }, // 5分钟缓存
            location: { data: null, timestamp: 0, ttl: 10 * 60 * 1000 }, // 10分钟缓存
            buildingInfo: { data: null, timestamp: 0, ttl: 15 * 60 * 1000 } // 15分钟缓存
        };
    }
    
    getStoredLanguage() {
        return localStorage.getItem('language') || CONFIG.DEFAULT_LANGUAGE;
    }
    
    getStoredUserInfo() {
        try {
            const stored = localStorage.getItem('userInfo');
            const timestamp = localStorage.getItem('userInfo_timestamp');
            if (stored && timestamp) {
                const age = Date.now() - parseInt(timestamp);
                // 用户信息缓存5分钟
                if (age < 5 * 60 * 1000) {
                    return JSON.parse(stored);
                } else {
                    // 缓存过期，清除
                    this.clearStoredUserInfo();
                }
            }
        } catch (error) {
            console.error('Failed to get stored user info:', error);
            this.clearStoredUserInfo();
        }
        return null;
    }
    
    getStoredLocation() {
        try {
            const stored = localStorage.getItem('location');
            const timestamp = localStorage.getItem('location_timestamp');
            if (stored && timestamp) {
                const age = Date.now() - parseInt(timestamp);
                // 位置信息缓存10分钟
                if (age < 10 * 60 * 1000) {
                    return JSON.parse(stored);
                } else {
                    // 缓存过期，清除
                    this.clearStoredLocation();
                }
            }
        } catch (error) {
            console.error('Failed to get stored location:', error);
            this.clearStoredLocation();
        }
        return null;
    }
    
    setUserInfo(userInfo) {
        this.userInfo = userInfo;
        if (userInfo) {
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            localStorage.setItem('userInfo_timestamp', Date.now().toString());
        } else {
            this.clearStoredUserInfo();
        }
    }
    
    setLocation(location) {
        this.location = location;
        if (location) {
            localStorage.setItem('location', JSON.stringify(location));
            localStorage.setItem('location_timestamp', Date.now().toString());
        } else {
            this.clearStoredLocation();
        }
    }
    
    clearStoredUserInfo() {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('userInfo_timestamp');
        this.userInfo = null;
    }
    
    clearStoredLocation() {
        localStorage.removeItem('location');
        localStorage.removeItem('location_timestamp');
        this.location = null;
    }
    
    // 通用缓存方法
    setCache(key, data, customTtl = null) {
        if (this.cache[key]) {
            this.cache[key].data = data;
            this.cache[key].timestamp = Date.now();
            if (customTtl) {
                this.cache[key].ttl = customTtl;
            }
        }
    }
    
    getCache(key) {
        if (this.cache[key]) {
            const { data, timestamp, ttl } = this.cache[key];
            const age = Date.now() - timestamp;
            if (age < ttl && data !== null) {
                return data;
            } else {
                // 缓存过期，清除
                this.cache[key].data = null;
                this.cache[key].timestamp = 0;
            }
        }
        return null;
    }
    
    clearCache(key = null) {
        if (key && this.cache[key]) {
            this.cache[key].data = null;
            this.cache[key].timestamp = 0;
        } else if (!key) {
            // 清除所有缓存
            Object.keys(this.cache).forEach(k => {
                this.cache[k].data = null;
                this.cache[k].timestamp = 0;
            });
            this.clearStoredUserInfo();
            this.clearStoredLocation();
        }
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

// 资源管理器
const ResourceManager = {
    loadedCSS: new Set(),
    loadedJS: new Set(),
    
    // 懒加载CSS文件
    async loadCSS(href) {
        if (this.loadedCSS.has(href)) {
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => {
                this.loadedCSS.add(href);
                resolve();
            };
            link.onerror = reject;
            document.head.appendChild(link);
        });
    },
    
    // 懒加载JS文件
    async loadJS(src) {
        if (this.loadedJS.has(src)) {
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                this.loadedJS.add(src);
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },
    
    // 预加载资源
    preloadResource(href, type = 'stylesheet') {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = href;
        link.as = type === 'stylesheet' ? 'style' : 'script';
        document.head.appendChild(link);
    },
    
    // 预加载页面相关资源
    preloadPageResources() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        // 根据当前页面预加载可能访问的其他页面资源
        const preloadMap = {
            'index.html': ['css/records.css', 'css/statistics.css', 'js/records.js', 'js/statistics.js'],
            'records.html': ['css/statistics.css', 'js/statistics.js'],
            'statistics.html': ['css/records.css', 'js/records.js'],
            'feedback.html': []
        };
        
        const resourcesToPreload = preloadMap[currentPage] || [];
        resourcesToPreload.forEach(resource => {
            const type = resource.endsWith('.css') ? 'stylesheet' : 'script';
            this.preloadResource(resource, type);
        });
    }
};

// 工具函数
const Utils = {
    // 获取多语言文本
    t(key) {
        return LANGUAGES[appState.currentLanguage][key] || key;
    },
    
    // 显示消息提示
    showMessage(message, type = 'info', duration = 3000, options = {}) {
        // 清除之前的消息（如果需要）
        if (options.clearPrevious) {
            document.querySelectorAll('.message').forEach(el => el.remove());
        }
        
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        
        // 支持HTML内容
        if (options.html) {
            messageEl.innerHTML = message;
        } else {
            messageEl.textContent = message;
        }
        
        // 获取颜色配置
        const colors = {
            success: '#10B981',
            error: '#EF4444',
            warning: '#F59E0B',
            info: '#3B82F6',
            loading: '#6B7280'
        };
        
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 9999;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            animation: slideDown 0.3s ease;
            max-width: 90%;
            word-wrap: break-word;
            font-size: 14px;
            line-height: 1.4;
        `;
        
        // 添加图标
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            loading: '⏳'
        };
        
        if (icons[type] && !options.noIcon) {
            const icon = document.createElement('span');
            icon.textContent = icons[type] + ' ';
            icon.style.marginRight = '8px';
            messageEl.insertBefore(icon, messageEl.firstChild);
        }
        
        // 添加关闭按钮（对于持久消息）
        if (options.persistent || duration > 10000) {
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '×';
            closeBtn.style.cssText = `
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                margin-left: 12px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            `;
            closeBtn.onclick = () => this._removeMessage(messageEl);
            messageEl.appendChild(closeBtn);
        }
        
        document.body.appendChild(messageEl);
        
        // 自动移除（除非是持久消息）
        if (!options.persistent) {
            setTimeout(() => {
                this._removeMessage(messageEl);
            }, duration);
        }
        
        return messageEl;
    },
    
    // 移除消息的辅助方法
    _removeMessage(messageEl) {
        if (messageEl && messageEl.parentNode) {
            messageEl.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }
    },
    
    // 显示加载消息
    showLoading(message = '加载中...') {
        return this.showMessage(message, 'loading', 0, { persistent: true });
    },
    
    // 隐藏加载消息
    hideLoading(loadingEl) {
        if (loadingEl) {
            this._removeMessage(loadingEl);
        }
    },
    
    // 显示确认对话框
    showConfirm(message, onConfirm, onCancel) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            padding: 24px;
            border-radius: 12px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        `;
        
        dialog.innerHTML = `
            <div style="margin-bottom: 20px; font-size: 16px; line-height: 1.5;">${message}</div>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="cancelBtn" style="padding: 8px 16px; border: 1px solid #ccc; background: white; border-radius: 6px; cursor: pointer;">取消</button>
                <button id="confirmBtn" style="padding: 8px 16px; border: none; background: #3B82F6; color: white; border-radius: 6px; cursor: pointer;">确认</button>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        const confirmBtn = dialog.querySelector('#confirmBtn');
        const cancelBtn = dialog.querySelector('#cancelBtn');
        
        const cleanup = () => {
            document.body.removeChild(overlay);
        };
        
        confirmBtn.onclick = () => {
            cleanup();
            if (onConfirm) onConfirm();
        };
        
        cancelBtn.onclick = () => {
            cleanup();
            if (onCancel) onCancel();
        };
        
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                cleanup();
                if (onCancel) onCancel();
            }
        };
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
    
    // 请求缓存和去重
    _requestCache: new Map(),
    _pendingRequests: new Map(),
    
    // API请求封装
    async request(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',  // 跳过ngrok警告页面
            },
        };
        
        // 生成请求的唯一键
        const requestKey = `${options.method || 'GET'}:${url}:${JSON.stringify(options.body || {})}`;
        
        // 对于GET请求，检查缓存
        if (!options.method || options.method === 'GET') {
            const cached = this._requestCache.get(requestKey);
            if (cached && Date.now() - cached.timestamp < 30000) { // 30秒缓存
                console.log('Using cached response for:', url);
                return cached.data;
            }
        }
        
        // 检查是否有相同的请求正在进行
        if (this._pendingRequests.has(requestKey)) {
            console.log('Request already pending, waiting for result:', url);
            return this._pendingRequests.get(requestKey);
        }
        
        // 创建新的请求Promise
        const requestPromise = this._makeRequest(url, options, defaultOptions);
        
        // 缓存正在进行的请求
        this._pendingRequests.set(requestKey, requestPromise);
        
        try {
            const result = await requestPromise;
            
            // 对于GET请求，缓存结果
            if (!options.method || options.method === 'GET') {
                this._requestCache.set(requestKey, {
                    data: result,
                    timestamp: Date.now()
                });
            }
            
            return result;
        } finally {
            // 清除正在进行的请求
            this._pendingRequests.delete(requestKey);
        }
    },
    
    // 实际执行请求的方法
    async _makeRequest(url, options, defaultOptions) {
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
    
    // 清除请求缓存
    clearRequestCache() {
        this._requestCache.clear();
        console.log('Request cache cleared');
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
            // 首先检查是否已经有缓存的用户信息
            if (appState.userInfo && appState.userInfo.student_id && appState.userInfo.student_id !== '未知') {
                console.log('Using cached user info:', appState.userInfo);
                return appState.userInfo;
            }
            
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            
            if (code) {
                // 检查是否已经使用过这个授权码
                const usedCode = sessionStorage.getItem('used_wechat_code');
                if (usedCode === code) {
                    console.log('Authorization code already used, redirecting to re-authorize...');
                    this._redirectToWeChatAuth();
                    return null;
                }
                
                try {
                    const response = await Utils.request('/api/wechat/userinfo', {
                        method: 'POST',
                        body: JSON.stringify({ code })
                    });
                    
                    if (response.success) {
                        // 标记授权码已使用
                        sessionStorage.setItem('used_wechat_code', code);
                        
                        appState.userInfo = response.data;
                        console.log('Successfully got user info from WeChat:', response.data);
                        
                        // 清除URL中的code参数，避免重复使用
                        this._clearCodeFromUrl();
                        
                        return response.data;
                    } else {
                        console.error('WeChat API returned error:', response.message);
                        
                        // 检查是否是授权码失效错误
                        if (response.message && response.message.includes('授权码已失效')) {
                            console.log('Authorization code expired, redirecting to re-authorize...');
                            sessionStorage.setItem('used_wechat_code', code);
                            this._redirectToWeChatAuth();
                            return null;
                        }
                        
                        // 在企业微信环境中，如果API失败，提示用户重新授权
                        if (this.isInWeChatWork()) {
                            console.log('WeChat API failed, redirecting to re-authorize...');
                            this._redirectToWeChatAuth();
                            return null;
                        }
                        throw new Error(response.message || '获取用户信息失败');
                    }
                } catch (apiError) {
                    console.error('WeChat API request failed:', apiError);
                    
                    // 标记授权码已使用（避免重复尝试）
                    sessionStorage.setItem('used_wechat_code', code);
                    
                    // 检查是否是网络错误或授权码相关错误
                    if (apiError.message && (apiError.message.includes('授权码') || apiError.message.includes('Invalid'))) {
                        console.log('Authorization code related error, redirecting to re-authorize...');
                        this._redirectToWeChatAuth();
                        return null;
                    }
                    
                    // 在企业微信环境中，API失败时重新授权
                    if (this.isInWeChatWork()) {
                        console.log('API error in WeChat environment, redirecting to re-authorize...');
                        this._redirectToWeChatAuth();
                        return null;
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
            // 在企业微信环境中出错时，重新授权
            if (this.isInWeChatWork()) {
                console.log('Error in WeChat environment, redirecting to re-authorize...');
                this._redirectToWeChatAuth();
                return null;
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
    
    // 清除URL中的code参数
    _clearCodeFromUrl() {
        const url = new URL(window.location);
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        window.history.replaceState({}, document.title, url.toString());
    },
    
    // 检查是否在企业微信环境中
    isInWeChatWork() {
        const ua = navigator.userAgent.toLowerCase();
        const isWxWork = ua.includes('wxwork');
        const isMicroMessenger = ua.includes('micromessenger');
        const hasWxObject = typeof wx !== 'undefined';
        
        console.log('WeChat environment check:', {
            userAgent: ua,
            isWxWork,
            isMicroMessenger,
            hasWxObject,
            isWeChatReady: appState.isWeChatReady
        });
        
        return (isWxWork || isMicroMessenger) && hasWxObject;
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
            console.log('chooseImage called, checking environment...');
            console.log('appState.isWeChatReady:', appState.isWeChatReady);
            console.log('typeof wx:', typeof wx);
            
            if (!appState.isWeChatReady) {
                const error = new Error('WeChat JS-SDK not ready');
                console.error('chooseImage failed:', error.message);
                reject(error);
                return;
            }
            
            if (typeof wx === 'undefined' || typeof wx.chooseImage !== 'function') {
                const error = new Error('WeChat chooseImage API not available');
                console.error('chooseImage failed:', error.message);
                reject(error);
                return;
            }
            
            console.log('Calling wx.chooseImage...');
            wx.chooseImage({
                count: 1,
                sizeType: ['compressed'],
                sourceType: ['camera', 'album'],
                success: (res) => {
                    console.log('wx.chooseImage success:', res);
                    if (res.localIds && res.localIds.length > 0) {
                        resolve(res.localIds[0]);
                    } else {
                        reject(new Error('No image selected'));
                    }
                },
                fail: (error) => {
                    console.error('wx.chooseImage failed:', error);
                    // 根据错误信息判断具体原因
                    let errorMessage = 'Failed to choose image';
                    if (error.errMsg) {
                        if (error.errMsg.includes('cancel')) {
                            errorMessage = 'User cancelled image selection';
                        } else if (error.errMsg.includes('permission')) {
                            errorMessage = 'Camera permission denied';
                        } else if (error.errMsg.includes('not support')) {
                            errorMessage = 'Camera not supported';
                        }
                    }
                    reject(new Error(errorMessage));
                },
                cancel: () => {
                    console.log('wx.chooseImage cancelled by user');
                    reject(new Error('User cancelled image selection'));
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
    
    // 预加载页面资源
    ResourceManager.preloadPageResources();
    
    // 初始化企业微信
    try {
        await WeChatAPI.init();
        console.log('WeChat JS-SDK initialized successfully');
    } catch (error) {
        console.warn('WeChat JS-SDK initialization failed:', error);
        // 在非企业微信环境下继续运行
    }
    
    // 只在首页自动获取用户信息，其他页面按需获取
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPage === 'index.html' || currentPage === '') {
        try {
            // 检查是否有缓存的用户信息
            const cachedUserInfo = appState.getStoredUserInfo();
            if (!cachedUserInfo) {
                await WeChatAPI.getUserInfo();
                console.log('User info loaded:', appState.userInfo);
            } else {
                console.log('Using cached user info:', cachedUserInfo);
                appState.userInfo = cachedUserInfo;
            }
        } catch (error) {
            console.warn('Failed to load user info:', error);
        }
    }
});

// 导出全局对象
window.AppState = appState;
window.Utils = Utils;
window.WeChatAPI = WeChatAPI;
window.ResourceManager = ResourceManager;
window.CONFIG = CONFIG;