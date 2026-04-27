const API_BASE_URL = 'https://online-complaint-and-investigation.onrender.com'; 
let currentAdminCaseId = null; 
let _geoWatchId = null;

// simple translation helper (translations defined in translations.js)
function t(key) {
    try {
        const lang = localStorage.getItem('civicLang') || 'en';
        return (translations && translations[lang] && translations[lang][key]) || translations?.en?.[key] || key;
    } catch { return key; }
}

function getCurrentUser() {
    const session = localStorage.getItem('civicUser');
    if (!session) return null;
    try { return JSON.parse(session); } catch { return null; }
}

function toggleShareLocation() {
    const btn = document.getElementById('shareLocationBtn');
    const status = document.getElementById('shareLocationStatus');
    if (!_geoWatchId) {
        startGeoWatch();
        if (btn) btn.textContent = 'Stop sharing';
        if (status) status.textContent = 'Sharing live location';
    } else {
        stopGeoWatch();
        if (btn) btn.textContent = 'Share Location';
        if (status) status.textContent = 'Location not shared';
    }
}
        // Citizen - allow closing own case
        try {
            const closeHolderId = 'citizenCloseHolder';
            let closeHolder = document.getElementById(closeHolderId);
            if (!closeHolder) {
                closeHolder = document.createElement('div');
                closeHolder.id = closeHolderId;
                closeHolder.style.marginTop = '12px';
                resultBox.appendChild(closeHolder);
            }

            // Determine ownership: either the complaint has a citizenId matching current user,
            // or it is an anonymous report (citizenId null) and user reached here via tracking code.
            const currentUserId = getCurrentUserId();
            const isOwner = (!data.citizenId) || (data.citizenId === currentUserId);

            closeHolder.innerHTML = '';
            if (isOwner && data.status !== 'Closed' && data.status !== 'Resolved' && data.status !== 'Rejected') {
                closeHolder.innerHTML = `<button id="closeCaseBtn" class="btn-danger" style="width:100%;">${t('close_btn')}</button>`;
                document.getElementById('closeCaseBtn')?.addEventListener('click', async () => {
                    if (!confirm(t('close_case_confirm'))) return;
                    const btn = document.getElementById('closeCaseBtn');
                    btn.disabled = true; btn.textContent = 'Closing...';
                    try {
                        // include X-User-Id header so server can authorize ownership
                        const res = await fetch(`${API_BASE_URL}/Complaints/${data.id}/close`, { method: 'PUT', headers: { 'X-User-Id': getCurrentUserId() } });
                        if (res.ok || res.status === 204) {
                            alert('Case closed successfully.');
                            // Refresh view
                            document.getElementById('trackInput').value = data.trackingCode;
                            trackCase();
                        } else {
                            alert('Failed to close case.');
                        }
                    } catch (e) { alert('Unable to reach server.'); }
                    finally { btn.disabled = false; btn.textContent = 'Close Case'; }
                });
            }
        } catch (e) { console.error('Error rendering close button:', e); }

function startGeoWatch() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by this browser.');
        return;
    }
    _geoWatchId = navigator.geolocation.watchPosition(pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const latEl = document.getElementById('reporterLatitude');
        const lngEl = document.getElementById('reporterLongitude');
        if (latEl) latEl.value = lat;
        if (lngEl) lngEl.value = lng;
    }, err => {
        console.error('Geolocation error', err);
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 });
}

