// 签到页面JavaScript

class SignInPage {
    constructor() {
        this.currentPhoto = null;
        this.currentLocation = null;
        this.timeInterval = null;
        this.isSigningIn = false;
        this.map = null;
        this.userMarker = null;
        this.buildingMarker = null;
        this.buildingCircle = null;
        this.connectionLine = null;
        this.currentBuildingInfo = null;
        this.customLocationBtn = null;
        this.customLocationContainer = null;
        this.allCourses = []; // 存储所有课程数据
        this.currentFilter = 'all'; // 当前筛选状态
        
        // 添加加载管理器
        this.loadingManager = {
            userInfoLoaded: false,
            locationLoaded: false,
            scheduleLoaded: false,
            pendingErrors: [],
            userInfoStartTime: null,
            locationStartTime: null,
            
            // 记录错误但不立即显示
            addPendingError(type, message, errorType = 'error', duration = 5000) {
                this.pendingErrors.push({
                    type,
                    message,
                    errorType,
                    duration,
                    timestamp: Date.now()
                });
                console.log(`[LoadingManager] 延迟显示错误: ${type} - ${message}`);
            },
            
            // 检查是否可以显示错误提示
            canShowErrors() {
                // 用户信息加载失败可以延迟3秒后显示
                const userInfoDelay = 3000;
                // 其他错误需要等待用户信息和定位都完成或失败
                return (this.userInfoLoaded || (this.userInfoStartTime && Date.now() - this.userInfoStartTime > userInfoDelay)) &&
                       (this.locationLoaded || (this.locationStartTime && Date.now() - this.locationStartTime > 8000));
            },
            
            // 显示所有待处理的错误
            showPendingErrors() {
                if (!this.canShowErrors()) return;
                
                this.pendingErrors.forEach(error => {
                    // 只显示用户信息错误，或者在用户信息和定位都完成后显示其他错误
                    if (error.type === 'user_info' || 
                        (this.userInfoLoaded && this.locationLoaded)) {
                        Utils.showMessage(error.message, error.errorType, error.duration);
                        console.log(`[LoadingManager] 显示延迟错误: ${error.type} - ${error.message}`);
                    }
                });
                
                // 清除已显示的错误
                this.pendingErrors = this.pendingErrors.filter(error => {
                    return !(error.type === 'user_info' || 
                           (this.userInfoLoaded && this.locationLoaded));
                });
            },
            
            // 标记用户信息加载完成
            setUserInfoLoaded(success = true) {
                this.userInfoLoaded = true;
                console.log(`[LoadingManager] 用户信息加载完成: ${success}`);
                this.showPendingErrors();
            },
            
            // 标记定位加载完成
            setLocationLoaded(success = true) {
                this.locationLoaded = true;
                console.log(`[LoadingManager] 定位加载完成: ${success}`);
                this.showPendingErrors();
            },
            
            // 标记课程表加载完成
            setScheduleLoaded(success = true) {
                this.scheduleLoaded = true;
                console.log(`[LoadingManager] 课程表加载完成: ${success}`);
            },
            
            // 开始用户信息加载
            startUserInfoLoading() {
                this.userInfoStartTime = Date.now();
                console.log(`[LoadingManager] 开始加载用户信息`);
            },
            
            // 开始定位加载
            startLocationLoading() {
                this.locationStartTime = Date.now();
                console.log(`[LoadingManager] 开始加载定位信息`);
            }
        };
    }

