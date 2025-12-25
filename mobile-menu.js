// 管理密码（可以修改为你想要的密码）
const ADMIN_PASSWORD = 'zsxq2025';

// 检查登录状态
function checkLogin() {
    return sessionStorage.getItem('adminLoggedIn') === 'true';
}

// 登录
function doLogin() {
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        document.getElementById('loginOverlay').classList.add('hidden');
        errorEl.textContent = '';
        initMobileApp();
    } else {
        errorEl.textContent = '密码错误，请重试';
        document.getElementById('loginPassword').value = '';
    }
}

// 退出登录
function logout() {
    sessionStorage.removeItem('adminLoggedIn');
    location.reload();
}

// 初始化移动端应用
function initMobileApp() {
    // 根据 URL hash 恢复页面状态
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    const validTabs = ['dashboard', 'licenses', 'devices', 'ipManage', 'deviceOverview', 'review', 'settings'];
    const tabName = validTabs.includes(hash) ? hash : 'dashboard';
    showTabByName(tabName);
}

// 页面初始化
window.onload = () => {
    if (checkLogin()) {
        document.getElementById('loginOverlay').classList.add('hidden');
        initMobileApp();
    }
};

// 监听浏览器前进后退
window.onhashchange = () => {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    const validTabs = ['dashboard', 'licenses', 'devices', 'ipManage', 'deviceOverview', 'review', 'settings'];
    if (validTabs.includes(hash)) {
        showTabByName(hash);
    }
};

// 内部切换标签页（不依赖 event）
function showTabByName(tabName) {
    // 隐藏所有标签页
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // 移除所有导航项的激活状态
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // 显示选中的标签页
    document.getElementById(tabName).classList.add('active');

    // 激活对应的导航项
    const navItem = document.querySelector(`.nav-item[onclick*="'${tabName}'"]`);
    if (navItem) navItem.classList.add('active');

    // 滚动到顶部
    window.scrollTo(0, 0);

    // 加载对应页面的数据
    if (tabName === 'dashboard') {
        loadDashboard();
    } else if (tabName === 'licenses') {
        loadAllLicenses();
    } else if (tabName === 'ipManage') {
        loadAllIPs();
    } else if (tabName === 'deviceOverview') {
        loadAllDevices();
    } else if (tabName === 'review') {
        loadPendingIPs();
        loadApprovedIPs();
        loadRejectedIPs();
    }
}

// 切换标签页（用户点击导航时调用）
function showTab(tabName) {
    // 更新 URL hash
    window.location.hash = tabName;
    showTabByName(tabName);
}

// 重写显示统计数据的函数（移动端优化）
function displayStats(data) {
    const total = data.total || 0;
    const active = data.licenses.filter(l => !l.isBanned && new Date(l.expire) > new Date()).length;
    const devices = data.licenses.reduce((sum, l) => sum + l.devicesUsed, 0);
    const banned = data.licenses.filter(l => l.isBanned).length;

    document.getElementById('statsContainer').innerHTML = `
        <div class="stat-card">
            <div class="stat-label">总密钥数</div>
            <div class="stat-value">${total}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">活跃密钥</div>
            <div class="stat-value">${active}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">总设备数</div>
            <div class="stat-value">${devices}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">已封禁</div>
            <div class="stat-value">${banned}</div>
        </div>
    `;
}

// 重写显示最近密钥的函数（移动端优化）
function displayRecentLicenses(data) {
    if (!data.licenses || data.licenses.length === 0) {
        document.getElementById('recentLicenses').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">暂无数据</div></div>';
        return;
    }

    let html = '';
    data.licenses.slice(0, 5).forEach(lic => {
        const status = lic.isBanned ? '<span class="badge badge-danger">已封禁</span>' :
            new Date(lic.expire) < new Date() ? '<span class="badge badge-warning">已过期</span>' :
                '<span class="badge badge-success">正常</span>';

        html += `
            <div class="list-item">
                <div class="list-item-header">
                    <div class="list-item-title">${lic.license}</div>
                    ${status}
                </div>
                <div class="list-item-info">👤 ${lic.customer}</div>
                <div class="list-item-info">📱 ${lic.devicesUsed} / ${lic.maxDevices} 台设备</div>
            </div>
        `;
    });
    document.getElementById('recentLicenses').innerHTML = html;
}

