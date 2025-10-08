// 签到页面JavaScript

class SignInPage {
    constructor() {
        this.currentPhoto = null;
        this.currentLocation = null;
        this.timeInterval = null;
        this.isSigningIn = false;
        
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
                buildingNameElement.textContent = Utils.t('location_failed');
                buildingNameElement.setAttribute('data-zh', '定位失败');
                buildingNameElement.setAttribute('data-en', 'Location Failed');
            }
            
            // 根据错误类型显示不同的提示
            let errorMessage = '定位获取失败';
            let errorType = 'error';
            
            if (error.message) {
                if (error.message.includes('permission') || error.message.includes('denied')) {
                    errorMessage = '定位权限被拒绝，请在设置中允许位置访问';
                    errorType = 'warning';
                } else if (error.message.includes('timeout')) {
                    errorMessage = '定位超时，请检查网络连接或稍后重试';
                    errorType = 'warning';
                } else if (error.message.includes('unavailable')) {
                    errorMessage = '定位服务不可用，请检查设备设置';
                    errorType = 'warning';
                } else {
                    errorMessage = `定位失败: ${error.message}`;
                }
            }
            
            // 显示错误提示，并提供重试选项
            Utils.showMessage(
                errorMessage + ' <button onclick="window.signinPage.getCurrentLocation()" style="margin-left: 12px; padding: 4px 8px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; border-radius: 4px; cursor: pointer;">重试</button>',
                errorType,
                8000,
                { html: true }
            );
            
            // 不再使用模拟位置，让用户知道定位失败了
            this.currentLocation = null;
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
                currentCourseDisplay.textContent = locationInfo.course?.name || '无当前课程';
            }
            
            // 显示教学楼信息
            if (buildingDisplay) {
                let buildingText = '未知位置';
                if (locationInfo.building) {
                    if (locationInfo.is_valid_location) {
                        buildingText = locationInfo.building.name;
                    } else {
                        buildingText = `${locationInfo.building.name} (距离${locationInfo.distance}米)`;
                    }
                }
                buildingDisplay.textContent = buildingText;
            }
            
            // 显示签到状态
            if (statusDisplay) {
                const statusText = {
                    'present': '正常签到',
                    'late': '迟到签到',
                    'absent': '缺席',
                    'no_class': '当前无课程'
                };
                
                let statusMessage = statusText[locationInfo.status] || locationInfo.status || '未知状态';
                
                // 如果位置无效，添加位置提示
                if (!locationInfo.is_valid_location && locationInfo.building) {
                    statusMessage += ' (位置距离过远)';
                }
                
                statusDisplay.textContent = statusMessage;
            }
        } else {
            courseInfoSection.style.display = 'none';
        }
    }
    
    // 隐藏签到模态框
    hideSigninModal() {
        const modal = document.getElementById('signinModal');
        if (modal) {
            modal.style.display = 'none';
        }
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
                timestamp: new Date().toISOString()
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
                errorMessage = '授权已过期，请刷新页面重新登录';
                errorType = 'warning';
                
                // 清除缓存的用户信息
                appState.clearCache('userInfo');
                sessionStorage.removeItem('index_userinfo_retry_count');
                
                // 显示刷新按钮
                Utils.showMessage(
                    errorMessage + ' <button onclick="window.location.reload()" style="margin-left: 12px; padding: 4px 8px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; border-radius: 4px; cursor: pointer;">刷新页面</button>',
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
                errorMessage = '网络连接失败，请检查网络后重试';
                errorType = 'warning';
            } 
            // 服务器错误
            else if (error.message && (
                error.message.includes('server') ||
                error.message.includes('500') ||
                error.message.includes('502') ||
                error.message.includes('503')
            )) {
                errorMessage = '服务器暂时不可用，请稍后重试';
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
    
    // 页面销毁时清理
    destroy() {
        if (this.timeInterval) {
            clearInterval(this.timeInterval);
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