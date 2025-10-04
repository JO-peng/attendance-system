/**
 * 记录页面功能
 */

class RecordsPage {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalRecords = 0;
        this.records = [];
        this.filteredRecords = [];
        this.currentFilter = {
            search: '',
            status: 'all',
            timeRange: 'month'
        };
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadAttendanceData();
        this.loadRecords();
    }
    
    bindEvents() {
        // 搜索框事件
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.currentFilter.search = e.target.value;
                this.filterRecords();
            }, 300));
        }
        
        // 状态筛选事件
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilter.status = e.target.value;
                this.filterRecords();
            });
        }
        
        // 时间范围选择事件
        const timeRangeSelect = document.getElementById('timeRange');
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', (e) => {
                this.currentFilter.timeRange = e.target.value;
                this.loadAttendanceData();
                this.loadRecords();
            });
        }
        
        // 导出按钮事件
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportRecords();
            });
        }
        
        // 分页按钮事件
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderRecords();
                }
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const totalPages = Math.ceil(this.filteredRecords.length / this.pageSize);
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.renderRecords();
                }
            });
        }
    }
    
    // 带重试限制的用户信息获取方法
    async getUserInfoWithRetry(maxRetries = 2) {
        const retryKey = 'records_userinfo_retry_count';
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
    
    async loadAttendanceData() {
        try {
            this.showLoadingState('attendance');
            
            // 获取当前用户信息，添加重试限制
            const userInfo = await this.getUserInfoWithRetry();
            if (!userInfo || !userInfo.student_id) {
                console.warn('无法获取用户信息，使用空数据');
                this.updateAttendanceStats({
                    totalDays: 0,
                    attendedDays: 0,
                    lateDays: 0,
                    absentDays: 0,
                    attendanceRate: 0
                });
                this.hideLoadingState('attendance');
                return;
            }
            
            // 获取指定时间范围的统计数据
            const timeRange = this.currentFilter.timeRange;
            const statsResponse = await Utils.request(`/api/attendance/statistics?student_id=${userInfo.student_id}&time_range=${timeRange}`);
            
            if (statsResponse.success && statsResponse.data) {
                // 使用API返回的实际数据
                const attendanceData = {
                    totalDays: statsResponse.data.total_days || 0,
                    attendedDays: statsResponse.data.attended_days || 0,
                    lateDays: statsResponse.data.late_days || 0,
                    absentDays: statsResponse.data.absent_days || 0,
                    attendanceRate: statsResponse.data.attendance_rate || 0
                };
                
                this.updateAttendanceStats(attendanceData);
            } else {
                // 如果API调用失败，计算本地数据
                // 获取当前筛选后的记录
                const attendedCount = this.filteredRecords.filter(r => r.status === 'attended').length;
                const lateCount = this.filteredRecords.filter(r => r.status === 'late').length;
                const absentCount = this.filteredRecords.filter(r => r.status === 'absent').length;
                const totalCount = attendedCount + lateCount + absentCount;
                
                // 计算出勤率：正常出勤 + 迟到*0.5，与统计界面保持一致
                const attendanceRate = totalCount > 0 ? 
                    Math.round(((attendedCount + lateCount * 0.5) / totalCount) * 100) : 0;
                
                const attendanceData = {
                    totalDays: totalCount,
                    attendedDays: attendedCount,
                    lateDays: lateCount,
                    absentDays: absentCount,
                    attendanceRate: attendanceRate
                };
                
                this.updateAttendanceStats(attendanceData);
            }
            
            this.hideLoadingState('attendance');
            
        } catch (error) {
            console.error('加载出勤数据失败:', error);
            
            // 特殊处理授权码过期错误
            if (error.message && (
                error.message.includes('Invalid authorization code') ||
                error.message.includes('授权码过期') ||
                error.message.includes('401') ||
                error.message.includes('403')
            )) {
                // 清除缓存的用户信息
                appState.clearStoredUserInfo();
                
                // 显示空的统计数据
                this.updateAttendanceStats({
                    totalDays: 0,
                    attendedDays: 0,
                    lateDays: 0,
                    absentDays: 0,
                    attendanceRate: 0
                });
                
                Utils.showMessage('授权已过期，统计数据无法加载', 'warning');
            } else {
                // 其他错误：如果API调用失败，计算本地数据
                const attendedCount = this.filteredRecords.filter(r => r.status === 'attended').length;
                const lateCount = this.filteredRecords.filter(r => r.status === 'late').length;
                const absentCount = this.filteredRecords.filter(r => r.status === 'absent').length;
                const totalCount = attendedCount + lateCount + absentCount;
                
                // 计算出勤率：正常出勤 + 迟到*0.5，与统计界面保持一致
                const attendanceRate = totalCount > 0 ? 
                    Math.round(((attendedCount + lateCount * 0.5) / totalCount) * 100) : 0;
                
                const attendanceData = {
                    totalDays: totalCount,
                    attendedDays: attendedCount,
                    lateDays: lateCount,
                    absentDays: absentCount,
                    attendanceRate: attendanceRate
                };
                
                this.updateAttendanceStats(attendanceData);
                Utils.showMessage('加载出勤数据失败，使用本地计算', 'warning');
            }
            
            this.hideLoadingState('attendance');
        }
    }
    
    async loadRecords() {
        try {
            this.showLoadingState('records');
            
            // 获取当前用户信息，添加重试限制
            const userInfo = await this.getUserInfoWithRetry();
            if (!userInfo || !userInfo.student_id) {
                console.warn('无法获取用户信息，显示空记录');
                this.records = [];
                this.filteredRecords = [];
                this.totalRecords = 0;
                this.renderRecords();
                this.hideLoadingState('records');
                Utils.showMessage('无法获取用户信息，请刷新页面重试', 'warning');
                return;
            }
            
            // 添加时间范围参数
            const timeRange = this.currentFilter.timeRange;
            
            // 调用后端API获取签到记录，添加时间范围参数
            const response = await Utils.request(`/api/attendance/records?student_id=${userInfo.student_id}&per_page=100&time_range=${timeRange}`, {
                method: 'GET'
            });
            
            if (response.success && response.data && response.data.records) {
                // 转换后端数据格式为前端需要的格式
                this.records = response.data.records.map(record => ({
                    id: record.id,
                    name: record.user_name,
                    studentId: record.student_id,
                    course: record.course_name,
                    location: record.location_address || record.classroom,
                    status: record.status,
                    time: record.signed_at,
                    photo: record.photo_path ? `/api/uploads/${record.photo_path}` : null
                }));
            } else {
                // 如果API调用失败，显示空状态
                console.warn('API调用失败，无法获取记录数据');
                this.records = [];
                Utils.showMessage('无法获取记录数据，请检查网络连接', 'error');
            }
            
            this.filteredRecords = [...this.records];
            this.totalRecords = this.records.length;
            
            this.renderRecords();
            this.loadAttendanceData(); // 重新计算出勤数据
            this.hideLoadingState('records');
            
        } catch (error) {
            console.error('加载记录失败:', error);
            
            // 特殊处理授权码过期错误
            if (error.message && (
                error.message.includes('Invalid authorization code') ||
                error.message.includes('授权码过期') ||
                error.message.includes('401') ||
                error.message.includes('403')
            )) {
                // 清除缓存的用户信息，强制重新获取
                appState.clearStoredUserInfo();
                sessionStorage.removeItem('userInfo_retry_count');
                
                Utils.showMessage('授权已过期，请刷新页面重新登录', 'warning', 5000);
                
                // 显示友好的错误状态
                const recordsContainer = document.getElementById('recordsContainer');
                if (recordsContainer) {
                    recordsContainer.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-icon">🔐</div>
                            <h3>授权已过期</h3>
                            <p>您的登录状态已过期，请刷新页面重新登录</p>
                            <button onclick="location.reload()" class="btn btn-primary">刷新页面</button>
                        </div>
                    `;
                }
            } else {
                // 其他错误的处理
                this.records = [];
                this.filteredRecords = [];
                this.totalRecords = 0;
                this.renderRecords();
                
                // 根据错误类型显示不同的消息
                let errorMessage = '加载记录失败';
                if (error.message && error.message.includes('网络')) {
                    errorMessage = '网络连接失败，请检查网络设置后重试';
                } else if (error.message && error.message.includes('500')) {
                    errorMessage = '服务器暂时不可用，请稍后重试';
                } else if (error.message) {
                    errorMessage = `加载失败: ${error.message}`;
                }
                
                Utils.showMessage(errorMessage, 'error');
            }
            
            this.hideLoadingState('records');
        }
    }
    
    generateMockRecords(timeRange = 'month') {
        const records = [];
        const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];
        const courses = ['高等数学', '大学英语', '计算机基础', '数据结构', '操作系统', '数据库原理'];
        const locations = ['教学楼A101', '教学楼B203', '实验楼C305', '图书馆D401', '综合楼E502'];
        const statuses = ['attended', 'late', 'absent'];
        const statusWeights = [0.7, 0.2, 0.1]; // 出勤概率权重
        
        // 根据时间范围设置日期范围
        const now = new Date();
        let startDate = new Date();
        
        if (timeRange === 'week') {
            // 本周的开始（周一）
            const day = now.getDay() || 7; // 如果是周日，getDay()返回0，转为7
            startDate.setDate(now.getDate() - day + 1);
        } else if (timeRange === 'month') {
            // 本月的开始
            startDate.setDate(1);
        } else if (timeRange === 'semester') {
            // 本学期（假设为近3个月）
            startDate.setMonth(now.getMonth() - 3);
        }
        
        // 生成记录数量根据时间范围调整
        let recordCount = 0;
        if (timeRange === 'week') recordCount = 5;
        else if (timeRange === 'month') recordCount = 20;
        else recordCount = 50;
        
        for (let i = 0; i < recordCount; i++) {
            // 在开始日期和当前日期之间随机选择一个日期
            const date = new Date(startDate.getTime() + Math.random() * (now.getTime() - startDate.getTime()));
            
            // 根据权重随机选择状态
            let status = 'attended';
            const rand = Math.random();
            if (rand < statusWeights[2]) {
                status = 'absent';
            } else if (rand < statusWeights[1] + statusWeights[2]) {
                status = 'late';
            }
            
            records.push({
                id: i + 1,
                name: names[Math.floor(Math.random() * names.length)],
                studentId: `2020${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
                course: courses[Math.floor(Math.random() * courses.length)],
                location: locations[Math.floor(Math.random() * locations.length)],
                status: status,
                time: date.toISOString(),
                photo: status !== 'absent' ? `https://picsum.photos/200/200?random=${i}` : null
            });
        }
        
        // 按时间倒序排列
        return records.sort((a, b) => new Date(b.time) - new Date(a.time));
    }
    
    updateAttendanceStats(data) {
        // 更新出勤率环形图
        const progressBar = document.querySelector('.progress-bar');
        const progressPercentage = document.querySelector('.progress-percentage');
        
        if (progressBar && progressPercentage) {
            const circumference = 314; // 2 * π * 50
            const offset = circumference - (circumference * data.attendanceRate / 100);
            
            progressBar.style.strokeDashoffset = offset;
            progressPercentage.textContent = `${data.attendanceRate}%`;
        }
        
        // 更新统计数据
        const attendedValue = document.querySelector('.stat-item.attended .stat-value');
        const lateValue = document.querySelector('.stat-item.late .stat-value');
        const absentValue = document.querySelector('.stat-item.absent .stat-value');
        
        if (attendedValue) attendedValue.textContent = data.attendedDays;
        if (lateValue) lateValue.textContent = data.lateDays;
        if (absentValue) absentValue.textContent = data.absentDays;
    }
    
    filterRecords() {
        this.filteredRecords = this.records.filter(record => {
            // 搜索过滤
            const searchMatch = !this.currentFilter.search || 
                record.name.toLowerCase().includes(this.currentFilter.search.toLowerCase()) ||
                record.studentId.includes(this.currentFilter.search) ||
                record.course.toLowerCase().includes(this.currentFilter.search.toLowerCase()) ||
                record.location.toLowerCase().includes(this.currentFilter.search.toLowerCase());
            
            // 状态过滤
            const statusMatch = this.currentFilter.status === 'all' || 
                record.status === this.currentFilter.status;
            
            // 时间范围过滤
            let timeMatch = true;
            if (this.currentFilter.timeRange) {
                const recordDate = new Date(record.time);
                const now = new Date();
                
                if (this.currentFilter.timeRange === 'week') {
                    // 本周的开始（周一）
                    const day = now.getDay() || 7; // 如果是周日，getDay()返回0，转为7
                    const weekStart = new Date(now);
                    weekStart.setDate(now.getDate() - day + 1);
                    weekStart.setHours(0, 0, 0, 0);
                    timeMatch = recordDate >= weekStart;
                } else if (this.currentFilter.timeRange === 'month') {
                    // 本月的开始
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    timeMatch = recordDate >= monthStart;
                } else if (this.currentFilter.timeRange === 'semester') {
                    // 本学期（假设为近3个月）
                    const semesterStart = new Date(now);
                    semesterStart.setMonth(now.getMonth() - 3);
                    semesterStart.setHours(0, 0, 0, 0);
                    timeMatch = recordDate >= semesterStart;
                }
            }
            
            return searchMatch && statusMatch && timeMatch;
        });
        
        this.currentPage = 1; // 重置到第一页
        this.renderRecords();
        
        // 筛选后重新计算出勤统计数据
        const attendedCount = this.filteredRecords.filter(r => r.status === 'attended').length;
        const lateCount = this.filteredRecords.filter(r => r.status === 'late').length;
        const absentCount = this.filteredRecords.filter(r => r.status === 'absent').length;
        const totalCount = attendedCount + lateCount + absentCount;
        
        // 计算出勤率：正常出勤 + 迟到*0.5
        const attendanceRate = totalCount > 0 ? 
            Math.round(((attendedCount + lateCount * 0.5) / totalCount) * 100) : 0;
        
        const attendanceData = {
            totalDays: totalCount,
            attendedDays: attendedCount,
            lateDays: lateCount,
            absentDays: absentCount,
            attendanceRate: attendanceRate
        };
        
        this.updateAttendanceStats(attendanceData);
    }
    
    renderRecords() {
        const tbody = document.querySelector('.records-table tbody');
        const emptyState = document.querySelector('.empty-state');
        const tableContainer = document.querySelector('.records-table-container');
        
        if (!tbody) return;
        
        // 如果没有记录，显示空状态
        if (this.filteredRecords.length === 0) {
            if (tableContainer) tableContainer.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        // 显示表格，隐藏空状态
        if (tableContainer) tableContainer.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
        
        // 计算分页
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageRecords = this.filteredRecords.slice(startIndex, endIndex);
        
        // 渲染记录
        tbody.innerHTML = pageRecords.map(record => {
            const statusText = {
                'attended': '已签到',
                'late': '迟到',
                'absent': '缺勤'
            }[record.status] || record.status;
            
            const photoCell = record.photo ? 
                `<img src="${record.photo}" alt="签到照片" class="photo-thumbnail" onclick="window.showPhotoPreview('${record.photo}', '签到照片')" style="cursor: pointer;">` : 
                '<span class="text-gray-400">-</span>';
            
            return `
                <tr>
                    <td>${record.name}</td>
                    <td>${record.studentId}</td>
                    <td>${record.course}</td>
                    <td>${record.location}</td>
                    <td><span class="status-badge ${record.status}">${statusText}</span></td>
                    <td>${Utils.formatDateTime(record.time)}</td>
                    <td>${photoCell}</td>
                </tr>
            `;
        }).join('');
        
        // 更新分页信息
        this.updatePagination();
    }
    
    updatePagination() {
        const totalPages = Math.ceil(this.filteredRecords.length / this.pageSize);
        const startRecord = (this.currentPage - 1) * this.pageSize + 1;
        const endRecord = Math.min(this.currentPage * this.pageSize, this.filteredRecords.length);
        
        // 更新分页按钮状态
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const pageInfo = document.getElementById('pageInfo');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= totalPages;
        }
        
        if (pageInfo) {
            pageInfo.textContent = `第 ${this.currentPage} 页，共 ${totalPages} 页`;
        }
    }
    
    showPhotoModal(src, alt) {
        const modal = document.getElementById('photoModal');
        const modalImg = document.getElementById('modalPhoto');
        
        if (modal && modalImg) {
            modalImg.src = src;
            modalImg.alt = alt;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    hidePhotoModal() {
        const modal = document.getElementById('photoModal');
        
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    async exportRecords() {
        try {
            Utils.showMessage('正在导出数据...', 'info');
            
            // 模拟导出延迟
            await Utils.delay(1500);
            
            // 创建CSV内容
            const headers = ['姓名', '学号', '课程', '位置', '状态', '时间'];
            const csvContent = [headers.join(',')];
            
            this.filteredRecords.forEach(record => {
                const statusText = {
                    'attended': '已签到',
                    'late': '迟到',
                    'absent': '缺勤'
                }[record.status] || record.status;
                
                const row = [
                    record.name,
                    record.studentId,
                    record.course,
                    record.location,
                    statusText,
                    Utils.formatDateTime(record.time)
                ];
                
                csvContent.push(row.join(','));
            });
            
            // 创建并下载文件
            const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `考勤记录_${Utils.formatDate(new Date())}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            Utils.showMessage('导出成功', 'success');
            
        } catch (error) {
            console.error('导出失败:', error);
            Utils.showMessage('导出失败', 'error');
        }
    }
    
    showLoadingState(type) {
        if (type === 'attendance') {
            const overviewCard = document.querySelector('.overview-card');
            if (overviewCard) {
                overviewCard.style.opacity = '0.6';
                overviewCard.style.pointerEvents = 'none';
            }
        } else if (type === 'records') {
            const tbody = document.querySelector('.records-table tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr class="loading-row">
                        <td colspan="7">
                            <div class="loading-spinner"></div>
                            加载中...
                        </td>
                    </tr>
                `;
            }
        }
    }
    
    hideLoadingState(type) {
        if (type === 'attendance') {
            const overviewCard = document.querySelector('.overview-card');
            if (overviewCard) {
                overviewCard.style.opacity = '';
                overviewCard.style.pointerEvents = '';
            }
        }
        // records的加载状态会在renderRecords中被替换
    }
}

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

document.addEventListener('DOMContentLoaded', () => {
    const recordsPage = new RecordsPage();
    recordsPage.init();
});