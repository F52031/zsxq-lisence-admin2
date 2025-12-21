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
    const validTabs = ['dashboard', 'licenses', 'review'];
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
    const validTabs = ['dashboard', 'licenses', 'review'];
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