    // 初始化方法
    async init() {
        this.bindEvents();
        this.startTimeUpdate();
        
        // 先加载用户信息，再加载课程表
        await this.loadUserInfo();
        
        // 如果已有用户信息，直接更新显示
        if (appState.userInfo) {
            this.updateUserInfo();
        }
        
        // 用户信息加载完成后再加载课程表，并等待课程表加载完成
        await this.loadCourseSchedule();
        
        // 课程表加载完成后再获取位置信息，确保所有依赖课程数据的功能都能正常工作
        this.getCurrentLocation();
        
        // 监听语言切换事件
        document.addEventListener('languageChanged', () => {
            // 重新显示位置和建筑信息
            this.refreshLocationDisplay();
            
            // 重新更新建筑信息显示（确保显示当前课程的建筑）
            if (this.currentLocation) {
                this.updateBuildingInfo();
            }
            
            // 重新更新课程信息显示
            if (this.locationInfo) {
                this.updateCourseInfo(this.locationInfo);
            }
            
            // 如果地图存在，重新调整地图大小和重新渲染
            if (this.map) {
                setTimeout(() => {
                    try {
                        // 重新调整地图容器大小
                        this.map.getViewport().resize();
                        
                        // 强制重新渲染地图
                        this.map.setCenter(this.map.getCenter());
                        
                        // 强制清除所有地图元素，然后重新绘制
                        this.clearMapMarkers();
                        
                        // 如果有位置信息，重新更新地图显示
                        if (this.currentLocation) {
                            // 使用当前建筑信息或locationInfo中的建筑信息
                            const buildingInfo = this.currentBuildingInfo || (this.locationInfo && this.locationInfo.building);
                            this.updateMapDisplay(this.currentLocation, buildingInfo);
                        }
                        
                        console.log('语言切换后地图重新渲染完成');
                    } catch (error) {
                        console.error('语言切换后地图重新渲染失败:', error);
                    }
                }, 200);
            }
        });
    }

    // 加载用户信息
    async loadUserInfo() {
        // 开始用户信息加载
        this.loadingManager.startUserInfoLoading();
        
        try {
            // 如果已有用户信息，直接显示
            if (appState.userInfo && appState.userInfo.student_id && appState.userInfo.name) {
                console.log('Using cached user info:', appState.userInfo);
                this.displayUserInfo(appState.userInfo);
                this.loadingManager.setUserInfoLoaded(true);
                return;
            }
            
            // 尝试从企业微信获取用户信息，添加重试限制
            const userInfo = await this.getUserInfoWithRetry();
            
            if (userInfo && userInfo.student_id && userInfo.name) {
                // 使用新的缓存机制保存用户信息
                appState.setUserInfo(userInfo);
                this.displayUserInfo(userInfo);
                console.log('User info loaded and cached:', userInfo);
                this.loadingManager.setUserInfoLoaded(true);
            } else {
                // 显示获取用户信息失败的状态
                console.error('无法获取用户信息');
                
                // 使用加载管理器延迟显示错误提示
                this.loadingManager.addPendingError(
                    'user_info', 
                    Utils.t('user_info_not_available'), 
                    'error'
                );
                
                // 显示错误状态
                const userIdElement = document.getElementById('userId');
                const userNameElement = document.getElementById('userName');
                
                if (userIdElement) {
                    userIdElement.textContent = '获取失败';
                }
                if (userNameElement) {
                    userNameElement.textContent = '获取失败';
                }
                
                // 禁用签到按钮
                const signinBtn = document.getElementById('signinBtn');
                if (signinBtn) {
                    signinBtn.disabled = true;
                    signinBtn.title = '请在企业微信环境中访问以获取用户信息';
                }
                
                this.loadingManager.setUserInfoLoaded(false);
            }
        } catch (error) {
            console.error('加载用户信息失败:', error);
            
            // 使用加载管理器延迟显示错误提示
            this.loadingManager.addPendingError(
                'user_info', 
                '用户信息加载失败，请刷新页面重试', 
                'error'
            );
            
            // 显示错误提示
            this.updateUserInfo({
                name: '用户信息加载失败',
                student_id: '请刷新页面重试'
            });
            
            // 禁用签到按钮
            const signinBtn = document.getElementById('signinBtn');
            if (signinBtn) {
                signinBtn.disabled = true;
                signinBtn.title = '用户信息加载失败，无法签到';
            }
            
            this.loadingManager.setUserInfoLoaded(false);
        }
    }

