const API_BASE_URL = 'http://localhost:5079/api'; 
let currentAdminCaseId = null; 

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
    updateServerTime();

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

    if (document.getElementById('complaintsTableBody')) {
        loadAdminComplaints();
    }

    if (document.getElementById('usersTableBody')) {
        loadUsers();
        loadAdminDashboardStats();
        loadReportCategories();
        refreshReportingModule();
        loadOfficerOptions();
    }

    if (document.getElementById('recentComplaintsTableBody')) {
        loadRecentComplaints();
        loadCitizenDashboardStats();
    }

    setupFeedbackRating();
    setupLocationHierarchy();
});

function setupLocationHierarchy() {
    const districtSel = document.getElementById('incidentDistrict');
    const sectorSel   = document.getElementById('incidentSector');
    const cellSel     = document.getElementById('incidentCell');

    if (!districtSel) return;

    // Full Rwanda geographical data
    const rwandaData = {
        'Gasabo': {
            'Bumbogo':   ['Bibare', 'Gasagara', 'Kabukuba', 'Nyamugari', 'Rugarama'],
            'Gisozi':    ['Cyimo', 'Gisozi', 'Kabeza', 'Karuruma', 'Ndera'],
            'Jabana':    ['Bwiza', 'Jabana', 'Kagugu', 'Kibenga', 'Muyange'],
            'Jali':      ['Batsinda', 'Gasabo', 'Jali', 'Karuruma', 'Nyundo'],
            'Kacyiru':   ['Kamatamu', 'Kacyiru', 'Kibaza', 'Kabutare', 'Rurembwe'],
            'Kimironko': ['Bibare', 'Kamukina', 'Kimironko', 'Kibagabaga', 'Nyabisindu'],
            'Kinyinya':  ['Gasanze', 'Kabuga', 'Kinyinya', 'Ruramba', 'Ryanyuma'],
            'Ndera':     ['Kagugu', 'Masoro', 'Ndera', 'Nyagahinga', 'Shyorongi'],
            'Nduba':     ['Bwiza', 'Gashaari', 'Nduba', 'Rugarama', 'Rusororo'],
            'Remera':    ['Gaculiro', 'Gahanga', 'Kibaza', 'Nyabisindu', 'Remera'],
            'Rusororo':  ['Gahondo', 'Karugaju', 'Munanira', 'Rusororo', 'Ryanyuma'],
            'Rutunga':   ['Gakoroba', 'Gishyeshye', 'Kibumba', 'Rutunga', 'Shyorongi']
        },
        'Kicukiro': {
            'Gahanga':   ['Akabuga', 'Gahanga', 'Karukanka', 'Kigarama', 'Murambi'],
            'Gatenga':   ['Gatenga', 'Kagarama', 'Kagera', 'Kibaya', 'Rusave'],
            'Gikondo':   ['Agakiriro', 'Gikondo', 'Kabuye', 'Nyabarongo', 'Rugunga'],
            'Kagarama':  ['Bibare', 'Gako', 'Kagarama', 'Kimisagara', 'Kinyinya'],
            'Kanombe':   ['Gahanga', 'Kabuga', 'Kanombe', 'Kibaya', 'Nyarugunga'],
            'Kicukiro':  ['Gatare', 'Kicukiro', 'Masaka', 'Nyanza', 'Rugunga'],
            'Masaka':    ['Gasanze', 'Kanombe', 'Karama', 'Masaka', 'Nyarugunga'],
            'Niboye':    ['Gikumba', 'Kabeza', 'Kanombe', 'Kibare', 'Niboye'],
            'Nyarugunga':['Gahanga', 'Kanombe', 'Kigarama', 'Nyarugunga', 'Rebero']
        },
        'Nyarugenge': {
            'Gitega':    ['Agatare', 'Biryogo', 'Gatare', 'Gitega', 'Kigarama'],
            'Kanyinya':  ['Akabahizi', 'Gaculiro', 'Kanyinya', 'Mabuye', 'Rwezamenyo'],
            'Kimisagara':['Akabahizi', 'Kimisagara', 'Nyarugenge', 'Rugunga', 'Rwezamenyo'],
            'Mageragere':['Bweramana', 'Kabuye', 'Mageragere', 'Rubirizi', 'Rubungo'],
            'Muhima':    ['Kimisagara', 'Muhima', 'Nyarugenge', 'Rugando', 'Rwezamenyo'],
            'Nyamirambo':['Biryogo', 'Gitega', 'Kiyovu', 'Nyamirambo', 'Rugarama'],
            'Nyarugenge':['Biryogo', 'Kimicanga', 'Nyarugenge', 'Rwezamenyo', 'Umujyi'],
            'Rwezamenyo':['Gihanga', 'Kiyovu', 'Nyarugenge', 'Rugando', 'Rwezamenyo']
        },
        'Bugesera': {
            'Gashora':   ['Gashora', 'Kabeza', 'Kagina', 'Karenge', 'Nyamata'],
            'Juru':      ['Gihanga', 'Juru', 'Kabuga', 'Kayenzi', 'Kirehe'],
            'Kamabuye':  ['Cyasemakamba', 'Gashora', 'Kamabuye', 'Nyamata', 'Rusagara'],
            'Mareba':    ['Bugesera', 'Gashora', 'Karambi', 'Mareba', 'Nyamata'],
            'Mayange':   ['Bugesera', 'Kagina', 'Karambi', 'Mayange', 'Nyamata'],
            'Musenyi':   ['Cyasemakamba', 'Gahinga', 'Kabyaza', 'Musenyi', 'Nyagasambu'],
            'Mwogo':     ['Gasambya', 'Kagina', 'Kamabuye', 'Mwogo', 'Nyagasambu'],
            'Ngeruka':   ['Gahinga', 'Kagina', 'Ngeruka', 'Nyamata', 'Rweru'],
            'Ntarama':   ['Bugesera', 'Kabeza', 'Ntarama', 'Nyamata', 'Rubona'],
            'Nyamata':   ['Bugesera', 'Gashora', 'Kayumbu', 'Nyamata', 'Rubona'],
            'Rilima':    ['Bugesera', 'Gashora', 'Karama', 'Karambi', 'Rilima'],
            'Ruhuha':    ['Gashora', 'Kabeza', 'Kayumbu', 'Ruhuha', 'Rweru'],
            'Rweru':     ['Gashora', 'Karambi', 'Karama', 'Rweru', 'Rubona'],
            'Shyara':    ['Bugesera', 'Gashora', 'Karambi', 'Nyamata', 'Shyara']
        },
        'Musanze': {
            'Cyuve':     ['Bikumba', 'Cyuve', 'Kabingo', 'Kagano', 'Nyange'],
            'Gacaca':    ['Biruyi', 'Gacaca', 'Kidomo', 'Rugarama', 'Rwerere'],
            'Gashaki':   ['Biruyi', 'Gashaki', 'Karwaza', 'Munanira', 'Nyakarenzo'],
            'Gataraga':  ['Bwiza', 'Gataraga', 'Kagitega', 'Kiraro', 'Rugaragara'],
            'Kimonyi':   ['Birambo', 'Kimonyi', 'Kagano', 'Nyange', 'Rugarama'],
            'Kinigi':    ['Bisoke', 'Karisimbi', 'Kinigi', 'Rugarama', 'Shingiro'],
            'Muhoza':    ['Kabingo', 'Kagano', 'Muhoza', 'Musanze', 'Nyange'],
            'Muko':      ['Binyamini', 'Kabingo', 'Muko', 'Rugaragara', 'Ryamateke'],
            'Nkotsi':    ['Cyinzuzi', 'Kagano', 'Nkotsi', 'Nyakabungo', 'Rugarama'],
            'Nyange':    ['Biruyi', 'Kidomo', 'Muhoza', 'Nyange', 'Rugarama'],
            'Remera':    ['Biruyi', 'Birambo', 'Kabingo', 'Remera', 'Rugarama'],
            'Rwaza':     ['Biruyi', 'Kagano', 'Kidomo', 'Rwaza', 'Shingiro'],
            'Shingiro':  ['Bisoke', 'Kagano', 'Rugarama', 'Shingiro', 'Virunga']
        },
        'Huye': {
            'Gishamvu':  ['Gishamvu', 'Karambi', 'Kayenzi', 'Mukangara', 'Nyanza'],
            'Karama':    ['Gaseke', 'Karama', 'Maraba', 'Nyakibanda', 'Ruhashya'],
            'Kigoma':    ['Cyarwa', 'Kigoma', 'Murama', 'Nyamiyaga', 'Sovu'],
            'Kinazi':    ['Butare', 'Kinazi', 'Maraba', 'Mukangara', 'Nyanza'],
            'Mbazi':     ['Cyarwa', 'Mbazi', 'Mugombwa', 'Rusatira', 'Sovu'],
            'Mukura':    ['Butare', 'Gaseke', 'Mukura', 'Rusatira', 'Simbi'],
            'Ngoma':     ['Butare', 'Maraba', 'Ngoma', 'Nyakibanda', 'Tumba'],
            'Ruhashya':  ['Butare', 'Cyarwa', 'Maraba', 'Ruhashya', 'Simbi'],
            'Rusatira':  ['Butare', 'Gaseke', 'Maraba', 'Rusatira', 'Sovu'],
            'Rwaniro':   ['Butare', 'Gaseke', 'Maraba', 'Rwaniro', 'Simbi'],
            'Simbi':     ['Butare', 'Cyarwa', 'Maraba', 'Simbi', 'Sovu'],
            'Tumba':     ['Cyarwa', 'Maraba', 'Nyakibanda', 'Tumba', 'Sovu']
        },
        'Rubavu': {
            'Bugeshi':   ['Bugeshi', 'Kamegeri', 'Kayenzi', 'Kidomo', 'Rugerero'],
            'Busasamana':['Busasamana', 'Gisenyi', 'Kamegeri', 'Kanama', 'Rugaragara'],
            'Cyanzarwe': ['Cyanzarwe', 'Gisenyi', 'Kanama', 'Kayenzi', 'Rugerero'],
            'Gisenyi':   ['Bugoyi', 'Gisenyi', 'Kamegeri', 'Lac Kivu', 'Rubavu'],
            'Kanama':    ['Bugeshi', 'Gisenyi', 'Kanama', 'Kayenzi', 'Rubavu'],
            'Kanzenze':  ['Bugeshi', 'Kanzenze', 'Kayenzi', 'Rubavu', 'Rugerero'],
            'Mudende':   ['Bugeshi', 'Kamegeri', 'Kayenzi', 'Mudende', 'Rugaragara'],
            'Nyakiliba':  ['Bugeshi', 'Kamegeri', 'Nyakiliba', 'Rugerero', 'Rubavu'],
            'Nyamyumba': ['Bugeshi', 'Gisenyi', 'Nyamyumba', 'Rubavu', 'Rugerero'],
            'Nyundo':    ['Bugeshi', 'Gisenyi', 'Kayenzi', 'Nyundo', 'Rubavu'],
            'Rubavu':    ['Bugeshi', 'Gisenyi', 'Rubavu', 'Rugerero', 'Urugwiro'],
            'Rugerero':  ['Bugeshi', 'Gisenyi', 'Kamegeri', 'Rugerero', 'Urugwiro']
        }
    };

    districtSel.onchange = () => {
        const district = districtSel.value;
        sectorSel.innerHTML = '<option value="">-- Select Sector --</option>';
        cellSel.innerHTML   = '<option value="">-- Select Cell --</option>';
        if (!district || !rwandaData[district]) return;
        Object.keys(rwandaData[district]).forEach(sector => {
            const opt = document.createElement('option');
            opt.value = sector; opt.textContent = sector;
            sectorSel.appendChild(opt);
        });
    };

    sectorSel.onchange = () => {
        const district = districtSel.value;
        const sector   = sectorSel.value;
        cellSel.innerHTML = '<option value="">-- Select Cell --</option>';
        if (!district || !sector || !rwandaData[district]?.[sector]) return;
        rwandaData[district][sector].forEach(cell => {
            const opt = document.createElement('option');
            opt.value = cell; opt.textContent = cell;
            cellSel.appendChild(opt);
        });
    };
}