// 重写显示所有密钥的函数（移动端优化）
function displayAllLicenses(data) {
    if (!data.licenses || data.licenses.length === 0) {
        document.getElementById('allLicenses').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">暂无数据</div></div>';
        return;
    }

    let html = '';
    data.licenses.forEach(lic => {
        const isExpired = new Date(lic.expire) < new Date();
        const status = lic.isBanned ? '<span class="badge badge-danger">已封禁</span>' :
            isExpired ? '<span class="badge badge-warning">已过期</span>' :
                '<span class="badge badge-success">正常</span>';

        // IP 绑定状态
        const ipStatus = lic.ipBindingEnabled ?
            `<span class="badge badge-info">🔒 ${(lic.allowedIPs || []).length} IP</span>` :
            '<span class="badge badge-secondary">IP未启用</span>';

        const banBtn = lic.isBanned ?
            `<button class="btn-small btn-success" onclick="unbanLicenseAction('${lic.license}')">解封</button>` :
            `<button class="btn-small btn-danger" onclick="banLicenseAction('${lic.license}')">封禁</button>`;

        html += `
            <div class="list-item">
                <div class="list-item-header">
                    <div class="list-item-title">${lic.license}</div>
                    ${status}
                </div>
                <div class="list-item-info">👤 ${lic.customer}</div>
                <div class="list-item-info">📅 ${lic.expire}</div>
                <div class="list-item-info">📱 ${lic.devicesUsed} / ${lic.maxDevices} 台设备</div>
                <div class="list-item-info">${ipStatus}</div>
                <div class="list-item-actions">
                    <button class="btn-small" onclick="editLicense('${lic.license}')">编辑</button>
                    <button class="btn-small" onclick="manageIPBindingFromList('${lic.license}')">🔒IP</button>
                    ${banBtn}
                    <button class="btn-small btn-danger" onclick="deleteLicense('${lic.license}')">删除</button>
                </div>
            </div>
        `;
    });
    document.getElementById('allLicenses').innerHTML = html;
}

// 重写显示设备的函数（移动端优化）
function displayDevices(data, license) {
    if (!data.devices || data.devices.length === 0) {
        document.getElementById('devicesResult').innerHTML = '<div class="section"><div class="empty-state"><div class="empty-state-icon">📱</div><div class="empty-state-text">该激活码暂无设备使用记录</div></div></div>';
        return;
    }

    let html = '<div class="section">';
    html += '<div class="section-header">';
    html += '<h2>设备列表</h2>';
    html += `<button class="btn-small" onclick="manageIPBinding('${license}')">🔒 IP绑定</button>`;
    html += '</div>';

    data.devices.forEach(device => {
        const status = device.isBanned ? '<span class="badge badge-danger">已封禁</span>' : '<span class="badge badge-success">正常</span>';
        const action = device.isBanned ?
            `<button class="btn-small btn-success" onclick="unbanDevice('${license}', '${device.machineId}')">解封</button>` :
            `<button class="btn-small btn-danger" onclick="banDevice('${license}', '${device.machineId}')">封禁</button>`;

        const ipHistoryBtn = device.ipHistory && device.ipHistory.length > 0 ?
            `<button class="btn-small" onclick="showIPHistory('${device.machineId}', ${JSON.stringify(device.ipHistory).replace(/"/g, '&quot;')})">IP历史</button>` : '';

        html += `
            <div class="list-item">
                <div class="list-item-header">
                    <div class="list-item-title">${device.machineIdShort}</div>
                    ${status}
                </div>
                <div class="list-item-info">🕐 首次: ${device.firstSeen}</div>
                <div class="list-item-info">🕐 最近: ${device.lastSeen}</div>
                <div class="list-item-info">🌐 首次IP: ${device.firstIP || '未知'}</div>
                <div class="list-item-info">🌐 最近IP: ${device.lastIP || '未知'}</div>
                <div class="list-item-actions">
                    ${action}
                    ${ipHistoryBtn}
                </div>
            </div>
        `;
    });
    html += '</div>';
    document.getElementById('devicesResult').innerHTML = html;
}

