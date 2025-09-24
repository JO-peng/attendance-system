// 统计页面主逻辑
class StatsApp {
    constructor() {
        this.statsData = [];
        this.charts = {};
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadUserInfo();
        this.loadStatsData();
    }

    // 绑定事件
    bindEvents() {
        // 返回按钮
        document.getElementById('backButton').addEventListener('click', () => {
            window.history.back();
        });

        // 排行榜视图切换
        document.getElementById('listViewTab').addEventListener('click', () => {
            this.switchRankingView('list');
        });
        document.getElementById('chartViewTab').addEventListener('click', () => {
            this.switchRankingView('chart');
        });

        // 导出按钮
        document.getElementById('exportButton').addEventListener('click', () => {
            this.exportData();
        });

        // 错误提示确定按钮
        document.getElementById('errorOkButton').addEventListener('click', () => {
            this.hideError();
        });

        // 详情弹窗关闭按钮
        document.getElementById('detailCloseButton').addEventListener('click', () => {
            this.hideDetailModal();
        });

        // 点击模态框背景关闭
        document.getElementById('errorModal').addEventListener('click', (e) => {
            if (e.target.id === 'errorModal') {
                this.hideError();
            }
        });

        document.getElementById('detailModal').addEventListener('click', (e) => {
            if (e.target.id === 'detailModal') {
                this.hideDetailModal();
            }
        });
    }

    // 加载用户信息
    async loadUserInfo() {
        try {
            const response = await fetch('/api/current-user');
            const data = await response.json();
            
            if (data.code === 200 && data.user) {
                document.getElementById('userName').textContent = data.user.name || data.user.username;
                document.getElementById('userInfoHeader').style.display = 'flex';
            }
        } catch (error) {
            console.error('加载用户信息失败:', error);
        }
    }

    // 加载统计数据
    async loadStatsData() {
        this.showLoading();
        
        try {
            const response = await fetch('/api/admin/handler-stats');
            const data = await response.json();
            
            if (data.code === 200) {
                this.statsData = data.data || [];
                this.renderStatsOverview();
                this.renderRankingList();
                this.renderStatsTable();
                this.renderCharts();
            } else {
                this.showError(data.msg || '加载统计数据失败');
            }
        } catch (error) {
            console.error('加载统计数据失败:', error);
            this.showError('网络错误，请检查网络连接');
        } finally {
            this.hideLoading();
        }
    }

    // 渲染统计概览
    renderStatsOverview() {
        const totalHandlers = this.statsData.length;
        const totalRecords = this.statsData.reduce((sum, item) => sum + item.count, 0);
        const avgRecords = totalHandlers > 0 ? Math.round(totalRecords / totalHandlers) : 0;

        document.getElementById('totalHandlers').textContent = totalHandlers;
        document.getElementById('totalRecords').textContent = totalRecords;
        document.getElementById('avgRecords').textContent = avgRecords;
    }

