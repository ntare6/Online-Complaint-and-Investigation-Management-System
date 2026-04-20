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
    const isDashboard = Boolean(document.getElementById('categoryDropdown'));
    const isOfficer = Boolean(document.getElementById('complaintsTableBody'));

    if (!user && (isDashboard || isOfficer)) {
        window.location.href = 'index.html';
        return;
    }
    if (isDashboard && user && !['Citizen', 'Client'].includes(user.role)) {
        window.location.href = user.role === 'Officer' ? 'admin.html' : 'superadmin.html';
        return;
    }
    if (isOfficer && user && user.role !== 'Officer') {
        window.location.href = user.role === 'Admin' ? 'superadmin.html' : 'dashboard.html';
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
});

// ==========================================
// 1. Categories Loading
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
        dropdown.innerHTML = '<option value="">Error loading categories. Is your API running?</option>';
    }
}

// ==========================================
// Notifications Polling
// ==========================================
async function loadNotifications() {
    const userId = getCurrentUserId();
    const citizenBadge = document.getElementById('citizenNotifBadge');
    const officerBadge = document.getElementById('officerNotifBadge');
    
    // Only proceed if a badge exists in the current view
    if (!citizenBadge && !officerBadge) return;

    try {
        const response = await fetch(`${API_BASE_URL}/Notifications/user/${userId}/unread`);
        if (!response.ok) return;
        
        const unread = await response.json();
        const count = unread.length;
        
        if (count > 0) {
            if (citizenBadge) {
                citizenBadge.innerText = count;
                citizenBadge.style.display = 'inline-block';
            }
            if (officerBadge) {
                officerBadge.innerText = count;
                officerBadge.style.display = 'inline-block';
            }
        }
    } catch (e) {
        console.error("Failed to load notifications", e);
    }
}

// ==========================================
// 2. Complaint Submission (Citizen Side)
// ==========================================
async function submitComplaint() {
    const title = document.getElementById('complaintTitle')?.value;
    const categoryId = document.getElementById('categoryDropdown')?.value;
    const location = document.getElementById('incidentLocation')?.value;
    const description = document.getElementById('complaintDescription')?.value;

    if (!title || !categoryId) {
        alert("Title and category are required.");
        return;
    }

    const payload = {
        title: title,
        description: description,
        location: location,
        categoryId: categoryId,
        priority: "Medium",
        isAnonymous: false,
        citizenId: null 
    };

    try {
        const response = await fetch(`${API_BASE_URL}/Complaints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            
            // --- NEW: Evidence Upload Module ---
            const fileInput = document.getElementById('evidenceFile');
            if (fileInput && fileInput.files.length > 0) {
                await uploadEvidence(result.id, fileInput.files[0]);
            }

            alert(`Complaint submitted. Tracking code: ${result.trackingCode}`);
            document.getElementById('complaintForm').reset();
            
            // Auto switch to tracking view specifically for them!
            switchCitizenTab('track');
            document.getElementById('trackInput').value = result.trackingCode;
            trackCase();

        } else {
            const error = await response.text();
            alert("Unable to submit complaint: " + error);
        }

    } catch (error) {
        alert("Unable to connect to server.");
    }
}

// ==========================================
// 3. Citizen Case Tracking
// ==========================================
function switchCitizenTab(tab) {
    const lodgeView = document.getElementById('lodgeView');
    const trackView = document.getElementById('trackView');
    const tabLodge = document.getElementById('tabLodge');
    const tabTrack = document.getElementById('tabTrack');

    if (tab === 'lodge') {
        lodgeView.style.display = 'block';
        trackView.style.display = 'none';
        tabLodge.classList.add('active-tab');
        tabTrack.classList.remove('active-tab');
    } else {
        lodgeView.style.display = 'none';
        trackView.style.display = 'block';
        tabLodge.classList.remove('active-tab');
        tabTrack.classList.add('active-tab');
    }
}

async function trackCase() {
    const code = document.getElementById('trackInput').value.trim();
    if (!code) return;

    try {
        const response = await fetch(`${API_BASE_URL}/Complaints/track/${code}`);
        const resultBox = document.getElementById('trackResult');

        if (!response.ok) {
            alert("Case not found. Check tracking code.");
            resultBox.style.display = 'none';
            return;
        }

        const data = await response.json();
        
        resultBox.style.display = 'block';
        document.getElementById('trackTitle').innerText = data.title;
        document.getElementById('trackCategory').innerText = data.categoryName ?? 'Other';
        document.getElementById('trackDate').innerText = new Date(data.submittedAt).toLocaleDateString('en-GB');
        
        const badge = document.getElementById('trackBadge');
        badge.innerText = data.status;
        badge.className = 'badge';
        if (data.status === 'Investigating') badge.classList.add('badge-investigating');
        else if (data.status === 'Resolved') badge.classList.add('badge-resolved');
        else badge.classList.add('badge-pending');

    } catch (error) {
        alert("Unable to connect to server.");
    }
}

// ==========================================
// 4. Load Admin Complaints (Officer Side)
// ==========================================
async function loadAdminComplaints() {
    const tableBody = document.getElementById('complaintsTableBody');
    if (!tableBody) return;

    try {
        const response = await fetch(`${API_BASE_URL}/Complaints`);
        
        if (!response.ok) {
            renderErrorState(tableBody, 'Connection Error', 'The server rejected the request. Please verify your authentication token or API status.');
            return;
        }
        
        const complaints = await response.json();
        const searchInput = (document.getElementById('searchCaseInput')?.value || '').trim().toLowerCase();
        const statusFilter = (document.getElementById('statusCaseFilter')?.value || '').trim();
        const filteredComplaints = complaints.filter(c => {
            const matchesSearch = !searchInput
                || (c.trackingCode || '').toLowerCase().includes(searchInput)
                || (c.title || '').toLowerCase().includes(searchInput);
            const matchesStatus = !statusFilter || c.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
        
        // Use the real endpoint for Dashboard stats!
        calculateAndRenderStats();
        tableBody.innerHTML = ''; 

        if (filteredComplaints.length === 0) {
            renderErrorState(tableBody, 'No Cases Found', 'No cases match the current filter.');
            return;
        }

        filteredComplaints.forEach(c => {
            let badgeClass = 'badge-pending';
            if (c.status === 'Investigating') badgeClass = 'badge-investigating';
            else if (c.status === 'Resolved') badgeClass = 'badge-resolved';
            else if (c.status === 'Rejected') badgeClass = 'badge-rejected';

            let dotClass = 'Medium';
            if (c.priority === 'High') dotClass = 'High';
            else if (c.priority === 'Low') dotClass = 'Low';

            const row = document.createElement('tr');
            row.className = 'clickable-row';
            
            const submittedDate = new Date(c.submittedAt).toLocaleDateString('en-GB');

            row.innerHTML = `
                <td style="font-family: monospace; font-weight: bold; width: 120px;">${c.trackingCode}</td>
                <td style="font-weight: 500;">${c.title}</td>
                <td>${c.categoryName ?? 'Other'}</td>
                <td><span class="priority-dot ${dotClass}"></span>${c.priority}</td>
                <td><span class="badge ${badgeClass}">${c.status}</span></td>
                <td style="color: var(--text-muted); font-size: 0.85rem;">${submittedDate}</td>
            `;

            row.addEventListener('click', () => openAdvancedPanel(c));
            tableBody.appendChild(row);
        });
    } catch (error) {
        renderErrorState(tableBody, 'System Failure', 'Failed to connect to backend.');
    }
}

async function calculateAndRenderStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/Analytics/dashboard-summary`);
        if (!response.ok) throw new Error('Analytics fetch failed');
        
        const stats = await response.json();
        
        document.getElementById('statTotal').innerText = stats.totalComplaints;
        document.getElementById('statPending').innerText = stats.pending;
        document.getElementById('statInvestigating').innerText = stats.inProgress;
        document.getElementById('statResolved').innerText = stats.resolved;
        document.getElementById('statResolutionRate').innerText = `${stats.resolutionRate}%`;
    } catch (e) {
        console.error("Could not dynamically load statistics from SQL:", e);
    }
}