// 重写显示搜索结果的函数（移动端优化）
function displaySearchResults(licenses) {
    if (!licenses || licenses.length === 0) {
        document.getElementById('allLicenses').innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-text">未找到匹配的密钥</div></div>';
        document.getElementById('licensesPagination').innerHTML = '';
        return;
    }

    let html = '';
    licenses.forEach(lic => {
        const status = lic.isBanned ? '<span class="badge badge-danger">已封禁</span>' :
            lic.isExpired ? '<span class="badge badge-warning">已过期</span>' :
                '<span class="badge badge-success">正常</span>';

        // IP 绑定状态
        const ipStatus = lic.ipBindingEnabled ?
            `<span class="badge badge-info">🔒 ${(lic.allowedIPs || []).length} IP</span>` :
            '<span class="badge badge-secondary">IP未启用</span>';

        const banBtn = lic.isBanned ?
            `<button class="btn-small btn-success" onclick="unbanLicenseAction('${lic.license}')">解封</button>` :
            `<button class="btn-small btn-danger" onclick="banLicenseAction('${lic.license}')">封禁</button>`;

        html += `
            <div class="list-item">
                <div class="list-item-header">
                    <div class="list-item-title">${lic.license}</div>
                    ${status}
                </div>
                <div class="list-item-info">👤 ${lic.customer}</div>
                <div class="list-item-info">📅 ${lic.expire}</div>
                <div class="list-item-info">📱 ${lic.devicesUsed} / ${lic.maxDevices} 台设备</div>
                <div class="list-item-info">${ipStatus}</div>
                <div class="list-item-actions">
                    <button class="btn-small" onclick="editLicense('${lic.license}')">编辑</button>
                    <button class="btn-small" onclick="manageIPBindingFromList('${lic.license}')">🔒IP</button>
                    ${banBtn}
                    <button class="btn-small btn-danger" onclick="deleteLicense('${lic.license}')">删除</button>
                </div>
            </div>
        `;
    });
    document.getElementById('allLicenses').innerHTML = html;
    document.getElementById('licensesPagination').innerHTML = `<div class="pagination"><span>共找到 ${licenses.length} 条记录</span></div>`;
}

// 重写显示分页的函数（移动端优化）
function displayLicensesPagination(data) {
    if (data.totalPages <= 1) {
        document.getElementById('licensesPagination').innerHTML = '';
        return;
    }

    let html = '<div class="pagination">';
    if (currentPage > 1) {
        html += `<button onclick="loadAllLicenses(${currentPage - 1})">⬅️ 上一页</button>`;
    }
    html += `<span>第 ${currentPage} / ${data.totalPages} 页</span>`;
    if (currentPage < data.totalPages) {
        html += `<button onclick="loadAllLicenses(${currentPage + 1})">下一页 ➡️</button>`;
    }
    html += '</div>';
    document.getElementById('licensesPagination').innerHTML = html;
}


// ==================== 激活审核功能（移动端优化） ====================

// 加载待审核 IP 列表
async function loadPendingIPs() {
    const result = await apiRequest('listPendingIPs', {});
    if (result.success) {
        displayPendingIPs(result.data);
    } else {
        document.getElementById('pendingIPsContainer').innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-text">加载失败</div></div>';
    }
}

