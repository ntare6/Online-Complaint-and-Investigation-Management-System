const API_BASE_URL = 'http://localhost:5079/api'; 
let currentAdminCaseId = null; // Stores the UUID of the case being inspected by the Officer

// --- Local User Session ---
function getCurrentUser() {
    const session = localStorage.getItem('civicUser');
    if (!session) return null;
    try { return JSON.parse(session); } catch { return null; }
}

function getCurrentUserId() {
    const user = getCurrentUser();
    if (user?.id) return user.id;
    return '00000000-0000-0000-0000-000000000000'; 
}

function logoutUser() {
    localStorage.removeItem('civicUser');
    window.location.href = 'index.html';
}

function applyRoleNavigation() {
    const user = getCurrentUser();
    const role = user?.role || '';
    const roleItems = document.querySelectorAll('[data-role-visible]');
    roleItems.forEach(item => {
        const allowedRoles = (item.getAttribute('data-role-visible') || '')
            .split(',')
            .map(r => r.trim())
            .filter(Boolean);
        if (allowedRoles.length && !allowedRoles.includes(role)) {
            item.classList.add('role-hidden');
        } else {
            item.classList.remove('role-hidden');
        }
    });
}

function enforceRoleAccess() {
    const user = getCurrentUser();
    const path = window.location.pathname.split('/').pop() || 'index.html';
    
    // Pages that require specific roles
    const roleRequirements = {
        'dashboard.html': ['Citizen', 'Client'],
        'admin.html': ['Officer'],
        'superadmin.html': ['Admin']
    };

    const allowedRoles = roleRequirements[path];
    if (allowedRoles && !user) {
        window.location.href = 'index.html';
        return;
    }

    if (user && allowedRoles && !allowedRoles.includes(user.role)) {
        if (user.role === 'Admin') window.location.href = 'superadmin.html';
        else if (user.role === 'Officer') window.location.href = 'admin.html';
        else window.location.href = 'dashboard.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    enforceRoleAccess();
    applyRoleNavigation();
    loadNotifications();

    const user = getCurrentUser();
    const roleLabel = document.getElementById('userRoleLabel');
    if (roleLabel && user?.role) roleLabel.textContent = `Role: ${user.role}`;

    const categoryDropdown = document.getElementById('categoryDropdown');
    if (categoryDropdown) {
        loadCategories();
    }

    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitComplaint);
    }

    const adminTableBody = document.getElementById('complaintsTableBody');
    if (adminTableBody) {
        loadAdminComplaints();
    }

    const superAdminTableBody = document.getElementById('usersTableBody');
    if (superAdminTableBody) {
        loadUsers();
        loadAdminDashboardStats();
        loadReportCategories();
        refreshReportingModule();
    }
});

// ==========================================
// 1. Core Data Loading (Shared)
// ==========================================
async function loadCategories() {
    const dropdown = document.getElementById('categoryDropdown');
    try {
        const response = await fetch(`${API_BASE_URL}/Category`);
        if (!response.ok) throw new Error('Failed to fetch categories');
        const categories = await response.json();
        dropdown.innerHTML = '<option value="">-- Select a Category --</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;        
            option.textContent = category.name;
            dropdown.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading categories:", error);
    }
}

async function loadNotifications() {
    const userId = getCurrentUserId();
    const citizenBadge = document.getElementById('citizenNotifBadge');
    const officerBadge = document.getElementById('officerNotifBadge');
    if (!citizenBadge && !officerBadge) return;

    try {
        const response = await fetch(`${API_BASE_URL}/Notifications/user/${userId}/unread`);
        if (!response.ok) return;
        const unread = await response.json();
        const count = unread.length;
        if (count > 0) {
            if (citizenBadge) { citizenBadge.innerText = count; citizenBadge.style.display = 'inline-block'; }
            if (officerBadge) { officerBadge.innerText = count; officerBadge.style.display = 'inline-block'; }
        }
    } catch (e) { console.error(e); }
}