function updateServerTime() {
    const el = document.getElementById('serverTimeDisplay');
    if (el) el.textContent = new Date().toISOString().split('T')[0];
}

function setupFeedbackRating() {
    const stars = document.querySelectorAll('.star-btn');
    stars.forEach(star => {
        star.onclick = () => {
            const val = star.getAttribute('data-value');
            document.querySelectorAll('.star-btn').forEach(s => {
                s.classList.toggle('active', s.getAttribute('data-value') <= val);
            });
            window.selectedRating = val;
        };
    });
}

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

    if (citizenBadge && !officerBadge) {
        loadCitizenDashboardStats();
    }
}

async function loadCitizenDashboardStats() {
    const userId = getCurrentUserId();
    try {
        const response = await fetch(`${API_BASE_URL}/Analytics/dashboard-summary?citizenId=${userId}`);
        const stats = await response.json();
        
        if (document.getElementById('statPending')) document.getElementById('statPending').innerText = stats.pending;
        if (document.getElementById('statInProgress')) document.getElementById('statInProgress').innerText = stats.inProgress;
        if (document.getElementById('statResolved')) document.getElementById('statResolved').innerText = stats.resolved;
        if (document.getElementById('statResolutionRate')) document.getElementById('statResolutionRate').innerText = (stats.resolutionRate || 0) + '%';
    } catch (e) { console.error("Error loading citizen stats:", e); }
}


