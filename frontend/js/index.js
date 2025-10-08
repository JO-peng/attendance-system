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
        this.currentBuildingInfo = null;
        
        this.init();
    }
   // 初始化方法
    init() {
        this.bindEvents();
        this.startTimeUpdate();
        this.loadUserInfo();
        this.getCurrentLocation();
        // 如果已有用户信息，直接更新显示
        if (appState.userInfo) {
            this.updateUserInfo();
        }
        
        // 监听语言切换事件
        document.addEventListener('languageChanged', () => {
            this.refreshLocationDisplay();
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
                // 缓存建筑信息
                appState.setCache('buildingInfo', result.data);
                console.log('Building info updated and cached:', result.data);
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
                        student_id: appState.userInfo?.student_id || '2020000319'
                    })
                });
                
                const result = await response.json();
                
                if (result.success && result.data) {
                    this.updateCourseInfo(result.data);
                    // 显示地图区域
                    this.showMapSection();
                }
            } catch (error) {
                console.warn('获取位置和课程信息失败:', error);
            }
        }
    }
    
    // 更新课程信息显示
    updateCourseInfo(locationInfo) {
        const courseInfoSection = document.getElementById('courseInfoSection');
        const currentCourseDisplay = document.getElementById('currentCourseDisplay');
        const buildingDisplay = document.getElementById('buildingDisplay');
        const statusDisplay = document.getElementById('statusDisplay');
        
        if (locationInfo.course || locationInfo.building) {
            courseInfoSection.style.display = 'block';
            
            // 显示课程信息
            if (currentCourseDisplay) {
                const noCourseText = appState.currentLanguage === 'zh' ? '无当前课程' : 'No current course';
                currentCourseDisplay.textContent = locationInfo.course?.name || noCourseText;
            }
            
            // 显示教学楼信息
            if (buildingDisplay) {
                let buildingText = appState.currentLanguage === 'zh' ? '未知位置' : 'Unknown location';
                if (locationInfo.building) {
                    const buildingName = appState.currentLanguage === 'zh' ? 
                        locationInfo.building.name : 
                        (locationInfo.building.name_en || locationInfo.building.name);
                    
                    if (locationInfo.is_valid_location) {
                        buildingText = buildingName;
                    } else {
                        const distanceText = appState.currentLanguage === 'zh' ? 
                            `距离${locationInfo.distance}米` : 
                            `${locationInfo.distance}m away`;
                        buildingText = `${buildingName} (${distanceText})`;
                    }
                }
                buildingDisplay.textContent = buildingText;
            }
            
            // 显示签到状态
            if (statusDisplay) {
                const statusText = {
                    'present': appState.currentLanguage === 'zh' ? '正常签到' : 'Present',
                    'late': appState.currentLanguage === 'zh' ? '迟到签到' : 'Late',
                    'absent': appState.currentLanguage === 'zh' ? '缺席' : 'Absent',
                    'no_class': appState.currentLanguage === 'zh' ? '当前无课程' : 'No class'
                };
                
                const unknownStatusText = appState.currentLanguage === 'zh' ? '未知状态' : 'Unknown status';
                let statusMessage = statusText[locationInfo.status] || locationInfo.status || unknownStatusText;
                
                // 如果位置无效，添加位置提示
                if (!locationInfo.is_valid_location && locationInfo.building) {
                    const distanceWarning = appState.currentLanguage === 'zh' ? 
                        ' (位置距离过远)' : 
                        ' (Location too far)';
                    statusMessage += distanceWarning;
                }
                
                statusDisplay.textContent = statusMessage;
            }
            
            // 保存建筑信息并显示地图
            if (locationInfo.building) {
                this.currentBuildingInfo = locationInfo.building;
                this.showMapSection();
            }
        } else {
            courseInfoSection.style.display = 'none';
            this.hideMapSection();
        }
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
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="#ccc">
                        <path d="M24 4L4 14v20c0 11.1 7.68 20 18 22 2.18-.42 4.18-1.28 6-2.2 1.82.92 3.82 1.78 6 2.2 10.32-2 18-10.9 18-22V14L24 4z"/>
                    </svg>
                    <p data-zh="点击拍照" data-en="Tap to take photo">+</p>
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
                student_id: appState.userInfo?.student_id || '2020000319',
                name: appState.userInfo?.name || '胡凯峰',
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
                    const checkResult = await Utils.request('/api/v1/check-in', {
                        method: 'POST',
                        body: JSON.stringify({
                            longitude: this.currentLocation.longitude,
                            latitude: this.currentLocation.latitude,
                            timestamp: Math.floor(Date.now() / 1000),
                            student_id: appState.userInfo?.student_id || '2020000319'
                        })
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
                    student_id: appState.userInfo?.student_id || '2020000319',
                    name: appState.userInfo?.name || '胡凯峰',
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
                
                // 延迟添加控件，确保地图完全加载
                setTimeout(() => {
                    this.addMapControls();
                }, 500);
                
                // 如果有当前位置和建筑信息，立即更新地图显示
                if (this.currentLocation) {
                    this.updateMapDisplay(this.currentLocation, this.currentBuildingInfo);
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
        
        // 创建定位按钮
        const locationBtn = document.createElement('div');
        locationBtn.className = 'amap-custom-location-btn';
        locationBtn.innerHTML = `
            <div style="width: 30px; height: 30px; background: white; border-radius: 2px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="#666">
                    <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-11c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
                </svg>
            </div>
        `;
        
        // 定位按钮点击事件
        locationBtn.onclick = () => {
            this.backToUserLocation();
        };
        
        // 将按钮添加到地图控件容器
        this.map.plugin(['AMap.ToolBar'], () => {
            const toolBarContainer = this.map.getContainer().querySelector('.amap-toolbar');
            if (toolBarContainer) {
                // 在工具栏上方添加定位按钮
                toolBarContainer.parentNode.insertBefore(locationBtn, toolBarContainer);
            }
        });
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
        const locationBtn = document.getElementById('locationBtn');
        if (locationBtn) {
            locationBtn.onclick = () => {
                this.backToUserLocation();
            };
        }
    }

    // 回到用户位置
    backToUserLocation() {
        if (!this.map || !this.currentLocation) {
            Utils.showMessage(
                appState.currentLanguage === 'zh' ? '无法获取当前位置信息' : 'Unable to get current location',
                'warning',
                3000
            );
            return;
        }

        const userLng = parseFloat(this.currentLocation.longitude);
        const userLat = parseFloat(this.currentLocation.latitude);
        
        // 设置地图中心为用户位置
        this.map.setCenter([userLng, userLat]);
        this.map.setZoom(16);
        
        // 显示成功消息
        Utils.showMessage(
            appState.currentLanguage === 'zh' ? '已回到用户位置' : 'Returned to user location',
            'success',
            2000
        );
    }

    // 更新地图显示
    updateMapDisplay(userLocation, buildingInfo = null) {
        if (!this.map || !userLocation) {
            return;
        }

        const userLng = parseFloat(userLocation.longitude);
        const userLat = parseFloat(userLocation.latitude);

        // 清除之前的标记
        this.clearMapMarkers();

        // 添加用户位置标记
        this.userMarker = new AMap.Marker({
            position: [userLng, userLat],
            title: appState.currentLanguage === 'zh' ? '我的位置' : 'My Location',
            icon: new AMap.Icon({
                size: new AMap.Size(25, 34),
                image: 'data:image/svg+xml;base64,' + btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="34" viewBox="0 0 25 34">
                        <path fill="#1890ff" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 21.5 12.5 21.5s12.5-9 12.5-21.5C25 5.6 19.4 0 12.5 0zm0 17c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5 4.5 2 4.5 4.5-2 4.5-4.5 4.5z"/>
                    </svg>
                `),
                imageOffset: new AMap.Pixel(-12, -34)
            })
        });
        this.map.add(this.userMarker);

        // 如果有建筑信息，添加建筑标记和范围圆圈
        if (buildingInfo && buildingInfo.longitude && buildingInfo.latitude) {
            const buildingLng = parseFloat(buildingInfo.longitude);
            const buildingLat = parseFloat(buildingInfo.latitude);
            const radius = parseFloat(buildingInfo.radius || 100);

            // 添加建筑标记
            this.buildingMarker = new AMap.Marker({
                position: [buildingLng, buildingLat],
                title: buildingInfo.name || (appState.currentLanguage === 'zh' ? '教学楼' : 'Building'),
                icon: new AMap.Icon({
                    size: new AMap.Size(25, 34),
                    image: 'data:image/svg+xml;base64,' + btoa(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="25" height="34" viewBox="0 0 25 34">
                            <path fill="#ff4d4f" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 21.5 12.5 21.5s12.5-9 12.5-21.5C25 5.6 19.4 0 12.5 0zm0 17c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5 4.5 2 4.5 4.5-2 4.5-4.5 4.5z"/>
                        </svg>
                    `),
                    imageOffset: new AMap.Pixel(-12, -34)
                })
            });
            this.map.add(this.buildingMarker);

            // 添加签到范围圆圈
            this.buildingCircle = new AMap.Circle({
                center: [buildingLng, buildingLat],
                radius: radius,
                fillColor: '#ff4d4f',
                fillOpacity: 0.1,
                strokeColor: '#ff4d4f',
                strokeWeight: 2,
                strokeOpacity: 0.8
            });
            this.map.add(this.buildingCircle);

            // 调整地图视野以包含所有标记
            const bounds = new AMap.Bounds([userLng, userLat], [buildingLng, buildingLat]);
            this.map.setBounds(bounds, false, [20, 20, 20, 20]);
        } else {
            // 只有用户位置时，以用户位置为中心
            this.map.setCenter([userLng, userLat]);
            this.map.setZoom(16);
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
    setTimeout(() => {
        window.signinPage = new SignInPage();
    }, 200);
});

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
    if (window.signinPage) {
        window.signinPage.destroy();
    }
});