// ==========================================
// 2. Citizen - Complaint Submission
// ==========================================
async function submitComplaint() {
    const title = document.getElementById('complaintTitle')?.value;
    const categoryId = document.getElementById('categoryDropdown')?.value;
    const location = document.getElementById('incidentLocation')?.value;
    const description = document.getElementById('complaintDescription')?.value;

    if (!title || !categoryId) { alert("Title and category are required."); return; }

    const payload = {
        title: title,
        description: description,
        location: location,
        categoryId: categoryId,
        priority: "Medium",
        isAnonymous: false,
        citizenId: getCurrentUserId() 
    };

    try {
        const response = await fetch(`${API_BASE_URL}/Complaints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            const fileInput = document.getElementById('evidenceFile');
            if (fileInput && fileInput.files.length > 0) { await uploadEvidence(result.id, fileInput.files[0]); }
            alert(`Complaint submitted. Tracking code: ${result.trackingCode}`);
            document.getElementById('complaintForm').reset();
            switchCitizenTab('track');
            document.getElementById('trackInput').value = result.trackingCode;
            trackCase();
        } else {
            alert("Unable to submit complaint.");
        }
    } catch (error) { alert("Unable to connect to server."); }
}

// ==========================================
// 3. Citizen - Tracking & Navigation
// ==========================================
function switchCitizenTab(tab) {
    document.querySelectorAll('.citizen-view').forEach(view => { view.style.display = 'none'; });
    const tabs = {
        overview: document.getElementById('tabOverview'),
        lodge: document.getElementById('tabLodge'),
        track: document.getElementById('tabTrack'),
        notifications: document.getElementById('tabNotifications')
    };
    Object.keys(tabs).forEach(key => { if (tabs[key]) tabs[key].classList.remove('active-tab'); });
    const targetView = document.getElementById(`${tab}View`);
    if (targetView) targetView.style.display = 'block';
    if (tabs[tab]) tabs[tab].classList.add('active-tab');

    if (tab === 'track') loadUserComplaints();
    if (tab === 'notifications') renderNotificationsList();
}

async function loadUserComplaints() {
    const userId = getCurrentUserId();
    const tbody = document.getElementById('userCasesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Retrieving records...</td></tr>';
    try {
        const response = await fetch(`${API_BASE_URL}/Complaints/citizen/${userId}`);
        const complaints = await response.json();
        tbody.innerHTML = '';
        if (complaints.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:3rem; color:var(--text-muted);">No reports found.</td></tr>';
            return;
        }
        complaints.forEach(c => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.innerHTML = `
                <td style="font-family: monospace; font-weight: bold;">${c.trackingCode}</td>
                <td>${c.title}</td>
                <td><span class="badge ${c.status === 'Resolved' ? 'badge-resolved' : c.status === 'Investigating' ? 'badge-investigating' : 'badge-pending'}">${c.status}</span></td>
                <td>${new Date(c.submittedAt).toLocaleDateString()}</td>
            `;
            row.onclick = () => { document.getElementById('trackInput').value = c.trackingCode; trackCase(); };
            tbody.appendChild(row);
        });
    } catch (e) { tbody.innerHTML = '<tr><td colspan="4">Error loading history.</td></tr>'; }
}

async function trackCase() {
    const code = document.getElementById('trackInput').value.trim();
    if (!code) return;
    try {
        const response = await fetch(`${API_BASE_URL}/Complaints/track/${code}`);
        const resultBox = document.getElementById('trackResult');
        if (!response.ok) { alert("Case not found."); resultBox.style.display = 'none'; return; }
        const data = await response.json();
        resultBox.style.display = 'block';
        document.getElementById('trackTitle').innerText = data.title;
        document.getElementById('trackCategory').innerText = data.categoryName ?? 'Other';
        document.getElementById('trackDate').innerText = new Date(data.submittedAt).toLocaleDateString();
        const badge = document.getElementById('trackBadge');
        badge.innerText = data.status;
        badge.className = 'badge';
        if (data.status === 'Investigating') badge.classList.add('badge-investigating');
        else if (data.status === 'Resolved') badge.classList.add('badge-resolved');
        else badge.classList.add('badge-pending');
        resultBox.scrollIntoView({ behavior: 'smooth' });
    } catch (e) { alert("Server error."); }
}

async function renderNotificationsList() {
    const userId = getCurrentUserId();
    const list = document.getElementById('notificationsList');
    if (!list) return;
    try {
        const response = await fetch(`${API_BASE_URL}/Notifications/user/${userId}`);
        const notifications = await response.json();
        if (notifications.length === 0) {
            list.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--text-muted);">No official notifications.</div>';
            return;
        }
        list.innerHTML = notifications.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(n => {
            const trackingCode = n.complaint?.trackingCode || '';
            return `
            <div style="padding: 1.25rem; border: 1px solid var(--border-color); border-radius: 4px; border-left: 4px solid var(--primary-blue); background-color: ${n.isRead ? 'white' : '#f0f9ff'}; cursor: pointer;" onclick="handleNotificationClick('${n.id}', '${trackingCode}')">
                <div style="display:flex; justify-content:space-between;">
                    <strong>CivicTrack Alert</strong>
                    <span style="font-size: 0.75rem;">${new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <div>${n.message}</div>
                ${trackingCode ? `<div style="margin-top:0.5rem; color:var(--primary-blue); font-weight:600;">View Case ${trackingCode} →</div>` : ''}
            </div>`;
        }).join('');
    } catch (e) { list.innerHTML = 'Error loading alerts.'; }
}

async function handleNotificationClick(notifId, trackingCode) {
    fetch(`${API_BASE_URL}/Notifications/mark-as-read/${notifId}`, { method: 'PUT' });
    if (trackingCode) {
        switchCitizenTab('track');
        document.getElementById('trackInput').value = trackingCode;
        trackCase();
    }
}

// ==========================================
// 4. Officer - Management
// ==========================================
async function loadAdminComplaints() {
    const tableBody = document.getElementById('complaintsTableBody');
    if (!tableBody) return;
    try {
        const response = await fetch(`${API_BASE_URL}/Complaints`);
        const complaints = await response.json();
        calculateAndRenderStats();
        tableBody.innerHTML = '';
        complaints.forEach(c => {
            const row = document.createElement('tr');
            row.className = 'clickable-row';
            row.innerHTML = `
                <td>${c.trackingCode}</td>
                <td>${c.title}</td>
                <td>${c.categoryName ?? 'Other'}</td>
                <td>${c.priority}</td>
                <td><span class="badge">${c.status}</span></td>
                <td>${new Date(c.submittedAt).toLocaleDateString()}</td>
            `;
            row.onclick = () => openAdvancedPanel(c);
            tableBody.appendChild(row);
        });
    } catch (e) { console.error(e); }
}

async function calculateAndRenderStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/Analytics/dashboard-summary`);
        const stats = await response.json();
        document.getElementById('statTotal').innerText = stats.totalComplaints;
        document.getElementById('statPending').innerText = stats.pending;
        document.getElementById('statInvestigating').innerText = stats.inProgress;
        document.getElementById('statResolved').innerText = stats.resolved;
        document.getElementById('statResolutionRate').innerText = `${stats.resolutionRate}%`;
    } catch (e) { }
}

function openAdvancedPanel(caseData) {
    currentAdminCaseId = caseData.id;
    document.getElementById('panelTrackingCode').innerText = caseData.trackingCode;
    document.getElementById('panelTitle').innerText = caseData.title;
    document.getElementById('panelDescription').innerText = caseData.description;
    document.getElementById('panelStatusBadge').innerText = caseData.status;
    document.getElementById('updateStatusSelect').value = caseData.status;
    document.getElementById('slideOverOverlay').classList.add('active');
    document.getElementById('caseDetailPanel').classList.add('open');
    loadComments(caseData.id);
}

function closeAdvancedPanel() {
    document.getElementById('slideOverOverlay').classList.remove('active');
    document.getElementById('caseDetailPanel').classList.remove('open');
}

async function updateCaseStatus() {
    const newStatus = document.getElementById('updateStatusSelect').value;
    await fetch(`${API_BASE_URL}/Complaints/${currentAdminCaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
    });
    closeAdvancedPanel();
    loadAdminComplaints();
}

// ==========================================
// 5. Evidence & Comments
// ==========================================
async function uploadEvidence(complaintId, file) {
    const formData = new FormData();
    formData.append("ComplaintId", complaintId);
    formData.append("UploadedByUserId", getCurrentUserId());
    formData.append("File", file);
    await fetch(`${API_BASE_URL}/Evidence/upload`, { method: 'POST', body: formData });
}

async function loadCaseEvidence() {
    const response = await fetch(`${API_BASE_URL}/Evidence/complaint/${currentAdminCaseId}`);
    const files = await response.json();
    alert("Files: " + files.map(f => f.fileName).join(", "));
}

async function loadComments(complaintId) {
    const box = document.getElementById('panelComments');
    const response = await fetch(`${API_BASE_URL}/Comments/complaint/${complaintId}`);
    const comments = await response.json();
    box.innerHTML = comments.map(c => `<div><strong>${c.authorName}:</strong> ${c.content}</div>`).join('');
}

async function postComment() {
    const text = document.getElementById('newCommentInput').value;
    await fetch(`${API_BASE_URL}/Comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaintId: currentAdminCaseId, authorId: getCurrentUserId(), content: text })
    });
    document.getElementById('newCommentInput').value = '';
    loadComments(currentAdminCaseId);
}

