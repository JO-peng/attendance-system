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
    
    // 加载用户信息
    async loadUserInfo() {
        try {
            // 如果已有用户信息，直接显示
            if (appState.userInfo && appState.userInfo.student_id && appState.userInfo.name) {
                console.log('Using cached user info:', appState.userInfo);
                this.displayUserInfo(appState.userInfo);
                return;
            }
            
            // 尝试从企业微信获取用户信息，添加重试限制
            const userInfo = await this.getUserInfoWithRetry();
            
            if (userInfo && userInfo.student_id && userInfo.name) {
                // 使用新的缓存机制保存用户信息
                appState.setUserInfo(userInfo);
                this.displayUserInfo(userInfo);
                console.log('User info loaded and cached:', userInfo);
            } else {
                // 显示获取用户信息失败的状态
                console.error('无法获取用户信息');
                Utils.showMessage(Utils.t('user_info_not_available'), 'error');
                
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
            }
        } catch (error) {
            console.error('加载用户信息失败:', error);
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
    
    // 更新建筑信息显示（带重试机制）
    async updateBuildingInfo(retryCount = 0, maxRetries = 2) {
        const buildingNameElement = document.getElementById('buildingName');
        
        if (!this.currentLocation?.latitude || !this.currentLocation?.longitude) {
            if (buildingNameElement) {
                buildingNameElement.textContent = '位置获取中...';
            }
            return;
        }
        
        // 显示正在获取位置信息的状态
        const lat = this.currentLocation.latitude.toFixed(4);
        const lng = this.currentLocation.longitude.toFixed(4);
        const coordsLabel = appState.currentLanguage === 'zh' ? '当前坐标：' : 'Current coordinates: ';
        const coordsText = `${lat}, ${lng}`;
        
        if (buildingNameElement && retryCount === 0) {
            const loadingText = appState.currentLanguage === 'zh' ? '正在获取位置信息...' : 'Getting location info...';
            buildingNameElement.innerHTML = `${loadingText}<br><small style="font-size: 0.75em; color: #666;">${coordsLabel}${coordsText}</small>`;
        }
        
        // 优先检查当前课程或下一节课程（无论课程数据是否完全加载）
        const targetCourse = this.getCurrentOrNextCourse();
        
        if (targetCourse && targetCourse.building_name) {
            // 如果有当前课程或下一节课程，优先显示该课程的建筑
            await this.displayCourseBasedBuilding(targetCourse, coordsText);
            return;
        } else {
            // 如果课程数据未加载完成，等待一段时间后重试
            if (this.courseDataLoaded !== true) {
                setTimeout(() => {
                    if (this.courseDataLoaded === true) {
                        this.updateBuildingInfo(retryCount, maxRetries);
                    }
                }, 1000);
            }
        }
        
        try {
            const response = await fetch('/api/v1/location-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    longitude: this.currentLocation.longitude,
                    latitude: this.currentLocation.latitude,
                    timestamp: Math.floor(Date.now() / 1000)
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                if (result.data.building && result.data.is_valid_location) {
                    // 在有效范围内，显示建筑名称和状态
                    if (buildingNameElement) {
                        const statusText = appState.currentLanguage === 'zh' ? '在范围内' : 'Within range';
                        const coordsLabel = appState.currentLanguage === 'zh' ? '当前坐标：' : 'Current coordinates: ';
                        buildingNameElement.innerHTML = `
                            <div style="color: #28a745; font-weight: bold;">${result.data.building.name}</div>
                            <div style="font-size: 0.85em; color: #28a745; margin-top: 2px;">✓ ${statusText}</div>
                            <small style="font-size: 0.75em; color: #666; margin-top: 4px; display: block;">${coordsLabel}${coordsText}</small>
                        `;
                        buildingNameElement.setAttribute('data-zh', `${result.data.building.name} - 在范围内`);
                        buildingNameElement.setAttribute('data-en', `${result.data.building.name_en} - Within range`);
                    }
                } else if (result.data.building) {
                    // 找到最近建筑但距离太远
                    if (buildingNameElement) {
                        const distance = result.data.distance;
                        const distanceText = appState.currentLanguage === 'zh' ? `距离 ${distance} 米` : `${distance}m away`;
                        const coordsLabel = appState.currentLanguage === 'zh' ? '当前坐标：' : 'Current coordinates: ';
                        buildingNameElement.innerHTML = `
                            <div style="color: #ffc107; font-weight: bold;">${result.data.building.name}</div>
                            <div style="font-size: 0.85em; color: #ffc107; margin-top: 2px;">📍 ${distanceText}</div>
                            <small style="font-size: 0.75em; color: #666; margin-top: 4px; display: block;">${coordsLabel}${coordsText}</small>
                        `;
                        buildingNameElement.setAttribute('data-zh', `${result.data.building.name} - 距离${distance}米`);
                        buildingNameElement.setAttribute('data-en', `${result.data.building.name_en} - ${distance}m away`);
                    }
                } else {
                    // 没有找到任何建筑
                    if (buildingNameElement) {
                        const unknownText = appState.currentLanguage === 'zh' ? '位置未知' : 'Unknown Location';
                        const coordsLabel = appState.currentLanguage === 'zh' ? '当前坐标：' : 'Current coordinates: ';
                        buildingNameElement.innerHTML = `
                            <div style="color: #dc3545; font-weight: bold;">${unknownText}</div>
                            <div style="font-size: 0.85em; color: #dc3545; margin-top: 2px;">❌ ${appState.currentLanguage === 'zh' ? '超出范围' : 'Out of range'}</div>
                            <small style="font-size: 0.75em; color: #666; margin-top: 4px; display: block;">${coordsLabel}${coordsText}</small>
                        `;
                        buildingNameElement.setAttribute('data-zh', '位置未知 - 超出范围');
                        buildingNameElement.setAttribute('data-en', 'Unknown Location - Out of range');
                    }
                }
                
                // 保存位置信息供其他功能使用
                this.locationInfo = result.data;
                this.currentBuildingInfo = result.data;
                // 缓存建筑信息
                appState.setCache('buildingInfo', result.data);
                console.log('Building info updated and cached:', result.data);
                
                // 如果有当前位置和地图已加载，更新地图显示
                if (this.currentLocation && this.map) {
                    this.updateMapDisplay(this.currentLocation, result.data);
                }
            } else {
                throw new Error(result.message || '位置信息获取失败');
            }
        } catch (error) {
            console.error(`更新建筑信息失败 (尝试 ${retryCount + 1}/${maxRetries + 1}):`, error);
            
            // 如果还有重试次数，则重试
            if (retryCount < maxRetries) {
                console.log(`正在重试获取位置信息... (${retryCount + 1}/${maxRetries})`);
                setTimeout(() => {
                    this.updateBuildingInfo(retryCount + 1, maxRetries);
                }, 1000 * (retryCount + 1)); // 递增延迟：1s, 2s
                return;
            }
            
            // 所有重试都失败了，显示失败状态
            if (buildingNameElement) {
                const failedText = appState.currentLanguage === 'zh' ? '位置获取失败' : 'Location Failed';
                buildingNameElement.innerHTML = `
                    <div style="color: #dc3545; font-weight: bold;">${failedText}</div>
                    <small style="font-size: 0.75em; color: #666; margin-top: 4px; display: block;">${coordsLabel}${coordsText}</small>
                `;
                buildingNameElement.setAttribute('data-zh', '位置获取失败');
                buildingNameElement.setAttribute('data-en', 'Location Failed');
            }
            
            // 只在最后一次失败时显示错误消息
            Utils.showMessage(`位置信息获取失败: ${error.message}`, 'error');
        }
    }
    
    // 显示缓存的建筑信息
    displayCachedBuildingInfo(buildingInfo) {
        const buildingNameElement = document.getElementById('buildingName');
        if (!buildingNameElement || !this.currentLocation) return;
        
        const lat = this.currentLocation.latitude.toFixed(4);
        const lng = this.currentLocation.longitude.toFixed(4);
        
        // 创建用户友好的坐标显示
        const coordsLabel = appState.currentLanguage === 'zh' ? '当前坐标：' : 'Current coordinates: ';
        const coordsText = `${lat}, ${lng}`;
        
        if (buildingInfo.building && buildingInfo.is_valid_location) {
            // 在有效范围内，显示建筑名称和状态
            const buildingName = appState.currentLanguage === 'zh' ? buildingInfo.building.name : buildingInfo.building.name_en;
            const statusText = appState.currentLanguage === 'zh' ? '在范围内' : 'Within range';
            buildingNameElement.innerHTML = `
                <div style="color: #28a745; font-weight: bold;">${buildingName}</div>
                <div style="font-size: 0.85em; color: #28a745; margin-top: 2px;">✓ ${statusText}</div>
                <small style="font-size: 0.75em; color: #666; margin-top: 4px; display: block;">${coordsLabel}${coordsText}</small>
            `;
            buildingNameElement.setAttribute('data-zh', `${buildingInfo.building.name} - 在范围内`);
            buildingNameElement.setAttribute('data-en', `${buildingInfo.building.name_en} - Within range`);
        } else if (buildingInfo.building) {
            // 找到最近建筑但距离太远
            const distance = buildingInfo.distance;
            const buildingName = appState.currentLanguage === 'zh' ? buildingInfo.building.name : buildingInfo.building.name_en;
            const distanceText = appState.currentLanguage === 'zh' ? `距离 ${distance} 米` : `${distance}m away`;
            
            buildingNameElement.innerHTML = `
                <div style="color: #ffc107; font-weight: bold;">${buildingName}</div>
                <div style="font-size: 0.85em; color: #ffc107; margin-top: 2px;">📍 ${distanceText}</div>
                <small style="font-size: 0.75em; color: #666; margin-top: 4px; display: block;">${coordsLabel}${coordsText}</small>
            `;
            buildingNameElement.setAttribute('data-zh', `${buildingInfo.building.name} - 距离${distance}米`);
            buildingNameElement.setAttribute('data-en', `${buildingInfo.building.name_en} - ${distance}m away`);
        } else {
            // 没有找到任何建筑
            const unknownText = appState.currentLanguage === 'zh' ? '位置未知' : 'Unknown Location';
            buildingNameElement.innerHTML = `
                <div style="color: #dc3545; font-weight: bold;">${unknownText}</div>
                <div style="font-size: 0.85em; color: #dc3545; margin-top: 2px;">❌ ${appState.currentLanguage === 'zh' ? '超出范围' : 'Out of range'}</div>
                <small style="font-size: 0.75em; color: #666; margin-top: 4px; display: block;">${coordsLabel}${coordsText}</small>
            `;
            buildingNameElement.setAttribute('data-zh', '位置未知 - 超出范围');
            buildingNameElement.setAttribute('data-en', 'Unknown Location - Out of range');
        }
        
        // 如果地图已加载，更新地图显示
        if (this.map) {
            this.currentBuildingInfo = buildingInfo;
            this.updateMapDisplay(this.currentLocation, buildingInfo);
        }
    }
    
    // 获取当前位置
    async getCurrentLocation() {
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
            
            // 显示错误提示，并提供重试选项
            const retryText = appState.currentLanguage === 'zh' ? '重试' : 'Retry';
            Utils.showMessage(
                errorMessage + ` <button onclick="window.signinPage.getCurrentLocation()" style="margin-left: 12px; padding: 4px 8px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; border-radius: 4px; cursor: pointer;">${retryText}</button>`,
                errorType,
                8000,
                { html: true }
            );
            
            // 不再使用模拟位置，让用户知道定位失败了
            this.currentLocation = null;
        }
    }
    
    // 刷新位置显示（用于语言切换时）
    refreshLocationDisplay() {
        if (this.currentLocation && this.locationInfo) {
            // 如果有位置信息，重新显示建筑信息
            this.displayCachedBuildingInfo(this.locationInfo);
            // 如果有课程信息，也重新更新课程信息显示
            if (this.locationInfo) {
                this.updateCourseInfo(this.locationInfo);
            }
            // 如果地图已经存在，重新渲染地图以修复语言切换后的显示问题
            if (this.map) {
                setTimeout(() => {
                    this.map.getSize();
                    this.updateMapDisplay(this.currentLocation, this.locationInfo);
                }, 100);
            }
        } else if (this.currentLocation) {
            // 如果只有位置坐标，重新获取建筑信息
            this.updateBuildingInfo();
        } else {
            // 如果没有位置信息，显示定位失败状态
            const buildingNameElement = document.getElementById('buildingName');
            if (buildingNameElement) {
                const failedText = appState.currentLanguage === 'zh' ? '位置获取失败' : 'Location Failed';
                buildingNameElement.textContent = failedText;
            }
        }
    }
    
    // 检查签到时间
    isSigninTimeValid() {
        // const now = new Date();
        // const hour = now.getHours();
        // const minute = now.getMinutes();
        
        // // 签到时间：8:00-18:00
        // const currentTime = hour * 60 + minute;
        // const startTime = 8 * 60; // 8:00
        // const endTime = 18 * 60;  // 18:00
        
        // return currentTime >= startTime && currentTime <= endTime;   
        // 移除时间限制，全天可签到           先暂时这样
        return true;
    }
    
    // 显示签到模态框
    async showSigninModal() {
        // 检查用户信息是否有效
        if (!appState.userInfo || !appState.userInfo.student_id || !appState.userInfo.name) {
            Utils.showMessage(Utils.t('user_info_not_loaded'), 'error');
            return;
        }
        
        if (!this.isSigninTimeValid()) {
            Utils.showMessage(Utils.t('signin_time_invalid'), 'error');
            return;
        }
        
        const modal = document.getElementById('signinModal');
        if (modal) {
            modal.style.display = 'flex';
            this.resetForm();
            await this.updateModalInfo();
        }
    }
    
    // 更新模态框中的用户信息和课程信息
    async updateModalInfo() {
        // 更新用户信息
        const userNameDisplay = document.getElementById('userNameDisplay');
        const studentIdDisplay = document.getElementById('studentIdDisplay');
        
        if (userNameDisplay && appState.userInfo?.name) {
            userNameDisplay.textContent = appState.userInfo.name;
        }
        if (studentIdDisplay && appState.userInfo?.student_id) {
            studentIdDisplay.textContent = appState.userInfo.student_id;
        }
        
        // 获取位置和课程信息
        if (this.currentLocation?.latitude && this.currentLocation?.longitude) {
            try {
                const response = await fetch('/api/v1/location-info', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        longitude: this.currentLocation.longitude,
                        latitude: this.currentLocation.latitude,
                        timestamp: Math.floor(Date.now() / 1000),
                        student_id: appState.userInfo?.student_id
                    })
                });
                
                const result = await response.json();
                
                if (result.success && result.data) {
                    this.updateCourseInfo(result.data);
                } else {
                    // 即使API返回空数据，也显示基本信息
                    this.updateCourseInfo({
                        course: null,
                        building: this.currentBuildingInfo,
                        status: 'unknown'
                    });
                }
                
                // 无论API调用结果如何，都显示地图区域
                this.showMapSection();
                
            } catch (error) {
                console.warn('获取位置和课程信息失败:', error);
                
                // API调用失败时，显示基本信息
                this.updateCourseInfo({
                    course: null,
                    building: this.currentBuildingInfo,
                    status: 'error'
                });
                
                // 即使API调用失败，也显示地图区域
                this.showMapSection();
            }
        } else {
            // 没有位置信息时，也显示基本的课程信息区域
            this.updateCourseInfo({
                course: null,
                building: null,
                status: 'no_location'
            });
            
            // 显示地图区域（可能显示默认位置）
            this.showMapSection();
        }
    }
    
    // 更新课程信息显示
    updateCourseInfo(locationInfo) {
        const courseInfoSection = document.getElementById('courseInfoSection');
        const currentCourseDisplay = document.getElementById('currentCourseDisplay');
        const classroomInfoDisplay = document.getElementById('classroomInfoDisplay');
        const statusDisplay = document.getElementById('statusDisplay');
        
        // 显示课程信息区域
        if (courseInfoSection) {
            courseInfoSection.style.display = 'block';
        }
        
        // 只有在课程数据加载完成后才应用样式
        if (this.courseDataLoaded === false) {
            return; // 课程数据还未加载完成，跳过样式更新
        }
        
        // 获取当前或下一节课程信息
        const currentCourse = this.getCurrentOrNextCourse();
        const hasCourse = currentCourse && currentCourse.course_name;
        
        // 根据是否有课程调整样式
        if (courseInfoSection) {
            if (hasCourse) {
                // 有课程时：使用蓝色/绿色主题，移除红色边框
                courseInfoSection.style.background = 'linear-gradient(135deg, rgba(13, 110, 253, 0.1) 0%, rgba(25, 135, 84, 0.05) 100%)';
                courseInfoSection.style.border = '1px solid #0d6efd';
                courseInfoSection.style.borderRadius = 'var(--radius-lg)';
            } else {
                // 无课程时：使用默认样式
                courseInfoSection.style.background = 'var(--gray-50)';
                courseInfoSection.style.border = '1px solid var(--gray-200)';
                courseInfoSection.style.borderRadius = 'var(--radius-lg)';
            }
        }
        
        // 显示课程信息
        if (currentCourseDisplay) {
            if (hasCourse) {
                currentCourseDisplay.textContent = currentCourse.course_name;
                currentCourseDisplay.style.color = '#0d6efd';
                currentCourseDisplay.style.fontWeight = '600';
            } else {
                currentCourseDisplay.textContent = Utils.t('no_current_course');
                currentCourseDisplay.style.color = 'var(--gray-600)';
                currentCourseDisplay.style.fontWeight = '500';
            }
        }
        
        // 显示教室信息
        if (classroomInfoDisplay) {
            let classroomText = Utils.t('unknown_location');
            let classroomColor = 'var(--gray-600)';
            
            if (hasCourse && currentCourse.building_name) {
                // 优先显示当前课程的教室信息（建筑名+教室号）
                const buildingName = appState.currentLanguage === 'zh' ? 
                    currentCourse.building_name : 
                    (currentCourse.building_name_en || currentCourse.building_name);
                
                const classroom = currentCourse.classroom || '';
                classroomText = classroom ? `${buildingName} ${classroom}` : buildingName;
                classroomColor = '#0d6efd'; // 蓝色表示课程教室
            } else if (locationInfo.building) {
                // 如果没有课程教室信息，显示位置信息
                const buildingName = appState.currentLanguage === 'zh' ? 
                    locationInfo.building.name : 
                    (locationInfo.building.name_en || locationInfo.building.name);
                
                if (locationInfo.is_valid_location) {
                    classroomText = buildingName;
                    classroomColor = '#198754'; // 绿色表示在范围内
                } else {
                    const distanceText = appState.currentLanguage === 'zh' ? 
                        `距离${locationInfo.distance}米` : 
                        `${locationInfo.distance}m away`;
                    classroomText = `${buildingName} (${distanceText})`;
                    classroomColor = '#ffc107'; // 黄色表示距离过远
                }
            }
            
            classroomInfoDisplay.textContent = classroomText;
            classroomInfoDisplay.style.color = classroomColor;
            classroomInfoDisplay.style.fontWeight = hasCourse ? '600' : '500';
        }
        
        // 显示签到状态
        if (statusDisplay) {
            let statusMessage = '';
            let statusColor = 'var(--gray-600)';
            
            if (hasCourse) {
                // 有课程时显示详细的签到状态
                const courseStatus = this.calculateCourseStatus(currentCourse);
                
                if (courseStatus === 'past') {
                    statusMessage = appState.currentLanguage === 'zh' ? '课程已结束' : 'Course Ended';
                    statusColor = '#dc3545'; // 红色
                } else if (courseStatus === 'upcoming') {
                    statusMessage = appState.currentLanguage === 'zh' ? '即将开始' : 'Starting Soon';
                    statusColor = '#ffc107'; // 黄色
                } else if (courseStatus === 'current') {
                    // 当前课程，检查位置状态
                    if (locationInfo.is_valid_location) {
                        statusMessage = appState.currentLanguage === 'zh' ? '可签到' : 'Can Sign In';
                        statusColor = '#198754'; // 绿色
                    } else if (locationInfo.building) {
                        statusMessage = appState.currentLanguage === 'zh' ? '距离过远' : 'Too Far';
                        statusColor = '#ffc107'; // 黄色
                    } else {
                        statusMessage = appState.currentLanguage === 'zh' ? '位置未知' : 'Unknown Location';
                        statusColor = '#dc3545'; // 红色
                    }
                } else {
                    statusMessage = appState.currentLanguage === 'zh' ? '等待中' : 'Waiting';
                    statusColor = 'var(--gray-600)';
                }
            } else {
                // 无课程时显示基本状态
                statusMessage = appState.currentLanguage === 'zh' ? '暂无课程' : 'No Course';
                statusColor = 'var(--gray-600)';
                
                // 如果有位置信息，显示位置状态
                if (locationInfo.building) {
                    const locationStatus = locationInfo.is_valid_location ? 
                        (appState.currentLanguage === 'zh' ? '位置正常' : 'Location OK') :
                        (appState.currentLanguage === 'zh' ? '位置偏远' : 'Location Far');
                    statusMessage = locationStatus;
                    statusColor = locationInfo.is_valid_location ? '#198754' : '#ffc107';
                }
            }
            
            statusDisplay.textContent = statusMessage;
            statusDisplay.style.color = statusColor;
            statusDisplay.style.fontWeight = hasCourse ? '600' : '500';
        }
        
        // 只有在课程数据加载完成后才执行自动填充
        if (this.courseDataLoaded !== false) {
            this.autoFillSigninForm(locationInfo);
        }
        
        // 保存建筑信息并显示地图（即使没有建筑信息也显示地图）
        if (locationInfo.building) {
            this.currentBuildingInfo = locationInfo.building;
        }
        // 始终显示地图区域，即使没有建筑信息
        this.showMapSection();
    }
    
    // 自动填充签到表单
    autoFillSigninForm(locationInfo) {
        const courseInput = document.getElementById('courseName');
        const classroomInput = document.getElementById('classroom');
        
        // 获取当前或下一节课程信息
        const currentCourse = this.getCurrentOrNextCourse();
        
        // 自动填充课程名称
        if (courseInput && currentCourse?.course_name) {
            // 只有当输入框为空时才自动填充，允许用户手动修改
            if (!courseInput.value.trim()) {
                courseInput.value = currentCourse.course_name;
                console.log('自动填充课程名称:', currentCourse.course_name);
            }
        }
        
        // 自动填充教室位置
        if (classroomInput && currentCourse) {
            // 只有当输入框为空时才自动填充，允许用户手动修改
            if (!classroomInput.value.trim()) {
                let classroomLocation = '';
                
                // 组合建筑名称和教室号来显示完整的教室位置
                if (currentCourse.building_name && currentCourse.classroom) {
                    classroomLocation = `${currentCourse.building_name}${currentCourse.classroom}`;
                } else if (currentCourse.classroom) {
                    // 如果只有教室号，直接使用
                    classroomLocation = currentCourse.classroom;
                } else if (currentCourse.building_name) {
                    // 如果只有建筑名，使用建筑名
                    classroomLocation = currentCourse.building_name;
                } else if (locationInfo?.building) {
                    // 使用建筑信息作为后备
                    const buildingName = appState.currentLanguage === 'zh' ? 
                        locationInfo.building.name : 
                        (locationInfo.building.name_en || locationInfo.building.name);
                    classroomLocation = buildingName;
                }
                
                if (classroomLocation) {
                    classroomInput.value = classroomLocation;
                    console.log('自动填充教室位置:', classroomLocation);
                }
            }
        }
        
        // 触发表单验证
        this.validateForm();
    }
    
    // 隐藏签到模态框
    hideSigninModal() {
        const modal = document.getElementById('signinModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.hideMapSection();
    }
    
    // 重置表单
    resetForm() {
        this.currentPhoto = null;
        
        const photoUpload = document.getElementById('photoUpload');
        const courseInput = document.getElementById('courseName');
        const classroomInput = document.getElementById('classroom');
        
        if (photoUpload) {
            photoUpload.innerHTML = `
                <div class="upload-placeholder">
                    <img src="icon/shot.png" alt="拍照" width="48" height="48">
                    <p data-zh="点击拍照" data-en="Tap to take photo">点击拍照</p>
                </div>
            `;
            photoUpload.classList.remove('has-photo');
        }
        
        if (courseInput) {
            courseInput.value = '';
        }
        
        if (classroomInput) {
            classroomInput.value = '';
        }
        
        this.validateForm();
    }
    
    // 拍照 - 直接使用系统相机
     async takePhoto() {
         try {
             console.log('takePhoto called, using system camera...');
             Utils.showMessage(Utils.t('camera_opening'), 'info', 1000);
             
             // 直接使用HTML5文件选择和相机功能
             this.chooseImageFallback();
             
         } catch (error) {
             console.error('Failed to take photo:', error);
             Utils.showMessage(Utils.t('camera_error'), 'error', 3000);
         }
     }
    
    // HTML5文件选择降级方案
    chooseImageFallback() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'camera'; // 优先使用摄像头
            
            input.onchange = (event) => {
                const file = event.target.files[0];
                if (file) {
                     // 检查文件大小（限制为5MB）
                     if (file.size > 5 * 1024 * 1024) {
                         Utils.showMessage(Utils.t('image_too_large'), 'warning', 4000);
                         return;
                     }
                     
                     // 检查文件类型
                     if (!file.type.startsWith('image/')) {
                         Utils.showMessage(Utils.t('select_image_file'), 'warning', 3000);
                         return;
                     }
                    
                    const loadingMessage = Utils.showLoading('正在处理图片...');
                    
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const dataUrl = e.target.result;
                            
                            // 显示照片预览
                            const photoUpload = document.getElementById('photoUpload');
                            if (photoUpload) {
                                photoUpload.innerHTML = `
                                    <img src="${dataUrl}" alt="签到照片" class="photo-preview">
                                `;
                                photoUpload.classList.add('has-photo');
                            }
                            
                            this.currentPhoto = dataUrl;
                            this.validateForm();
                            
                            Utils.hideLoading(loadingMessage);
                             Utils.showMessage(Utils.t('image_upload_success'), 'success', 2000);
                             
                         } catch (error) {
                             Utils.hideLoading(loadingMessage);
                             console.error('Image processing error:', error);
                             Utils.showMessage(Utils.t('image_process_failed'), 'error', 3000);
                         }
                     };
                     
                     reader.onerror = () => {
                         Utils.hideLoading(loadingMessage);
                         Utils.showMessage(Utils.t('image_read_failed'), 'error', 3000);
                     };
                     
                     reader.readAsDataURL(file);
                 } else {
                     Utils.showMessage(Utils.t('no_image_selected'), 'info', 2000);
                 }
             };
             
             // 处理用户取消选择
             input.oncancel = () => {
                 Utils.showMessage(Utils.t('image_selection_cancelled'), 'info', 2000);
             };
             
             input.click();
             
         } catch (error) {
             console.error('File selection error:', error);
             Utils.showMessage(Utils.t('file_selector_error'), 'error', 4000);
         }
    }
    
    // 验证表单
    validateForm() {
        const courseInput = document.getElementById('courseName');
        const classroomInput = document.getElementById('classroom');
        const submitBtn = document.getElementById('submitSignin');
        
        const hasPhoto = !!this.currentPhoto;
        const hasCourse = courseInput && courseInput.value.trim();
        const hasClassroom = classroomInput && classroomInput.value.trim();
        
        const isValid = hasPhoto && hasCourse && hasClassroom;
        
        if (submitBtn) {
            submitBtn.disabled = !isValid;
        }
        
        return isValid;
    }
    
    // 提交签到
    async submitSignin() {
        if (this.isSigningIn) {
            return;
        }
    
        // 检查用户信息是否有效
         if (!appState.userInfo || !appState.userInfo.student_id || !appState.userInfo.name) {
             Utils.showMessage(Utils.t('user_info_refresh_required'), 'error');
             return;
         }
    
        if (!this.validateForm()) {
            if (!this.currentPhoto) {
                Utils.showMessage(Utils.t('photo_required'), 'error');
            } else if (!document.getElementById('courseName').value.trim()) {
                Utils.showMessage(Utils.t('course_required'), 'error');
            } else if (!document.getElementById('classroom').value.trim()) {
                Utils.showMessage(Utils.t('classroom_required'), 'error');
            }
            return;
        }
    
        this.isSigningIn = true;
        const submitBtn = document.getElementById('submitSignin');
    
        // 显示加载状态
        const loadingMessage = Utils.showLoading('正在提交签到...');
    
        try {
            if (submitBtn) {
                submitBtn.classList.add('loading');
                submitBtn.disabled = true;
            }
    
            // 处理照片上传
            let photoData = null;
            if (this.currentPhoto) {
                try {
                    // 检查是否为base64数据（HTML5文件选择）
                    if (this.currentPhoto.startsWith('data:image/')) {
                        // base64数据，直接使用
                        photoData = this.currentPhoto;
                    } else {
                        // 企业微信照片ID，尝试上传到服务器
                        if (appState.isWeChatReady) {
                            photoData = await WeChatAPI.uploadImage(this.currentPhoto);
                        } else {
                            photoData = this.currentPhoto;
                        }
                    }
                } catch (error) {
                    console.warn('Failed to process photo:', error);
                    // 继续使用原始数据
                    photoData = this.currentPhoto;
                }
            }
            
            // 准备签到数据
            const signinData = {
                student_id: appState.userInfo?.student_id,
                name: appState.userInfo?.name,
                course_name: document.getElementById('courseName').value.trim(),
                classroom: document.getElementById('classroom').value.trim(),
                photo: photoData,
                latitude: this.currentLocation?.latitude,
                longitude: this.currentLocation?.longitude,
                location_address: this.currentLocation?.address,
                wechat_userid: appState.userInfo?.wechat_userid,
                timestamp: new Date().toISOString(),
                language: appState.currentLanguage // 添加当前界面语言
            };
    
            console.log('提交签到数据:', signinData);
            
            // 首先检查当前位置和课程
            let buildingInfo = null;
            if (this.currentLocation?.latitude && this.currentLocation?.longitude) {
                try {
                    // 获取当前或下一节课程信息
                    const targetCourse = this.getCurrentOrNextCourse();
                    
                    const checkRequestBody = {
                        longitude: this.currentLocation.longitude,
                        latitude: this.currentLocation.latitude,
                        timestamp: Math.floor(Date.now() / 1000),
                        student_id: appState.userInfo?.student_id
                    };
                    
                    // 如果有课程信息，添加目标建筑参数
                    if (targetCourse && targetCourse.building_name) {
                        checkRequestBody.target_building = targetCourse.building_name;
                    }
                    
                    const checkResult = await Utils.request('/api/v1/check-in', {
                        method: 'POST',
                        body: JSON.stringify(checkRequestBody)
                    });
                    
                    if (checkResult.success && checkResult.data) {
                        buildingInfo = checkResult.data;
                        console.log('位置检查结果:', buildingInfo);
                        
                        // 显示建筑信息
                        if (buildingInfo.building) {
                            Utils.showMessage(`检测到您在${buildingInfo.building.name}(${buildingInfo.building.name_en})`, 'info', 2000);
                        }
                        
                        // 如果有课程信息，显示课程状态
                        if (buildingInfo.course) {
                            const statusKey = `status_${buildingInfo.status}`;
                            const statusText = Utils.t(statusKey) !== statusKey ? Utils.t(statusKey) : buildingInfo.status;
                            const courseLabel = appState.currentLanguage === 'zh' ? '课程' : 'Course';
                            Utils.showMessage(`${courseLabel}: ${buildingInfo.course.name} - ${statusText}`, 'info', 2000);
                        }
                    }
                } catch (error) {
                     console.warn('位置检查失败:', error);
                     Utils.showMessage(Utils.t('location_check_failed'), 'warning', 2000);
                 }
            }
            
            // 提交到后端
            const result = await Utils.request('/signin', {
                method: 'POST',
                body: JSON.stringify(signinData)
            });
            
            if (result.success) {
                Utils.hideLoading(loadingMessage);
                Utils.showMessage(Utils.t('signin_success'), 'success', 3000);
                this.hideSigninModal();
                
                // 可选：刷新页面或更新UI状态
                setTimeout(() => {
                    // window.location.reload();
                }, 1500);
            } else {
                throw new Error(result.message || 'Sign in failed');
            }
            
        } catch (error) {
            Utils.hideLoading(loadingMessage);
            console.error('Sign in error:', error);
            
            let errorMessage = Utils.t('signin_failed');
            let errorType = 'error';
            
            // 检查是否是授权相关错误
            if (error.message && (
                error.message.includes('Invalid authorization') ||
                error.message.includes('授权码过期') ||
                error.message.includes('401') ||
                error.message.includes('403')
            )) {
                errorMessage = appState.currentLanguage === 'zh' ? 
                    '授权已过期，请刷新页面重新登录' : 
                    'Authorization expired, please refresh page to login again';
                errorType = 'warning';
                
                // 清除缓存的用户信息
                appState.clearCache('userInfo');
                sessionStorage.removeItem('index_userinfo_retry_count');
                
                // 显示刷新按钮
                const refreshText = appState.currentLanguage === 'zh' ? '刷新页面' : 'Refresh Page';
                Utils.showMessage(
                    errorMessage + ` <button onclick="window.location.reload()" style="margin-left: 12px; padding: 4px 8px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; border-radius: 4px; cursor: pointer;">${refreshText}</button>`,
                    errorType,
                    0,
                    { html: true, persistent: true, clearPrevious: true }
                );
                return;
            }
            
            // 网络错误
            if (error.message && (
                error.message.includes('network') || 
                error.message.includes('fetch') ||
                error.message.includes('Failed to fetch') ||
                error.name === 'NetworkError'
            )) {
                errorMessage = appState.currentLanguage === 'zh' ? 
                    '网络连接失败，请检查网络后重试' : 
                    'Network connection failed, please check network and try again';
                errorType = 'warning';
            } 
            // 服务器错误
            else if (error.message && (
                error.message.includes('server') ||
                error.message.includes('500') ||
                error.message.includes('502') ||
                error.message.includes('503')
            )) {
                errorMessage = appState.currentLanguage === 'zh' ? 
                    '服务器暂时不可用，请稍后重试' : 
                    'Server temporarily unavailable, please try again later';
                errorType = 'warning';
            }
            // 如果有具体的错误消息，显示具体消息
            else if (error.message && error.message !== 'Sign in failed') {
                errorMessage = error.message;
            }
            
            Utils.showMessage(errorMessage, errorType, 5000);
            
            // 在控制台输出详细错误信息供调试
            console.log('详细错误信息:', {
                message: error.message,
                name: error.name,
                stack: error.stack,
                signinData: {
                    student_id: appState.userInfo?.student_id,
                    name: appState.userInfo?.name,
                    course_name: document.getElementById('courseName').value.trim(),
                    classroom: document.getElementById('classroom').value.trim(),
                    hasPhoto: !!this.currentPhoto
                }
            });
            
        } finally {
            this.isSigningIn = false;
            
            // 恢复按钮状态
            if (submitBtn) {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        }
    }
    
    // 初始化地图
    initMap() {
        // 检查高德地图API是否加载成功
        if (!window.AMap) {
            console.warn('高德地图API未加载，尝试重新加载...');
            this.loadAMapAPI();
            return;
        }

        // 检查AMap对象是否包含必要的构造函数
        if (!AMap.Map || !AMap.Scale || !AMap.ToolBar) {
            console.warn('高德地图API组件不完整，重新加载...');
            this.loadAMapAPI();
            return;
        }

        const mapContainer = document.getElementById('mapContainer');
        if (!mapContainer) {
            console.warn('地图容器未找到');
            return;
        }

        try {
            // 创建地图实例
            this.map = new AMap.Map('mapContainer', {
                zoom: 16,
                center: [114.0579, 22.5431], // 深圳大学默认坐标
                mapStyle: 'amap://styles/normal',
                showLabel: true,
                showBuildingBlock: true,
                resizeEnable: true,
                rotateEnable: false,
                pitchEnable: false,
                scrollWheel: true,
                doubleClickZoom: true,
                keyboardEnable: false
            });

            // 地图加载完成事件
            this.map.on('complete', () => {
                mapContainer.classList.add('loaded');
                console.log('地图加载完成');
                
                // 添加缩放事件监听器，实现图标自适应缩放
                this.map.on('zoomchange', () => {
                    this.updateIconSizesByZoom();
                });
                
                // 延迟添加控件，确保地图完全加载
                setTimeout(() => {
                    this.addMapControls();
                }, 500);
                
                // 显示所有深圳大学建筑
                setTimeout(() => {
                    this.displayAllBuildings();
                }, 1000);
                
                // 如果有当前位置，立即更新地图显示
                if (this.currentLocation) {
                    this.updateMapDisplay(this.currentLocation, this.currentBuildingInfo);
                } else {
                    // 如果没有位置信息，尝试获取位置
                    this.getCurrentLocation().catch(error => {
                        console.log('地图加载完成后获取位置失败:', error);
                    });
                }
                
                Utils.showMessage('地图加载成功', 'success', 2000);
            });

            // 地图加载失败事件
            this.map.on('error', (error) => {
                console.error('地图加载错误:', error);
                this.showMapError('地图加载失败，请检查网络连接');
            });

        } catch (error) {
            console.error('地图初始化失败:', error);
            this.showMapError('地图初始化失败: ' + error.message);
        }
    }

    // 添加地图控件
    addMapControls() {
        if (!this.map || !window.AMap) {
            console.warn('地图或API未就绪，无法添加控件');
            return;
        }

        try {
            // 添加比例尺控件
            if (AMap.Scale) {
                this.map.addControl(new AMap.Scale({
                    position: {
                        bottom: '10px',
                        left: '10px'
                    }
                }));
            } else {
                console.warn('比例尺控件不可用');
            }
            
            // 添加工具栏控件（包含定位功能）
            if (AMap.ToolBar) {
                this.map.addControl(new AMap.ToolBar({
                    position: {
                        top: '10px',
                        right: '10px'
                    },
                    locate: true, // 启用定位功能
                    noIpLocate: true
                }));
            } else {
                console.warn('工具栏控件不可用');
            }
            
            // 添加自定义定位按钮
            this.addCustomLocationButton();
            
        } catch (error) {
            console.error('添加地图控件失败:', error);
        }
    }

    // 添加自定义定位按钮
    addCustomLocationButton() {
        if (!this.map) return;
        
        // 等待地图控件加载完成后再添加按钮
        setTimeout(() => {
            // 创建定位按钮容器
            const locationBtnContainer = document.createElement('div');
            locationBtnContainer.className = 'amap-custom-location-container';
            locationBtnContainer.style.cssText = `
                position: absolute;
                top: 80px;
                right: 5px;
                z-index: 1000;
            `;
        
            // 创建定位按钮
            const locationBtn = document.createElement('button');
            locationBtn.className = 'amap-custom-location-btn';
            locationBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
                </svg>
            `;
            
            // 设置按钮样式
            locationBtn.style.cssText = `
                width: 40px;
                height: 40px;
                background: #1890ff;
                border: none;
                border-radius: 6px;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
                transition: all 0.3s ease;
                font-size: 0;
                margin-bottom: 8px;
            `;
            
            // 添加悬停效果
            locationBtn.addEventListener('mouseenter', () => {
                locationBtn.style.transform = 'scale(1.05)';
                locationBtn.style.boxShadow = '0 4px 12px rgba(24, 144, 255, 0.4)';
            });
            
            locationBtn.addEventListener('mouseleave', () => {
                locationBtn.style.transform = 'scale(1)';
                locationBtn.style.boxShadow = '0 2px 8px rgba(24, 144, 255, 0.3)';
            });
            
            // 添加点击效果
            locationBtn.addEventListener('mousedown', () => {
                locationBtn.style.transform = 'scale(0.95)';
            });
            
            locationBtn.addEventListener('mouseup', () => {
                locationBtn.style.transform = 'scale(1.05)';
            });
            
            // 定位按钮点击事件
            locationBtn.addEventListener('click', () => {
                this.backToUserLocation();
            });
            
            // 添加工具提示
            locationBtn.title = appState.currentLanguage === 'zh' ? '回到我的位置' : 'Back to my location';
            
            // 将按钮添加到容器
            locationBtnContainer.appendChild(locationBtn);
            
            // 将容器添加到地图容器
            const mapContainer = this.map.getContainer();
            if (mapContainer) {
                mapContainer.appendChild(locationBtnContainer);
            }
        
            // 保存按钮引用以便后续操作
            this.customLocationBtn = locationBtn;
            this.customLocationContainer = locationBtnContainer;
        }, 500); // 延迟500ms等待地图控件加载
    }

    // 加载高德地图API
    loadAMapAPI() {
        // 检查是否已经在加载中
        if (this.isLoadingAMap) {
            console.log('高德地图API正在加载中...');
            return;
        }
        
        this.isLoadingAMap = true;
        
        // 先移除可能存在的旧脚本
        const existingScripts = document.querySelectorAll('script[src*="webapi.amap.com"]');
        existingScripts.forEach(script => script.remove());
        
        // 重置AMap对象
        window.AMap = null;
        
        const script = document.createElement('script');
        // 使用更稳定的API版本和加载方式
        script.src = 'https://webapi.amap.com/maps?v=2.0&key=947de6f6c206f80edc09bcdbc1d0c4d4&plugin=AMap.Geolocation,AMap.Scale,AMap.ToolBar&callback=onAMapLoaded';
        
        // 设置全局回调函数
        window.onAMapLoaded = () => {
            console.log('高德地图API加载成功');
            this.isLoadingAMap = false;
            
            // 检查API是否完整加载
            if (window.AMap && AMap.Map && AMap.Scale && AMap.ToolBar) {
                console.log('高德地图API组件加载完整');
                // 延迟重新初始化地图，确保所有组件就绪
                setTimeout(() => {
                    this.initMap();
                }, 1000);
            } else {
                console.warn('高德地图API组件不完整，尝试备用方案');
                this.tryAlternativeAMapLoad();
            }
        };
        
        script.onerror = () => {
            console.error('高德地图API加载失败');
            this.isLoadingAMap = false;
            this.showMapError('高德地图API加载失败，请检查网络连接');
        };
        
        document.head.appendChild(script);
        
        // 设置超时检查
        setTimeout(() => {
            if (this.isLoadingAMap) {
                console.warn('高德地图API加载超时');
                this.isLoadingAMap = false;
                this.tryAlternativeAMapLoad();
            }
        }, 10000); // 10秒超时
    }
    
    // 尝试备用加载方案
    tryAlternativeAMapLoad() {
        console.log('尝试备用高德地图API加载方案...');
        
        // 方案1：使用更简单的API版本
        const script = document.createElement('script');
        script.src = 'https://webapi.amap.com/maps?v=1.4.15&key=947de6f6c206f80edc09bcdbc1d0c4d4';
        
        script.onload = () => {
            console.log('备用高德地图API加载成功');
            this.isLoadingAMap = false;
            
            // 检查基本功能是否可用
            if (window.AMap && AMap.Map) {
                console.log('备用API基本功能可用');
                setTimeout(() => {
                    this.initSimpleMap();
                }, 500);
            } else {
                this.showMapError('高德地图API无法加载，请检查网络或密钥配置');
            }
        };
        
        script.onerror = () => {
            console.error('备用高德地图API加载失败');
            this.isLoadingAMap = false;
            this.showMapError('高德地图服务暂时不可用，请稍后重试');
        };
        
        document.head.appendChild(script);
    }
    
    // 初始化简化版地图（无控件）
    initSimpleMap() {
        const mapContainer = document.getElementById('mapContainer');
        if (!mapContainer || !window.AMap || !AMap.Map) {
            this.showMapError('地图初始化失败');
            return;
        }
        
        try {
            this.map = new AMap.Map('mapContainer', {
                zoom: 16,
                center: [114.0579, 22.5431],
                resizeEnable: true
            });
            
            this.map.on('complete', () => {
                mapContainer.classList.add('loaded');
                console.log('简化版地图加载完成');
                Utils.showMessage('地图加载成功（简化版）', 'success', 2000);
                
                // 更新地图显示
                if (this.currentLocation) {
                    this.updateSimpleMapDisplay(this.currentLocation, this.currentBuildingInfo);
                }
            });
            
        } catch (error) {
            console.error('简化版地图初始化失败:', error);
            this.showMapError('地图初始化失败: ' + error.message);
        }
    }
    
    // 更新简化版地图显示
    updateSimpleMapDisplay(userLocation, buildingInfo = null) {
        if (!this.map || !userLocation) return;
        
        const userLng = parseFloat(userLocation.longitude);
        const userLat = parseFloat(userLocation.latitude);
        
        // 设置地图中心
        this.map.setCenter([userLng, userLat]);
        
        // 如果有建筑信息，调整视野
        if (buildingInfo && buildingInfo.longitude && buildingInfo.latitude) {
            const buildingLng = parseFloat(buildingInfo.longitude);
            const buildingLat = parseFloat(buildingInfo.latitude);
            
            // 简单的视野调整
            this.map.setZoom(15);
        }
    }

    // 显示地图错误信息
    showMapError(message) {
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--gray-500); font-size: var(--font-size-sm); text-align: center; padding: 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🗺️</div>
                    <div style="margin-bottom: 10px;">${message}</div>
                    <button onclick="window.signinPage.retryMapLoad()" style="padding: 8px 16px; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer;">
                        ${appState.currentLanguage === 'zh' ? '重试加载' : 'Retry'}
                    </button>
                </div>
            `;
        }
        Utils.showMessage(message, 'error', 5000);
    }

    // 重试地图加载
    retryMapLoad() {
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer) {
            mapContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--gray-500);">正在重新加载地图...</div>';
        }
        setTimeout(() => {
            this.initMap();
        }, 1000);
    }

    // 绑定回到用户位置按钮事件
    bindLocationButton() {
        // 自定义按钮已在addCustomLocationButton中绑定事件，这里不需要额外操作
        // 但确保按钮存在
        if (this.customLocationBtn) {
            console.log('自定义位置按钮已绑定');
        }
    }

    // 回到用户位置
    backToUserLocation() {
        if (!this.map || !this.currentLocation) {
            // 尝试重新获取位置
            this.getCurrentLocation().then(() => {
                if (this.currentLocation) {
                    this.backToUserLocation();
                } else {
                    Utils.showMessage(
                        appState.currentLanguage === 'zh' ? '无法获取您的位置，请检查定位权限' : 'Unable to get your location, please check location permissions',
                        'error',
                        3000
                    );
                }
            }).catch(() => {
                Utils.showMessage(
                    appState.currentLanguage === 'zh' ? '定位失败，请重试' : 'Location failed, please try again',
                    'error',
                    3000
                );
            });
            return;
        }

        // 添加按钮点击动画
        if (this.customLocationBtn) {
            this.customLocationBtn.style.background = '#52c41a';
            setTimeout(() => {
                if (this.customLocationBtn) {
                    this.customLocationBtn.style.background = '#1890ff';
                }
            }, 300);
        }

        const userLng = parseFloat(this.currentLocation.longitude);
        const userLat = parseFloat(this.currentLocation.latitude);
        
        // 平滑移动到用户位置
        this.map.setCenter([userLng, userLat]);
        this.map.setZoom(17);
        
        // 如果用户标记存在，添加跳动动画
        if (this.userMarker) {
            // 创建标准的用户图标
            const standardIcon = new AMap.Icon({
                size: new AMap.Size(32, 42),
                image: 'icon/user_pin.png',
                imageOffset: new AMap.Pixel(-16, -42)
            });
            
            // 创建放大的图标用于动画
            const enlargedIcon = new AMap.Icon({
                size: new AMap.Size(40, 52),
                image: 'icon/user_pin.png',
                imageOffset: new AMap.Pixel(-20, -52)
            });
            
            this.userMarker.setIcon(enlargedIcon);
            
            // 500ms后恢复标准大小
            setTimeout(() => {
                if (this.userMarker) {
                    this.userMarker.setIcon(standardIcon);
                }
            }, 500);
        }
        
        // 显示成功消息
        Utils.showMessage(
            appState.currentLanguage === 'zh' ? '已回到您的位置' : 'Returned to your location',
            'success',
            2000
        );
    }

    // 更新地图显示
    updateMapDisplay(userLocation, buildingInfo = null) {
        console.log('updateMapDisplay调用:', { userLocation, buildingInfo });
        
        if (!this.map || !userLocation) {
            console.log('地图或用户位置不存在');
            return;
        }

        const userLng = parseFloat(userLocation.longitude);
        const userLat = parseFloat(userLocation.latitude);

        // 清除之前的标记
        this.clearMapMarkers();

        // 添加用户位置标记 - 使用user_pin.png图标
        this.userMarker = new AMap.Marker({
            position: [userLng, userLat],
            title: appState.currentLanguage === 'zh' ? '我的位置' : 'My Location',
            icon: new AMap.Icon({
                size: new AMap.Size(32, 42),
                image: 'icon/user_pin.png',
                imageSize: new AMap.Size(32, 42),
                imageOffset: new AMap.Pixel(0, 0)
            }),
            anchor: 'bottom-center',
            zIndex: 100
        });
        this.map.add(this.userMarker);

        // 添加用户位置标签
        const userInfoWindow = new AMap.InfoWindow({
            content: `<div style="padding: 8px; font-size: 12px; color: #333;">
                        <strong style="color: #1890ff;">${appState.currentLanguage === 'zh' ? '我的位置' : 'My Location'}</strong><br>
                        <span style="color: #666;">经度: ${userLng.toFixed(6)}</span><br>
                        <span style="color: #666;">纬度: ${userLat.toFixed(6)}</span>
                      </div>`,
            offset: new AMap.Pixel(0, -30),
            closeWhenClickMap: true
        });

        // 点击用户标记显示信息窗口
        this.userMarker.on('click', () => {
            userInfoWindow.open(this.map, [userLng, userLat]);
        });

        // 如果有建筑信息，添加建筑标记和签到范围
        console.log('检查建筑信息:', buildingInfo);
        
        if (buildingInfo && buildingInfo.longitude && buildingInfo.latitude) {
            const buildingLng = parseFloat(buildingInfo.longitude);
            const buildingLat = parseFloat(buildingInfo.latitude);
            const radius = parseFloat(buildingInfo.radius || 75);

            // 添加建筑标记 - 使用pin.png图标
            this.buildingMarker = new AMap.Marker({
                position: [buildingLng, buildingLat],
                title: buildingInfo.name || (appState.currentLanguage === 'zh' ? '教学楼' : 'Building'),
                icon: new AMap.Icon({
                    size: new AMap.Size(36, 46),
                    image: 'icon/pin.png',
                    imageSize: new AMap.Size(36, 46),
                    imageOffset: new AMap.Pixel(0, 0)
                }),
                anchor: 'bottom-center',
                zIndex: 99
            });
            this.map.add(this.buildingMarker);

            // 添加建筑信息窗口
            const buildingInfoWindow = new AMap.InfoWindow({
                content: `<div style="padding: 8px; font-size: 12px; color: #333;">
                            <strong style="color: #ff4d4f;">${buildingInfo.name || (appState.currentLanguage === 'zh' ? '教学楼' : 'Building')}</strong><br>
                            <span style="color: #666;">签到半径: ${radius}米</span><br>
                            <span style="color: #666;">经度: ${buildingLng.toFixed(6)}</span><br>
                            <span style="color: #666;">纬度: ${buildingLat.toFixed(6)}</span>
                          </div>`,
                offset: new AMap.Pixel(0, -42),
                closeWhenClickMap: true
            });

            // 点击建筑标记显示信息窗口
            this.buildingMarker.on('click', () => {
                buildingInfoWindow.open(this.map, [buildingLng, buildingLat]);
            });

            // 添加签到范围圆圈 - 使用渐变效果
            this.buildingCircle = new AMap.Circle({
                center: [buildingLng, buildingLat],
                radius: radius,
                fillColor: '#ff4d4f',
                fillOpacity: 0.15,
                strokeColor: '#ff4d4f',
                strokeWeight: 2,
                strokeOpacity: 0.8,
                strokeStyle: 'dashed',
                zIndex: 50
            });
            this.map.add(this.buildingCircle);

            // 计算用户与建筑的距离
            const distance = AMap.GeometryUtil.distance([userLng, userLat], [buildingLng, buildingLat]);
            const isInRange = distance <= radius;

            // 总是显示连接线，但根据是否在范围内使用不同颜色和样式
            this.connectionLine = new AMap.Polyline({
                path: [[userLng, userLat], [buildingLng, buildingLat]],
                strokeColor: isInRange ? '#52c41a' : '#ff7875', // 范围内绿色，范围外红色
                strokeWeight: isInRange ? 3 : 2, // 范围内粗一些，范围外细一些
                strokeOpacity: isInRange ? 0.8 : 0.6, // 范围内不透明度高一些
                strokeStyle: isInRange ? 'solid' : 'dashed', // 范围内实线，范围外虚线
                zIndex: 60
            });
            this.map.add(this.connectionLine);

            // 调整地图视野以包含所有标记
            const bounds = new AMap.Bounds([userLng, userLat], [buildingLng, buildingLat]);
            this.map.setBounds(bounds, false, [40, 40, 40, 80]); // 增加边距以更好地显示标记
        } else {
            // 只有用户位置时，以用户位置为中心
            this.map.setCenter([userLng, userLat]);
            this.map.setZoom(16);
        }
    }

    // 根据地图缩放级别更新图标大小
    updateIconSizesByZoom() {
        if (!this.map) return;
        
        const zoom = this.map.getZoom();
        console.log('当前缩放级别:', zoom);
        
        // 计算缩放比例 (基准缩放级别为16)
        const baseZoom = 16;
        const scaleFactor = Math.pow(1.2, zoom - baseZoom); // 每级缩放1.2倍
        const minScale = 0.5; // 最小缩放比例
        const maxScale = 2.0; // 最大缩放比例
        
        // 限制缩放比例范围
        const finalScale = Math.max(minScale, Math.min(maxScale, scaleFactor));
        
        // 更新用户位置图标
        if (this.userMarker) {
            const baseUserSize = { width: 32, height: 42 };
            const newUserSize = {
                width: Math.round(baseUserSize.width * finalScale),
                height: Math.round(baseUserSize.height * finalScale)
            };
            
            const userIcon = new AMap.Icon({
                size: new AMap.Size(newUserSize.width, newUserSize.height),
                image: 'icon/user_pin.png',
                imageSize: new AMap.Size(newUserSize.width, newUserSize.height),
                imageOffset: new AMap.Pixel(0, 0)
            });
            this.userMarker.setIcon(userIcon);
        }
        
        // 更新建筑图标
        if (this.buildingMarker) {
            const baseBuildingSize = { width: 36, height: 46 };
            const newBuildingSize = {
                width: Math.round(baseBuildingSize.width * finalScale),
                height: Math.round(baseBuildingSize.height * finalScale)
            };
            
            const buildingIcon = new AMap.Icon({
                size: new AMap.Size(newBuildingSize.width, newBuildingSize.height),
                image: 'icon/pin.png',
                imageSize: new AMap.Size(newBuildingSize.width, newBuildingSize.height),
                imageOffset: new AMap.Pixel(0, 0)
            });
            this.buildingMarker.setIcon(buildingIcon);
        }
        
        // 更新所有建筑标记
        if (this.buildingMarkers && this.buildingMarkers.length > 0) {
            const baseBuildingSize = { width: 32, height: 40 };
            const newBuildingSize = {
                width: Math.round(baseBuildingSize.width * finalScale),
                height: Math.round(baseBuildingSize.height * finalScale)
            };
            
            this.buildingMarkers.forEach(marker => {
                const buildingIcon = new AMap.Icon({
                    size: new AMap.Size(newBuildingSize.width, newBuildingSize.height),
                    image: 'icon/pin.png',
                    imageSize: new AMap.Size(newBuildingSize.width, newBuildingSize.height),
                    imageOffset: new AMap.Pixel(0, 0)
                });
                marker.setIcon(buildingIcon);
            });
        }
    }

    // 显示所有深圳大学建筑
    displayAllBuildings() {
        if (!this.map) return;

        // 深圳大学所有建筑数据
        const buildings = [
            // 沧海校区
            { name: "致腾楼", name_en: "Zhiteng Building", campus: "沧海校区", longitude: 113.93677, latitude: 22.52601, radius: 75 },
            { name: "致远楼", name_en: "Zhiyuan Building", campus: "沧海校区", longitude: 113.937826, latitude: 22.525709, radius: 75 },
            { name: "致工楼", name_en: "Zhigong Building", campus: "沧海校区", longitude: 113.93861, latitude: 22.526338, radius: 75 },
            { name: "致信楼", name_en: "Zhixin Building", campus: "沧海校区", longitude: 113.93758, latitude: 22.527523, radius: 75 },
            { name: "致知楼", name_en: "Zhizhi Building", campus: "沧海校区", longitude: 113.939055, latitude: 22.527002, radius: 75 },
            { name: "致艺楼", name_en: "Zhiyi Building", campus: "沧海校区", longitude: 113.939763, latitude: 22.529297, radius: 75 },
            { name: "致理楼", name_en: "Zhili Building", campus: "沧海校区", longitude: 113.939913, latitude: 22.528048, radius: 75 },
            { name: "致真楼", name_en: "Zhizhen Building", campus: "沧海校区", longitude: 113.94097, latitude: 22.5295, radius: 75 },
            { name: "汇智楼", name_en: "Huizhi Building", campus: "沧海校区", longitude: 113.935938, latitude: 22.531457, radius: 75 },
            { name: "汇子楼", name_en: "Huizi Building", campus: "沧海校区", longitude: 113.936557, latitude: 22.532779, radius: 75 },
            { name: "汇典楼", name_en: "Huidian Building", campus: "沧海校区", longitude: 113.935447, latitude: 22.533408, radius: 75 },
            { name: "汇文楼", name_en: "Huiwen Building", campus: "沧海校区", longitude: 113.934642, latitude: 22.537704, radius: 75 },
            { name: "汇行楼", name_en: "Huixing Building", campus: "沧海校区", longitude: 113.9366, latitude: 22.535152, radius: 75 },
            { name: "汇德楼", name_en: "Huide Building", campus: "沧海校区", longitude: 113.933001, latitude: 22.534245, radius: 75 },
            { name: "汇园楼", name_en: "Huiyuan Building", campus: "沧海校区", longitude: 113.933001, latitude: 22.534245, radius: 75 },
            // 丽湖校区
            { name: "四方楼", name_en: "Sifang Building", campus: "丽湖校区", longitude: 113.991746, latitude: 22.602008, radius: 75 },
            { name: "明理楼", name_en: "Mingli Building", campus: "丽湖校区", longitude: 113.993462, latitude: 22.601239, radius: 75 },
            { name: "守正楼", name_en: "Shouzheng Building", campus: "丽湖校区", longitude: 113.994057, latitude: 22.600552, radius: 75 },
            { name: "文韬楼", name_en: "Wentao Building", campus: "丽湖校区", longitude: 113.994775, latitude: 22.599209, radius: 75 }
        ];

        // 清除现有的建筑标记
        this.clearAllBuildingMarkers();

        // 为每个建筑创建标记和半径圆圈
        buildings.forEach((building, index) => {
            const buildingLng = parseFloat(building.longitude);
            const buildingLat = parseFloat(building.latitude);
            const radius = building.radius || 75;

            // 创建建筑标记
            const marker = new AMap.Marker({
                position: [buildingLng, buildingLat],
                title: building.name,
                icon: new AMap.Icon({
                    size: new AMap.Size(32, 40),
                    image: 'icon/pin.png',
                    imageSize: new AMap.Size(32, 40),
                    imageOffset: new AMap.Pixel(0, 0)
                }),
                anchor: 'bottom-center',
                zIndex: 98
            });

            // 创建建筑名称标签
            const label = new AMap.Text({
                text: building.name,
                position: [buildingLng, buildingLat],
                offset: new AMap.Pixel(0, -35),
                style: {
                    'background-color': 'rgba(255, 255, 255, 0.9)',
                    'border': '1px solid #1890ff',
                    'border-radius': '4px',
                    'padding': '2px 6px',
                    'font-size': '12px',
                    'color': '#1890ff',
                    'font-weight': 'bold',
                    'text-align': 'center',
                    'white-space': 'nowrap',
                    'box-shadow': '0 2px 4px rgba(0,0,0,0.2)'
                },
                zIndex: 99
            });

            // 创建信息窗口
            const infoWindow = new AMap.InfoWindow({
                content: `<div style="padding: 8px; font-size: 12px; color: #333;">
                            <strong style="color: #1890ff;">${building.name}</strong><br>
                            <span style="color: #666;">${building.name_en}</span><br>
                            <span style="color: #666;">校区: ${building.campus}</span><br>
                            <span style="color: #666;">签到半径: ${radius}米</span><br>
                            <span style="color: #666;">经度: ${buildingLng.toFixed(6)}</span><br>
                            <span style="color: #666;">纬度: ${buildingLat.toFixed(6)}</span>
                          </div>`,
                offset: new AMap.Pixel(0, -36),
                closeWhenClickMap: true
            });

            // 点击标记显示信息窗口
            marker.on('click', () => {
                infoWindow.open(this.map, [buildingLng, buildingLat]);
            });

            // 点击标签也显示信息窗口
            label.on('click', () => {
                infoWindow.open(this.map, [buildingLng, buildingLat]);
            });

            // 创建签到范围圆圈
            const circle = new AMap.Circle({
                center: [buildingLng, buildingLat],
                radius: radius,
                fillColor: '#1890ff',
                fillOpacity: 0.1,
                strokeColor: '#1890ff',
                strokeWeight: 1,
                strokeOpacity: 0.6,
                strokeStyle: 'dashed',
                zIndex: 49
            });

            // 添加到地图
            this.map.add(marker);
            this.map.add(label);
            this.map.add(circle);

            // 保存引用以便后续清除
            if (!this.allBuildingMarkers) this.allBuildingMarkers = [];
            if (!this.allBuildingLabels) this.allBuildingLabels = [];
            if (!this.allBuildingCircles) this.allBuildingCircles = [];
            this.allBuildingMarkers.push(marker);
            this.allBuildingLabels.push(label);
            this.allBuildingCircles.push(circle);
        });

        console.log(`已显示 ${buildings.length} 个建筑标记`);
        
        // 如果有用户位置，显示与最近建筑的连线
        if (this.userMarker && this.currentLocation) {
            const userLng = parseFloat(this.currentLocation.longitude);
            const userLat = parseFloat(this.currentLocation.latitude);
            
            // 找到最近的建筑
            let nearestBuilding = null;
            let minDistance = Infinity;
            
            buildings.forEach(building => {
                const buildingLng = parseFloat(building.longitude);
                const buildingLat = parseFloat(building.latitude);
                const distance = AMap.GeometryUtil.distance([userLng, userLat], [buildingLng, buildingLat]);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestBuilding = building;
                }
            });
            
            // 如果找到最近的建筑，显示连线
            if (nearestBuilding) {
                const buildingLng = parseFloat(nearestBuilding.longitude);
                const buildingLat = parseFloat(nearestBuilding.latitude);
                const radius = nearestBuilding.radius || 75;
                const isInRange = minDistance <= radius;
                
                // 清除之前的连线
                if (this.connectionLine) {
                    this.map.remove(this.connectionLine);
                }
                
                // 创建与最近建筑的连线
                this.connectionLine = new AMap.Polyline({
                    path: [[userLng, userLat], [buildingLng, buildingLat]],
                    strokeColor: isInRange ? '#52c41a' : '#ff7875', // 范围内绿色，范围外红色
                    strokeWeight: isInRange ? 3 : 2, // 范围内粗一些，范围外细一些
                    strokeOpacity: isInRange ? 0.8 : 0.6, // 范围内不透明度高一些
                    strokeStyle: isInRange ? 'solid' : 'dashed', // 范围内实线，范围外虚线
                    zIndex: 60
                });
                this.map.add(this.connectionLine);
                
                console.log(`显示与最近建筑 ${nearestBuilding.name} 的连线，距离: ${minDistance.toFixed(2)}米，${isInRange ? '在范围内' : '在范围外'}`);
            }
        }
    }

    // 清除所有建筑标记
    clearAllBuildingMarkers() {
        // 清除多个建筑标记
        if (this.allBuildingMarkers) {
            this.allBuildingMarkers.forEach(marker => {
                this.map.remove(marker);
            });
            this.allBuildingMarkers = [];
        }
        if (this.allBuildingLabels) {
            this.allBuildingLabels.forEach(label => {
                this.map.remove(label);
            });
            this.allBuildingLabels = [];
        }
        if (this.allBuildingCircles) {
            this.allBuildingCircles.forEach(circle => {
                this.map.remove(circle);
            });
            this.allBuildingCircles = [];
        }
        
        // 清除单个建筑标记，避免重复显示
        if (this.buildingMarker) {
            this.map.remove(this.buildingMarker);
            this.buildingMarker = null;
        }
        if (this.buildingCircle) {
            this.map.remove(this.buildingCircle);
            this.buildingCircle = null;
        }
        
        // 清除连线
        if (this.connectionLine) {
            this.map.remove(this.connectionLine);
            this.connectionLine = null;
        }
    }

    // 清除地图标记
    clearMapMarkers() {
        if (this.userMarker) {
            this.map.remove(this.userMarker);
            this.userMarker = null;
        }
        if (this.buildingMarker) {
            this.map.remove(this.buildingMarker);
            this.buildingMarker = null;
        }
        if (this.buildingCircle) {
            this.map.remove(this.buildingCircle);
            this.buildingCircle = null;
        }
        if (this.connectionLine) {
            this.map.remove(this.connectionLine);
            this.connectionLine = null;
        }
    }

    // 显示地图区域
    showMapSection() {
        const mapSection = document.getElementById('mapSection');
        if (mapSection) {
            mapSection.style.display = 'block';
            
            // 确保地图容器有合适的高度
            const mapContainer = document.getElementById('mapContainer');
            if (mapContainer) {
                mapContainer.style.height = '300px';
                mapContainer.style.minHeight = '300px';
            }
            
            // 延迟初始化地图以确保容器已显示
            setTimeout(() => {
                if (!this.map) {
                    this.initMap();
                } else {
                    // 如果地图已存在，重新调整大小
                    this.map.getViewport().resize();
                    // 强制更新地图显示，确保标记被绘制
                    if (this.currentLocation) {
                        this.updateMapDisplay(this.currentLocation, this.currentBuildingInfo);
                    }
                }
                
                // 绑定回到用户位置按钮事件
                this.bindLocationButton();
            }, 300); // 增加延迟时间确保DOM更新完成
        }
    }

    // 隐藏地图区域
    hideMapSection() {
        const mapSection = document.getElementById('mapSection');
        if (mapSection) {
            mapSection.style.display = 'none';
        }
    }

    // 加载课程表信息
    async loadCourseSchedule() {
        try {
            // 标记课程数据正在加载
            this.courseDataLoaded = false;
            
            // 检查是否有有效的用户信息
            if (!appState.userInfo || !appState.userInfo.student_id) {
                console.log('没有有效的用户信息，显示空课程表');
                this.displayEmptyCourseCards();
                this.courseDataLoaded = true; // 即使没有课程，也标记为加载完成
                return;
            }
            
            const studentId = appState.userInfo.student_id;
            console.log('加载课程表，学号:', studentId);
            
            const response = await Utils.request(`/api/v1/student-schedule?student_id=${studentId}&days=7`);
            
            if (response.success) {
                this.allCourses = response.data.schedule || [];
                this.filterAndDisplayCourses();
                console.log(`成功加载 ${this.allCourses.length} 门课程`);
            } else {
                console.error('获取课程表失败:', response.message);
                this.displayEmptyCourseCards();
            }
            
            // 标记课程数据加载完成
            this.courseDataLoaded = true;
            console.log('课程数据加载完成，courseDataLoaded =', this.courseDataLoaded);
            
        } catch (error) {
            console.error('加载课程表时出错:', error);
            this.displayEmptyCourseCards();
            // 即使出错，也标记为加载完成，避免无限等待
            this.courseDataLoaded = true;
        }
    }

    // 筛选并显示课程
    filterAndDisplayCourses() {
        let filteredCourses = [...this.allCourses];
        
        if (this.currentFilter === 'today') {
            const today = new Date().toDateString();
            filteredCourses = this.allCourses.filter(course => {
                const courseDate = new Date(course.date).toDateString();
                return courseDate === today;
            });
        }
        
        this.displayCourseCards(filteredCourses);
    }

    // 显示课程卡片
    displayCourseCards(courses) {
        const wrapper = document.getElementById('courseCardsWrapper');
        if (!wrapper) return;

        // 清空现有内容
        wrapper.innerHTML = '';

        if (!courses || courses.length === 0) {
            this.displayEmptyCourseCards();
            return;
        }

        // 按时间排序课程，优先显示即将到来的课程
        const sortedCourses = courses.sort((a, b) => {
            const dateA = new Date(`${a.date} ${a.start_time}`);
            const dateB = new Date(`${b.date} ${b.start_time}`);
            return dateA - dateB;
        });

        // 生成课程卡片
        sortedCourses.forEach(course => {
            const courseCard = this.createCourseCard(course);
            wrapper.appendChild(courseCard);
        });

        // 添加滚动事件监听
        this.addScrollEvents(wrapper);
    }

    // 创建单个课程卡片
    createCourseCard(course) {
        const card = document.createElement('div');
        card.className = 'course-card';
        
        // 计算课程状态
        const courseStatus = this.calculateCourseStatus(course);
        
        // 根据课程状态添加相应的类
        if (courseStatus === 'current') {
            card.classList.add('current');
        } else if (courseStatus === 'upcoming') {
            card.classList.add('upcoming');
        } else if (courseStatus === 'past') {
            card.classList.add('past');
        }

        // 格式化日期显示
        const courseDate = new Date(course.date);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        let dateDisplay = '';
        if (courseDate.toDateString() === today.toDateString()) {
            dateDisplay = Utils.t('course_today');
        } else if (courseDate.toDateString() === tomorrow.toDateString()) {
            dateDisplay = Utils.t('course_tomorrow');
        } else {
            const weekdays = [
                Utils.t('course_sunday'),
                Utils.t('course_monday'),
                Utils.t('course_tuesday'),
                Utils.t('course_wednesday'),
                Utils.t('course_thursday'),
                Utils.t('course_friday'),
                Utils.t('course_saturday')
            ];
            dateDisplay = weekdays[courseDate.getDay()];
        }

        // 获取状态文本
        const statusTexts = {
            'current': Utils.t('course_status_current'),
            'upcoming': Utils.t('course_status_upcoming'),
            'past': Utils.t('course_status_past')
        };

        card.innerHTML = `
            <div class="course-time">
                <span class="time-slot">${dateDisplay} ${course.start_time}-${course.end_time}</span>
            </div>
            <div class="course-info">
                <h4 class="course-name">${course.course_name}</h4>
                <div class="course-details">
                    <span class="course-location">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                            <path d="M6 0C2.7 0 0 2.7 0 6c0 4.5 6 6 6 6s6-1.5 6-6c0-3.3-2.7-6-6-6zm0 8.25c-1.24 0-2.25-1.01-2.25-2.25S4.76 3.75 6 3.75s2.25 1.01 2.25 2.25S7.24 8.25 6 8.25z"/>
                        </svg>
                        ${course.building_name} ${course.classroom}
                    </span>
                </div>
            </div>
            <div class="course-status">
                <span class="status-indicator ${courseStatus}"></span>
            </div>
            ${statusTexts[courseStatus] ? `<span class="status-label">${statusTexts[courseStatus]}</span>` : ''}
        `;

        return card;
    }

    // 获取当前课程或下一节课程
    getCurrentOrNextCourse() {
        if (!this.allCourses || this.allCourses.length === 0) {
            return null;
        }
        
        const now = new Date();
        
        // 首先查找当前正在进行的课程
        const currentCourse = this.allCourses.find(course => {
            const status = this.calculateCourseStatus(course);
            return status === 'current';
        });
        
        if (currentCourse) {
            return currentCourse;
        }
        
        // 如果没有当前课程，查找下一节即将开始的课程
        const upcomingCourses = this.allCourses
            .filter(course => {
                const status = this.calculateCourseStatus(course);
                return status === 'upcoming';
            })
            .sort((a, b) => {
                const dateA = new Date(`${a.date} ${a.start_time}`);
                const dateB = new Date(`${b.date} ${b.start_time}`);
                return dateA - dateB;
            });
        
        return upcomingCourses.length > 0 ? upcomingCourses[0] : null;
    }
    
    // 显示基于课程的建筑信息
    async displayCourseBasedBuilding(course, coordsText) {
        const buildingNameElement = document.getElementById('buildingName');
        if (!buildingNameElement) return;
        
        const courseStatus = this.calculateCourseStatus(course);
        const isCurrent = courseStatus === 'current';
        
        try {
            // 调用API获取该建筑的详细位置信息
            const response = await fetch('/api/v1/location-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    longitude: this.currentLocation.longitude,
                    latitude: this.currentLocation.latitude,
                    timestamp: Math.floor(Date.now() / 1000),
                    target_building: course.building_name // 指定目标建筑
                })
            });
            
            const result = await response.json();
            
            if (result.success && result.data && result.data.building) {
                const building = result.data.building;
                const distance = result.data.distance;
                const isInRange = result.data.is_valid_location;
                
                let statusText, statusColor, statusIcon;
                
                if (isInRange) {
                    statusText = appState.currentLanguage === 'zh' ? '在范围内' : 'Within range';
                    statusColor = '#28a745';
                    statusIcon = '✓';
                } else {
                    const distanceText = appState.currentLanguage === 'zh' ? `距离 ${distance} 米` : `${distance}m away`;
                    statusText = distanceText;
                    statusColor = '#ffc107';
                    statusIcon = '📍';
                }
                
                // 显示课程状态
                const courseStatusText = isCurrent ? 
                    (appState.currentLanguage === 'zh' ? '当前课程' : 'Current Class') :
                    (appState.currentLanguage === 'zh' ? '下节课程' : 'Next Class');
                
                const coordsLabel = appState.currentLanguage === 'zh' ? '当前坐标：' : 'Current coordinates: ';
                
                buildingNameElement.innerHTML = `
                    <div style="color: ${statusColor}; font-weight: bold;">${building.name}</div>
                    <div style="font-size: 0.85em; color: ${statusColor}; margin-top: 2px;">${statusIcon} ${statusText}</div>
                    <div style="font-size: 0.8em; color: #007bff; margin-top: 2px;">📚 ${courseStatusText}: ${course.course_name}</div>
                    <small style="font-size: 0.75em; color: #666; margin-top: 4px; display: block;">${coordsLabel}${coordsText}</small>
                `;
                
                // 保存位置信息
                this.locationInfo = result.data;
                this.currentBuildingInfo = result.data;
                appState.setCache('buildingInfo', result.data);
                
                // 更新地图显示
                if (this.currentLocation && this.map) {
                    this.updateMapDisplay(this.currentLocation, result.data);
                }
                
            } else {
                // API调用失败，显示基本课程信息
                this.displayBasicCourseInfo(course, coordsText, isCurrent);
            }
            
        } catch (error) {
            console.error('获取课程建筑信息失败:', error);
            // 显示基本课程信息
            this.displayBasicCourseInfo(course, coordsText, isCurrent);
        }
    }
    
    // 显示基本课程信息（当API调用失败时）
    displayBasicCourseInfo(course, coordsText, isCurrent) {
        const buildingNameElement = document.getElementById('buildingName');
        if (!buildingNameElement) return;
        
        const courseStatusText = isCurrent ? 
            (appState.currentLanguage === 'zh' ? '当前课程' : 'Current Class') :
            (appState.currentLanguage === 'zh' ? '下节课程' : 'Next Class');
        
        const coordsLabel = appState.currentLanguage === 'zh' ? '当前坐标：' : 'Current coordinates: ';
        
        buildingNameElement.innerHTML = `
            <div style="color: #007bff; font-weight: bold;">${course.building_name}</div>
            <div style="font-size: 0.85em; color: #6c757d; margin-top: 2px;">📍 ${appState.currentLanguage === 'zh' ? '位置检测中...' : 'Checking location...'}</div>
            <div style="font-size: 0.8em; color: #007bff; margin-top: 2px;">📚 ${courseStatusText}: ${course.course_name}</div>
            <small style="font-size: 0.75em; color: #666; margin-top: 4px; display: block;">${coordsLabel}${coordsText}</small>
        `;
    }
    
    // 计算课程状态
    calculateCourseStatus(course) {
        const now = new Date();
        const courseDate = new Date(course.date);
        const startTime = new Date(`${course.date} ${course.start_time}`);
        const endTime = new Date(`${course.date} ${course.end_time}`);
        
        // 如果是今天的课程
        if (courseDate.toDateString() === now.toDateString()) {
            if (now >= startTime && now <= endTime) {
                return 'current'; // 正在进行
            } else if (now < startTime) {
                // 即将开始（距离开始时间1小时内）
                const timeDiff = startTime - now;
                if (timeDiff <= 60 * 60 * 1000) { // 1小时内
                    return 'upcoming';
                }
                return 'upcoming';
            } else {
                return 'past'; // 已结束
            }
        } else if (courseDate > now) {
            return 'upcoming'; // 未来的课程
        } else {
            return 'past'; // 过去的课程
        }
    }

    // 显示空状态课程卡片
    displayEmptyCourseCards() {
        const wrapper = document.getElementById('courseCardsWrapper');
        if (!wrapper) return;

        wrapper.innerHTML = `
            <div class="course-card empty-state">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                </svg>
                <div class="empty-text">暂无课程安排</div>
            </div>
        `;
    }

    // 添加滚动事件
    addScrollEvents(wrapper) {
        let isScrolling = false;
        
        // 添加触摸滚动支持
        wrapper.addEventListener('touchstart', (e) => {
            isScrolling = true;
        });

        wrapper.addEventListener('touchend', (e) => {
            isScrolling = false;
        });

        // 添加鼠标滚动支持
        wrapper.addEventListener('wheel', (e) => {
            e.preventDefault();
            wrapper.scrollLeft += e.deltaY;
        });
    }

    // 页面销毁时清理
    destroy() {
        if (this.timeInterval) {
            clearInterval(this.timeInterval);
        }
        if (this.map) {
            this.map.destroy();
            this.map = null;
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 确保DOM完全加载后再初始化
    setTimeout(async () => {
        window.signinPage = new SignInPage();
        await window.signinPage.init();
    }, 200);
});

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
    if (window.signinPage) {
        window.signinPage.destroy();
    }
});