// 显示待审核 IP（移动端优化）
function displayPendingIPs(list) {
    if (!list || list.length === 0) {
        document.getElementById('pendingIPsContainer').innerHTML = '<div class="empty-state"><div class="empty-state-icon">✨</div><div class="empty-state-text">暂无待审核的激活请求</div></div>';
        return;
    }

    let html = '';
    list.forEach(item => {
        const taskCount = item.taskCount || 0;
        const maxTasks = item.maxTasks || 10;
        const taskInfo = `${taskCount} / ${maxTasks}`;
        const taskBadgeClass = taskCount >= maxTasks ? 'badge-danger' : 'badge-info';
        const deviceIdShort = item.machineIdFull ? item.machineIdFull.substring(0, 8) + '...' : '-';
        const licenseType = item.licenseType || '临时密钥';
        html += `
            <div class="list-item">
                <div class="list-item-header">
                    <div class="list-item-title">${item.ip}</div>
                    <span class="badge badge-warning">${item.remaining}</span>
                </div>
                <div class="list-item-info">🖥️ 设备: ${deviceIdShort}</div>
                <div class="list-item-info">🕐 激活时间: ${item.createdAt}</div>
                <div class="list-item-info">⏰ 最后活跃: ${item.lastSeen || '-'}</div>
                <div class="list-item-info">📊 任务次数: <span class="badge ${taskBadgeClass}">${taskInfo}</span></div>
                <div class="list-item-info">🏷️ 类型: <span class="badge badge-secondary">${licenseType}</span></div>
                <div class="list-item-actions">
                    <button class="btn-small btn-success" onclick="approveIPAction('${item.ip}')">✅ 通过</button>
                    <button class="btn-small btn-danger" onclick="rejectIPAction('${item.ip}')">❌ 拒绝</button>
                </div>
            </div>
        `;
    });
    document.getElementById('pendingIPsContainer').innerHTML = html;
}

// 审核通过
async function approveIPAction(ip) {
    if (!confirm(`确定要通过 IP: ${ip} 的激活申请吗？\n\n通过后该 IP 可永久使用插件。`)) return;

    const result = await apiRequest('approveIP', { ip });
    if (result.success) {
        showMessage(`IP ${ip} 已通过审核`, 'success');
        loadPendingIPs();
        loadApprovedIPs();
    } else {
        showMessage(result.error || '操作失败', 'error');
    }
}

// 拒绝激活
async function rejectIPAction(ip) {
    if (!confirm(`确定要拒绝 IP: ${ip} 的激活申请吗？`)) return;

    const result = await apiRequest('rejectIP', { ip });
    if (result.success) {
        showMessage(`IP ${ip} 已拒绝`, 'success');
        loadPendingIPs();
    } else {
        showMessage(result.error || '操作失败', 'error');
    }
}

// 加载已通过 IP 列表
async function loadApprovedIPs() {
    const result = await apiRequest('listApprovedIPs', {});
    if (result.success) {
        displayApprovedIPs(result.data);
    } else {
        document.getElementById('approvedIPsContainer').innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-text">加载失败</div></div>';
    }
}

// 显示已通过 IP（移动端优化）
function displayApprovedIPs(list) {
    if (!list || list.length === 0) {
        document.getElementById('approvedIPsContainer').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">暂无已通过的 IP</div></div>';
        return;
    }

    let html = '';
    list.forEach(item => {
        // 兼容旧格式（字符串）和新格式（对象）
        const ip = typeof item === 'string' ? item : (item.ip || '');
        const machineId = typeof item === 'object' ? (item.machineId || '') : '';
        const approvedAt = typeof item === 'object' ? (item.approvedAt || '') : '';
        const lastSeen = typeof item === 'object' ? (item.lastSeen || '') : '';

        // 设备 ID 显示：如果有值则显示前8位
        const machineIdDisplay = machineId ? machineId.substring(0, 8) + '...' : '-';

        html += `
            <div class="list-item">
                <div class="list-item-header">
                    <div class="list-item-title">${ip}</div>
                    <span class="badge badge-success">已授权</span>
                </div>
                ${machineId ? `<div class="list-item-info">🖥️ 设备: <span title="${machineId}">${machineIdDisplay}</span></div>` : ''}
                ${approvedAt && approvedAt !== '-' ? `<div class="list-item-info">✅ 通过: ${approvedAt}</div>` : ''}
                ${lastSeen && lastSeen !== '-' ? `<div class="list-item-info">🕐 最近: ${lastSeen}</div>` : ''}
                <div class="list-item-actions">
                    <button class="btn-small btn-danger" onclick="removeApprovedIPAction('${ip}')">🗑️ 移除</button>
                </div>
            </div>
        `;
    });
    html += `<div class="hint" style="text-align: center; margin-top: 10px;">共 ${list.length} 个已授权 IP</div>`;
    document.getElementById('approvedIPsContainer').innerHTML = html;
}