function renderErrorState(container, title, message) {
    const isError = title.includes('Failure') || title.includes('Error');
    const bgColor = isError ? '#fee2e2' : '#f8fafc';
    const borderColor = isError ? '#fca5a5' : 'var(--border-color)';
    const textColor = isError ? '#9f1239' : 'var(--text-muted)';
    
    container.innerHTML = `
        <tr>
            <td colspan="6" style="padding: 1.5rem;">
                <div style="background-color: ${bgColor}; border: 1px solid ${borderColor}; border-radius: var(--radius-sm); padding: 1rem; color: ${textColor}; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 500;">${isError ? 'Unable to connect to the server. Please try again.' : 'No records available.'}</span>
                    <button class="btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.75rem; background-color: white;" onclick="loadAdminComplaints()">Retry</button>
                </div>
            </td>
        </tr>
    `;
}

// ==========================================
// 5. Slide-Over Panel Logic & SQL Updates
// ==========================================
function openAdvancedPanel(caseData) {
    // Save the ID globally so we can update it
    currentAdminCaseId = caseData.id;

    document.getElementById('panelTrackingCode').innerText = caseData.trackingCode;
    document.getElementById('panelDate').innerText = `Logged: ${new Date(caseData.submittedAt).toLocaleString()}`;
    document.getElementById('panelTitle').innerText = caseData.title;
    document.getElementById('panelCategory').innerText = caseData.categoryName ?? 'Unspecified';
    document.getElementById('panelLocation').innerText = caseData.location ?? 'N/A';
    document.getElementById('panelDescription').innerText = caseData.description;
    document.getElementById('panelOfficer').innerText = caseData.assignedOfficerName ?? 'Unassigned';

    // Status Badge & Dropdown Selector sync
    const statusBadge = document.getElementById('panelStatusBadge');
    statusBadge.innerText = caseData.status;
    statusBadge.className = 'badge'; 
    if (caseData.status === 'Investigating') statusBadge.classList.add('badge-investigating');
    else if (caseData.status === 'Resolved') statusBadge.classList.add('badge-resolved');
    else statusBadge.classList.add('badge-pending');

    document.getElementById('updateStatusSelect').value = caseData.status;

    // Priority System
    const prioritySpan = document.getElementById('panelPriority');
    prioritySpan.innerText = caseData.priority + ' Priority';
    if (caseData.priority === 'High') prioritySpan.style.color = 'var(--priority-high)';
    else if (caseData.priority === 'Medium') prioritySpan.style.color = 'var(--priority-med)';
    else prioritySpan.style.color = 'var(--priority-low)';

    document.getElementById('slideOverOverlay').classList.add('active');
    document.getElementById('caseDetailPanel').classList.add('open');
    document.body.style.overflow = 'hidden'; 
    
    // NEW: Auto-fetch communications
    loadComments(caseData.id);
}