function stopGeoWatch() {
    if (_geoWatchId && navigator.geolocation) {
        navigator.geolocation.clearWatch(_geoWatchId);
        _geoWatchId = null;
    }
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
        'admin.html':      ['Officer'],
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

    const rwandaData = {
        'Gasabo': {
            'Bumbogo':   ['Bibare', 'Gasagara', 'Kabukuba', 'Nyamugari', 'Rugarama'],
            'Gisozi':    ['Cyimo', 'Gisozi', 'Kabeza', 'Karuruma', 'Ndera'],
            'Jabana':    ['Bwiza', 'Jabana', 'Kagugu', 'Kibenga', 'Muyange'],
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
            'Gahanga':    ['Akabuga', 'Gahanga', 'Karukanka', 'Kigarama', 'Murambi'],
            'Gatenga':    ['Gatenga', 'Kagarama', 'Kagera', 'Kibaya', 'Rusave'],
            'Gikondo':    ['Agakiriro', 'Gikondo', 'Kabuye', 'Nyabarongo', 'Rugunga'],
            'Kagarama':   ['Bibare', 'Gako', 'Kagarama', 'Kimisagara', 'Kinyinya'],
            'Kanombe':    ['Gahanga', 'Kabuga', 'Kanombe', 'Kibaya', 'Nyarugunga'],
            'Kicukiro':   ['Gatare', 'Kicukiro', 'Masaka', 'Nyanza', 'Rugunga'],
            'Masaka':     ['Gasanze', 'Kanombe', 'Karama', 'Masaka', 'Nyarugunga'],
            'Niboye':     ['Gikumba', 'Kabeza', 'Kanombe', 'Kibare', 'Niboye'],
            'Nyarugunga': ['Gahanga', 'Kanombe', 'Kigarama', 'Nyarugunga', 'Rebero']
        },
        'Nyarugenge': {
            'Gitega':     ['Agatare', 'Biryogo', 'Gatare', 'Gitega', 'Kigarama'],
            'Kanyinya':   ['Akabahizi', 'Gaculiro', 'Kanyinya', 'Mabuye', 'Rwezamenyo'],
            'Kimisagara': ['Akabahizi', 'Kimisagara', 'Nyarugenge', 'Rugunga', 'Rwezamenyo'],
            'Mageragere': ['Bweramana', 'Kabuye', 'Mageragere', 'Rubirizi', 'Rubungo'],
            'Muhima':     ['Kimisagara', 'Muhima', 'Nyarugenge', 'Rugando', 'Rwezamenyo'],
            'Nyamirambo': ['Biryogo', 'Gitega', 'Kiyovu', 'Nyamirambo', 'Rugarama'],
            'Nyarugenge': ['Biryogo', 'Kimicanga', 'Nyarugenge', 'Rwezamenyo', 'Umujyi'],
            'Rwezamenyo': ['Gihanga', 'Kiyovu', 'Nyarugenge', 'Rugando', 'Rwezamenyo']
        },
        'Bugesera': {
            'Gashora':  ['Gashora', 'Kabeza', 'Kagina', 'Karenge', 'Nyamata'],
            'Juru':     ['Gihanga', 'Juru', 'Kabuga', 'Kayenzi', 'Kirehe'],
            'Kamabuye': ['Cyasemakamba', 'Gashora', 'Kamabuye', 'Nyamata', 'Rusagara'],
            'Mareba':   ['Bugesera', 'Gashora', 'Karambi', 'Mareba', 'Nyamata'],
            'Mayange':  ['Bugesera', 'Kagina', 'Karambi', 'Mayange', 'Nyamata'],
            'Ntarama':  ['Bugesera', 'Kabeza', 'Ntarama', 'Nyamata', 'Rubona'],
            'Nyamata':  ['Bugesera', 'Gashora', 'Kayumbu', 'Nyamata', 'Rubona'],
            'Rilima':   ['Bugesera', 'Gashora', 'Karama', 'Karambi', 'Rilima'],
            'Ruhuha':   ['Gashora', 'Kabeza', 'Kayumbu', 'Ruhuha', 'Rweru'],
            'Rweru':    ['Gashora', 'Karambi', 'Karama', 'Rweru', 'Rubona']
        },
        'Musanze': {
            'Cyuve':    ['Bikumba', 'Cyuve', 'Kabingo', 'Kagano', 'Nyange'],
            'Gataraga': ['Bwiza', 'Gataraga', 'Kagitega', 'Kiraro', 'Rugaragara'],
            'Kimonyi':  ['Birambo', 'Kimonyi', 'Kagano', 'Nyange', 'Rugarama'],
            'Kinigi':   ['Bisoke', 'Karisimbi', 'Kinigi', 'Rugarama', 'Shingiro'],
            'Muhoza':   ['Kabingo', 'Kagano', 'Muhoza', 'Musanze', 'Nyange'],
            'Muko':     ['Binyamini', 'Kabingo', 'Muko', 'Rugaragara', 'Ryamateke'],
            'Nyange':   ['Biruyi', 'Kidomo', 'Muhoza', 'Nyange', 'Rugarama'],
            'Rwaza':    ['Biruyi', 'Kagano', 'Kidomo', 'Rwaza', 'Shingiro'],
            'Shingiro': ['Bisoke', 'Kagano', 'Rugarama', 'Shingiro', 'Virunga']
        },
        'Huye': {
            'Gishamvu': ['Gishamvu', 'Karambi', 'Kayenzi', 'Mukangara', 'Nyanza'],
            'Karama':   ['Gaseke', 'Karama', 'Maraba', 'Nyakibanda', 'Ruhashya'],
            'Kigoma':   ['Cyarwa', 'Kigoma', 'Murama', 'Nyamiyaga', 'Sovu'],
            'Kinazi':   ['Butare', 'Kinazi', 'Maraba', 'Mukangara', 'Nyanza'],
            'Mbazi':    ['Cyarwa', 'Mbazi', 'Mugombwa', 'Rusatira', 'Sovu'],
            'Mukura':   ['Butare', 'Gaseke', 'Mukura', 'Rusatira', 'Simbi'],
            'Ngoma':    ['Butare', 'Maraba', 'Ngoma', 'Nyakibanda', 'Tumba'],
            'Ruhashya': ['Butare', 'Cyarwa', 'Maraba', 'Ruhashya', 'Simbi'],
            'Simbi':    ['Butare', 'Cyarwa', 'Maraba', 'Simbi', 'Sovu'],
            'Tumba':    ['Cyarwa', 'Maraba', 'Nyakibanda', 'Tumba', 'Sovu']
        },
        'Rubavu': {
            'Bugeshi':    ['Bugeshi', 'Kamegeri', 'Kayenzi', 'Kidomo', 'Rugerero'],
            'Busasamana': ['Busasamana', 'Gisenyi', 'Kamegeri', 'Kanama', 'Rugaragara'],
            'Cyanzarwe':  ['Cyanzarwe', 'Gisenyi', 'Kanama', 'Kayenzi', 'Rugerero'],
            'Gisenyi':    ['Bugoyi', 'Gisenyi', 'Kamegeri', 'Lac Kivu', 'Rubavu'],
            'Kanama':     ['Bugeshi', 'Gisenyi', 'Kanama', 'Kayenzi', 'Rubavu'],
            'Mudende':    ['Bugeshi', 'Kamegeri', 'Kayenzi', 'Mudende', 'Rugaragara'],
            'Nyamyumba':  ['Bugeshi', 'Gisenyi', 'Nyamyumba', 'Rubavu', 'Rugerero'],
            'Nyundo':     ['Bugeshi', 'Gisenyi', 'Kayenzi', 'Nyundo', 'Rubavu'],
            'Rubavu':     ['Bugeshi', 'Gisenyi', 'Rubavu', 'Rugerero', 'Urugwiro'],
            'Rugerero':   ['Bugeshi', 'Gisenyi', 'Kamegeri', 'Rugerero', 'Urugwiro']
        },
        'Rwamagana': {
            'Fumbwe':   ['Fumbwe', 'Gahengeri', 'Karenge', 'Munyiginya', 'Rugarama'],
            'Gahengeri':['Gahengeri', 'Karenge', 'Munyiginya', 'Rwamagana', 'Rugarama'],
            'Karenge':  ['Fumbwe', 'Karenge', 'Munyiginya', 'Rwamagana', 'Rugarama'],
            'Kigabiro': ['Gahengeri', 'Kigabiro', 'Munyiginya', 'Rwamagana', 'Rugarama'],
            'Muhazi':   ['Fumbwe', 'Gahengeri', 'Muhazi', 'Munyiginya', 'Rugarama'],
            'Munyaga':  ['Fumbwe', 'Gahengeri', 'Munyaga', 'Munyiginya', 'Rugarama'],
            'Munyiginya':['Fumbwe', 'Gahengeri', 'Munyiginya', 'Rwamagana', 'Rugarama'],
            'Nzige':    ['Fumbwe', 'Gahengeri', 'Munyiginya', 'Nzige', 'Rugarama'],
            'Rubona':   ['Fumbwe', 'Gahengeri', 'Munyiginya', 'Rubona', 'Rugarama']
        },
        'Nyagatare': {
            'Gatunda':   ['Gatunda', 'Kagitumba', 'Karama', 'Matimba', 'Rwempasha'],
            'Karama':    ['Gatunda', 'Karama', 'Matimba', 'Nyagatare', 'Rwempasha'],
            'Karangazi': ['Karangazi', 'Matimba', 'Nyagatare', 'Rwempasha', 'Tabagwe'],
            'Katabagemu':['Katabagemu', 'Matimba', 'Nyagatare', 'Rwempasha', 'Tabagwe'],
            'Mimuli':    ['Karama', 'Matimba', 'Mimuli', 'Nyagatare', 'Rwempasha'],
            'Mukama':    ['Karama', 'Matimba', 'Mukama', 'Nyagatare', 'Rwempasha'],
            'Nyagatare': ['Karama', 'Matimba', 'Nyagatare', 'Rwempasha', 'Tabagwe'],
            'Rwempasha': ['Gatunda', 'Karama', 'Matimba', 'Nyagatare', 'Rwempasha'],
            'Tabagwe':   ['Karama', 'Matimba', 'Nyagatare', 'Rwempasha', 'Tabagwe']
        },
        'Muhanga': {
            'Cyeza':     ['Cyeza', 'Kabacuzi', 'Karama', 'Muhanga', 'Nyamabuye'],
            'Kabacuzi':  ['Cyeza', 'Kabacuzi', 'Karama', 'Muhanga', 'Nyamabuye'],
            'Kibangu':   ['Cyeza', 'Kabacuzi', 'Kibangu', 'Muhanga', 'Nyamabuye'],
            'Kiyumba':   ['Cyeza', 'Kabacuzi', 'Kiyumba', 'Muhanga', 'Nyamabuye'],
            'Muhanga':   ['Cyeza', 'Kabacuzi', 'Karama', 'Muhanga', 'Nyamabuye'],
            'Mushishiro':['Cyeza', 'Kabacuzi', 'Muhanga', 'Mushishiro', 'Nyamabuye'],
            'Nyamabuye': ['Cyeza', 'Kabacuzi', 'Muhanga', 'Nyamabuye', 'Rongi'],
            'Nyamiyaga': ['Cyeza', 'Kabacuzi', 'Muhanga', 'Nyamiyaga', 'Nyamabuye'],
            'Rongi':     ['Cyeza', 'Kabacuzi', 'Muhanga', 'Nyamabuye', 'Rongi'],
            'Rugendabari':['Cyeza', 'Kabacuzi', 'Muhanga', 'Nyamabuye', 'Rugendabari']
        }
    };

    districtSel.onchange = () => {
        const district = districtSel.value;
        const lang = localStorage.getItem('civicLang') || 'en';
        const sectorPlaceholder = (typeof translations !== 'undefined' && translations[lang]?.select_sector) || '-- Select Sector --';
        const cellPlaceholder   = (typeof translations !== 'undefined' && translations[lang]?.select_cell)   || '-- Select Cell --';
        sectorSel.innerHTML = `<option value="">${sectorPlaceholder}</option>`;
        cellSel.innerHTML   = `<option value="">${cellPlaceholder}</option>`;
        if (!district || !rwandaData[district]) return;
        Object.keys(rwandaData[district]).sort().forEach(sector => {
            const opt = document.createElement('option');
            opt.value = sector; opt.textContent = sector;
            sectorSel.appendChild(opt);
        });
    };

    sectorSel.onchange = () => {
        const district = districtSel.value;
        const sector   = sectorSel.value;
        const lang = localStorage.getItem('civicLang') || 'en';
        const cellPlaceholder = (typeof translations !== 'undefined' && translations[lang]?.select_cell) || '-- Select Cell --';
        cellSel.innerHTML = `<option value="">${cellPlaceholder}</option>`;
        if (!district || !sector || !rwandaData[district]?.[sector]) return;
        rwandaData[district][sector].sort().forEach(cell => {
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

// AI-based category detection — keyword matching against loaded categories
let _allCategories = [];

async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/Category`);
        if (!response.ok) return;
        _allCategories = await response.json();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function autoDetectCategory(text) {
    const suggestion  = document.getElementById('categorysuggestion');
    const nameEl      = document.getElementById('suggestedCategoryName');
    const hiddenInput = document.getElementById('categoryDropdown');
    if (!suggestion || !_allCategories.length) return;

    // Also pull in the title for better context
    const titleText = document.getElementById('complaintTitle')?.value || '';
    const combined  = (titleText + ' ' + text).toLowerCase();

    if (combined.trim().length < 10) { suggestion.style.display = 'none'; return; }

    // ── Weighted keyword map ──────────────────────────────────────────────────
    // Each entry: { word, weight }  weight 2 = strong signal, 1 = normal
    const buckets = [
        {
            hint: 'Infrastructure',
            terms: [
                // Roads & transport
                {w:'road',v:2},{w:'street',v:2},{w:'pothole',v:2},{w:'tarmac',v:2},{w:'pavement',v:1},
                {w:'bridge',v:2},{w:'highway',v:1},{w:'traffic',v:1},{w:'sidewalk',v:1},{w:'footpath',v:1},
                // Water
                {w:'water',v:1},{w:'pipe',v:2},{w:'pipeline',v:2},{w:'tap',v:1},{w:'borehole',v:2},
                {w:'sewage',v:2},{w:'sewer',v:2},{w:'drainage',v:2},{w:'flood',v:1},{w:'leak',v:1},
                {w:'burst pipe',v:2},{w:'no water',v:2},{w:'water supply',v:2},
                // Electricity
                {w:'electricity',v:2},{w:'power',v:1},{w:'blackout',v:2},{w:'outage',v:2},
                {w:'transformer',v:2},{w:'electric',v:1},{w:'light',v:1},{w:'streetlight',v:2},
                // Construction & buildings
                {w:'construction',v:1},{w:'building',v:1},{w:'infrastructure',v:2},{w:'collapsed',v:2},
                {w:'broken',v:1},{w:'damaged',v:1},{w:'repair',v:1},{w:'maintenance',v:1},
                {w:'garbage collection',v:1},{w:'public toilet',v:2},{w:'latrine',v:2}
            ]
        },
        {
            hint: 'Safety',
            terms: [
                // Crime
                {w:'theft',v:2},{w:'robbery',v:2},{w:'stolen',v:2},{w:'burglar',v:2},{w:'break in',v:2},
                {w:'assault',v:2},{w:'attack',v:2},{w:'beat',v:1},{w:'hit',v:1},{w:'stab',v:2},
                {w:'murder',v:2},{w:'kill',v:2},{w:'dead',v:1},{w:'body',v:1},{w:'shooting',v:2},
                {w:'gun',v:2},{w:'weapon',v:2},{w:'knife',v:2},{w:'armed',v:2},
                // Sexual violence
                {w:'rape',v:2},{w:'sexual',v:2},{w:'harass',v:2},{w:'molest',v:2},{w:'abuse',v:1},
                // Drugs & gangs
                {w:'drug',v:2},{w:'narcotics',v:2},{w:'gang',v:2},{w:'criminal',v:2},{w:'suspect',v:1},
                // Police & security
                {w:'police',v:1},{w:'security',v:1},{w:'patrol',v:1},{w:'unsafe',v:2},{w:'danger',v:2},
                {w:'threat',v:2},{w:'intimidate',v:2},{w:'fight',v:1},{w:'violence',v:2},{w:'crime',v:2},
                {w:'accident',v:1},{w:'crash',v:1},{w:'fire',v:1},{w:'explosion',v:2}
            ]
        },
        {
            hint: 'Environmental',
            terms: [
                // Waste
                {w:'garbage',v:2},{w:'waste',v:2},{w:'trash',v:2},{w:'rubbish',v:2},{w:'litter',v:2},
                {w:'dump',v:2},{w:'dumping',v:2},{w:'landfill',v:2},{w:'refuse',v:1},
                // Pollution
                {w:'pollution',v:2},{w:'pollute',v:2},{w:'contaminate',v:2},{w:'toxic',v:2},
                {w:'chemical',v:1},{w:'smoke',v:1},{w:'smell',v:1},{w:'odor',v:1},{w:'stench',v:2},
                {w:'noise',v:1},{w:'dust',v:1},
                // Water & nature
                {w:'river',v:1},{w:'lake',v:1},{w:'swamp',v:1},{w:'wetland',v:2},{w:'erosion',v:2},
                {w:'deforestation',v:2},{w:'tree',v:1},{w:'forest',v:1},{w:'soil',v:1},{w:'land',v:1},
                {w:'environment',v:2},{w:'sanitation',v:2},{w:'hygiene',v:1},{w:'clean',v:1},
                {w:'flooding',v:1},{w:'drainage',v:1},{w:'mosquito',v:1},{w:'pest',v:1}
            ]
        },
        {
            hint: 'Governance',
            terms: [
                // Corruption
                {w:'corruption',v:2},{w:'corrupt',v:2},{w:'bribe',v:2},{w:'bribery',v:2},{w:'extort',v:2},
                {w:'fraud',v:2},{w:'embezzle',v:2},{w:'steal public',v:2},{w:'misuse',v:2},
                // Officials & misconduct
                {w:'official',v:1},{w:'officer',v:1},{w:'government',v:1},{w:'authority',v:1},
                {w:'misconduct',v:2},{w:'abuse of power',v:2},{w:'nepotism',v:2},{w:'favoritism',v:2},
                {w:'discrimination',v:2},{w:'unfair',v:1},{w:'injustice',v:2},
                // Services
                {w:'service',v:1},{w:'delay',v:1},{w:'refused',v:1},{w:'denied',v:1},{w:'ignored',v:1},
                {w:'document',v:1},{w:'permit',v:1},{w:'license',v:1},{w:'certificate',v:1},
                {w:'land title',v:2},{w:'property',v:1},{w:'tax',v:1},{w:'fee',v:1},
                {w:'election',v:2},{w:'vote',v:2},{w:'political',v:1},{w:'accountability',v:2},
                {w:'transparency',v:2},{w:'report',v:1},{w:'complaint ignored',v:2}
            ]
        },
        {
            hint: 'Social',
            terms: [
                // Health
                {w:'hospital',v:2},{w:'clinic',v:2},{w:'health',v:2},{w:'medical',v:2},{w:'doctor',v:2},
                {w:'nurse',v:2},{w:'medicine',v:2},{w:'treatment',v:1},{w:'sick',v:1},{w:'disease',v:2},
                {w:'malaria',v:2},{w:'hiv',v:2},{w:'covid',v:2},{w:'epidemic',v:2},{w:'vaccination',v:2},
                // Education
                {w:'school',v:2},{w:'education',v:2},{w:'student',v:2},{w:'teacher',v:2},{w:'class',v:1},
                {w:'university',v:2},{w:'college',v:2},{w:'dropout',v:2},{w:'fees',v:1},
                // Poverty & welfare
                {w:'poverty',v:2},{w:'poor',v:1},{w:'hungry',v:2},{w:'food',v:1},{w:'starving',v:2},
                {w:'homeless',v:2},{w:'shelter',v:1},{w:'orphan',v:2},{w:'widow',v:2},{w:'elderly',v:2},
                {w:'child',v:1},{w:'children',v:1},{w:'family',v:1},{w:'welfare',v:2},{w:'social',v:1},
                {w:'disability',v:2},{w:'disabled',v:2},{w:'refugee',v:2},{w:'domestic violence',v:2}
            ]
        }
    ];

    // ── Scoring ───────────────────────────────────────────────────────────────
    let bestHint  = null;
    let bestScore = 0;

    for (const bucket of buckets) {
        let score = 0;
        for (const { w, v } of bucket.terms) {
            if (combined.includes(w)) score += v;
        }
        if (score > bestScore) {
            bestScore = score;
            bestHint  = bucket.hint;
        }
    }

    if (!bestHint || bestScore === 0) { suggestion.style.display = 'none'; return; }

    // ── Match against DB category by partial name ─────────────────────────────
    const matched = _allCategories.find(c => c.name.toLowerCase().includes(bestHint.toLowerCase()));
    if (!matched) { suggestion.style.display = 'none'; return; }

    hiddenInput.value  = matched.id;
    nameEl.textContent = matched.name;
    suggestion.style.display = 'block';
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
        // count unique affected cases (complaintId) among unread notifications
        const caseIds = new Set(unread.filter(n => n.complaintId).map(n => n.complaintId));
        const uniqueCases = caseIds.size;
        if (count > 0) {
            if (citizenBadge) { citizenBadge.innerText = count; citizenBadge.style.display = 'inline-block'; }
            if (officerBadge) { officerBadge.innerText = count; officerBadge.style.display = 'inline-block'; }
            const summary = document.getElementById('citizenNotifSummary');
            if (summary) {
                summary.style.display = 'block';
                summary.innerText = `Unread: ${count} (${uniqueCases} case${uniqueCases === 1 ? '' : 's'})`;
            }
        } else {
            const summary = document.getElementById('citizenNotifSummary');
            if (summary) summary.style.display = 'none';
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

function setSubmissionMode(mode) {
    const isEmergency = mode === 'emergency';

    // Toggle button styles
    const btnStd = document.getElementById('modeStandard');
    const btnEmg = document.getElementById('modeEmergency');
    if (btnStd) btnStd.classList.toggle('selected', !isEmergency);
    if (btnEmg) btnEmg.classList.toggle('selected', isEmergency);

    // Show/hide forms
    const stdForm = document.getElementById('standardForm');
    const emgForm = document.getElementById('emergencyForm');
    if (stdForm) stdForm.style.display = isEmergency ? 'none'  : 'block';
    if (emgForm) emgForm.style.display = isEmergency ? 'block' : 'none';

    // Reset AI suggestion when switching
    const sug = document.getElementById('categorysuggestion');
    if (sug) sug.style.display = 'none';
    const hidden = document.getElementById('categoryDropdown');
    if (hidden) hidden.value = '';
}

async function submitEmergency() {
    const description = document.getElementById('emergencyDescription')?.value?.trim();
    const categoryId  = document.getElementById('emergencyCategory')?.value || document.getElementById('categoryDropdown')?.value;
    const lat         = document.getElementById('reporterLatitude')?.value;
    const lng         = document.getElementById('reporterLongitude')?.value;

    if (!description || description.length < 10) {
        alert('Please describe the emergency (at least 10 characters).');
        return;
    }


    const finalCategoryId = categoryId || (_allCategories[0]?.id ?? null);
    if (!finalCategoryId) {
        alert('Categories not loaded. Please try again in a moment.');
        return;
    }

    const user = getCurrentUser();
    const payload = {
        title:       'EMERGENCY: ' + description.substring(0, 60),
        description: description,
        // ensure numeric values are sent for latitude/longitude
        latitude:    lat ? Number(lat) : undefined,
        longitude:   lng ? Number(lng) : undefined,
        district:    '',
        sector:      '',
        cell:        '',
        village:     '',
        categoryId:  finalCategoryId,
        priority:    'Critical',
        isAnonymous: user ? false : true,
        citizenId:   user?.id ?? null
    };

    const btn = document.getElementById('emergencySubmitBtn');
    btn.disabled    = true;
    btn.textContent = 'Submitting...';

    try {
        const response = await fetch(`${API_BASE_URL}/Complaints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            alert(
                `\u2705 Emergency submitted successfully!\n\n` +
                `Tracking Code: ${result.trackingCode}\n\n` +
                `Your case has been flagged as CRITICAL and will be escalated immediately.\n` +
                `Save your tracking code to follow up.`
            );
            document.getElementById('emergencyDescription').value = '';
            document.getElementById('reporterLatitude').value = '';
            document.getElementById('reporterLongitude').value = '';
            document.getElementById('categorysuggestion').style.display = 'none';
            document.getElementById('categoryDropdown').value = '';
            switchCitizenTab('track');
            document.getElementById('trackInput').value = result.trackingCode;
            trackCase();
        } else {
            const err = await response.json().catch(() => null);
            const msg = err?.errors ? Object.values(err.errors).flat()[0] : 'Submission failed. Please try again.';
            alert(msg);
        }
    } catch {
        alert('Unable to connect to server. Please try again.');
    } finally {
        btn.disabled    = false;
        btn.textContent = '\u{1F6A8} Submit Emergency Report';
    }
}
async function submitComplaint() {
    const title       = document.getElementById('complaintTitle')?.value?.trim();
    const rawCategory  = document.getElementById('complaintCategory')?.value;
    const hiddenCat    = document.getElementById('categoryDropdown')?.value;
    const district    = document.getElementById('incidentDistrict')?.value;
    const sector      = document.getElementById('incidentSector')?.value;
    const cell        = document.getElementById('incidentCell')?.value;
    const village     = document.getElementById('incidentVillage')?.value;
    const location    = document.getElementById('incidentLocation')?.value;
    const description = document.getElementById('complaintDescription')?.value?.trim();
    const isAnonymous = document.getElementById('isAnonymous')?.checked || false;
    const priorityEl  = document.querySelector('input[name="complaintPriority"]:checked');
    const priority    = priorityEl ? priorityEl.value : 'Medium';

    if (!title)                                  { alert('Please enter a complaint title.'); return; }
    if (!description || description.length < 20) { alert('Please provide a detailed description (at least 20 characters). The system needs this to auto-detect the category.'); return; }
    // Resolve category: prefer explicit selection, fallback to AI-detected hidden id, then server default
    let resolvedCategoryId = null;
    if (rawCategory) {
        const matched = (_allCategories || []).find(c => (c.name || '').toLowerCase() === rawCategory.toLowerCase());
        if (matched) resolvedCategoryId = matched.id;
    }
    if (!resolvedCategoryId && hiddenCat) resolvedCategoryId = hiddenCat;
    if (!resolvedCategoryId) { alert('Please select a category or provide more detail so the system can suggest one.'); return; }
    if (!district)                               { alert('Please select a district.'); return; }

    const payload = {
        title, description, location, district, sector, cell, village,
        categoryId: resolvedCategoryId, priority, isAnonymous,
        citizenId: isAnonymous ? null : (getCurrentUser()?.id ?? null)
    };

    const btn = document.getElementById('submitBtn');
    btn.disabled = true; btn.textContent = 'Submitting...';

    try {
        const response = await fetch(`${API_BASE_URL}/Complaints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            // No evidence required for emergency submissions (live location is primary)
            alert(`Complaint submitted successfully.\n\nYour tracking code is:\n${result.trackingCode}\n\nSave this code to track your case.`);
            document.getElementById('complaintForm').reset();
            document.getElementById('categorysuggestion').style.display = 'none';
            switchCitizenTab('track');
            document.getElementById('trackInput').value = result.trackingCode;
            trackCase();
        } else {
            const err = await response.json().catch(() => null);
            const msg = err?.errors ? Object.values(err.errors).flat()[0] : 'Unable to submit complaint.';
            alert(msg);
        }
    } catch { alert('Unable to connect to server.'); }
    finally {
        btn.disabled = false;
        btn.textContent = 'Submit Investigation Request';
    }
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

function getPriorityBadge(priority) {
    const styles = {
        Low:      'background:#f0fdf4; color:#166534; border:1px solid #bbf7d0;',
        Medium:   'background:#fffbeb; color:#92400e; border:1px solid #fde68a;',
        High:     'background:#fef2f2; color:#991b1b; border:1px solid #fecaca;',
        Critical: 'background:#f5f3ff; color:#5b21b6; border:1px solid #ddd6fe;'
    };
    const s = styles[priority] || styles.Medium;
    return `<span style="display:inline-block; padding:2px 8px; font-size:11px; font-weight:700; ${s}">${priority}</span>`;
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
            officerDisplay.innerText = data.assignedOfficerName || 'Awaiting Assignment';
            officerDisplay.style.color = data.assignedOfficerName ? 'var(--primary-blue)' : 'var(--text-muted)';
        }

        const priorityDisplay = document.getElementById('trackPriority');
        if (priorityDisplay) {
            priorityDisplay.innerText = data.priority || '-';
            const pColors = { Low: '#16a34a', Medium: '#d97706', High: '#dc2626', Critical: '#7c3aed' };
            priorityDisplay.style.color = pColors[data.priority] || 'var(--text-dark)';
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
                <td>${(c.latitude && c.longitude) ? `${Number(c.latitude).toFixed(6)}, ${Number(c.longitude).toFixed(6)}` : (c.location || '')}</td>
                <td>${getPriorityBadge(c.priority)}</td>
                <td><span class="badge ${getStatusBadgeClass(c.status)}">${c.status}</span></td>
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

        // Fetch all complaints then filter by officer assignment client-side
        // (the analytics endpoint filters by citizenId, not assignedOfficerId)
        const response = await fetch(`${API_BASE_URL}/Complaints`);
        if (!response.ok) return;
        let complaints = await response.json();

        // Officers only see their own assigned cases
        if (user?.role === 'Officer') {
            const officerId = (user.id || '').toLowerCase();
            complaints = complaints.filter(c =>
                (c.assignedOfficerId || '').toLowerCase() === officerId
            );
        }

        const total      = complaints.length;
        const pending    = complaints.filter(c => c.status === 'Pending').length;
        const inProgress = complaints.filter(c => c.status === 'Investigating' || c.status === 'UnderReview').length;
        const resolved   = complaints.filter(c => c.status === 'Resolved').length;
        const resRate    = total === 0 ? '0%' : Math.round((resolved / total) * 100) + '%';

        if (document.getElementById('statTotal'))         document.getElementById('statTotal').innerText         = total;
        if (document.getElementById('statPending'))       document.getElementById('statPending').innerText       = pending;
        if (document.getElementById('statInvestigating')) document.getElementById('statInvestigating').innerText = inProgress;
        if (document.getElementById('statInProgress'))    document.getElementById('statInProgress').innerText    = inProgress;
        if (document.getElementById('statResolved'))      document.getElementById('statResolved').innerText      = resolved;
        if (document.getElementById('statResolutionRate'))document.getElementById('statResolutionRate').innerText = resRate;
        if (document.getElementById('pendingCountBadge')) document.getElementById('pendingCountBadge').innerText  = pending;
        if (document.getElementById('reportResRate'))     document.getElementById('reportResRate').innerText      = resRate;

        const max = total || 1;
        if (document.getElementById('offBarPending')) document.getElementById('offBarPending').style.width = (pending    / max * 100) + '%';
        if (document.getElementById('offBarInProg'))  document.getElementById('offBarInProg').style.width  = (inProgress / max * 100) + '%';
        if (document.getElementById('offBarDone'))    document.getElementById('offBarDone').style.width    = (resolved   / max * 100) + '%';

    } catch (e) { console.error('Error rendering stats:', e); }
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
    // Show coordinates and map link when available (be defensive about types)
    const locEl = document.getElementById('panelLocation');
    if (locEl) {
        const lat = Number(caseData.latitude);
        const lng = Number(caseData.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            locEl.innerHTML = `${lat.toFixed(6)}, ${lng.toFixed(6)} <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" style="margin-left:8px; font-weight:700; color:var(--primary-blue);">View on map</a>`;
        } else {
            locEl.innerText = caseData.location || 'Not provided';
        }
    }
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
    if (document.getElementById('updatePrioritySelect')) {
        document.getElementById('updatePrioritySelect').value = caseData.priority || 'Medium';
    }

    // Handle existing resolution note
    const resDisplay = document.getElementById('resolutionDisplay');
    const resInput   = document.getElementById('caseResolutionNote');
    if (resDisplay) {
        if (caseData.resolutionNote) {
            resDisplay.style.display = 'block';
            resDisplay.innerText = caseData.resolutionNote;
            if (resInput) resInput.value = caseData.resolutionNote;
        } else {
            resDisplay.style.display = 'none';
            if (resInput) resInput.value = '';
        }
    }

    document.getElementById('slideOverOverlay').classList.add('active');
    document.getElementById('caseDetailPanel').classList.add('open');
    loadComments(caseData.id);
    loadCaseFiles(caseData.id);
}

function closeAdvancedPanel() {
    document.getElementById('slideOverOverlay').classList.remove('active');
    document.getElementById('caseDetailPanel').classList.remove('open');
}

function toggleResolutionField() { /* no-op: resolution field is always visible */ }

async function updateCaseStatus() {
    const newStatus   = document.getElementById('updateStatusSelect').value;
    const newPriority = document.getElementById('updatePrioritySelect')?.value;
    const note        = document.getElementById('caseResolutionNote')?.value?.trim();

    const res = await fetch(`${API_BASE_URL}/Complaints/${currentAdminCaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            status: newStatus,
            priority: newPriority || undefined,
            resolutionNote: note || undefined
        })
    });

    if (res.ok || res.status === 204) {
        closeAdvancedPanel();
        loadAdminComplaints();
    } else {
        alert('Failed to save changes. Please try again.');
    }
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

async function loadCaseFiles(complaintId) {
    const box = document.getElementById('panelFiles');
    if (!box) return;
    box.innerHTML = 'Loading files...';
    try {
        const response = await fetch(`${API_BASE_URL}/Evidence/complaint/${complaintId}`);
        if (!response.ok) { box.innerHTML = 'Failed to load files.'; return; }
        const files = await response.json();
        if (!files || files.length === 0) {
            box.innerHTML = '<div style="color:var(--text-muted);">No files uploaded.</div>';
            return;
        }
        box.innerHTML = files.map(f => `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:6px;">
                <div style="font-size:13px;">${f.fileName} <span style="font-size:11px; color:var(--text-muted);">(${Math.round(f.fileSizeInBytes/1024)} KB)</span></div>
                <div>
                    <a class="btn-small" href="${f.filePath}" target="_blank">Open</a>
                    <button class="btn-secondary" onclick="downloadEvidence('${f.filePath}')">Download</button>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error(e); box.innerHTML = 'Error loading files.'; }
}

function downloadEvidence(path) {
    // create an anchor to trigger download
    const a = document.createElement('a');
    a.href = path;
    a.download = '';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
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