// 移除已通过 IP
async function removeApprovedIPAction(ip) {
    if (!confirm(`确定要移除 IP: ${ip} 吗？\n\n移除后该 IP 将无法使用插件。`)) return;

    const result = await apiRequest('removeApprovedIP', { ip });
    if (result.success) {
        showMessage(`IP ${ip} 已移除`, 'success');
        loadApprovedIPs();
    } else {
        showMessage(result.error || '操作失败', 'error');
    }
}


// 加载被拒绝 IP 列表
async function loadRejectedIPs() {
    const result = await apiRequest('listRejectedIPs', {});
    if (result.success) {
        displayRejectedIPs(result.data);
    } else {
        document.getElementById('rejectedIPsContainer').innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-text">加载失败</div></div>';
    }
}

// 显示被拒绝 IP（移动端优化）
function displayRejectedIPs(list) {
    if (!list || list.length === 0) {
        document.getElementById('rejectedIPsContainer').innerHTML = '<div class="empty-state"><div class="empty-state-icon">✨</div><div class="empty-state-text">暂无被拒绝的 IP</div></div>';
        return;
    }

    let html = '';
    list.forEach(ip => {
        html += `
            <div class="list-item">
                <div class="list-item-header">
                    <div class="list-item-title">${ip}</div>
                    <span class="badge badge-danger">已拒绝</span>
                </div>
                <div class="list-item-actions">
                    <button class="btn-small btn-success" onclick="unrejectIPAction('${ip}')">🔄 恢复</button>
                </div>
            </div>
        `;
    });
    html += `<div class="hint" style="text-align: center; margin-top: 10px;">共 ${list.length} 个被拒绝 IP</div>`;
    document.getElementById('rejectedIPsContainer').innerHTML = html;
}

// 恢复被拒绝的 IP
async function unrejectIPAction(ip) {
    if (!confirm(`确定要恢复 IP: ${ip} 吗？\n\n恢复后该 IP 可以重新申请激活。`)) return;

    const result = await apiRequest('unrejectIP', { ip });
    if (result.success) {
        showMessage(`IP ${ip} 已恢复`, 'success');
        loadRejectedIPs();
    } else {
        showMessage(result.error || '操作失败', 'error');
    }
}

// 手动封禁 IP
async function manualBanIP() {
    const input = document.getElementById('banIPInput');
    const ip = input.value.trim();

    if (!ip) {
        showMessage('请输入要封禁的 IP 地址', 'error');
        return;
    }

    // 简单验证 IP 格式
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
        showMessage('请输入有效的 IP 地址格式（如 192.168.1.1）', 'error');
        return;
    }

    if (!confirm(`确定要封禁 IP: ${ip} 吗？\n\n封禁后该 IP 无法使用插件。`)) return;

    const result = await apiRequest('rejectIP', { ip });
    if (result.success) {
        showMessage(`IP ${ip} 已封禁`, 'success');
        input.value = ''; // 清空输入框
        loadRejectedIPs();
    } else {
        showMessage(result.error || '封禁失败', 'error');
    }
}

// ==================== IP 管理功能（移动端） ====================

// 缓存所有 IP 数据
let allIPsCache = [];