function closeAdvancedPanel() {
    currentAdminCaseId = null;
    document.getElementById('slideOverOverlay').classList.remove('active');
    document.getElementById('caseDetailPanel').classList.remove('open');
    document.body.style.overflow = 'auto'; 
}

// ACTUAL SQL MUTATION!
async function updateCaseStatus() {
    if (!currentAdminCaseId) return;
    
    const newStatus = document.getElementById('updateStatusSelect').value;

    try {
        const response = await fetch(`${API_BASE_URL}/Complaints/${currentAdminCaseId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok || response.status === 204) {
            closeAdvancedPanel();
            // Dynamically reload the entire table so the officer sees the change AND the Top Stats recount!
            loadAdminComplaints();
        } else {
            console.error("Failed to update status");
            alert("Could not update case status.");
        }
    } catch (error) {
        alert("Unable to connect to backend.");
    }
}

// ==========================================
// 6. Evidence Module Integration
// ==========================================
async function uploadEvidence(complaintId, file) {
    const formData = new FormData();
    formData.append("ComplaintId", complaintId);
    formData.append("UploadedByUserId", getCurrentUserId()); 
    formData.append("File", file);

    try {
        const res = await fetch(`${API_BASE_URL}/Evidence/upload`, {
            method: 'POST',
            body: formData 
        });
        
        if (!res.ok) {
            console.error("Warning: Case was created, but Evidence upload failed.", await res.text());
        }
    } catch (e) {
        console.error("Evidence network error", e);
    }
}

async function loadCaseEvidence() {
    if (!currentAdminCaseId) return;
    try {
        const response = await fetch(`${API_BASE_URL}/Evidence/complaint/${currentAdminCaseId}`);
        if (!response.ok) return alert("Failed to fetch evidence files.");
        
        const files = await response.json();
        if (files.length === 0) {
            alert("No evidence files available.");
            return;
        }

        let fileList = files.map(f => `${f.fileName} (${(f.fileSizeInBytes / 1024).toFixed(1)} KB)`).join("\n");
        alert(`Attached evidence files:\n\n${fileList}`);

    } catch (e) {
        console.error(e);
        alert("Error fetching case documents.");
    }
}

// ==========================================
// 7. Transparency Engine (Comments)
// ==========================================
async function loadComments(complaintId) {
    const commentsBox = document.getElementById('panelComments');
    if (!commentsBox) return;

    commentsBox.innerHTML = 'Loading communications...';

    try {
        const response = await fetch(`${API_BASE_URL}/Comments/complaint/${complaintId}`);
        if (!response.ok) throw new Error('Failed to fetch');
        
        const comments = await response.json();
        
        if (comments.length === 0) {
            commentsBox.innerHTML = '<span style="color:var(--text-muted)">No official remarks registered yet.</span>';
            return;
        }

        commentsBox.innerHTML = comments.map(c => `
            <div style="margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px dashed var(--border-color);">
                <strong style="color:var(--text-dark);">${c.authorName} (${c.authorRole})</strong>
                <span style="font-size: 0.75rem; color:var(--text-muted); float:right;">${new Date(c.createdAt).toLocaleString()}</span>
                <div style="margin-top: 0.25rem;">${c.content}</div>
            </div>
        `).join('');
        commentsBox.scrollTop = commentsBox.scrollHeight;
    } catch (e) {
        commentsBox.innerHTML = '<span style="color:red">Failed to load communications.</span>';
    }
}

async function postComment() {
    if (!currentAdminCaseId) return alert("No case selected.");
    
    const input = document.getElementById('newCommentInput');
    const text = input.value.trim();
    if (!text) return;

    const payload = {
        complaintId: currentAdminCaseId,
        authorId: getCurrentUserId(),
        content: text
    };

    try {
        const response = await fetch(`${API_BASE_URL}/Comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            input.value = '';
            loadComments(currentAdminCaseId); // Immediately auto-refresh the log!
        } else {
            alert("Failed to post official remark.");
        }
    } catch (error) {
        console.error("Comment Error:", error);
    }
}
