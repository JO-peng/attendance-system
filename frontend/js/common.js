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
        date_format: 'YYYY-MM-DD',
        
        // 用户信息相关
        user_info_not_available: '无法获取用户信息，请在企业微信环境中访问',
        user_info_not_loaded: '用户信息未获取，请在企业微信中访问或刷新页面',
        user_info_refresh_required: '用户信息未获取，请刷新页面或在企业微信中访问',
        user_info_load_failed: '无法获取用户信息，请刷新页面重试',
        auth_expired: '授权已过期，请刷新页面重新登录',
        auth_expired_stats: '授权已过期，统计数据无法加载',
        
        // 位置相关
        location_success: '位置获取成功',
        location_service_init_failed: '定位服务初始化失败，请刷新页面重试',
        location_permission_failed: '定位失败，请检查定位权限或刷新页面重试',
        
        // 拍照相关
        camera_opening: '正在打开相机...',
        camera_error: '拍照功能异常，请重试',
        image_too_large: '图片文件过大，请选择小于5MB的图片',
        select_image_file: '请选择图片文件',
        image_upload_success: '图片上传成功',
        image_process_failed: '图片处理失败，请重试',
        image_read_failed: '图片读取失败，请重试',
        no_image_selected: '未选择图片',
        image_selection_cancelled: '已取消选择图片',
        file_selector_error: '无法打开文件选择器，请检查浏览器权限',
        
        // 数据加载相关
        load_attendance_failed: '加载出勤数据失败，使用本地计算',
        load_records_failed: '无法获取记录数据，请检查网络连接',
        
        // 导出相关
        exporting_data: '正在导出数据...',
        export_success: '导出成功',
        export_failed: '导出失败',
        
        // 状态相关
        status_present: '已签到',
        status_late: '迟到',
        status_absent: '缺勤',
        
        // 位置相关
        unknown_location: '未知',
        latitude: '纬度',
        longitude: '经度',
        meters: '米',
        kilometers: '公里',
        
        // 表单相关
        form_reset: '表单已重置',
        
        // 签到状态
        status_present: '正常签到',
        status_late: '迟到签到',
        status_absent: '缺席',
        status_no_class: '当前无课程',
        
        // 位置信息
        distance_to_building: '距离最近签到楼',
        building_too_far: '距离签到楼太远',
        unknown_location: '位置未知',
        current_coordinates: '当前位置坐标',
        meters: '米',
        latitude: '纬度',
        longitude: '经度',
        
        // 时间选择
        year: '年',
        month: '月',
        january: '一月',
        february: '二月',
        march: '三月',
        april: '四月',
        may: '五月',
        june: '六月',
        july: '七月',
        august: '八月',
        september: '九月',
        october: '十月',
        november: '十一月',
        december: '十二月',
        
        // 反馈相关
        rating_required: '请选择评分',
        max_images_exceeded: '最多只能上传{count}张图片',
        invalid_image_file: '{filename} 不是有效的图片文件',
        image_too_large_specific: '{filename} 文件过大，请选择小于5MB的图片',
        submit_failed_retry: '提交失败，请稍后重试',
        
        // 重置确认对话框
        reset_confirm_title: '确认重置',
        reset_confirm_message: '确定要重置表单吗？所有已填写的内容将被清除。',
        
        // 课程信息相关
        course_status_current: '正在进行',
        course_status_upcoming: '即将开始',
        course_status_past: '已结束',
        course_today: '今天',
        course_tomorrow: '明天',
        course_sunday: '周日',
        course_monday: '周一',
        course_tuesday: '周二',
        course_wednesday: '周三',
        course_thursday: '周四',
        course_friday: '周五',
        course_saturday: '周六',
        no_current_course: '无当前课程',
        unknown_location: '未知位置',
        location_too_far: '位置距离过远',
        unknown_status: '未知状态'
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
        date_format: 'YYYY-MM-DD',
        
        // User info related
        user_info_not_available: 'Unable to get user info, please access in WeChat Work environment',
        user_info_not_loaded: 'User info not loaded, please access in WeChat Work or refresh page',
        user_info_refresh_required: 'User info not loaded, please refresh page or access in WeChat Work',
        user_info_load_failed: 'Unable to get user info, please refresh page and try again',
        auth_expired: 'Authorization expired, please refresh page to login again',
        auth_expired_stats: 'Authorization expired, statistics data cannot be loaded',
        
        // 位置相关
        location_success: 'Location obtained successfully',
        location_service_init_failed: 'Location service initialization failed, please refresh page and try again',
        location_permission_failed: 'Location failed, please check location permissions or refresh page and try again',
        
        // Camera related
        camera_opening: 'Opening camera...',
        camera_error: 'Camera function error, please try again',
        image_too_large: 'Image file too large, please select image smaller than 5MB',
        select_image_file: 'Please select an image file',
        image_upload_success: 'Image uploaded successfully',
        image_process_failed: 'Image processing failed, please try again',
        image_read_failed: 'Image reading failed, please try again',
        no_image_selected: 'No image selected',
        image_selection_cancelled: 'Image selection cancelled',
        file_selector_error: 'Cannot open file selector, please check browser permissions',
        
        // Data loading related
        load_attendance_failed: 'Failed to load attendance data, using local calculation',
        load_records_failed: 'Unable to get records data, please check network connection',
        
        // Export related
        exporting_data: 'Exporting data...',
        export_success: 'Export successful',
        export_failed: 'Export failed',
        
        // Status related
        status_present: 'Present',
        status_late: 'Late',
        status_absent: 'Absent',
        
        // Location related
        unknown_location: 'Unknown',
        latitude: 'Latitude',
        longitude: 'Longitude',
        meters: 'm',
        kilometers: 'km',
        
        // Form related
        form_reset: 'Form has been reset',
        
        // Sign-in status
        status_present: 'Present',
        status_late: 'Late',
        status_absent: 'Absent',
        status_no_class: 'No Class',
        
        // Location info
        distance_to_building: 'Distance to nearest building',
        building_too_far: 'Too far from building',
        unknown_location: 'Unknown location',
        current_coordinates: 'Current coordinates',
        meters: 'meters',
        latitude: 'Latitude',
        longitude: 'Longitude',
        
        // Time selection
        year: 'Year',
        month: 'Month',
        january: 'January',
        february: 'February',
        march: 'March',
        april: 'April',
        may: 'May',
        june: 'June',
        july: 'July',
        august: 'August',
        september: 'September',
        october: 'October',
        november: 'November',
        december: 'December',
        
        // Feedback related
        rating_required: 'Please select a rating',
        max_images_exceeded: 'Maximum {count} images allowed',
        invalid_image_file: '{filename} is not a valid image file',
        image_too_large_specific: '{filename} is too large, please select image smaller than 5MB',
        submit_failed_retry: 'Submit failed, please try again later',
        
        // 重置确认对话框
        reset_confirm_title: 'Confirm Reset',
        reset_confirm_message: 'Are you sure you want to reset the form? All filled content will be cleared.',
        
        // 课程信息相关
        course_status_current: 'In Progress',
        course_status_upcoming: 'Upcoming',
        course_status_past: 'Completed',
        course_today: 'Today',
        course_tomorrow: 'Tomorrow',
        course_sunday: 'Sun',
        course_monday: 'Mon',
        course_tuesday: 'Tue',
        course_wednesday: 'Wed',
        course_thursday: 'Thu',
        course_friday: 'Fri',
        course_saturday: 'Sat',
        no_current_course: 'No current course',
        unknown_location: 'Unknown location',
        location_too_far: 'Location too far',
        unknown_status: 'Unknown status'
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
            
            // 触发语言切换事件，通知其他组件
            const event = new CustomEvent('languageChanged', {
                detail: { language: lang }
            });
            document.dispatchEvent(event);
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
        
        // 触发语言切换回调
        if (this.languageChangeCallbacks) {
            this.languageChangeCallbacks.forEach(callback => {
                try {
                    callback(this.currentLanguage);
                } catch (error) {
                    console.warn('Language change callback error:', error);
                }
            });
        }
    }
    
    // 添加语言切换监听器
    addLanguageChangeListener(callback) {
        if (!this.languageChangeCallbacks) {
            this.languageChangeCallbacks = [];
        }
        this.languageChangeCallbacks.push(callback);
    }
    
    // 移除语言切换监听器
    removeLanguageChangeListener(callback) {
        if (this.languageChangeCallbacks) {
            const index = this.languageChangeCallbacks.indexOf(callback);
            if (index > -1) {
                this.languageChangeCallbacks.splice(index, 1);
            }
        }
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
    t(key, params = {}) {
        let text = LANGUAGES[appState.currentLanguage][key] || key;
        
        // 支持参数替换，格式：{paramName}
        if (params && typeof params === 'object') {
            Object.keys(params).forEach(param => {
                const placeholder = `{${param}}`;
                text = text.replace(new RegExp(placeholder, 'g'), params[param]);
            });
        }
        
        return text;
    },
    
    // 显示消息提示
    // 原有的showMessage方法，保留作为内部使用
    _originalShowMessage(message, type = 'info', duration = 3000, options = {}) {
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
            left: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 9999;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            animation: slideDown 0.3s ease;
            word-wrap: break-word;
            font-size: 14px;
            line-height: 1.4;
            text-align: center;
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

    // 新的showMessage方法，使用弹窗管理器
    showMessage(message, type = 'info', duration = 3000, options = {}) {
        // 如果指定了立即显示或者是加载消息，直接使用原有方法
        if (options.immediate || type === 'loading') {
            return this._originalShowMessage(message, type, duration, options);
        }
        
        // 尝试从消息内容推断弹窗类型
        let popupType = this._inferPopupType(message, type);
        
        // 如果无法推断类型，使用默认处理
        if (!popupType) {
            return this._originalShowMessage(message, type, duration, options);
        }
        
        // 使用弹窗管理器
        return popupManager.addPopup(popupType, message, type, duration, options);
    },

    // 推断弹窗类型的辅助方法
    _inferPopupType(message, type) {
        // 根据消息内容和类型推断弹窗类型
        const messageStr = message.toString().toLowerCase();
        
        if (messageStr.includes('授权') && messageStr.includes('过期')) {
            return 'auth_expired';
        }
        if (messageStr.includes('网络') && messageStr.includes('失败')) {
            return 'network_error';
        }
        if (messageStr.includes('服务器') && messageStr.includes('错误')) {
            return 'server_error';
        }
        if (messageStr.includes('签到') && messageStr.includes('成功')) {
            return 'signin_success';
        }
        if (messageStr.includes('签到') && messageStr.includes('失败')) {
            return 'signin_failed';
        }
        if (messageStr.includes('用户信息') && (messageStr.includes('获取') || messageStr.includes('加载'))) {
            return 'user_info_not_available';
        }
        if (messageStr.includes('位置') && messageStr.includes('成功')) {
            return 'location_success';
        }
        if (messageStr.includes('定位服务') && messageStr.includes('初始化')) {
            return 'location_service_init_failed';
        }
        if (messageStr.includes('定位') && (messageStr.includes('权限') || messageStr.includes('失败'))) {
            return 'location_permission_failed';
        }
        if (messageStr.includes('企业微信') && messageStr.includes('配置')) {
            return 'wechat_config_failed';
        }
        
        return null; // 无法推断类型
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
                <button id="cancelBtn" style="padding: 8px 16px; border: 1px solid #ccc; background: white; border-radius: 6px; cursor: pointer;">${Utils.t('cancel')}</button>
                <button id="confirmBtn" style="padding: 8px 16px; border: none; background: #3B82F6; color: white; border-radius: 6px; cursor: pointer;">${Utils.t('confirm')}</button>
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
            console.log('🔧 初始化企业微信JS-SDK');
        
        if (typeof wx === 'undefined') {
            const error = 'WeChat JS-SDK not loaded';
            console.error('❌ 企业微信JS-SDK未加载');
            reject(new Error(error));
            return;
        }
        
        // 获取签名等配置信息
        this.getConfig().then(config => {
            console.log('✅ 配置信息获取成功');
                
                const wxConfig = {
                    beta: true,
                    debug: false, // 关闭调试模式
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
                };
                
                wx.config(wxConfig);
                
                wx.ready(() => {
                    console.log('✅ 企业微信JS-SDK初始化成功');
                    appState.isWeChatReady = true;
                    resolve();
                });
                
                wx.error((res) => {
                    console.error('❌ 企业微信JS-SDK初始化失败:', res);
                    reject(new Error('WeChat JS-SDK initialization failed: ' + JSON.stringify(res)));
                });
            }).catch(error => {
                console.error('❌ [WeChat Init] 获取配置失败:', error);
                // 通过PopupManager添加微信配置失败提示（会等待用户信息加载完成）
                PopupManager.addPopup('wechat_config_failed', `获取企业微信配置失败: ${error.message}`, 'error', 5000);
                reject(error);
            });
        });
    },
    
    // 获取配置信息
    async getConfig() {
        try {
            const response = await Utils.request('/api/wechat/config', {
                method: 'POST',
                body: JSON.stringify({
                    url: window.location.href.split('#')[0]
                })
            });
            
            // 后端返回的数据结构是 {success: true, data: config}
            if (response.success && response.data) {
                console.log('WeChat config received:', response.data);
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to get WeChat config');
            }
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
            // 首先检查是否在企业微信环境中
        const isInWeChat = this.isInWeChatWork();
            
            // 如果在企业微信环境，强制使用企业微信定位
            if (isInWeChat) {
                // 检查SDK是否准备好
                if (!appState.isWeChatReady || typeof wx === 'undefined') {
                    const errorMsg = !appState.isWeChatReady ? 'SDK未准备好' : 'wx对象不存在';
                    console.error(`❌ 企业微信定位失败: ${errorMsg}`);
                    Utils.showMessage(Utils.t('location_service_init_failed'), 'error', 3000);
                    reject(new Error(`企业微信环境中定位失败: ${errorMsg}`));
                    return;
                }
                
                console.log('📍 使用企业微信定位...');
                
                wx.getLocation({
                    type: 'gcj02',
                    success: (res) => {
                        console.log('✅ 定位成功:', res);
                        
                        const location = {
                            latitude: res.latitude,
                            longitude: res.longitude,
                            accuracy: res.accuracy,
                            speed: res.speed,
                            altitude: res.altitude,
                            source: 'wechat_work'
                        };
                        appState.location = location;
                        resolve(location);
                    },
                    fail: (error) => {
                        console.error('❌ 定位失败:', error);
                        Utils.showMessage(Utils.t('location_permission_failed'), 'error', 5000);
                        reject(new Error(`企业微信定位失败: ${JSON.stringify(error)}`));
                    }
                });
            } else {
                // 非企业微信环境，使用浏览器原生定位
                console.log('📍 使用浏览器定位');
                
                this._getBrowserLocation().then(result => {
                    result.source = 'browser';
                    resolve(result);
                }).catch(reject);
            }
        });
    },
    
    // 浏览器原生定位API备选方案
    async _getBrowserLocation() {
        return new Promise((resolve, reject) => {
            console.log('📍 使用浏览器定位');
            
            if (!navigator.geolocation) {
                const errorMsg = '浏览器不支持定位功能';
                console.error('❌ 浏览器定位错误:', errorMsg);
                Utils.showMessage(`❌ ${errorMsg}`, 'error', 3000);
                reject(new Error(errorMsg));
                return;
            }
            
            // 设置定位选项
            const options = {
                enableHighAccuracy: true,  // 启用高精度定位
                timeout: 15000,           // 15秒超时
                maximumAge: 300000        // 5分钟内的缓存位置可用
            };
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        altitude: position.coords.altitude,
                        speed: position.coords.speed,
                        source: 'browser'
                    };
                    
                    console.log('✅ 浏览器定位成功');
                    appState.location = location;
                    resolve(location);
                },
                (error) => {
                    console.error('❌ 浏览器定位失败:', error);
                    
                    // 根据错误类型提供更友好的错误信息
                    let errorMessage = '定位获取失败';
                    
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = '定位权限被拒绝，请在浏览器设置中允许位置访问';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = '定位信息不可用，请检查设备GPS或网络连接';
                            break;
                        case error.TIMEOUT:
                            errorMessage = '定位请求超时，请稍后重试';
                            break;
                        default:
                            errorMessage = `定位失败: ${error.message}`;
                    }
                    
                    Utils.showMessage(`❌ 浏览器定位失败: ${errorMessage}`, 'error', 5000);
                    reject(new Error(errorMessage));
                },
                options
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