    // 渲染排行榜列表
    renderRankingList() {
        const container = document.getElementById('rankingList');
        
        if (this.statsData.length === 0) {
            container.innerHTML = '<div class="loading-placeholder">暂无统计数据</div>';
            return;
        }

        const html = this.statsData.map((item, index) => {
            const rank = index + 1;
            const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-other';
            
            return `
                <div class="ranking-item" onclick="statsApp.showHandlerDetail('${item.handle_student_id}', '${item.handle_name}')">
                    <div class="ranking-number ${rankClass}">${rank}</div>
                    <div class="ranking-info">
                        <div class="ranking-name">${item.handle_name}</div>
                        <div class="ranking-id">${item.handle_student_id}</div>
                    </div>
                    <div class="ranking-count">
                        <div class="count-number">${item.count}</div>
                        <div class="count-label">次核验</div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    // 渲染统计表格
    renderStatsTable() {
        const tbody = document.getElementById('statsTableBody');
        
        if (this.statsData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">暂无统计数据</td></tr>';
            return;
        }

        const totalRecords = this.statsData.reduce((sum, item) => sum + item.count, 0);
        
        const html = this.statsData.map((item, index) => {
            const rank = index + 1;
            const percentage = totalRecords > 0 ? ((item.count / totalRecords) * 100).toFixed(1) : '0.0';
            
            return `
                <tr onclick="statsApp.showHandlerDetail('${item.handle_student_id}', '${item.handle_name}')">
                    <td>${rank}</td>
                    <td>${item.handle_name}</td>
                    <td>${item.handle_student_id}</td>
                    <td>${item.count}</td>
                    <td>${percentage}%</td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = html;
    }

    // 渲染图表
    renderCharts() {
        this.renderStatsChart();
        this.renderRankingChart();
    }

    // 渲染统计分布图表
    renderStatsChart() {
        const ctx = document.getElementById('statsChart').getContext('2d');
        
        // 销毁现有图表
        if (this.charts.statsChart) {
            this.charts.statsChart.destroy();
        }

        if (this.statsData.length === 0) {
            return;
        }

        // 取前10名数据
        const top10Data = this.statsData.slice(0, 10);
        
        this.charts.statsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: top10Data.map(item => item.handle_name),
                datasets: [{
                    label: '核验数量',
                    data: top10Data.map(item => item.count),
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 0
                        }
                    }
                }
            }
        });
    }

    // 渲染排行榜图表
    renderRankingChart() {
        const ctx = document.getElementById('rankingChart').getContext('2d');
        
        // 销毁现有图表
        if (this.charts.rankingChart) {
            this.charts.rankingChart.destroy();
        }

        if (this.statsData.length === 0) {
            return;
        }

        // 取前8名数据用于饼图
        const top8Data = this.statsData.slice(0, 8);
        const otherCount = this.statsData.slice(8).reduce((sum, item) => sum + item.count, 0);
        
        const labels = top8Data.map(item => item.handle_name);
        const data = top8Data.map(item => item.count);
        
        if (otherCount > 0) {
            labels.push('其他');
            data.push(otherCount);
        }

        this.charts.rankingChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
                        '#4BC0C0'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    // 切换排行榜视图
    switchRankingView(view) {
        // 更新标签状态
        document.querySelectorAll('.ranking-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(view + 'ViewTab').classList.add('active');

        // 切换内容显示
        document.querySelectorAll('.ranking-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(view + 'View').classList.add('active');

        // 如果切换到图表视图，重新渲染图表
        if (view === 'chart') {
            setTimeout(() => {
                this.renderRankingChart();
            }, 100);
        }
    }

    // 显示处理人详情
    async showHandlerDetail(studentId, name) {
        // 这里可以扩展显示更详细的信息
        const content = `
            <div class="detail-content">
                <h4>报到人员信息</h4>
                <p><strong>姓名：</strong>${name}</p>
                <p><strong>学工号：</strong>${studentId}</p>
                <p><strong>报到数量：</strong>${this.statsData.find(item => item.handle_student_id === studentId)?.count || 0} 次</p>
                <br>
                <p>更多详细信息功能开发中...</p>
            </div>
        `;

        document.getElementById('detailContent').innerHTML = content;
        document.getElementById('detailTitle').textContent = `${name} 的报到详情`;
        document.getElementById('detailModal').style.display = 'flex';
    }

    // 导出数据
    exportData() {
        if (this.statsData.length === 0) {
            this.showError('暂无数据可导出');
            return;
        }

        // 创建CSV内容
        const headers = ['排名', '姓名', '学工号', '报到数量', '占比'];
        const totalRecords = this.statsData.reduce((sum, item) => sum + item.count, 0);

        const csvContent = [
            headers.join(','),
            ...this.statsData.map((item, index) => {
                const rank = index + 1;
                const percentage = totalRecords > 0 ? ((item.count / totalRecords) * 100).toFixed(1) : '0.0';
                return [rank, item.handle_name, item.handle_student_id, item.count, percentage + '%'].join(',');
            })
        ].join('\n');

        // 创建下载链接
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `核验统计_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // 显示加载提示
    showLoading() {
        document.getElementById('loading').style.display = 'flex';
    }

    // 隐藏加载提示
    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    // 显示错误提示
    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorModal').style.display = 'flex';
    }

    // 隐藏错误提示
    hideError() {
        document.getElementById('errorModal').style.display = 'none';
    }

    // 隐藏详情弹窗
    hideDetailModal() {
        document.getElementById('detailModal').style.display = 'none';
    }
}

// 初始化应用
let statsApp;
document.addEventListener('DOMContentLoaded', () => {
    statsApp = new StatsApp();
});
