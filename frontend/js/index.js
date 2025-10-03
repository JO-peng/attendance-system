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
    
    // 加载用户信息
    async loadUserInfo() {
        try {
            // 如果已有用户信息，直接显示
            if (appState.userInfo && appState.userInfo.student_id && appState.userInfo.name) {
                this.displayUserInfo(appState.userInfo);
                return;
            }
            
            // 尝试从企业微信获取用户信息
            const userInfo = await WeChatAPI.getUserInfo();
            
            if (userInfo && userInfo.student_id && userInfo.name) {
                this.displayUserInfo(userInfo);
            } else {
                // 显示获取用户信息失败的状态
                console.error('无法获取用户信息');
                Utils.showMessage('无法获取用户信息，请在企业微信环境中访问', 'error');
                
                // 显示错误状态
                const studentIdElement = document.getElementById('studentId');
                const studentNameElement = document.getElementById('studentName');
                
                if (studentIdElement) {
                    studentIdElement.textContent = '获取失败';
                }
                if (studentNameElement) {
                    studentNameElement.textContent = '获取失败';
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
            this.displayUserInfo({
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
    updateUserInfo() {
        const nameElement = document.getElementById('userName');
        const idElement = document.getElementById('userId');
        
        if (nameElement && appState.userInfo?.name) {
            nameElement.textContent = appState.userInfo.name;
        }
        if (idElement && appState.userInfo?.student_id) {
            idElement.textContent = appState.userInfo.student_id;
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
    
    // 更新建筑信息显示
    async updateBuildingInfo() {
        const buildingNameElement = document.getElementById('buildingName');
        
        if (!this.currentLocation?.latitude || !this.currentLocation?.longitude) {
            if (buildingNameElement) {
                buildingNameElement.textContent = '位置获取中...';
            }
            return;
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

            const result = await response.json();
            
            if (result.success && result.data) {
                if (result.data.building && result.data.is_valid_location) {
                    // 在有效范围内，显示建筑名称
                    if (buildingNameElement) {
                        buildingNameElement.textContent = result.data.building.name;
                        buildingNameElement.setAttribute('data-zh', result.data.building.name);
                        buildingNameElement.setAttribute('data-en', result.data.building.name_en);
                    }
                } else if (result.data.building) {
                    // 找到最近建筑但距离太远
                    if (buildingNameElement) {
                        const distance = result.data.distance;
                        buildingNameElement.textContent = `${result.data.building.name} (${distance}m)`;
                        buildingNameElement.setAttribute('data-zh', `${result.data.building.name} (距离${distance}米)`);
                        buildingNameElement.setAttribute('data-en', `${result.data.building.name_en} (${distance}m away)`);
                    }
                } else {
                    // 没有找到任何建筑
                    if (buildingNameElement) {
                        buildingNameElement.textContent = '位置未知';
                        buildingNameElement.setAttribute('data-zh', '位置未知');
                        buildingNameElement.setAttribute('data-en', 'Unknown Location');
                    }
                }
                
                // 保存位置信息供其他功能使用
                this.locationInfo = result.data;
            } else {
                // API调用失败
                if (buildingNameElement) {
                    buildingNameElement.textContent = '定位失败';
                    buildingNameElement.setAttribute('data-zh', '定位失败');
                    buildingNameElement.setAttribute('data-en', 'Location Failed');
                }
            }
        } catch (error) {
            console.error('更新建筑信息失败:', error);
            if (buildingNameElement) {
                buildingNameElement.textContent = '位置获取失败';
                buildingNameElement.setAttribute('data-zh', '定位失败');
                buildingNameElement.setAttribute('data-en', 'Location Failed');
            }
        }
    }
    
    // 获取当前位置
    async getCurrentLocation() {
        try {
            console.log('Starting location acquisition...');
            const location = await WeChatAPI.getLocation();
            this.currentLocation = location;
            console.log('Location obtained successfully:', location);
            
            // 更新UI显示定位成功
            const buildingNameElement = document.getElementById('buildingName');
            if (buildingNameElement) {
                buildingNameElement.textContent = Utils.t('location_getting');
                buildingNameElement.setAttribute('data-zh', '正在获取位置信息...');
                buildingNameElement.setAttribute('data-en', 'Getting location...');
            }
            
        } catch (error) {
            console.error('Failed to get location:', error);
            
            // 更新UI显示定位失败
            const buildingNameElement = document.getElementById('buildingName');
            if (buildingNameElement) {
                buildingNameElement.textContent = Utils.t('location_failed');
                buildingNameElement.setAttribute('data-zh', '定位失败');
                buildingNameElement.setAttribute('data-en', 'Location Failed');
            }
            
            // 显示错误提示
            Utils.showMessage(`定位获取失败: ${error.message}`, 'error');
            
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
            Utils.showMessage('用户信息未获取，请在企业微信中访问或刷新页面', 'error');
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
    
    // 拍照
    async takePhoto() {
        try {
            // 检查是否在企业微信环境中且JS-SDK已准备好
            if (appState.isWeChatReady && WeChatAPI.isInWeChatWork()) {
                const localId = await WeChatAPI.chooseImage();
                
                // 显示照片预览
                const photoUpload = document.getElementById('photoUpload');
                if (photoUpload) {
                    photoUpload.innerHTML = `
                        <img src="${localId}" alt="签到照片" class="photo-preview">
                    `;
                    photoUpload.classList.add('has-photo');
                }
                
                this.currentPhoto = localId;
                this.validateForm();
            } else {
                // 降级到HTML5文件选择
                this.chooseImageFallback();
            }
            
        } catch (error) {
            console.error('Failed to take photo:', error);
            // 如果企业微信拍照失败，尝试降级方案
            this.chooseImageFallback();
        }
    }
    
    // HTML5文件选择降级方案
    chooseImageFallback() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'camera'; // 优先使用摄像头
        
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
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
                };
                reader.readAsDataURL(file);
            }
        };
        
        input.click();
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
            Utils.showMessage('用户信息未获取，请刷新页面或在企业微信中访问', 'error');
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
    
        try {
            // 显示加载状态
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
                            Utils.showMessage(`检测到您在${buildingInfo.building.name}(${buildingInfo.building.name_en})`, 'info');
                        }
                        
                        // 如果有课程信息，显示课程状态
                        if (buildingInfo.course) {
                            const statusText = {
                                'present': '正常签到',
                                'late': '迟到签到',
                                'absent': '缺席',
                                'no_class': '当前无课程'
                            };
                            Utils.showMessage(`课程: ${buildingInfo.course.name} - ${statusText[buildingInfo.status] || buildingInfo.status}`, 'info');
                        }
                    }
                } catch (error) {
                    console.warn('位置检查失败:', error);
                    // 继续正常签到流程
                }
            }
            
            // 提交到后端
            const result = await Utils.request('/signin', {
                method: 'POST',
                body: JSON.stringify(signinData)
            });
            
            if (result.success) {
                Utils.showMessage(Utils.t('signin_success'), 'success');
                this.hideSigninModal();
                
                // 可选：刷新页面或更新UI状态
                setTimeout(() => {
                    // window.location.reload();
                }, 1500);
            } else {
                throw new Error(result.message || 'Sign in failed');
            }
            
        } catch (error) {
            console.error('Sign in error:', error);
            
            let errorMessage = Utils.t('signin_failed');
            
            // 如果是网络错误
            if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = Utils.t('network_error');
            } 
            // 如果是服务器错误
            else if (error.message.includes('server')) {
                errorMessage = Utils.t('server_error');
            }
            // 如果有具体的错误消息，显示具体消息
            else if (error.message && error.message !== 'Sign in failed') {
                errorMessage = error.message;
            }
            
            Utils.showMessage(errorMessage, 'error');
            
            // 在控制台输出详细错误信息供调试
            console.log('详细错误信息:', {
                message: error.message,
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