// 页面自动更新管理器
const PageUpdateManager = {
    // 页面实例引用
    pageInstances: {
        statistics: null,
        records: null,
        feedback: null
    },
    
    // 注册页面实例
    registerPage(pageName, instance) {
        this.pageInstances[pageName] = instance;
    },
    
    // 检查用户数据是否有效
    checkUserData() {
        const userInfo = appState.getStoredUserInfo();
        if (!userInfo || !userInfo.userid) {
            this.showDataLossPrompt();
            return false;
        }
        return true;
    },
    
    // 显示数据丢失提示
    showDataLossPrompt() {
        const currentLang = appState.language;
        const message = currentLang === 'zh' ? 
            '若数据未正常加载，返回首页刷新' : 
            'If data is not loaded properly, return to homepage to refresh';
        
        // 创建提示元素
        const prompt = document.createElement('div');
        prompt.className = 'data-loss-prompt';
        prompt.innerHTML = `
            <div class="prompt-content">
                <span class="prompt-icon">⚠️</span>
                <span class="prompt-text">${message}</span>
                <button class="prompt-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // 添加样式
        if (!document.getElementById('data-loss-prompt-style')) {
            const style = document.createElement('style');
            style.id = 'data-loss-prompt-style';
            style.textContent = `
                .data-loss-prompt {
                    position: fixed;
                    top: 80px;
                    left: 20px;
                    right: 20px;
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 8px;
                    padding: 12px 16px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    z-index: 9999;
                    text-align: center;
                    animation: slideDown 0.3s ease;
                }
                .prompt-content {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                    color: #856404;
                }
                .prompt-icon {
                    font-size: 16px;
                }
                .prompt-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    color: #856404;
                    cursor: pointer;
                    padding: 0;
                    margin-left: 8px;
                }
                @keyframes slideDown {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // 移除已存在的提示
        const existingPrompt = document.querySelector('.data-loss-prompt');
        if (existingPrompt) {
            existingPrompt.remove();
        }
        
        // 添加新提示
        document.body.appendChild(prompt);
        
        // 5秒后自动消失
        setTimeout(() => {
            if (prompt.parentElement) {
                prompt.remove();
            }
        }, 5000);
    },
    
    // 刷新当前页面数据
    refreshCurrentPage() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        // 检查用户数据
        if (!this.checkUserData()) {
            return;
        }
        
        // 根据页面类型刷新数据
        if (currentPage === 'statistics.html' && this.pageInstances.statistics) {
            console.log('Refreshing statistics page data...');
            this.pageInstances.statistics.loadAttendanceData();
        } else if (currentPage === 'records.html' && this.pageInstances.records) {
            console.log('Refreshing records page data...');
            this.pageInstances.records.loadRecords();
            this.pageInstances.records.loadAttendanceData();
        } else if (currentPage === 'feedback.html' && this.pageInstances.feedback) {
            console.log('Refreshing feedback page data...');
            // 反馈页面通常不需要刷新数据，但可以检查用户状态
        }
    },
    
    // 初始化页面监听
    init() {
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // 页面变为可见时刷新数据
                setTimeout(() => {
                    this.refreshCurrentPage();
                }, 100);
            }
        });
        
        // 监听页面获得焦点
        window.addEventListener('focus', () => {
            setTimeout(() => {
                this.refreshCurrentPage();
            }, 100);
        });
        
        // 监听页面显示事件（从缓存恢复时）
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) {
                // 从缓存恢复时刷新数据
                setTimeout(() => {
                    this.refreshCurrentPage();
                }, 100);
            }
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
    
    // 初始化页面更新管理器
    PageUpdateManager.init();
    
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
window.PageUpdateManager = PageUpdateManager;
window.PopupManager = popupManager;
window.CONFIG = CONFIG;

