// 统计页面JavaScript

class StatisticsPage {
    constructor() {
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth() + 1;
        this.attendanceData = {};
        this.signinRecords = [];
        
        this.init();
    }
    
    init() {
        this.initDateSelectors();
        this.bindEvents();
        this.loadAttendanceData();
    }
    
    // 初始化日期选择器
    initDateSelectors() {
        const yearSelect = document.getElementById('yearSelect');
        const monthSelect = document.getElementById('monthSelect');
        
        if (yearSelect) {
            // 生成年份选项（当前年份前后各2年）
            const currentYear = new Date().getFullYear();
            for (let year = currentYear - 2; year <= currentYear + 2; year++) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                if (year === this.currentYear) {
                    option.selected = true;
                }
                yearSelect.appendChild(option);
            }
        }
        
        if (monthSelect) {
            monthSelect.value = this.currentMonth;
        }
    }
    
    // 绑定事件
    bindEvents() {
        const yearSelect = document.getElementById('yearSelect');
        const monthSelect = document.getElementById('monthSelect');
        const closeDetails = document.getElementById('closeDetails');
        
        if (yearSelect) {
            yearSelect.addEventListener('change', (e) => {
                this.currentYear = parseInt(e.target.value);
                this.loadAttendanceData();
            });
        }
        
        if (monthSelect) {
            monthSelect.addEventListener('change', (e) => {
                this.currentMonth = parseInt(e.target.value);
                this.loadAttendanceData();
            });
        }
        
        if (closeDetails) {
            closeDetails.addEventListener('click', () => {
                this.hideSigninDetails();
            });
        }
        
        // 点击详情背景关闭
        const signinDetails = document.getElementById('signinDetails');
        if (signinDetails) {
            signinDetails.addEventListener('click', (e) => {
                if (e.target === signinDetails) {
                    this.hideSigninDetails();
                }
            });
        }
    }
    
    // 带重试限制的用户信息获取方法
    async getUserInfoWithRetry(maxRetries = 2) {
        const retryKey = 'statistics_userinfo_retry_count';
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
    
    // 加载考勤数据
    async loadAttendanceData() {
        try {
            this.showLoadingState();
            
            // 获取当前用户信息，添加重试限制
            const userInfo = await this.getUserInfoWithRetry();
            if (!userInfo || !userInfo.student_id) {
                console.warn('无法获取用户信息，显示空数据');
                // 清空数据并更新显示
                this.attendanceData = {};
                this.signinRecords = [];
                this.renderCalendar();
                this.updateStatistics();
                this.hideLoadingState();
                Utils.showMessage(Utils.t('user_info_load_failed'), 'warning');
                return;
            }
            
            // 获取指定年月的统计数据
            const statsResponse = await Utils.request(`/api/attendance/statistics?student_id=${userInfo.student_id}&year=${this.currentYear}&month=${this.currentMonth}`);
            
            // 获取指定年月的签到记录
            const recordsResponse = await Utils.request(`/api/attendance/records?student_id=${userInfo.student_id}&per_page=100`);
            
            if (statsResponse.success && recordsResponse.success) {
                // 初始化数据结构
                this.attendanceData = {};
                this.signinRecords = [];
                
                // 处理签到记录，过滤当前年月的记录
                const currentMonthRecords = recordsResponse.data.records.filter(record => {
                    const recordDate = new Date(record.signed_at);
                    return recordDate.getFullYear() === this.currentYear && 
                           recordDate.getMonth() + 1 === this.currentMonth;
                });
                
                // 转换记录格式并构建attendanceData
                currentMonthRecords.forEach(record => {
                    const recordDate = new Date(record.signed_at);
                    const dateStr = `${recordDate.getFullYear()}-${(recordDate.getMonth() + 1).toString().padStart(2, '0')}-${recordDate.getDate().toString().padStart(2, '0')}`;
                    
                    // 设置考勤状态
                    if (record.status === 'attended') {
                        this.attendanceData[dateStr] = 'attended';
                    } else if (record.status === 'late') {
                        this.attendanceData[dateStr] = 'partial';
                    } else if (record.status === 'absent') {
                        this.attendanceData[dateStr] = 'missed';
                    }
                    
                    // 添加签到记录
                    this.signinRecords.push({
                        id: record.id,
                        date: dateStr,
                        time: Utils.formatTime(new Date(record.signed_at)),
                        courseName: record.course_name,
                        classroom: record.classroom || record.location_address,
                        status: record.status,
                        photo: record.photo_path ? `/api/uploads/${record.photo_path}` : null,
                        location: {
                            latitude: record.latitude,
                            longitude: record.longitude
                        }
                    });
                });
                
                this.renderCalendar();
                this.updateStatistics();
            } else {
                throw new Error('API调用失败');
            }
            
        } catch (error) {
            console.error('Failed to load attendance data:', error);
            
            // 显示空状态而不是模拟数据
            this.attendanceData = {};
            this.signinRecords = [];
            this.renderCalendar();
            this.updateStatistics();
            
            Utils.showMessage(`${Utils.t('error')}: ${error.message}`, 'error');
        }
    }
    

    
    // 显示加载状态
    showLoadingState() {
        const calendarBody = document.getElementById('calendarBody');
        if (calendarBody) {
            calendarBody.innerHTML = `
                <div class="loading-calendar" style="grid-column: 1 / -1;">
                    <div class="loading-spinner"></div>
                </div>
            `;
        }
    }
    
    // 渲染日历
    renderCalendar() {
        const calendarBody = document.getElementById('calendarBody');
        if (!calendarBody) return;
        
        calendarBody.innerHTML = '';
        
        // 获取当月第一天和最后一天
        const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay();
        
        // 获取上个月的最后几天
        const prevMonth = new Date(this.currentYear, this.currentMonth - 2, 0);
        const daysInPrevMonth = prevMonth.getDate();
        
        // 渲染上个月的日期
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const dayElement = this.createDayElement(day, 'other-month');
            calendarBody.appendChild(dayElement);
        }
        
        // 渲染当月的日期
        for (let day = 1; day <= daysInMonth; day++) {
            const date = `${this.currentYear}-${this.currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const status = this.attendanceData[date] || null;
            const isToday = this.isToday(this.currentYear, this.currentMonth - 1, day);
            
            let classes = [];
            if (isToday) classes.push('today');
            if (status) classes.push(status);
            
            const dayElement = this.createDayElement(day, classes.join(' '), date);
            calendarBody.appendChild(dayElement);
        }
        
        // 渲染下个月的日期（填满6周）
        const totalCells = calendarBody.children.length;
        const remainingCells = 42 - totalCells; // 6周 * 7天
        
        for (let day = 1; day <= remainingCells; day++) {
            const dayElement = this.createDayElement(day, 'other-month');
            calendarBody.appendChild(dayElement);
        }
    }
    
    // 创建日期元素
    createDayElement(day, className = '', date = null) {
        const dayElement = document.createElement('div');
        dayElement.className = `calendar-day ${className}`;
        dayElement.textContent = day;
        
        if (date && this.attendanceData[date]) {
            dayElement.addEventListener('click', () => {
                this.showSigninDetails(date);
            });
            dayElement.style.cursor = 'pointer';
        }
        
        return dayElement;
    }
    
    // 检查是否为今天
    isToday(year, month, day) {
        const today = new Date();
        return year === today.getFullYear() && 
               month === today.getMonth() && 
               day === today.getDate();
    }
    
    // 更新统计信息
    updateStatistics() {
        const attendedDays = Object.values(this.attendanceData).filter(status => status === 'attended').length;
        const partialDays = Object.values(this.attendanceData).filter(status => status === 'partial').length;
        const missedDays = Object.values(this.attendanceData).filter(status => status === 'missed').length;
        const totalDays = attendedDays + partialDays + missedDays;
        
        const attendanceRate = totalDays > 0 ? Math.round(((attendedDays + partialDays * 0.5) / totalDays) * 100) : 0;
        
        // 更新显示
        const attendedElement = document.getElementById('attendedDays');
        const missedElement = document.getElementById('missedDays');
        const rateElement = document.getElementById('attendanceRate');
        
        if (attendedElement) {
            attendedElement.textContent = attendedDays + partialDays;
        }
        
        if (missedElement) {
            missedElement.textContent = missedDays;
        }
        
        if (rateElement) {
            rateElement.textContent = `${attendanceRate}%`;
        }
    }
    
    // 显示签到详情
    showSigninDetails(date) {
        const record = this.signinRecords.find(r => r.date === date);
        const detailsElement = document.getElementById('signinDetails');
        const contentElement = document.getElementById('detailsContent');
        
        if (!detailsElement || !contentElement) return;
        
        if (record) {
            // 处理照片显示
            const photoCell = record.photo ? 
                `<img src="${record.photo}" alt="签到照片" class="detail-photo" onclick="window.showPhotoPreview('${record.photo}', '签到照片')" style="cursor: pointer; max-width: 100px; max-height: 100px; border-radius: 4px;">` : 
                '<span class="text-gray-400">无照片</span>';
            
            contentElement.innerHTML = `
                <div class="detail-item">
                    <span class="detail-label" data-zh="日期" data-en="Date">日期</span>
                    <span class="detail-value">${record.date}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label" data-zh="时间" data-en="Time">时间</span>
                    <span class="detail-value">${record.time}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label" data-zh="课程" data-en="Course">课程</span>
                    <span class="detail-value">${record.courseName}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label" data-zh="教室" data-en="Classroom">教室</span>
                    <span class="detail-value">${record.classroom}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label" data-zh="状态" data-en="Status">状态</span>
                    <span class="detail-value">
                        <span class="status-badge ${record.status}">
                            ${this.getStatusText(record.status)}
                        </span>
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label" data-zh="照片" data-en="Photo">照片</span>
                    <span class="detail-value">
                        ${photoCell}
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label" data-zh="位置" data-en="Location">位置</span>
                    <span class="detail-value">${record.location ? `${Utils.t('latitude')}: ${record.location.latitude.toFixed(4)}, ${Utils.t('longitude')}: ${record.location.longitude.toFixed(4)}` : Utils.t('unknown_location')}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label" data-zh="教学楼" data-en="Building">教学楼</span>
                    <span class="detail-value">${record.building || record.buildingName || Utils.t('unknown_location')}</span>
                </div>
            `;
        } else {
            contentElement.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <h3 data-zh="无签到记录" data-en="No Sign-in Record">无签到记录</h3>
                    <p data-zh="该日期没有签到记录" data-en="No sign-in record for this date">该日期没有签到记录</p>
                </div>
            `;
        }
        
        // 更新多语言
        appState.updateUI();
        
        detailsElement.style.display = 'block';
    }
    
    // 隐藏签到详情
    hideSigninDetails() {
        const detailsElement = document.getElementById('signinDetails');
        if (detailsElement) {
            detailsElement.style.display = 'none';
        }
    }
    
    // 获取状态文本
    getStatusText(status) {
        const statusMap = {
            'attended': appState.currentLanguage === 'zh' ? '正常' : 'Normal',
            'late': appState.currentLanguage === 'zh' ? '迟到' : 'Late',
            'missed': appState.currentLanguage === 'zh' ? '缺勤' : 'Absent'
        };
        return statusMap[status] || status;
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.statisticsPage = new StatisticsPage();
});

// 全局照片预览函数
window.showPhotoPreview = function(src, alt) {
    const modal = document.createElement('div');
    modal.className = 'photo-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    
    modal.appendChild(img);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
};