// 加载所有 IP
async function loadAllIPs() {
    document.getElementById('allIPsContainer').innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><div class="empty-state-text">正在加载...</div></div>';

    // 并行加载三个列表
    const [pendingResult, approvedResult, rejectedResult] = await Promise.all([
        apiRequest('listPendingIPs', {}),
        apiRequest('listApprovedIPs', {}),
        apiRequest('listRejectedIPs', {})
    ]);

    allIPsCache = [];

    // 处理待审核 IP
    if (pendingResult.success && pendingResult.data) {
        pendingResult.data.forEach(item => {
            allIPsCache.push({
                ip: item.ip,
                status: 'pending',
                statusText: '待审核',
                machineId: item.machineIdFull || '',
                createdAt: item.createdAt || '-',
                lastSeen: item.lastSeen || '-',
                taskCount: item.taskCount || 0,
                maxTasks: item.maxTasks || 10
            });
        });
    }

    // 处理已通过 IP
    if (approvedResult.success && approvedResult.data) {
        approvedResult.data.forEach(item => {
            const ip = typeof item === 'string' ? item : (item.ip || '');
            const machineId = typeof item === 'object' ? (item.machineId || '') : '';
            const approvedAt = typeof item === 'object' ? (item.approvedAt || '-') : '-';
            const lastSeen = typeof item === 'object' ? (item.lastSeen || '-') : '-';

            allIPsCache.push({
                ip: ip,
                status: 'approved',
                statusText: '已通过',
                machineId: machineId,
                createdAt: approvedAt,
                lastSeen: lastSeen,
                taskCount: '-',
                maxTasks: '-'
            });
        });
    }

    // 处理已拒绝 IP
    if (rejectedResult.success && rejectedResult.data) {
        rejectedResult.data.forEach(ip => {
            allIPsCache.push({
                ip: ip,
                status: 'rejected',
                statusText: '已拒绝',
                machineId: '-',
                createdAt: '-',
                lastSeen: '-',
                taskCount: '-',
                maxTasks: '-'
            });
        });
    }

    // 按激活时间排序（最新优先）
    allIPsCache.sort((a, b) => {
        // 处理 '-' 或空值
        if (a.createdAt === '-' || !a.createdAt) return 1;
        if (b.createdAt === '-' || !b.createdAt) return -1;
        // 尝试解析日期
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB - dateA; // 降序
    });

    displayIPStats();
    displayAllIPsList(allIPsCache);
}

// 显示 IP 统计
function displayIPStats() {
    const pending = allIPsCache.filter(i => i.status === 'pending').length;
    const approved = allIPsCache.filter(i => i.status === 'approved').length;
    const rejected = allIPsCache.filter(i => i.status === 'rejected').length;

    document.getElementById('ipStatsContainer').innerHTML = `
        <div class="stat-card">
            <div class="stat-label">待审核</div>
            <div class="stat-value" style="color: #ffc107;">${pending}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">已通过</div>
            <div class="stat-value" style="color: #28a745;">${approved}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">已拒绝</div>
            <div class="stat-value" style="color: #dc3545;">${rejected}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">总计</div>
            <div class="stat-value">${allIPsCache.length}</div>
        </div>
    `;
}

// 显示 IP 列表（移动端优化）
function displayAllIPsList(list) {
    if (!list || list.length === 0) {
        document.getElementById('allIPsContainer').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">暂无 IP 数据</div></div>';
        return;
    }

    let html = '';
    list.forEach(item => {
        const statusBadge = item.status === 'approved' ? 'badge-success' :
            item.status === 'pending' ? 'badge-warning' : 'badge-danger';
        const machineIdDisplay = item.machineId && item.machineId !== '-' ?
            item.machineId.substring(0, 8) + '...' : '-';

        let actions = '';
        if (item.status === 'pending') {
            actions = `
                <button class="btn-small btn-success" onclick="approveIPAction('${item.ip}')">✅ 通过</button>
                <button class="btn-small btn-danger" onclick="rejectIPAction('${item.ip}')">❌ 拒绝</button>
            `;
        } else if (item.status === 'approved') {
            actions = `<button class="btn-small btn-danger" onclick="removeApprovedIPAction('${item.ip}')">🗑️ 移除</button>`;
        } else if (item.status === 'rejected') {
            actions = `<button class="btn-small btn-success" onclick="unrejectIPAction('${item.ip}')">🔄 恢复</button>`;
        }

        html += `
            <div class="list-item">
                <div class="list-item-header">
                    <div class="list-item-title">${item.ip}</div>
                    <span class="badge ${statusBadge}">${item.statusText}</span>
                </div>
                <div class="list-item-info">🖥️ 设备: ${machineIdDisplay}</div>
                <div class="list-item-info">🕐 激活: ${item.createdAt}</div>
                ${item.taskCount !== '-' ? `<div class="list-item-info">📊 任务: ${item.taskCount} / ${item.maxTasks}</div>` : ''}
                <div class="list-item-actions">
                    ${actions}
                </div>
            </div>
        `;
    });

    html += `<div class="hint" style="text-align: center; margin-top: 10px;">共 ${list.length} 个 IP 地址</div>`;
    document.getElementById('allIPsContainer').innerHTML = html;
}