// 弹窗管理队列系统
class PopupManager {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.currentPopup = null;
        this.dependencies = new Map(); // 存储依赖关系
        this.delayedChecks = new Map(); // 存储延迟检测
        this.systemState = {
            userInfoLoaded: false,
            locationLoaded: false,
            wechatSDKReady: false
        };
        
        // 定义弹窗优先级（数字越小优先级越高）
        this.priorities = {
            CRITICAL: 1,    // 关键错误，立即显示
            HIGH: 2,        // 重要提示，需要用户注意
            MEDIUM: 3,      // 一般提示，可以延迟
            LOW: 4          // 非关键提示，最后显示
        };
        
        // 定义弹窗类型和其优先级
        this.popupTypes = {
            // 关键错误 - 立即显示
            'auth_expired': { priority: this.priorities.CRITICAL, dependencies: [] },
            'network_error': { priority: this.priorities.CRITICAL, dependencies: [] },
            'server_error': { priority: this.priorities.CRITICAL, dependencies: [] },
            
            // 重要提示 - 需要用户注意
            'signin_success': { priority: this.priorities.HIGH, dependencies: [] },
            'signin_failed': { priority: this.priorities.HIGH, dependencies: [] },
            
            // 一般提示 - 可以延迟
            'user_info_not_available': { 
                priority: this.priorities.MEDIUM, 
                dependencies: [],
                delayMs: 3000 // 3秒延迟检测
            },
            'location_success': { 
                priority: this.priorities.MEDIUM, 
                dependencies: ['userInfoLoaded'] 
            },
            'location_failed': { 
                priority: this.priorities.MEDIUM, 
                dependencies: ['userInfoLoaded'] 
            },
            
            // 非关键提示 - 最后显示
            'location_service_init_failed': { 
                priority: this.priorities.LOW, 
                dependencies: ['userInfoLoaded', 'locationLoaded'] 
            },
            'location_permission_failed': { 
                priority: this.priorities.LOW, 
                dependencies: ['userInfoLoaded', 'locationLoaded'] 
            },
            'wechat_config_failed': { 
                priority: this.priorities.LOW, 
                dependencies: ['userInfoLoaded'] 
            }
        };
    }
    
    // 更新系统状态
    updateSystemState(state, value) {
        this.systemState[state] = value;
        console.log(`PopupManager: ${state} = ${value}`);
        
        // 状态更新后，检查是否有等待的弹窗可以显示
        this.processQueue();
    }
    
    // 添加弹窗到队列
    addPopup(type, message, messageType = 'info', duration = 3000, options = {}) {
        const popupConfig = this.popupTypes[type] || { 
            priority: this.priorities.MEDIUM, 
            dependencies: [] 
        };
        
        const popup = {
            id: Date.now() + Math.random(),
            type,
            message,
            messageType,
            duration,
            options,
            priority: popupConfig.priority,
            dependencies: popupConfig.dependencies,
            delayMs: popupConfig.delayMs || 0,
            addedAt: Date.now()
        };
        
        // 如果有延迟要求，设置延迟检测
        if (popup.delayMs > 0) {
            this.setupDelayedCheck(popup);
            return popup.id;
        }
        
        // 检查是否为关键错误，关键错误立即显示
        if (popup.priority === this.priorities.CRITICAL) {
            this.showPopupImmediately(popup);
            return popup.id;
        }
        
        // 添加到队列
        this.queue.push(popup);
        this.sortQueue();
        
        console.log(`PopupManager: Added popup ${type} to queue, current queue length: ${this.queue.length}`);
        
        // 尝试处理队列
        this.processQueue();
        
        return popup.id;
    }
    
    // 设置延迟检测
    setupDelayedCheck(popup) {
        console.log(`PopupManager: Setting up delayed check for ${popup.type}, delay: ${popup.delayMs}ms`);
        
        const checkId = setTimeout(() => {
            // 延迟时间到达后，检查是否仍需要显示此弹窗
            if (this.shouldShowDelayedPopup(popup)) {
                console.log(`PopupManager: Delayed check passed for ${popup.type}, adding to queue`);
                this.queue.push(popup);
                this.sortQueue();
                this.processQueue();
            } else {
                console.log(`PopupManager: Delayed check failed for ${popup.type}, skipping popup`);
            }
            
            this.delayedChecks.delete(popup.id);
        }, popup.delayMs);
        
        this.delayedChecks.set(popup.id, checkId);
    }
    
    // 检查延迟弹窗是否仍需要显示
    shouldShowDelayedPopup(popup) {
        switch (popup.type) {
            case 'user_info_not_available':
                // 如果3秒后用户信息仍未加载，则显示提示
                return !this.systemState.userInfoLoaded;
            default:
                return true;
        }
    }
    
    // 立即显示弹窗（用于关键错误）
    showPopupImmediately(popup) {
        console.log(`PopupManager: Showing critical popup immediately: ${popup.type}`);
        this.currentPopup = popup;
        this.displayPopup(popup);
    }
    
    // 检查依赖是否满足
    checkDependencies(dependencies) {
        return dependencies.every(dep => this.systemState[dep] === true);
    }
    
    // 按优先级排序队列
    sortQueue() {
        this.queue.sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            // 相同优先级按添加时间排序
            return a.addedAt - b.addedAt;
        });
    }
    
    // 处理队列
    processQueue() {
        if (this.isProcessing || this.currentPopup) {
            return;
        }
        
        // 查找第一个可以显示的弹窗
        for (let i = 0; i < this.queue.length; i++) {
            const popup = this.queue[i];
            
            if (this.checkDependencies(popup.dependencies)) {
                // 移除并显示此弹窗
                this.queue.splice(i, 1);
                this.showPopup(popup);
                break;
            }
        }
    }
    
    // 显示弹窗
    showPopup(popup) {
        this.isProcessing = true;
        this.currentPopup = popup;
        
        console.log(`PopupManager: Showing popup: ${popup.type}`);
        
        const messageEl = this.displayPopup(popup);
        
        // 设置弹窗完成回调
        if (!popup.options.persistent) {
            setTimeout(() => {
                this.onPopupComplete();
            }, popup.duration);
        }
    }
    
    // 实际显示弹窗的方法
    displayPopup(popup) {
        // 使用原有的 Utils.showMessage 方法
        return Utils._originalShowMessage(popup.message, popup.messageType, popup.duration, popup.options);
    }
    
    // 弹窗完成回调
    onPopupComplete() {
        console.log(`PopupManager: Popup completed: ${this.currentPopup?.type}`);
        this.currentPopup = null;
        this.isProcessing = false;
        
        // 继续处理队列
        setTimeout(() => {
            this.processQueue();
        }, 500); // 短暂延迟，避免弹窗过于频繁
    }
    
    // 清除特定类型的弹窗
    clearPopupsByType(type) {
        this.queue = this.queue.filter(popup => popup.type !== type);
        
        // 清除延迟检测
        for (const [id, checkId] of this.delayedChecks.entries()) {
            const popup = this.queue.find(p => p.id === id);
            if (popup && popup.type === type) {
                clearTimeout(checkId);
                this.delayedChecks.delete(id);
            }
        }
    }
    
    // 清空所有弹窗
    clearAll() {
        this.queue = [];
        for (const checkId of this.delayedChecks.values()) {
            clearTimeout(checkId);
        }
        this.delayedChecks.clear();
        this.currentPopup = null;
        this.isProcessing = false;
    }
}

// 创建全局弹窗管理器实例
const popupManager = new PopupManager();

// ... existing code ...