// ==========================================
// 8. Superadmin - User Registry & Reporting
// ==========================================
async function loadUsers() {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;
    const search = document.getElementById('userSearchInput')?.value.toLowerCase() || '';
    const response = await fetch(`${API_BASE_URL}/Users`);
    const allUsers = await response.json();

    if (document.getElementById('userCountValue')) {
        document.getElementById('userCountValue').textContent = allUsers.length;
        document.getElementById('activeCountValue').textContent = allUsers.filter(u => u.isActive).length;
        document.getElementById('inactiveCountValue').textContent = allUsers.filter(u => !u.isActive).length;
        document.getElementById('adminCountValue').textContent = allUsers.filter(u => u.role === 'Admin').length;
    }

    tableBody.innerHTML = allUsers.filter(u => u.fullName.toLowerCase().includes(search)).map(u => `
        <tr>
            <td>${u.id.substring(0,8)}</td>
            <td>${u.fullName}</td>
            <td>${u.email}</td>
            <td>${u.phone}</td>
            <td>${u.role}</td>
            <td>${u.isActive ? 'Active' : 'Suspended'}</td>
            <td><button onclick="toggleAccess('${u.id}')">${u.isActive ? 'Suspend' : 'Restore'}</button></td>
        </tr>
    `).join('');
}