// 搜索 IP
function searchIPs() {
    const keyword = document.getElementById('ipSearchKeyword').value.trim().toLowerCase();

    if (!keyword) {
        displayAllIPsList(allIPsCache);
        return;
    }

    const filtered = allIPsCache.filter(item =>
        item.ip.toLowerCase().includes(keyword) ||
        (item.machineId && item.machineId.toLowerCase().includes(keyword))
    );

    displayAllIPsList(filtered);
}

// ==================== 设备总览功能（移动端） ====================

// 缓存所有设备数据
let allDevicesCache = [];

// 加载所有设备
async function loadAllDevices() {
    document.getElementById('allDevicesContainer').innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><div class="empty-state-text">正在加载...</div></div>';

    // 并行加载待审核和已通过列表来提取设备信息
    const [pendingResult, approvedResult, licensesResult] = await Promise.all([
        apiRequest('listPendingIPs', {}),
        apiRequest('listApprovedIPs', {}),
        apiRequest('list', { page: 1, pageSize: 100 })
    ]);

    const deviceMap = new Map();

    // 从待审核列表提取设备
    if (pendingResult.success && pendingResult.data) {
        pendingResult.data.forEach(item => {
            if (item.machineIdFull) {
                const existing = deviceMap.get(item.machineIdFull);
                if (!existing) {
                    deviceMap.set(item.machineIdFull, {
                        machineId: item.machineIdFull,
                        status: 'pending',
                        statusText: '待审核',
                        ips: [item.ip],
                        licenses: [],
                        firstSeen: item.createdAt || '-',
                        lastSeen: item.lastSeen || '-',
                        isBanned: false
                    });
                } else {
                    if (!existing.ips.includes(item.ip)) {
                        existing.ips.push(item.ip);
                    }
                }
            }
        });
    }

    // 从已通过列表提取设备
    if (approvedResult.success && approvedResult.data) {
        approvedResult.data.forEach(item => {
            if (typeof item === 'object' && item.machineId) {
                const existing = deviceMap.get(item.machineId);
                if (!existing) {
                    deviceMap.set(item.machineId, {
                        machineId: item.machineId,
                        status: 'approved',
                        statusText: '已授权',
                        ips: [item.ip],
                        licenses: [],
                        firstSeen: item.approvedAt || '-',
                        lastSeen: item.lastSeen || '-',
                        isBanned: false
                    });
                } else {
                    existing.status = 'approved';
                    existing.statusText = '已授权';
                    if (item.ip && !existing.ips.includes(item.ip)) {
                        existing.ips.push(item.ip);
                    }
                }
            }
        });
    }

    // 从密钥的设备列表中提取设备（只查前10个密钥，避免太慢）
    if (licensesResult.success && licensesResult.data && licensesResult.data.licenses) {
        const licensesToCheck = licensesResult.data.licenses.slice(0, 10);
        for (const lic of licensesToCheck) {
            const statusResult = await apiRequest('status', { license: lic.license });
            if (statusResult.success && statusResult.data && statusResult.data.devices) {
                statusResult.data.devices.forEach(device => {
                    const existing = deviceMap.get(device.machineId);
                    if (!existing) {
                        deviceMap.set(device.machineId, {
                            machineId: device.machineId,
                            status: device.isBanned ? 'banned' : 'active',
                            statusText: device.isBanned ? '已封禁' : '正常',
                            ips: device.lastIP ? [device.lastIP] : [],
                            licenses: [lic.license],
                            firstSeen: device.firstSeen || '-',
                            lastSeen: device.lastSeen || '-',
                            isBanned: device.isBanned || false
                        });
                    } else {
                        if (!existing.licenses.includes(lic.license)) {
                            existing.licenses.push(lic.license);
                        }
                        if (device.lastIP && !existing.ips.includes(device.lastIP)) {
                            existing.ips.push(device.lastIP);
                        }
                        if (device.isBanned) {
                            existing.status = 'banned';
                            existing.statusText = '已封禁';
                            existing.isBanned = true;
                        }
                    }
                });
            }
        }
    }

    allDevicesCache = Array.from(deviceMap.values());
    displayDeviceStats();
    displayAllDevicesList(allDevicesCache);
}