// ==========================================
// 2. Citizen - Complaint Submission
// ==========================================
async function submitComplaint() {
    const title = document.getElementById('complaintTitle')?.value;
    const categoryId = document.getElementById('categoryDropdown')?.value;
    const district = document.getElementById('incidentDistrict')?.value;
    const sector = document.getElementById('incidentSector')?.value;
    const cell = document.getElementById('incidentCell')?.value;
    const village = document.getElementById('incidentVillage')?.value;
    const location = document.getElementById('incidentLocation')?.value;
    const description = document.getElementById('complaintDescription')?.value;

    if (!title || !categoryId || !district) { alert("Title, Category, and District are required."); return; }

    const payload = {
        title: title,
        description: description,
        location: location,
        district: district,
        sector: sector,
        cell: cell,
        village: village,
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
    if (targetView) {
        targetView.style.display = 'block';
        // SCROLL TO TOP OF CONTENT AREA
        const contentArea = document.querySelector('.content-area');
        if (contentArea) {
            contentArea.scrollTo({ top: 0, behavior: 'smooth' });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (tabs[tab]) tabs[tab].classList.add('active-tab');

    if (tab === 'track') loadUserComplaints();
    if (tab === 'notifications') renderNotificationsList();
    if (tab === 'overview') {
        loadRecentComplaints();
        loadCitizenDashboardStats();
    }
}

async function loadRecentComplaints() {
    const userId = getCurrentUserId();
    const tbody = document.getElementById('recentComplaintsTableBody');
    if (!tbody) return;
    try {
        const response = await fetch(`${API_BASE_URL}/Complaints/citizen/${userId}`);
        const complaints = await response.json();
        
        if (!complaints || complaints.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-muted); background:#fcfcfc;">No complaints submitted yet.</td></tr>';
        } else {
            tbody.innerHTML = '';
            const lang = localStorage.getItem('civicLang') || 'en';
            const viewDetailsLabel = (translations && translations[lang] && translations[lang]['view_details']) || 'View Details';
            complaints.slice(0, 5).forEach(c => {
                const row = document.createElement('tr');
                row.style.cursor = 'pointer';
                row.innerHTML = `
                    <td style="font-family: monospace; font-weight: bold; color:var(--primary-blue-dark);">${c.trackingCode}</td>
                    <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:500;">${c.title}</td>
                    <td><span class="badge ${getStatusBadgeClass(c.status)}" style="font-size:10.5px; padding:2px 8px;">${c.status}</span></td>
                    <td><button class="btn-small" style="height:26px; padding:0 10px; font-size:11px; background:var(--primary-blue); color:white; border:none; border-radius:4px;">${viewDetailsLabel}</button></td>
                `;
                row.onclick = (e) => { 
                    e.stopPropagation();
                    switchCitizenTab('track'); 
                    document.getElementById('trackInput').value = c.trackingCode; 
                    trackCase(); 
                };
                tbody.appendChild(row);
            });
        }
    } catch (e) { 
        console.error("Error loading recent complaints:", e);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--error-red);">Unable to retrieve records.</td></tr>';
    }
}

function getStatusBadgeClass(status) {
    if (status === 'Resolved') return 'badge-resolved';
    if (status === 'Investigating' || status === 'UnderReview') return 'badge-investigating';
    if (status === 'Escalated') return 'badge-escalated';
    if (status === 'Rejected') return 'badge-rejected';
    return 'badge-pending';
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
                <td><span class="badge ${getStatusBadgeClass(c.status)}">${c.status}</span></td>
                <td>${new Date(c.submittedAt).toLocaleDateString()}</td>
            `;
            row.onclick = () => { document.getElementById('trackInput').value = c.trackingCode; trackCase(); };
            tbody.appendChild(row);
        });
    } catch (e) { tbody.innerHTML = '<tr><td colspan="4">Error loading history.</td></tr>'; }
}

async function trackCase() {
    const codeInput = document.getElementById('trackInput');
    const code = codeInput ? codeInput.value.trim() : "";
    if (!code) return;
    try {
        const response = await fetch(`${API_BASE_URL}/Complaints/track/${code}`);
        const resultBox = document.getElementById('trackResult');
        if (!response.ok) { alert("Case not found."); resultBox.style.display = 'none'; return; }
        const data = await response.json();
        resultBox.style.display = 'block';
        document.getElementById('trackTitle').innerText = data.title;
        document.getElementById('trackCodeDisplay').innerText = data.trackingCode;
        document.getElementById('trackCategory').innerText = data.categoryName ?? 'Other';
        document.getElementById('trackDate').innerText = new Date(data.submittedAt).toLocaleDateString();
        
        const badge = document.getElementById('trackBadge');
        badge.innerText = data.status;
        badge.className = 'badge ' + getStatusBadgeClass(data.status);

        const officerDisplay = document.getElementById('trackOfficerName');
        if (officerDisplay) {
            officerDisplay.innerText = data.assignedOfficerName || "Awaiting Assignment";
        }

        // Render History
        const timeline = document.getElementById('trackTimeline');
        if (timeline) {
            if (data.statusHistory && data.statusHistory.length > 0) {
                timeline.innerHTML = '<h4 style="font-size: 0.9rem; margin-bottom: 1rem;">Official Case History</h4>' + data.statusHistory.map(sh => `
                    <div style="margin-bottom: 12px; padding-left: 1rem; border-left: 2px solid var(--border-color);">
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${new Date(sh.changedAt).toLocaleString()}</div>
                        <div style="font-weight: 600; font-size: 0.85rem;">Status: ${sh.status}</div>
                        <div style="font-size: 0.85rem;">${sh.authorityNote || 'System update.'}</div>
                    </div>
                `).reverse().join('');
            } else {
                timeline.innerHTML = '<div class="timeline-item">No official history records found.</div>';
            }

            if (data.resolutionNote) {
                timeline.innerHTML = `
                    <div style="margin-bottom: 15px; padding: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px;">
                        <div style="font-weight: 700; color: #166534; font-size: 12px; margin-bottom: 4px;">OFFICIAL RESOLUTION</div>
                        <div style="font-size: 14px; line-height: 1.5;">${data.resolutionNote}</div>
                    </div>
                ` + timeline.innerHTML;
            }
        }
        resultBox.scrollIntoView({ behavior: 'smooth' });
    } catch (e) { console.error(e); alert("Server error."); }
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
// 4. Case Management (Officer & Admin)
// ==========================================
async function loadAdminComplaints() {
    const tableBody = document.getElementById('complaintsTableBody');
    if (!tableBody) return;

    const user = getCurrentUser();
    const isAdmin = user?.role === 'Admin';
    
    const searchInput = document.getElementById(isAdmin ? 'adminSearchCaseInput' : 'searchCaseInput');
    const statusFilter = document.getElementById(isAdmin ? 'adminStatusCaseFilter' : 'statusCaseFilter');
    
    const search = searchInput?.value.toLowerCase() || '';
    const status = statusFilter?.value || '';

    try {
        const response = await fetch(`${API_BASE_URL}/Complaints`);
        let complaints = await response.json();
        
        // --- STRICT RESOURCE ISOLATION ---
        if (user?.role === 'Officer') {
            const officerId = (user.id || user.Id || "").toLowerCase();
            complaints = complaints.filter(c => {
                const caseOfficerId = (c.assignedOfficerId || c.AssignedOfficerId || "").toLowerCase();
                return caseOfficerId === officerId;
            });
        }
        
        if (isAdmin) {
             loadAdminDashboardStats();
        } else {
             calculateAndRenderStats();
        }

        if (search) complaints = complaints.filter(c => c.trackingCode.toLowerCase().includes(search) || c.title.toLowerCase().includes(search));
        if (status) complaints = complaints.filter(c => c.status === status);

        tableBody.innerHTML = '';
        complaints.forEach(c => {
            const row = document.createElement('tr');
            row.className = 'clickable-row';
            row.innerHTML = `
                <td><strong>${c.trackingCode}</strong></td>
                <td>${c.title}</td>
                <td>${c.categoryName ?? 'Other'}</td>
                <td><span class="badge ${c.priority === 'High' ? 'badge-pending' : ''}" style="border-radius:4px;">${c.priority}</span></td>
                <td><span class="badge ${c.status === 'Investigating' ? 'badge-investigating' : c.status === 'Resolved' ? 'badge-resolved' : 'badge-pending'}">${c.status}</span></td>
                <td style="font-size:0.85rem; font-weight:600;">${c.assignedOfficerName || '<span style="color:#94a3b8; font-weight:400;">Unassigned</span>'}</td>
            `;
            row.onclick = () => openAdvancedPanel(c);
            tableBody.appendChild(row);
        });
    } catch (e) { console.error(e); }
}

async function calculateAndRenderStats() {
    try {
        const user = getCurrentUser();
        let url = `${API_BASE_URL}/Analytics/dashboard-summary`;
        
        // If Officer, filter by their assigned cases
        if (user?.role === 'Officer') {
            url += `?citizenId=${user.id}`; // Reusing the parameter name for assigned officer logic on backend if needed, 
                                            // but for now let's ensure we distinguish correctly.
                                            // Actually, the backend GetDashboardSummary currently filters by CitizenId.
        }

        const response = await fetch(url);
        const stats = await response.json();
        const total = stats.totalComplaints;
        const resRate = stats.resolutionRate + '%';

        if (document.getElementById('statTotal')) document.getElementById('statTotal').innerText = total;
        if (document.getElementById('statPending')) document.getElementById('statPending').innerText = stats.pending;
        if (document.getElementById('statInvestigating')) document.getElementById('statInvestigating').innerText = stats.inProgress;
        if (document.getElementById('statInProgress')) document.getElementById('statInProgress').innerText = stats.inProgress; // Support both naming conventions
        if (document.getElementById('statResolved')) document.getElementById('statResolved').innerText = stats.resolved;
        if (document.getElementById('statResolutionRate')) document.getElementById('statResolutionRate').innerText = resRate;
        
        if (document.getElementById('pendingCountBadge')) document.getElementById('pendingCountBadge').innerText = stats.pending;
        if (document.getElementById('reportResRate')) document.getElementById('reportResRate').innerText = resRate;
        
        const max = total || 1;
        if (document.getElementById('offBarPending')) document.getElementById('offBarPending').style.width = (stats.pending / max * 100) + '%';
        if (document.getElementById('offBarInProg')) document.getElementById('offBarInProg').style.width = (stats.inProgress / max * 100) + '%';
        if (document.getElementById('offBarDone')) document.getElementById('offBarDone').style.width = (stats.resolved / max * 100) + '%';

    } catch (e) { console.error("Error rendering stats:", e); }
}

function switchOfficerView(view) {
    document.querySelectorAll('.officer-view').forEach(v => v.style.display = 'none');
    const tabs = {
        dashboard: document.getElementById('offTabDashboard'),
        cases: document.getElementById('offTabCases'),
        reports: document.getElementById('offTabReports'),
        notifications: document.getElementById('offTabNotifs')
    };
    Object.values(tabs).forEach(t => t?.classList.remove('active-tab'));
    const views = {
        dashboard: document.getElementById('officerDashboardView'),
        cases: document.getElementById('officerCasesView'),
        reports: document.getElementById('officerReportsView'),
        notifications: document.getElementById('officerNotificationsView')
    };
    if (views[view]) views[view].style.display = 'block';
    if (tabs[view]) tabs[view].classList.add('active-tab');
    if (view === 'dashboard' || view === 'reports') calculateAndRenderStats();
    if (view === 'cases') loadAdminComplaints();
    if (view === 'notifications') renderOfficerNotifications();
}

async function renderOfficerNotifications() {
    const userId = getCurrentUserId();
    const container = document.getElementById('officerNotificationsContainer');
    if (!container) return;
    try {
        const response = await fetch(`${API_BASE_URL}/Notifications/user/${userId}`);
        const notifs = await response.json();
        if (notifs.length === 0) {
            container.innerHTML = '<div class="card" style="text-align:center; padding:3rem;">No internal alerts found.</div>';
            return;
        }
        container.innerHTML = notifs.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(n => `
            <div class="card" style="border-left: 4px solid var(--primary-blue);">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <strong style="color:var(--text-dark);">System Update</strong>
                    <span style="font-size:0.75rem; color:var(--text-muted);">${new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <div style="font-size:0.9rem;">${n.message}</div>
            </div>
        `).join('');
    } catch (e) { container.innerHTML = 'Failed to load notifications.'; }
}

function openAdvancedPanel(caseData) {
    currentAdminCaseId = caseData.id;
    const user = getCurrentUser();
    document.getElementById('panelTrackingCode').innerText = caseData.trackingCode;
    document.getElementById('panelTitle').innerText = caseData.title;
    document.getElementById('panelDescription').innerText = caseData.description;
    const badge = document.getElementById('panelStatusBadge');
    badge.innerText = caseData.status;
    badge.className = 'badge ' + (caseData.status === 'Investigating' ? 'badge-investigating' : caseData.status === 'Resolved' ? 'badge-resolved' : 'badge-pending');
    if (document.getElementById('panelOfficer')) {
        document.getElementById('panelOfficer').innerText = caseData.assignedOfficerName ? `Assigned: ${caseData.assignedOfficerName}` : 'Status: Unassigned';
    }
    const assignSection = document.getElementById('assignmentSection');
    if (assignSection) {
        assignSection.style.display = (user?.role === 'Admin' && !caseData.assignedOfficerName) ? 'block' : 'none';
    }
    if (document.getElementById('updateStatusSelect')) {
        document.getElementById('updateStatusSelect').value = caseData.status;
    }

    // Handle existing resolution
    const resField = document.getElementById('resolutionField');
    const resDisplay = document.getElementById('resolutionDisplay');
    const resInput = document.getElementById('caseResolutionNote');
    if (resField) {
        if (caseData.status === 'Resolved') {
            resField.style.display = 'block';
            resDisplay.style.display = 'block';
            resDisplay.innerText = caseData.resolutionNote || "No summary provided.";
            if (resInput) resInput.style.display = 'none';
        } else {
            resField.style.display = 'none';
            resDisplay.style.display = 'none';
            if (resInput) {
                resInput.style.display = 'block';
                resInput.value = '';
            }
        }
    }

    document.getElementById('slideOverOverlay').classList.add('active');
    document.getElementById('caseDetailPanel').classList.add('open');
    loadComments(caseData.id);
}

function closeAdvancedPanel() {
    document.getElementById('slideOverOverlay').classList.remove('active');
    document.getElementById('caseDetailPanel').classList.remove('open');
}

function toggleResolutionField() {
    const status = document.getElementById('updateStatusSelect').value;
    const field = document.getElementById('resolutionField');
    if (field) {
        field.style.display = (status === 'Resolved') ? 'block' : 'none';
    }
}

async function updateCaseStatus() {
    const newStatus = document.getElementById('updateStatusSelect').value;
    const note = document.getElementById('caseResolutionNote')?.value;
    
    if (newStatus === 'Resolved' && !note && !document.getElementById('resolutionDisplay').innerText) {
        return alert("Please provide an official resolution summary before closing the case.");
    }

    await fetch(`${API_BASE_URL}/Complaints/${currentAdminCaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            status: newStatus,
            resolutionNote: note 
        })
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
// 6. Superadmin - User Registry & Assignment
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

    tableBody.innerHTML = allUsers.filter(u => u.fullName.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)).map(u => `
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
    document.querySelectorAll('.admin-view').forEach(v => v.style.display = 'none');
    const tabs = {
        overview: document.getElementById('admTabOverview'),
        complaints: document.getElementById('admTabComplaints'),
        users: document.getElementById('admTabUsers'),
        reports: document.getElementById('admTabReports'),
        logs: document.getElementById('admTabLogs')
    };
    Object.values(tabs).forEach(t => t?.classList.remove('active-tab'));
    const views = {
        overview: document.getElementById('adminOverviewView'),
        complaints: document.getElementById('adminComplaintsView'),
        users: document.getElementById('adminUsersView'),
        reports: document.getElementById('adminReportsView'),
        logs: document.getElementById('adminLogsView')
    };
    if (views[view]) views[view].style.display = 'block';
    if (tabs[view]) tabs[view].classList.add('active-tab');
    if (view === 'reports') refreshReportingModule();
    if (view === 'users') loadUsers();
    if (view === 'complaints') {
        loadAdminComplaints();
        loadOfficerOptions();
    }
}

async function loadOfficerOptions() {
    const dropdown = document.getElementById('caseOfficerSelect');
    if (!dropdown) return;
    try {
        const response = await fetch(`${API_BASE_URL}/Users`);
        const users = await response.json();
        dropdown.innerHTML = '<option value="">-- Choose Officer --</option>';
        users.filter(u => u.role === 'Officer').forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.id;
            opt.textContent = o.fullName;
            dropdown.appendChild(opt);
        });
    } catch (e) { }
}

async function assignCaseToOfficer() {
    const officerId = document.getElementById('caseOfficerSelect').value;
    if (!officerId) return alert("Select an officer first.");
    try {
        const response = await fetch(`${API_BASE_URL}/Complaints/${currentAdminCaseId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assignedOfficerId: officerId, status: 'Investigating' })
        });
        if (response.ok) {
            alert("Case successfully assigned to officer.");
            closeAdvancedPanel();
            loadAdminComplaints();
        } else {
            alert("Failed to assign case.");
        }
    } catch (e) { alert("Assignment failed."); }
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
