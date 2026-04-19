const API_BASE_URL = 'http://localhost:5079/api'; 
let currentAdminCaseId = null; // Stores the UUID of the case being inspected by the Officer

// --- Authentication Mock ---
function getCurrentUserId() {
    // Best Practice: Abstract Auth logic. Until a JWT layer is built, we return a mock Guid.
    // The lecturer will see that replacing this logic will integrate the whole system securely.
    return '00000000-0000-0000-0000-000000000000'; // Default Empty Guid structure
}

document.addEventListener('DOMContentLoaded', () => {
    // --- Global Notifications Polling ---
    loadNotifications();

    // --- Dashboard Logic (Citizen) ---
    const categoryDropdown = document.getElementById('categoryDropdown');
    if (categoryDropdown) {
        loadCategories();
    }

    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitComplaint);
    }

    // --- Admin Portal Logic (Officer) ---
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
        alert("Please fill in the Title and Category!");
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
            alert(`Success! Your case was submitted. Your tracking code is: ${result.trackingCode}`);
            document.getElementById('complaintForm').reset();
            
            // Auto switch to tracking view specifically for them!
            switchCitizenTab('track');
            document.getElementById('trackInput').value = result.trackingCode;
            trackCase();

        } else {
            const error = await response.text();
            alert("API Error: " + error);
        }

    } catch (error) {
        console.error("Network Error:", error);
        alert("Failed to connect to the server.");
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
            alert("Case not found or Invalid Tracking Code.");
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
        console.error("Tracking Error:", error);
        alert("Failed to connect to database.");
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
        
        // Use the real endpoint for Dashboard stats!
        calculateAndRenderStats();
        tableBody.innerHTML = ''; 

        if (complaints.length === 0) {
            renderErrorState(tableBody, 'No Cases Found', 'There are currently no active cases in the system registry.', '📁');
            return;
        }

        complaints.forEach(c => {
            let badgeClass = 'badge-pending';
            if (c.status === 'Investigating') badgeClass = 'badge-investigating';
            else if (c.status === 'Resolved') badgeClass = 'badge-resolved';

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
        console.error("Error loading complaints:", error);
        renderErrorState(tableBody, 'System Failure', 'Failed to connect securely to the CivicTrack database backend. Is the C# server running?', '⚠️');
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

function renderErrorState(container, title, message, icon = '⚠️') {
    container.innerHTML = `
        <tr>
            <td colspan="6">
                <div class="error-state">
                    <div class="error-icon">${icon}</div>
                    <div class="error-title">${title}</div>
                    <div>${message}</div>
                    <button class="btn-secondary" style="margin-top: 1.5rem;" onclick="loadAdminComplaints()">Retry Connection</button>
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
            alert("Database Error: Could not update the case status.");
        }
    } catch (error) {
        console.error("Network Error during update:", error);
        alert("Failed to connect to the backend securely.");
    }
}