async function toggleAccess(userId) {
    await fetch(`${API_BASE_URL}/Users/${userId}/deactivate`, { method: 'PUT' });
    loadUsers();
}

function switchAdminView(view) {
    // 1. Hide all views
    document.querySelectorAll('.admin-view').forEach(v => v.style.display = 'none');
    
    // 2. Reset sidebar tabs
    const tabs = {
        overview: document.getElementById('admTabOverview'),
        users: document.getElementById('admTabUsers'),
        reports: document.getElementById('admTabReports'),
        logs: document.getElementById('admTabLogs')
    };
    Object.values(tabs).forEach(t => t?.classList.remove('active-tab'));

    // 3. Show target view & tab
    const views = {
        overview: document.getElementById('adminOverviewView'),
        users: document.getElementById('adminUsersView'),
        reports: document.getElementById('adminReportsView'),
        logs: document.getElementById('adminLogsView')
    };
    
    if (views[view]) views[view].style.display = 'block';
    if (tabs[view]) tabs[view].classList.add('active-tab');

    // 4. Trigger data refresh if needed
    if (view === 'reports') refreshReportingModule();
    if (view === 'users') loadUsers();
}

async function loadAdminDashboardStats() {
    const response = await fetch(`${API_BASE_URL}/Analytics/dashboard-summary`);
    const stats = await response.json();
    if (document.getElementById('statTotal')) document.getElementById('statTotal').textContent = stats.totalComplaints;
}

async function loadReportCategories() {
    const dropdown = document.getElementById('reportCategoryFilter');
    if (!dropdown) return;
    const response = await fetch(`${API_BASE_URL}/Category`);
    const cats = await response.json();
    cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id; opt.textContent = c.name;
        dropdown.appendChild(opt);
    });
}

async function refreshReportingModule() {
    const start = document.getElementById('reportStartDate')?.value;
    const end = document.getElementById('reportEndDate')?.value;
    const cat = document.getElementById('reportCategoryFilter')?.value;
    let url = `${API_BASE_URL}/Analytics/report-detailed?`;
    if (start) url += `startDate=${start}&`;
    if (end) url += `endDate=${end}&`;
    if (cat) url += `categoryId=${cat}&`;
    const response = await fetch(url);
    const data = await response.json();
    document.getElementById('repTotal').textContent = data.total;
    document.getElementById('repPending').textContent = data.pending;
    document.getElementById('repResolved').textContent = data.resolved;
    const max = data.total || 1;
    document.getElementById('barPending').style.width = ((data.pending/max)*100)+'%';
    document.getElementById('barInProgress').style.width = ((data.inProgress/max)*100)+'%';
    document.getElementById('barResolved').style.width = ((data.resolved/max)*100)+'%';
}

async function exportDataToCSV() {
    const response = await fetch(`${API_BASE_URL}/Complaints`);
    const complaints = await response.json();
    const headers = ["TrackingCode", "Title", "Category", "Status"];
    const rows = complaints.map(c => [c.trackingCode, c.title, c.categoryName, c.status]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "CivicTrack_Report.csv";
    link.click();
}