    // 获取当前位置
    async getCurrentLocation() {
        // 开始定位加载
        this.loadingManager.startLocationLoading();
        
        // 检查是否有缓存的位置信息
        if (appState.location) {
            console.log('Using cached location:', appState.location);
            this.currentLocation = appState.location;
            // 使用缓存的建筑信息
            const cachedBuildingInfo = appState.getCache('buildingInfo');
            if (cachedBuildingInfo) {
                console.log('Using cached building info:', cachedBuildingInfo);
                this.locationInfo = cachedBuildingInfo;
                this.displayCachedBuildingInfo(cachedBuildingInfo);
            } else {
                await this.updateBuildingInfo();
            }
            this.loadingManager.setLocationLoaded(true);
            return;
        }
        
        // 如果在企业微信环境中，等待SDK初始化完成
        const isInWeChat = navigator.userAgent.includes('wxwork') || navigator.userAgent.includes('micromessenger');
        if (isInWeChat && typeof wx !== 'undefined') {
            console.log('🔄 等待企业微信SDK初始化...');
            
            // 等待企业微信SDK初始化完成，最多等待10秒
            let waitCount = 0;
            const maxWait = 100; // 10秒 (100 * 100ms)
            
            while (!appState.isWeChatReady && waitCount < maxWait) {
                await new Promise(resolve => setTimeout(resolve, 100));
                waitCount++;
            }
            
            if (appState.isWeChatReady) {
                console.log('✅ 企业微信SDK初始化完成');
            } else {
                console.log('⚠️ 企业微信SDK初始化超时');
                // 使用加载管理器延迟显示错误提示
                this.loadingManager.addPendingError(
                    'wechat_sdk', 
                    '企业微信SDK初始化超时', 
                    'warning'
                );
            }
        }
        
        // 显示定位加载状态
        const loadingMessage = Utils.showLoading('正在获取位置信息...');
        
        try {
            console.log('Starting location acquisition...');
            const location = await WeChatAPI.getLocation();
            this.currentLocation = location;
            // 使用新的缓存机制保存位置信息
            appState.setLocation(location);
            console.log('Location obtained and cached:', location);
            
            Utils.hideLoading(loadingMessage);
            Utils.showMessage(Utils.t('location_success'), 'success', 2000);
            
            // 立即更新建筑信息
            await this.updateBuildingInfo();
            
            this.loadingManager.setLocationLoaded(true);
            
        } catch (error) {
            Utils.hideLoading(loadingMessage);
            console.error('Failed to get location:', error);
            
            // 更新UI显示定位失败
            const buildingNameElement = document.getElementById('buildingName');
            if (buildingNameElement) {
                const failedText = appState.currentLanguage === 'zh' ? '定位失败' : 'Location Failed';
                buildingNameElement.textContent = failedText;
                buildingNameElement.setAttribute('data-zh', '定位失败');
                buildingNameElement.setAttribute('data-en', 'Location Failed');
            }
            
            // 根据错误类型显示不同的提示
            let errorMessage = appState.currentLanguage === 'zh' ? '定位获取失败' : 'Location failed';
            let errorType = 'error';
            
            if (error.message) {
                if (error.message.includes('permission') || error.message.includes('denied')) {
                    errorMessage = appState.currentLanguage === 'zh' ? 
                        '定位权限被拒绝，请在设置中允许位置访问' : 
                        'Location permission denied, please allow location access in settings';
                    errorType = 'warning';
                } else if (error.message.includes('timeout')) {
                    errorMessage = appState.currentLanguage === 'zh' ? 
                        '定位超时，请检查网络连接或稍后重试' : 
                        'Location timeout, please check network or try again later';
                    errorType = 'warning';
                } else if (error.message.includes('unavailable')) {
                    errorMessage = appState.currentLanguage === 'zh' ? 
                        '定位服务不可用，请检查设备设置' : 
                        'Location service unavailable, please check device settings';
                    errorType = 'warning';
                } else {
                    errorMessage = appState.currentLanguage === 'zh' ? 
                        `定位失败: ${error.message}` : 
                        `Location failed: ${error.message}`;
                }
            }
            
            // 使用加载管理器延迟显示错误提示，并提供重试选项
            const retryText = appState.currentLanguage === 'zh' ? '重试' : 'Retry';
            this.loadingManager.addPendingError(
                'location', 
                errorMessage + ` <button onclick="window.signinPage.getCurrentLocation()" style="margin-left: 12px; padding: 4px 8px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; border-radius: 4px; cursor: pointer;">${retryText}</button>`,
                errorType,
                8000
            );
            
            // 不再使用模拟位置，让用户知道定位失败了
            this.currentLocation = null;
            this.loadingManager.setLocationLoaded(false);
        }
    }

