class SignInPage {
    constructor() {
        this.timeInterval = setInterval(() => {
            this.refreshLocationDisplay();
        }, 60000);
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
    
    // 初始化地图 - 使用企业微信API
    initMap() {
        const mapContainer = document.getElementById('mapContainer');
        if (!mapContainer) {
            console.warn('地图容器未找到');
            return;
        }

        try {
            // 创建地图占位符界面
            this.createMapPlaceholder(mapContainer);
            
            // 标记地图已加载
            mapContainer.classList.add('loaded');
            console.log('企业微信地图界面初始化完成');
            
            // 如果没有位置信息，尝试获取位置
            if (!this.currentLocation) {
                this.getCurrentLocation().catch(error => {
                    console.log('获取位置失败:', error);
                });
            }
            
            Utils.showMessage('地图界面加载成功', 'success', 2000);

        } catch (error) {
            console.error('地图初始化失败:', error);
            this.showMapError('地图初始化失败: ' + error.message);
        }
    }

    // 创建地图占位符界面
    createMapPlaceholder(mapContainer) {
        mapContainer.innerHTML = `
            <div class="wechat-map-placeholder" style="
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 12px;
                position: relative;
                overflow: hidden;
            ">
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><defs><pattern id=\"grid\" width=\"10\" height=\"10\" patternUnits=\"userSpaceOnUse\"><path d=\"M 10 0 L 0 0 0 10\" fill=\"none\" stroke=\"%23ffffff\" stroke-width=\"0.5\" opacity=\"0.1\"/></pattern></defs><rect width=\"100\" height=\"100\" fill=\"url(%23grid)\"/></svg>');
                    opacity: 0.3;
                "></div>
                <div style="position: relative; z-index: 1; text-align: center;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style="margin-bottom: 16px;">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">企业微信地图</h3>
                    <p style="margin: 0; font-size: 14px; opacity: 0.9;">点击下方按钮查看位置详情</p>
                </div>
                <button id="openLocationBtn" style="
                    margin-top: 20px;
                    padding: 12px 24px;
                    background: rgba(255, 255, 255, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 25px;
                    color: white;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    backdrop-filter: blur(10px);
                " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
                   onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                    📍 查看地图位置
                </button>
            </div>
        `;

        // 绑定打开位置的事件
        const openLocationBtn = mapContainer.querySelector('#openLocationBtn');
        if (openLocationBtn) {
            openLocationBtn.addEventListener('click', () => {
                this.openWeChatLocation();
            });
        }
    }

    // 使用企业微信API打开位置
    openWeChatLocation() {
        if (!this.currentLocation) {
            Utils.showMessage('暂无位置信息', 'warning');
            return;
        }

        const { latitude, longitude } = this.currentLocation;
        const buildingName = this.currentBuildingInfo ? this.currentBuildingInfo.name : '当前位置';
        
        // 使用企业微信API打开位置
        if (window.WeChatAPI && WeChatAPI.isWeChatReady) {
            WeChatAPI.openLocation({
                latitude: latitude,
                longitude: longitude,
                name: buildingName,
                address: this.currentBuildingInfo ? this.currentBuildingInfo.address : '深圳大学',
                scale: 16,
                infoUrl: ''
            }).then(() => {
                console.log('企业微信地图打开成功');
            }).catch(error => {
                console.error('打开企业微信地图失败:', error);
                Utils.showMessage('打开地图失败，请确保在企业微信环境中使用', 'error');
            });
        } else {
            Utils.showMessage('请在企业微信环境中使用地图功能', 'warning');
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

        // 显示成功消息
        Utils.showMessage(
            appState.currentLanguage === 'zh' ? '已回到您的位置' : 'Returned to your location',
            'success',
            2000
        );
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
                this.initMap();
            }, 300);
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
        // 清理地图相关资源（已改为企业微信API）
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