// 显示设备统计
function displayDeviceStats() {
    const active = allDevicesCache.filter(d => d.status === 'active' || d.status === 'approved').length;
    const pending = allDevicesCache.filter(d => d.status === 'pending').length;
    const banned = allDevicesCache.filter(d => d.status === 'banned').length;

    document.getElementById('deviceStatsContainer').innerHTML = `
        <div class="stat-card">
            <div class="stat-label">正常</div>
            <div class="stat-value" style="color: #28a745;">${active}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">待审核</div>
            <div class="stat-value" style="color: #ffc107;">${pending}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">已封禁</div>
            <div class="stat-value" style="color: #dc3545;">${banned}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">总计</div>
            <div class="stat-value">${allDevicesCache.length}</div>
        </div>
    `;
}

// 显示设备列表（移动端优化）
function displayAllDevicesList(list) {
    if (!list || list.length === 0) {
        document.getElementById('allDevicesContainer').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📱</div><div class="empty-state-text">暂无设备数据</div></div>';
        return;
    }

    let html = '';
    list.forEach(item => {
        const statusBadge = item.status === 'approved' || item.status === 'active' ? 'badge-success' :
            item.status === 'pending' ? 'badge-warning' : 'badge-danger';
        const machineIdDisplay = item.machineId.substring(0, 12) + '...';
        const ipsDisplay = item.ips.length > 0 ? item.ips[0] + (item.ips.length > 1 ? ` (+${item.ips.length - 1})` : '') : '-';
        const licensesDisplay = item.licenses.length > 0 ? item.licenses[0].substring(0, 12) + '...' : '-';

        let actions = '';
        if (item.licenses.length > 0) {
            if (item.isBanned) {
                actions = `<button class="btn-small btn-success" onclick="unbanDeviceGlobal('${item.licenses[0]}', '${item.machineId}')">🔓 解封</button>`;
            } else {
                actions = `<button class="btn-small btn-danger" onclick="banDeviceGlobal('${item.licenses[0]}', '${item.machineId}')">🔒 封禁</button>`;
            }
        }

        html += `
            <div class="list-item">
                <div class="list-item-header">
                    <div class="list-item-title">${machineIdDisplay}</div>
                    <span class="badge ${statusBadge}">${item.statusText}</span>
                </div>
                <div class="list-item-info">🌐 IP: ${ipsDisplay}</div>
                <div class="list-item-info">🔑 密钥: ${licensesDisplay}</div>
                <div class="list-item-info">🕐 首次: ${item.firstSeen}</div>
                <div class="list-item-info">🕐 最近: ${item.lastSeen}</div>
                ${actions ? `<div class="list-item-actions">${actions}</div>` : ''}
            </div>
        `;
    });

    html += `<div class="hint" style="text-align: center; margin-top: 10px;">共 ${list.length} 个设备</div>`;
    document.getElementById('allDevicesContainer').innerHTML = html;
}

// 搜索设备
function searchDevicesGlobal() {
    const keyword = document.getElementById('deviceSearchKeyword').value.trim().toLowerCase();

    if (!keyword) {
        displayAllDevicesList(allDevicesCache);
        return;
    }

    const filtered = allDevicesCache.filter(item =>
        item.machineId.toLowerCase().includes(keyword) ||
        item.ips.some(ip => ip.toLowerCase().includes(keyword)) ||
        item.licenses.some(lic => lic.toLowerCase().includes(keyword))
    );

    displayAllDevicesList(filtered);
}

// 全局封禁设备
async function banDeviceGlobal(license, machineId) {
    if (!confirm(`确定要封禁设备 ${machineId.substring(0, 12)}... 吗？`)) return;
    const result = await apiRequest('banDevice', { license, machineId });
    if (result.success) {
        showMessage('设备已封禁', 'success');
        loadAllDevices();
    } else {
        showMessage(result.error || '封禁失败', 'error');
    }
}

// 全局解封设备
async function unbanDeviceGlobal(license, machineId) {
    if (!confirm(`确定要解封设备 ${machineId.substring(0, 12)}... 吗？`)) return;
    const result = await apiRequest('unbanDevice', { license, machineId });
    if (result.success) {
        showMessage('设备已解封', 'success');
        loadAllDevices();
    } else {
        showMessage(result.error || '解封失败', 'error');
    }
}