    // 其他方法保持不变...
    bindEvents() {
        // 签到按钮点击事件
        const signinBtn = document.getElementById('signinBtn');
        if (signinBtn) {
            signinBtn.addEventListener('click', () => this.showSigninModal());
        }
        
        // 模态框关闭事件
        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => this.hideSigninModal());
        }
        
        // 点击模态框背景关闭
        const modal = document.getElementById('signinModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideSigninModal();
                }
            });
        }
        
        // 拍照上传事件
        const photoUpload = document.getElementById('photoUpload');
        if (photoUpload) {
            photoUpload.addEventListener('click', () => this.takePhoto());
        }
        
        // 提交签到事件
        const submitBtn = document.getElementById('submitSignin');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitSignin());
        }
        
        // 表单输入事件
        const courseInput = document.getElementById('courseName');
        const classroomInput = document.getElementById('classroom');
        
        if (courseInput) {
            courseInput.addEventListener('input', () => this.validateForm());
        }
        
        if (classroomInput) {
            classroomInput.addEventListener('input', () => this.validateForm());
        }
        
        // 课程筛选器事件
        const courseFilter = document.getElementById('courseFilter');
        if (courseFilter) {
            courseFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.filterAndDisplayCourses();
            });
        }
    }

    // 开始时间更新
    startTimeUpdate() {
        this.updateTime();
        this.timeInterval = setInterval(() => {
            this.updateTime();
        }, 1000);
    }
    
    // 更新时间显示
    updateTime() {
        const timeElement = document.getElementById('currentTime');
        if (timeElement) {
            const now = new Date();
            const timeString = Utils.formatTime(now, 'HH:mm:ss');
            timeElement.textContent = timeString;
        }
    }

    // 带重试限制的用户信息获取方法
    async getUserInfoWithRetry(maxRetries = 2) {
        const retryKey = 'index_userinfo_retry_count';
        let retryCount = parseInt(sessionStorage.getItem(retryKey) || '0');
        
        if (retryCount >= maxRetries) {
            console.warn('已达到最大重试次数，停止获取用户信息');
            return null;
        }
        
        try {
            const userInfo = await WeChatAPI.getUserInfo();
            if (userInfo && userInfo.student_id) {
                // 成功获取，重置重试计数
                sessionStorage.removeItem(retryKey);
                return userInfo;
            } else {
                // 获取失败，增加重试计数
                retryCount++;
                sessionStorage.setItem(retryKey, retryCount.toString());
                console.warn(`用户信息获取失败，重试次数: ${retryCount}/${maxRetries}`);
                return null;
            }
        } catch (error) {
            // 出现错误，增加重试计数
            retryCount++;
            sessionStorage.setItem(retryKey, retryCount.toString());
            console.error(`用户信息获取出错，重试次数: ${retryCount}/${maxRetries}`, error);
            return null;
        }
    }

    // 更新首页用户信息 - 完全按照弹窗的方式实现
    updateUserInfo(userInfo = null) {
        const nameElement = document.getElementById('userName');
        const idElement = document.getElementById('userId');
        
        // 使用传入的用户信息或全局状态中的用户信息
        const userData = userInfo || appState.userInfo;
        
        if (nameElement) {
            if (userData?.name) {
                nameElement.textContent = userData.name;
            } else {
                nameElement.textContent = '获取失败';
            }
        }
        if (idElement) {
            if (userData?.student_id) {
                idElement.textContent = userData.student_id;
            } else {
                idElement.textContent = '获取失败';
            }
        }
    }

    // 显示用户信息 - 完全按照弹窗的方式实现
    displayUserInfo(userInfo) {
        // 保存用户信息到全局状态
        appState.userInfo = userInfo;
        
        // 调用更新方法
        this.updateUserInfo();
        
        // 获取位置信息并更新建筑显示
        this.updateBuildingInfo();
    }

    // 其他方法继续保持原有逻辑...
    // 这里只是示例，实际应该包含所有原有方法
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.signinPage = new SignInPage();
    window.signinPage.init();
});