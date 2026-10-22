/* eslint-disable no-unused-vars */
(function () {
  'use strict';

  function getApiUrl() {
    return (window._APP_CONFIG && window._APP_CONFIG.apiUrl) ||
      window.API_BASE_URL ||
      (window.location.origin + '/api');
  }

  let currentView = 'registrations'; // 'registrations' | 'newconverts'
  let contactFilterMode = 'all'; // 'all' | 'unique' | 'shared'
  let selectedDate = ''; // 'YYYY-MM-DD'

  let allRegistrations = [];
  let filteredRegistrations = [];
  let allNewConverts = [];
  let filteredNewConverts = [];

  let regStats = { total: 0, uniqueContacts: 0, sharedContacts: 0, emailSent: 0, smsSent: 0, today: 0 };
  let convertStats = { total: 0, uniqueContacts: 0, sharedContacts: 0, withPhone: 0, today: 0 };

  let currentPage = 1;
  const itemsPerPage = 20;
  let autoRefreshTimer = null;
  let lastRefreshDate = null;
  let isFetching = false;

  const state = {
    get el() {
      return {
        // Tabs
        tabRegistrations: document.getElementById('tabRegistrations'),
        tabNewConverts: document.getElementById('tabNewConverts'),
        tabRegCount: document.getElementById('tabRegCount'),
        tabConvertCount: document.getElementById('tabConvertCount'),

        // Stats Card Elements
        statsGrid: document.getElementById('statsGrid'),
        statCard1: document.getElementById('statCard1'),
        statCard2: document.getElementById('statCard2'),
        statCard3: document.getElementById('statCard3'),
        statCard4: document.getElementById('statCard4'),

        statVal1: document.getElementById('statVal1'),
        statLabel1: document.getElementById('statLabel1'),
        statHint1: document.getElementById('statHint1'),
        statIcon1: document.getElementById('statIcon1'),

        statVal2: document.getElementById('statVal2'),
        statLabel2: document.getElementById('statLabel2'),
        statHint2: document.getElementById('statHint2'),
        statIcon2: document.getElementById('statIcon2'),

        statVal3: document.getElementById('statVal3'),
        statLabel3: document.getElementById('statLabel3'),
        statHint3: document.getElementById('statHint3'),
        statIcon3: document.getElementById('statIcon3'),

        statVal4: document.getElementById('statVal4'),
        statLabel4: document.getElementById('statLabel4'),
        statHint4: document.getElementById('statHint4'),
        statIcon4: document.getElementById('statIcon4'),

        // Toolbar & Search
        searchInput: document.getElementById('searchInput'),
        searchClearBtn: document.getElementById('searchClearBtn'),
        dateFilter: document.getElementById('dateFilter'),
        dateClearBtn: document.getElementById('dateClearBtn'),
        clearAllFiltersBtn: document.getElementById('clearAllFiltersBtn'),
        lastRefreshTime: document.getElementById('lastRefreshTime'),
        autoRefresh: document.getElementById('autoRefresh'),
        manualRefreshBtn: document.getElementById('manualRefreshBtn'),
        refreshIcon: document.getElementById('refreshIcon'),
        exportCsvBtn: document.getElementById('exportCsvBtn'),
        exportBtnLabel: document.getElementById('exportBtnLabel'),
        exportUniqueCsvBtn: document.getElementById('exportUniqueCsvBtn'),

        // Filter Dropdown
        filterDropdownWrap: document.getElementById('filterDropdownWrap'),
        filterDropdownBtn: document.getElementById('filterDropdownBtn'),
        filterDropdownLabel: document.getElementById('filterDropdownLabel'),
        filterDropdownCount: document.getElementById('filterDropdownCount'),
        filterDropdownIcon: document.getElementById('filterDropdownIcon'),
        filterDropdownMenu: document.getElementById('filterDropdownMenu'),
        countFilterAll: document.getElementById('countFilterAll'),
        countFilterUnique: document.getElementById('countFilterUnique'),
        countFilterShared: document.getElementById('countFilterShared'),

        // Export Dropdown
        exportDropdownWrap: document.getElementById('exportDropdownWrap'),
        exportDropdownBtn: document.getElementById('exportDropdownBtn'),
        exportDropdownLabel: document.getElementById('exportDropdownLabel'),
        exportDropdownMenu: document.getElementById('exportDropdownMenu'),
        exportCurrentViewBtn: document.getElementById('exportCurrentViewBtn'),
        exportUniqueSmsBtn: document.getElementById('exportUniqueSmsBtn'),
        exportMasterListBtn: document.getElementById('exportMasterListBtn'),

        // Table Elements
        tableCardTitle: document.getElementById('tableCardTitle'),
        tableCardSubtitle: document.getElementById('tableCardSubtitle'),
        totalEntriesLabel: document.getElementById('totalEntriesLabel'),
        tableHead: document.getElementById('tableHead'),
        tableBody: document.getElementById('tableBody'),
        emptyState: document.getElementById('emptyState'),
        emptyTitle: document.getElementById('emptyTitle'),
        emptyDesc: document.getElementById('emptyDesc'),

        // Pagination
        paginationInfo: document.getElementById('paginationInfo'),
        pageNumbers: document.getElementById('pageNumbers'),
        firstPageBtn: document.getElementById('firstPageBtn'),
        prevPageBtn: document.getElementById('prevPageBtn'),
        nextPageBtn: document.getElementById('nextPageBtn'),
        lastPageBtn: document.getElementById('lastPageBtn'),

        // Others
        toast: document.getElementById('toast'),
        logoutBtn: document.getElementById('logoutBtn')
      };
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    // 1. Verify authentication
    if (typeof window.checkAuth === 'function') {
      const ok = window.checkAuth();
      if (!ok) return;
    }

    // 2. Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.logout === 'function') {
          window.logout();
        } else {
          localStorage.removeItem('adminToken');
          window.location.replace('/login');
        }
      });
    }

    // 3. Setup tabs, filter dropdown, export dropdown & date filter
    setupTabs();
    setupContactFilters();
    setupExportDropdown();
    setupDateFilter();
    setupClearAllFilters();
    setupClickOutsideListener();

    // 4. Setup search input and clear button
    const searchInput = document.getElementById('searchInput');
    const searchClearBtn = document.getElementById('searchClearBtn');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const val = searchInput.value;
        if (searchClearBtn) {
          searchClearBtn.style.display = val ? 'flex' : 'none';
        }
        filterTable();
        updateClearFiltersButtonVisibility();
      });
    }
    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          searchClearBtn.style.display = 'none';
          searchInput.focus();
          filterTable();
          updateClearFiltersButtonVisibility();
        }
      });
    }

    // 5. Setup auto refresh toggle
    attachAutoRefreshToggle();

    // 6. Initial data load
    loadDashboardData();
    startAutoRefresh();
  });

  function getAuthHeaders() {
    const token = localStorage.getItem('adminToken') || '';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  function setupTabs() {
    const { tabRegistrations, tabNewConverts } = state.el;
    if (tabRegistrations) {
      tabRegistrations.addEventListener('click', () => switchView('registrations'));
    }
    if (tabNewConverts) {
      tabNewConverts.addEventListener('click', () => switchView('newconverts'));
    }
  }

  function setupContactFilters() {
    const { filterDropdownBtn, filterDropdownMenu } = state.el;
    if (filterDropdownBtn && filterDropdownMenu) {
      filterDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns(filterDropdownMenu);
        const isOpen = filterDropdownMenu.classList.toggle('open');
        filterDropdownBtn.classList.toggle('open', isOpen);
        filterDropdownBtn.setAttribute('aria-expanded', isOpen);
      });

      filterDropdownMenu.querySelectorAll('.dropdown-item[data-filter]').forEach((item) => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const mode = item.getAttribute('data-filter') || 'all';
          switchContactFilter(mode);
          filterDropdownMenu.classList.remove('open');
          filterDropdownBtn.classList.remove('open');
          filterDropdownBtn.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  function setupExportDropdown() {
    const { exportDropdownBtn, exportDropdownMenu, exportCurrentViewBtn, exportUniqueSmsBtn, exportMasterListBtn } = state.el;
    if (exportDropdownBtn && exportDropdownMenu) {
      exportDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns(exportDropdownMenu);
        const isOpen = exportDropdownMenu.classList.toggle('open');
        exportDropdownBtn.classList.toggle('open', isOpen);
        exportDropdownBtn.setAttribute('aria-expanded', isOpen);
      });

      if (exportCurrentViewBtn) {
        exportCurrentViewBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          closeAllDropdowns();
          exportCSV();
        });
      }

      if (exportUniqueSmsBtn) {
        exportUniqueSmsBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          closeAllDropdowns();
          exportUniqueCSV();
        });
      }

      if (exportMasterListBtn) {
        exportMasterListBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          closeAllDropdowns();
          exportMasterCSV();
        });
      }
    }
  }

  function setupClickOutsideListener() {
    document.addEventListener('click', () => {
      closeAllDropdowns();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllDropdowns();
      }
    });
  }

  function closeAllDropdowns(exceptMenu) {
    const { filterDropdownBtn, filterDropdownMenu, exportDropdownBtn, exportDropdownMenu } = state.el;
    if (filterDropdownMenu && filterDropdownMenu !== exceptMenu) {
      filterDropdownMenu.classList.remove('open');
      if (filterDropdownBtn) {
        filterDropdownBtn.classList.remove('open');
        filterDropdownBtn.setAttribute('aria-expanded', 'false');
      }
    }
    if (exportDropdownMenu && exportDropdownMenu !== exceptMenu) {
      exportDropdownMenu.classList.remove('open');
      if (exportDropdownBtn) {
        exportDropdownBtn.classList.remove('open');
        exportDropdownBtn.setAttribute('aria-expanded', 'false');
      }
    }
  }

  function setupDateFilter() {
    const { dateFilter, dateClearBtn } = state.el;
    if (dateFilter) {
      dateFilter.addEventListener('input', () => {
        selectedDate = dateFilter.value;
        if (dateClearBtn) {
          dateClearBtn.style.display = selectedDate ? 'inline-flex' : 'none';
        }
        filterTable();
        updateClearFiltersButtonVisibility();
      });
      dateFilter.addEventListener('change', () => {
        selectedDate = dateFilter.value;
        if (dateClearBtn) {
          dateClearBtn.style.display = selectedDate ? 'inline-flex' : 'none';
        }
        filterTable();
        updateClearFiltersButtonVisibility();
      });
    }
    if (dateClearBtn) {
      dateClearBtn.addEventListener('click', () => {
        if (dateFilter) {
          dateFilter.value = '';
          selectedDate = '';
          dateClearBtn.style.display = 'none';
          filterTable();
          updateClearFiltersButtonVisibility();
        }
      });
    }
  }

  function setupClearAllFilters() {
    const { clearAllFiltersBtn } = state.el;
    if (clearAllFiltersBtn) {
      clearAllFiltersBtn.addEventListener('click', () => {
        clearAllFilters();
      });
    }
  }

  function clearAllFilters() {
    const { searchInput, searchClearBtn, dateFilter, dateClearBtn } = state.el;
    if (searchInput) {
      searchInput.value = '';
      if (searchClearBtn) searchClearBtn.style.display = 'none';
    }
    if (dateFilter) {
      dateFilter.value = '';
      selectedDate = '';
      if (dateClearBtn) dateClearBtn.style.display = 'none';
    }
    contactFilterMode = 'all';
    currentPage = 1;

    const { filterDropdownMenu } = state.el;
    if (filterDropdownMenu) {
      filterDropdownMenu.querySelectorAll('.dropdown-item[data-filter]').forEach((item) => {
        const itemMode = item.getAttribute('data-filter');
        item.classList.toggle('active', itemMode === 'all');
      });
    }

    filterTable();
    updateClearFiltersButtonVisibility();
    showToast('All filters cleared', 'ok');
  }

  function updateClearFiltersButtonVisibility() {
    const { clearAllFiltersBtn, searchInput } = state.el;
    if (!clearAllFiltersBtn) return;
    const hasSearch = !!(searchInput && searchInput.value.trim());
    const hasDate = !!selectedDate;
    const hasContactFilter = contactFilterMode !== 'all';

    const isAnyFilterActive = hasSearch || hasDate || hasContactFilter;
    clearAllFiltersBtn.style.display = isAnyFilterActive ? 'inline-flex' : 'none';
  }

  function extractDateYMD(dateString) {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '';
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch (_) {
      return '';
    }
  }

  function switchContactFilter(mode) {
    contactFilterMode = mode;
    currentPage = 1;

    const { filterDropdownMenu } = state.el;
    if (filterDropdownMenu) {
      filterDropdownMenu.querySelectorAll('.dropdown-item[data-filter]').forEach((item) => {
        const itemMode = item.getAttribute('data-filter');
        item.classList.toggle('active', itemMode === mode);
      });
    }

    filterTable();
    updateClearFiltersButtonVisibility();

    const modeLabels = {
      all: 'Showing all headcount records',
      unique: 'Filtered to unique contacts only (1 per phone)',
      shared: 'Filtered to shared phone numbers (2+ people)'
    };
    showToast(modeLabels[mode] || 'Filter updated', 'ok');
  }

  function normalizePhoneForDedup(raw) {
    if (!raw) return '';
    const digits = String(raw).replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('0') && digits.length === 10) {
      return '233' + digits.substring(1);
    }
    if (digits.length === 9 && !digits.startsWith('233')) {
      return '233' + digits;
    }
    return digits;
  }

  function getPhoneCounts(dataset) {
    const counts = new Map();
    (dataset || []).forEach((item) => {
      const raw = item.contact || item.Contact || item.contact_normalized || '';
      const norm = normalizePhoneForDedup(raw);
      if (norm) {
        counts.set(norm, (counts.get(norm) || 0) + 1);
      }
    });
    return counts;
  }

  function getFirstRegisteredMap(dataset) {
    const map = new Map();
    (dataset || []).forEach((item) => {
      const raw = item.contact || item.Contact || item.contact_normalized || '';
      const norm = normalizePhoneForDedup(raw);
      if (!norm) return;

      const existing = map.get(norm);
      if (!existing) {
        map.set(norm, item);
      } else {
        const dExisting = new Date(existing.registration_date || existing.registered_at || existing.registeredAt || existing.created_at || existing.createdAt || 0).getTime();
        const dCurrent = new Date(item.registration_date || item.registered_at || item.registeredAt || item.created_at || item.createdAt || 0).getTime();
        // Keep the earliest chronologically registered person (first person that registered with the number)
        if (dCurrent < dExisting || (dCurrent === dExisting && item.id && existing.id && item.id < existing.id)) {
          map.set(norm, item);
        }
      }
    });
    return map;
  }

  function updateContactFilterPillCounts() {
    const { countFilterAll, countFilterUnique, countFilterShared, filterDropdownLabel, filterDropdownCount, filterDropdownIcon } = state.el;
    let currentDataset = currentView === 'registrations' ? allRegistrations : allNewConverts;
    if (selectedDate) {
      currentDataset = currentDataset.filter((item) => {
        const itemDate = currentView === 'registrations'
          ? (item.registration_date || item.registered_at || item.registeredAt || item['Registered At'])
          : (item.created_at || item.createdAt || item.recorded_at);
        return extractDateYMD(itemDate) === selectedDate;
      });
    }
    const phoneCounts = getPhoneCounts(currentDataset);

    let total = currentDataset.length;
    let uniqueCount = 0;
    let sharedCount = 0;

    const seenPhones = new Set();
    currentDataset.forEach((item) => {
      const raw = item.contact || item.Contact || item.contact_normalized || '';
      const norm = normalizePhoneForDedup(raw);
      if (!norm) {
        uniqueCount++;
      } else {
        if (!seenPhones.has(norm)) {
          seenPhones.add(norm);
          uniqueCount++;
        }
        if ((phoneCounts.get(norm) || 0) > 1) {
          sharedCount++;
        }
      }
    });

    if (countFilterAll) countFilterAll.textContent = formatCount(total);
    if (countFilterUnique) countFilterUnique.textContent = formatCount(uniqueCount);
    if (countFilterShared) countFilterShared.textContent = formatCount(sharedCount);

    if (filterDropdownLabel && filterDropdownCount) {
      if (contactFilterMode === 'unique') {
        filterDropdownLabel.textContent = 'Unique Contacts';
        filterDropdownCount.textContent = formatCount(uniqueCount);
        if (filterDropdownIcon) filterDropdownIcon.className = 'fa-solid fa-address-book';
      } else if (contactFilterMode === 'shared') {
        filterDropdownLabel.textContent = 'Shared Numbers';
        filterDropdownCount.textContent = formatCount(sharedCount);
        if (filterDropdownIcon) filterDropdownIcon.className = 'fa-solid fa-people-group';
      } else {
        filterDropdownLabel.textContent = 'All Headcount';
        filterDropdownCount.textContent = formatCount(total);
        if (filterDropdownIcon) filterDropdownIcon.className = 'fa-solid fa-users';
      }
    }
  }

  function switchView(viewName) {
    if (currentView === viewName) return;
    currentView = viewName;
    currentPage = 1;

    const { tabRegistrations, tabNewConverts, searchInput, searchClearBtn } = state.el;

    if (tabRegistrations && tabNewConverts) {
      tabRegistrations.classList.toggle('active', viewName === 'registrations');
      tabRegistrations.setAttribute('aria-selected', viewName === 'registrations');

      tabNewConverts.classList.toggle('active', viewName === 'newconverts');
      tabNewConverts.setAttribute('aria-selected', viewName === 'newconverts');
    }

    if (searchInput) {
      searchInput.value = '';
      searchInput.placeholder = viewName === 'registrations'
        ? 'Search by name, phone, ticket ID, status, location...'
        : 'Search new converts by name, phone, or residential area...';
      if (searchClearBtn) searchClearBtn.style.display = 'none';
    }

    updateViewUI();
    filterTable();
    updateClearFiltersButtonVisibility();
  }

  function updateViewUI() {
    const {
      tableCardTitle,
      tableCardSubtitle,
      exportDropdownLabel,
      statsGrid, statCard1, statCard2, statCard3, statCard4,
      statLabel1, statIcon1, statHint1,
      statLabel2, statIcon2, statHint2,
      statLabel3, statIcon3, statHint3,
      statLabel4, statIcon4, statHint4
    } = state.el;

    if (currentView === 'registrations') {
      if (statsGrid) statsGrid.classList.remove('three-cards');
      if (statCard3) statCard3.style.display = 'flex';

      if (tableCardTitle) tableCardTitle.textContent = 'Attendee Registrations';
      if (tableCardSubtitle) tableCardSubtitle.textContent = 'View ticket details, membership category, SMS/Email delivery, and export data.';
      if (exportDropdownLabel) exportDropdownLabel.textContent = 'Export (CSV)';

      if (statLabel1) statLabel1.textContent = selectedDate ? 'Filtered Registrations' : 'Total Registrations';
      if (statIcon1) statIcon1.className = 'fa-solid fa-users';
      if (statHint1) statHint1.innerHTML = selectedDate ? `<i class="fa-solid fa-calendar-check"></i> Date: ${selectedDate}` : '<i class="fa-solid fa-circle-check"></i> Total headcount';

      if (statLabel2) statLabel2.textContent = selectedDate ? 'Unique Contacts (Date)' : 'Unique Contacts';
      if (statIcon2) statIcon2.className = 'fa-solid fa-address-book';
      if (statHint2) statHint2.innerHTML = selectedDate ? `<i class="fa-solid fa-phone-volume"></i> Reachable on ${selectedDate}` : '<i class="fa-solid fa-bullhorn"></i> Reachable phone numbers';

      if (statLabel3) statLabel3.textContent = selectedDate ? 'SMS Sent (Date)' : 'SMS Sent';
      if (statIcon3) statIcon3.className = 'fa-solid fa-comment-sms';
      if (statHint3) statHint3.innerHTML = selectedDate ? `<i class="fa-solid fa-paper-plane"></i> Sent on ${selectedDate}` : '<i class="fa-solid fa-paper-plane"></i> Instant SMS';

      if (statLabel4) statLabel4.textContent = selectedDate ? 'Records On Date' : "Today's Registrations";
      if (statIcon4) statIcon4.className = 'fa-solid fa-calendar-day';
      if (statHint4) statHint4.innerHTML = selectedDate ? '<i class="fa-solid fa-filter"></i> Filtered Date' : '<i class="fa-solid fa-bolt"></i> Real-time';
    } else {
      // New Converts (Altar Call) View - 3 Cards layout
      if (statsGrid) statsGrid.classList.add('three-cards');
      if (statCard3) statCard3.style.display = 'none';

      if (tableCardTitle) tableCardTitle.textContent = 'Altar Call & New Converts Records';
      if (tableCardSubtitle) tableCardSubtitle.textContent = 'Manage decision responses, phone contacts, residential areas, and follow-up data.';
      if (exportDropdownLabel) exportDropdownLabel.textContent = 'Export (CSV)';

      if (statLabel1) statLabel1.textContent = selectedDate ? 'Filtered New Converts' : 'Total New Converts';
      if (statIcon1) statIcon1.className = 'fa-solid fa-cross';
      if (statHint1) statHint1.innerHTML = selectedDate ? `<i class="fa-solid fa-calendar-check"></i> Date: ${selectedDate}` : '<i class="fa-solid fa-heart"></i> Total responses';

      if (statLabel2) statLabel2.textContent = selectedDate ? 'Unique Phone Contacts (Date)' : 'Unique Phone Contacts';
      if (statIcon2) statIcon2.className = 'fa-solid fa-phone-volume';
      if (statHint2) statHint2.innerHTML = selectedDate ? `<i class="fa-solid fa-check"></i> Outreach on ${selectedDate}` : '<i class="fa-solid fa-check"></i> Clean outreach list';

      if (statLabel4) statLabel4.textContent = selectedDate ? 'Converts On Date' : "Today's Converts";
      if (statIcon4) statIcon4.className = 'fa-solid fa-calendar-day';
      if (statHint4) statHint4.innerHTML = selectedDate ? '<i class="fa-solid fa-filter"></i> Filtered Date' : '<i class="fa-solid fa-bolt"></i> Altar live';
    }

    renderStats();
    updateContactFilterPillCounts();
  }

  function renderStats() {
    const {
      statVal1, statVal2, statVal3, statVal4,
      tabRegCount, tabConvertCount
    } = state.el;

    if (tabRegCount) tabRegCount.textContent = formatCount(regStats.total);
    if (tabConvertCount) tabConvertCount.textContent = formatCount(convertStats.total);

    if (currentView === 'registrations') {
      if (selectedDate) {
        const dateRecords = allRegistrations.filter((reg) => {
          const regAt = reg.registration_date || reg.registered_at || reg.registeredAt || reg['Registered At'];
          return extractDateYMD(regAt) === selectedDate;
        });

        const total = dateRecords.length;
        const seen = new Set();
        let uniqueCount = 0;
        let smsCount = 0;
        dateRecords.forEach((r) => {
          const raw = r.contact || r.Contact || r.contact_normalized || '';
          const norm = normalizePhoneForDedup(raw);
          if (!norm) {
            uniqueCount++;
          } else if (!seen.has(norm)) {
            seen.add(norm);
            uniqueCount++;
          }
          if (r.sms_sent === true || r.smsSent === true) {
            smsCount++;
          }
        });

        if (statVal1) statVal1.textContent = formatCount(total);
        if (statVal2) statVal2.textContent = formatCount(uniqueCount);
        if (statVal3) statVal3.textContent = formatCount(smsCount);
        if (statVal4) statVal4.textContent = formatCount(total);
      } else {
        if (statVal1) statVal1.textContent = formatCount(regStats.total);
        if (statVal2) statVal2.textContent = formatCount(regStats.uniqueContacts || regStats.total);
        if (statVal3) statVal3.textContent = formatCount(regStats.smsSent);
        if (statVal4) statVal4.textContent = formatCount(regStats.today);
      }
    } else {
      if (selectedDate) {
        const dateRecords = allNewConverts.filter((c) => {
          const cAt = c.created_at || c.createdAt || c.recorded_at;
          return extractDateYMD(cAt) === selectedDate;
        });

        const total = dateRecords.length;
        const seen = new Set();
        let uniqueCount = 0;
        dateRecords.forEach((c) => {
          const raw = c.contact || c.contact_normalized || '';
          const norm = normalizePhoneForDedup(raw);
          if (!norm) {
            uniqueCount++;
          } else if (!seen.has(norm)) {
            seen.add(norm);
            uniqueCount++;
          }
        });

        if (statVal1) statVal1.textContent = formatCount(total);
        if (statVal2) statVal2.textContent = formatCount(uniqueCount);
        if (statVal4) statVal4.textContent = formatCount(total);
      } else {
        if (statVal1) statVal1.textContent = formatCount(convertStats.total);
        if (statVal2) statVal2.textContent = formatCount(convertStats.uniqueContacts || convertStats.withPhone);
        if (statVal4) statVal4.textContent = formatCount(convertStats.today);
      }
    }
  }

  function showToast(message, kind) {
    const toast = state.el.toast;
    if (!toast) return;
    const msg = toast.querySelector('.toast-message');
    const icon = toast.querySelector('.toast-icon');
    toast.className = 'toast' + (kind ? ' ' + kind : '');
    if (msg) msg.textContent = message;
    if (icon) {
      icon.className = 'toast-icon ' + (
        kind === 'ok' ? 'fa-solid fa-circle-check'
        : kind === 'err' ? 'fa-solid fa-triangle-exclamation'
        : kind === 'warn' ? 'fa-solid fa-circle-exclamation'
        : 'fa-solid fa-circle-info'
      );
    }
    requestAnimationFrame(() => toast.classList.add('show'));
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 3800);
  }

  function formatPhoneDisplay(raw) {
    if (!raw || !String(raw).trim() || String(raw).trim().toLowerCase() === 'n/a') {
      return '';
    }
    const digits = String(raw).replace(/\D/g, '');
    if (!digits) return '';
    let local = digits;
    if (digits.startsWith('233') && digits.length === 12) {
      local = '0' + digits.substring(3);
    } else if (digits.length === 9 && !digits.startsWith('0')) {
      local = '0' + digits;
    } else if (!local.startsWith('0') && local.length === 10) {
      local = '0' + local.substring(1);
    } else if (!local.startsWith('0')) {
      local = '0' + local;
    }
    return local;
  }

  function formatPhoneForCsvFormula(raw) {
    const p = formatPhoneDisplay(raw);
    return p ? `="${p}"` : '""';
  }

  function formatDate(dateString) {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return String(dateString).slice(0, 22);
      return date.toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (_) {
      return String(dateString).slice(0, 22);
    }
  }

  function formatCount(n) {
    try {
      return (n || 0).toLocaleString('en-US');
    } catch (_) {
      return n || 0;
    }
  }

  async function loadDashboardData() {
    if (isFetching) return;
    isFetching = true;

    const { refreshIcon } = state.el;
    if (refreshIcon) refreshIcon.classList.add('fa-spin');

    try {
      await Promise.all([
        loadRegistrationsData(),
        loadNewConvertsData()
      ]);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      isFetching = false;
      if (refreshIcon) refreshIcon.classList.remove('fa-spin');
    }
  }

  async function loadRegistrationsData() {
    try {
      const apiUrl = getApiUrl();
      const headers = getAuthHeaders();

      const [regRes, statsRes] = await Promise.all([
        fetch(`${apiUrl}/registrations`, { headers, cache: 'no-store' }),
        fetch(`${apiUrl}/stats`, { headers, cache: 'no-store' })
      ]);

      if (regRes.status === 401 || regRes.status === 403) {
        localStorage.removeItem('adminToken');
        window.location.replace('/login');
        return;
      }

      if (regRes.ok) {
        const data = await regRes.json();
        allRegistrations = Array.isArray(data.data) ? data.data : [];
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        if (data && data.success && data.data) {
          regStats = data.data;
        }
      }

      if (currentView === 'registrations') {
        const q = state.el.searchInput?.value || '';
        filteredRegistrations = filterRegistrations(q);
        renderCurrentData();
      }
    } catch (err) {
      console.error('Error loading registrations:', err);
    }
  }

  async function loadNewConvertsData() {
    try {
      const apiUrl = getApiUrl();
      const headers = getAuthHeaders();

      const [convertsRes, statsRes] = await Promise.all([
        fetch(`${apiUrl}/new-converts`, { headers, cache: 'no-store' }),
        fetch(`${apiUrl}/new-converts/stats`, { headers, cache: 'no-store' })
      ]);

      if (convertsRes.ok) {
        const data = await convertsRes.json();
        allNewConverts = Array.isArray(data.data) ? data.data : [];
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        if (data && data.success && data.data) {
          convertStats = data.data;
        }
      }

      if (currentView === 'newconverts') {
        const q = state.el.searchInput?.value || '';
        filteredNewConverts = filterNewConverts(q);
        renderCurrentData();
      }
    } catch (err) {
      console.error('Error loading new converts:', err);
    }
  }

  function filterRegistrations(q) {
    const s = String(q || '').trim().toLowerCase();
    const phoneCounts = getPhoneCounts(allRegistrations);

    let list = allRegistrations;

    if (s) {
      list = list.filter((reg) => {
        const name = String(reg.name || reg.Name || '').toLowerCase();
        const contact = String(reg.contact || reg.Contact || '').toLowerCase();
        const email = String(reg.email || reg.Email || '').toLowerCase();
        const location = String(reg.location || reg.Location || '').toLowerCase();
        const status = String(reg.member_status || reg.memberStatus || '').toLowerCase();
        const ticketId = String(reg.ticket_id || reg.ticketId || '').toLowerCase();

        return name.includes(s) ||
               contact.includes(s) ||
               email.includes(s) ||
               location.includes(s) ||
               status.includes(s) ||
               ticketId.includes(s);
      });
    }

    if (selectedDate) {
      list = list.filter((reg) => {
        const regAt = reg.registration_date || reg.registered_at || reg.registeredAt || reg['Registered At'];
        return extractDateYMD(regAt) === selectedDate;
      });
    }

    if (contactFilterMode === 'unique') {
      const earliestByPhone = getFirstRegisteredMap(allRegistrations);
      list = list.filter((reg) => {
        const raw = reg.contact || reg.Contact || reg.contact_normalized || '';
        const norm = normalizePhoneForDedup(raw);
        if (!norm) return true; // keep entries without phone
        const earliest = earliestByPhone.get(norm);
        if (!earliest) return true;
        return (reg.ticket_id && earliest.ticket_id && reg.ticket_id === earliest.ticket_id) ||
               (reg.id && earliest.id && reg.id === earliest.id) ||
               (reg === earliest);
      });
    } else if (contactFilterMode === 'shared') {
      list = list.filter((reg) => {
        const raw = reg.contact || reg.Contact || reg.contact_normalized || '';
        const norm = normalizePhoneForDedup(raw);
        return norm && (phoneCounts.get(norm) || 0) > 1;
      });
    }

    return list;
  }

  function filterNewConverts(q) {
    const s = String(q || '').trim().toLowerCase();
    const phoneCounts = getPhoneCounts(allNewConverts);

    let list = allNewConverts;

    if (s) {
      list = list.filter((c) => {
        const name = String(c.name || '').toLowerCase();
        const contact = String(c.contact || '').toLowerCase();
        const location = String(c.location || '').toLowerCase();

        return name.includes(s) ||
               contact.includes(s) ||
               location.includes(s);
      });
    }

    if (selectedDate) {
      list = list.filter((c) => {
        const cAt = c.created_at || c.createdAt || c.recorded_at;
        return extractDateYMD(cAt) === selectedDate;
      });
    }

    if (contactFilterMode === 'unique') {
      const earliestByPhone = getFirstRegisteredMap(allNewConverts);
      list = list.filter((c) => {
        const raw = c.contact || c.contact_normalized || '';
        const norm = normalizePhoneForDedup(raw);
        if (!norm) return true;
        const earliest = earliestByPhone.get(norm);
        if (!earliest) return true;
        return (c.id && earliest.id && c.id === earliest.id) || (c === earliest);
      });
    } else if (contactFilterMode === 'shared') {
      list = list.filter((c) => {
        const raw = c.contact || c.contact_normalized || '';
        const norm = normalizePhoneForDedup(raw);
        return norm && (phoneCounts.get(norm) || 0) > 1;
      });
    }

    return list;
  }

  function filterTable() {
    const q = state.el.searchInput?.value ?? '';
    currentPage = 1;

    if (currentView === 'registrations') {
      filteredRegistrations = filterRegistrations(q);
    } else {
      filteredNewConverts = filterNewConverts(q);
    }

    updateContactFilterPillCounts();
    renderCurrentData();
  }

  function renderCurrentData() {
    renderStats();
    updateViewUI();

    if (currentView === 'registrations') {
      renderRegistrationsTable();
    } else {
      renderNewConvertsTable();
    }

    lastRefreshDate = new Date();
    if (state.el.lastRefreshTime) {
      state.el.lastRefreshTime.textContent = lastRefreshDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  }

  function renderRegistrationsTable() {
    const { tableHead, tableBody, emptyState, totalEntriesLabel } = state.el;
    if (!tableHead || !tableBody) return;

    tableHead.innerHTML = `
      <tr>
        <th><span>Ticket ID</span></th>
        <th><span>Full Name</span></th>
        <th><span>Phone Number</span></th>
        <th><span>Attendee Status</span></th>
        <th><span>Location</span></th>
        <th><span>Email</span></th>
        <th><span>SMS</span></th>
        <th><span>Email</span></th>
        <th><span>Registered At</span></th>
        <th class="col-actions"><span>Actions</span></th>
      </tr>
    `;

    const data = filteredRegistrations;
    const total = data.length;
    const phoneCounts = getPhoneCounts(allRegistrations);

    if (totalEntriesLabel) {
      const modeSuffix = contactFilterMode === 'unique' ? ' (Unique Contacts)' : contactFilterMode === 'shared' ? ' (Shared Numbers)' : '';
      const dateSuffix = selectedDate ? ` on ${selectedDate}` : '';
      totalEntriesLabel.textContent = `${formatCount(total)} ${total === 1 ? 'entry' : 'entries'}${modeSuffix}${dateSuffix}`;
    }

    if (total === 0) {
      tableBody.innerHTML = '';
      if (emptyState) {
        emptyState.classList.remove('hidden');
        if (state.el.emptyTitle) state.el.emptyTitle.textContent = 'No registrations found';
        if (state.el.emptyDesc) state.el.emptyDesc.textContent = 'No matching attendee records found. Try adjusting your search query, date or contact filter.';
      }
      updatePagination(0, 0, 0);
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    const totalPages = Math.ceil(total / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, total);
    const pageData = data.slice(startIndex, endIndex);

    tableBody.innerHTML = pageData.map((reg, i) => {
      const ticketId = reg.ticket_id || reg.ticketId || reg['Ticket ID'] || '—';
      const name = reg.name || reg.Name || '—';
      const contactRaw = reg.contact || reg.Contact || '—';
      const contactDisplay = formatPhoneDisplay(contactRaw) || contactRaw;
      const normPhone = normalizePhoneForDedup(contactRaw);
      const sharedCount = normPhone ? (phoneCounts.get(normPhone) || 0) : 0;
      const status = reg.member_status || reg.memberStatus || 'Church Member';
      const location = reg.location || reg.Location || '';
      const email = reg.email || reg.Email || '';
      const registeredAt = reg.registration_date || reg.registered_at || reg.registeredAt || reg['Registered At'];
      const emailSent = reg.email_sent === true || reg.emailSent === true;
      const smsSent = reg.sms_sent === true || reg.smsSent === true;
      const ticketHref = `/ticket/${encodeURIComponent(ticketId)}`;
      const contactHref = contactDisplay ? `tel:${encodeURIComponent(contactDisplay)}` : '#';

      const statusBadgeClass = getStatusClass(status);
      const sharedBadgeHtml = (contactFilterMode === 'shared' && sharedCount > 1)
        ? `<span class="shared-badge" title="Shared contact: ${sharedCount} people registered using this phone number"><i class="fa-solid fa-people-group"></i> ${sharedCount}</span>`
        : '';

      return `
        <tr style="--row-idx:${i}">
          <td class="ticket-col">
            <span class="ticket-pill"><code>${escapeHtml(ticketId)}</code></span>
          </td>
          <td class="name-col">
            <span class="attendee-name">${escapeHtml(name)}</span>
          </td>
          <td class="contact-col">
            ${contactDisplay ? `
              <a href="${contactHref}" class="contact-link" title="Call ${escapeHtml(contactDisplay)}">
                <i class="fa-solid fa-phone"></i>
                ${escapeHtml(contactDisplay)}
              </a>${sharedBadgeHtml}` : '<span class="muted">—</span>'}
          </td>
          <td class="status-col">
            <span class="member-pill ${statusBadgeClass}">${escapeHtml(status)}</span>
          </td>
          <td class="loc-col">
            ${location && location !== 'N/A' ? `<span class="loc-text"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(location)}</span>` : '<span class="muted">—</span>'}
          </td>
          <td class="email-col">
            ${email && email !== 'N/A' ? `<a href="mailto:${encodeURIComponent(email)}" class="email-link" title="${escapeHtml(email)}">${escapeHtml(email)}</a>` : '<span class="muted">—</span>'}
          </td>
          <td class="sms-status-col">
            <span class="status-badge ${smsSent ? 'sent' : 'pending'}">
              <i class="fa-solid ${smsSent ? 'fa-check-double' : 'fa-clock'}"></i>
              ${smsSent ? 'Sent' : 'Pending'}
            </span>
          </td>
          <td class="email-status-col">
            <span class="status-badge ${emailSent ? 'sent' : 'pending'}">
              <i class="fa-solid ${emailSent ? 'fa-envelope-circle-check' : 'fa-clock'}"></i>
              ${emailSent ? 'Sent' : 'Pending'}
            </span>
          </td>
          <td class="date-col">
            <span class="date-text">${formatDate(registeredAt)}</span>
          </td>
          <td class="actions-col">
            <div class="row-actions">
              <button type="button" class="row-act copy-tk" data-id="${escapeHtml(ticketId)}" title="Copy Ticket Code">
                <i class="fa-regular fa-copy"></i>
              </button>
              <a class="row-act view-tk" href="${ticketHref}" target="_blank" rel="noopener" title="Download / View PDF Ticket">
                <i class="fa-solid fa-file-arrow-down"></i>
              </a>
            </div>
          </td>
        </tr>`;
    }).join('');

    updatePagination(startIndex + 1, endIndex, total);
    attachRowHandlers();
  }

  function renderNewConvertsTable() {
    const { tableHead, tableBody, emptyState, totalEntriesLabel } = state.el;
    if (!tableHead || !tableBody) return;

    tableHead.innerHTML = `
      <tr>
        <th><span>#</span></th>
        <th><span>Full Name</span></th>
        <th><span>Phone Number</span></th>
        <th><span>Location / Residential Area</span></th>
        <th><span>Date Recorded</span></th>
        <th class="col-actions"><span>Actions</span></th>
      </tr>
    `;

    const data = filteredNewConverts;
    const total = data.length;
    const phoneCounts = getPhoneCounts(allNewConverts);

    if (totalEntriesLabel) {
      const modeSuffix = contactFilterMode === 'unique' ? ' (Unique Contacts)' : contactFilterMode === 'shared' ? ' (Shared Numbers)' : '';
      const dateSuffix = selectedDate ? ` on ${selectedDate}` : '';
      totalEntriesLabel.textContent = `${formatCount(total)} ${total === 1 ? 'convert' : 'converts'}${modeSuffix}${dateSuffix}`;
    }

    if (total === 0) {
      tableBody.innerHTML = '';
      if (emptyState) {
        emptyState.classList.remove('hidden');
        if (state.el.emptyTitle) state.el.emptyTitle.textContent = 'No new converts recorded yet';
        if (state.el.emptyDesc) state.el.emptyDesc.textContent = 'No matching convert records found. Try adjusting your search query, date or contact filter.';
      }
      updatePagination(0, 0, 0);
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    const totalPages = Math.ceil(total / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, total);
    const pageData = data.slice(startIndex, endIndex);

    tableBody.innerHTML = pageData.map((c, i) => {
      const idx = startIndex + i + 1;
      const name = c.name || '—';
      const contactRaw = c.contact || '';
      const contactDisplay = formatPhoneDisplay(contactRaw);
      const normPhone = normalizePhoneForDedup(contactRaw);
      const sharedCount = normPhone ? (phoneCounts.get(normPhone) || 0) : 0;
      const location = c.location || 'Accra';
      const createdAt = c.created_at;
      const contactHref = contactDisplay ? `tel:${encodeURIComponent(contactDisplay)}` : '#';
      const sharedBadgeHtml = (contactFilterMode === 'shared' && sharedCount > 1)
        ? `<span class="shared-badge" title="Shared contact: ${sharedCount} converts registered using this phone number"><i class="fa-solid fa-people-group"></i> ${sharedCount}</span>`
        : '';

      return `
        <tr style="--row-idx:${i}">
          <td class="ticket-col">
            <span class="ticket-pill"><code>${idx}</code></span>
          </td>
          <td class="name-col">
            <span class="attendee-name" style="color:#0f172a; font-weight:800;">${escapeHtml(name)}</span>
          </td>
          <td class="contact-col">
            ${contactDisplay ? `
              <a href="${contactHref}" class="contact-link" title="Call ${escapeHtml(contactDisplay)}">
                <i class="fa-solid fa-phone" style="color:#059669;"></i>
                <strong style="color:#0f172a;">${escapeHtml(contactDisplay)}</strong>
              </a>${sharedBadgeHtml}` : '<span class="muted" style="font-style:italic;">No phone provided</span>'}
          </td>
          <td class="loc-col">
            <span class="loc-text"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(location)}</span>
          </td>
          <td class="date-col">
            <span class="date-text">${formatDate(createdAt)}</span>
          </td>
          <td class="actions-col">
            <div class="row-actions">
              ${contactDisplay ? `
                <button type="button" class="row-act copy-tk" data-id="${escapeHtml(contactDisplay)}" title="Copy Phone Number">
                  <i class="fa-regular fa-copy"></i>
                </button>
                <a class="row-act view-tk" href="${contactHref}" title="Call Attendee">
                  <i class="fa-solid fa-phone"></i>
                </a>` : '<span class="muted">—</span>'}
            </div>
          </td>
        </tr>`;
    }).join('');

    updatePagination(startIndex + 1, endIndex, total);
    attachRowHandlers();
  }

  function getStatusClass(status) {
    const s = String(status || '').toLowerCase();
    if (s.includes('first-time') || s.includes('new')) return 'status-guest';
    if (s.includes('visiting')) return 'status-visiting';
    return 'status-member';
  }

  function attachRowHandlers() {
    const { tableBody } = state.el;
    if (!tableBody) return;
    tableBody.querySelectorAll('.copy-tk').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id') || '';
        copyText(id).then((ok) => {
          showToast(ok ? `Copied: ${id}` : 'Failed to copy', ok ? 'ok' : 'warn');
          if (ok) {
            btn.classList.add('copied');
            const orig = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => {
              btn.classList.remove('copied');
              btn.innerHTML = orig;
            }, 1200);
          }
        });
      });
    });
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (_) {
      return false;
    }
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function updatePagination(start, end, total) {
    const { paginationInfo, firstPageBtn, prevPageBtn, nextPageBtn, lastPageBtn, pageNumbers } = state.el;

    if (paginationInfo) {
      if (total === 0) paginationInfo.textContent = 'Showing 0 – 0 of 0 entries';
      else paginationInfo.textContent = `Showing ${start} – ${end} of ${formatCount(total)} entries`;
    }

    const totalPages = Math.ceil(total / itemsPerPage) || 1;

    if (firstPageBtn) firstPageBtn.disabled = totalPages <= 1 || currentPage === 1;
    if (prevPageBtn) prevPageBtn.disabled = totalPages <= 1 || currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = totalPages <= 1 || currentPage === totalPages;
    if (lastPageBtn) lastPageBtn.disabled = totalPages <= 1 || currentPage === totalPages;

    if (!pageNumbers) return;
    if (totalPages <= 1) {
      pageNumbers.innerHTML = '';
      return;
    }

    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    let html = '';
    for (let i = startPage; i <= endPage; i++) {
      const isActive = i === currentPage;
      html += `<button class="page-btn page-number ${isActive ? 'active' : ''}" data-page="${i}" type="button" ${isActive ? 'aria-current="page"' : ''}>${i}</button>`;
    }
    pageNumbers.innerHTML = html;
    pageNumbers.querySelectorAll('[data-page]').forEach((b) => {
      b.addEventListener('click', () => {
        goToPage(parseInt(b.getAttribute('data-page'), 10));
      });
    });
  }

  function goToPage(page) {
    currentPage = Math.max(1, page);
    renderCurrentData();
  }
  function nextPage() {
    const list = currentView === 'registrations' ? filteredRegistrations : filteredNewConverts;
    const totalPages = Math.ceil(list.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderCurrentData();
    }
  }
  function previousPage() {
    if (currentPage > 1) {
      currentPage--;
      renderCurrentData();
    }
  }
  function goToFirstPage() {
    currentPage = 1;
    renderCurrentData();
  }
  function goToLastPage() {
    const list = currentView === 'registrations' ? filteredRegistrations : filteredNewConverts;
    currentPage = Math.max(1, Math.ceil(list.length / itemsPerPage));
    renderCurrentData();
  }

  function refreshData() {
    loadDashboardData().then(() => {
      showToast('Dashboard records refreshed', 'ok');
    }).catch(() => showToast('Failed to refresh data', 'err'));
  }

  async function exportCSV() {
    if (currentView === 'registrations') {
      await exportRegistrationsCSV();
    } else {
      await exportNewConvertsCSV();
    }
  }

  async function exportRegistrationsCSV() {
    let dataToExport = (filteredRegistrations && filteredRegistrations.length > 0)
      ? filteredRegistrations
      : allRegistrations;

    if (!dataToExport || dataToExport.length === 0) {
      showToast('No registration data available to export.', 'warn');
      return;
    }

    try {
      const headers = [
        '#',
        'Ticket ID',
        'Full Name',
        'Phone Number',
        'Attendee Status',
        'Location',
        'Email',
        'SMS Sent',
        'Email Sent',
        'Registered At'
      ];

      const rows = dataToExport.map((reg, idx) => {
        const ticketId = reg.ticket_id || reg.ticketId || reg['Ticket ID'] || '';
        const name = reg.name || reg.Name || '';
        const phoneFormatted = formatPhoneForCsvFormula(reg.contact || reg.Contact);
        const status = reg.member_status || reg.memberStatus || 'Church Member';
        const location = reg.location || reg.Location || '';
        const email = reg.email || reg.Email || '';
        const sSent = (reg.sms_sent === true || reg.smsSent === true) ? 'Yes' : 'No';
        const eSent = (reg.email_sent === true || reg.emailSent === true) ? 'Yes' : 'No';
        const regAt = formatDate(reg.registration_date || reg.registered_at || reg.registeredAt || '');
        return [
          idx + 1,
          csvEscape(ticketId),
          csvEscape(name),
          phoneFormatted,
          csvEscape(status),
          csvEscape(location),
          csvEscape(email),
          sSent,
          eSent,
          csvEscape(regAt)
        ].join(',');
      });

      const filename = contactFilterMode === 'unique' ? 'sbm2026-registrations-unique' : 'sbm2026-registrations';
      downloadCsvFile(headers, rows, filename);
      showToast(`Exported ${dataToExport.length} registrations to CSV`, 'ok');
    } catch (err) {
      console.error('Export error:', err);
      showToast('Export failed. Please try again.', 'err');
    }
  }

  async function exportNewConvertsCSV() {
    let dataToExport = (filteredNewConverts && filteredNewConverts.length > 0)
      ? filteredNewConverts
      : allNewConverts;

    if (!dataToExport || dataToExport.length === 0) {
      showToast('No new converts data available to export.', 'warn');
      return;
    }

    try {
      const headers = [
        '#',
        'Full Name',
        'Phone Number',
        'Location / Branch',
        'Recorded At'
      ];

      const rows = dataToExport.map((c, idx) => {
        const name = c.name || '';
        const phoneFormatted = formatPhoneForCsvFormula(c.contact);
        const location = c.location || 'Accra';
        const regAt = formatDate(c.created_at);
        return [
          idx + 1,
          csvEscape(name),
          phoneFormatted,
          csvEscape(location),
          csvEscape(regAt)
        ].join(',');
      });

      const filename = contactFilterMode === 'unique' ? 'sbm2026-new-converts-unique' : 'sbm2026-new-converts';
      downloadCsvFile(headers, rows, filename);
      showToast(`Exported ${dataToExport.length} new converts to CSV`, 'ok');
    } catch (err) {
      console.error('Export error:', err);
      showToast('Export failed. Please try again.', 'err');
    }
  }

  async function exportUniqueCSV() {
    let dataset = currentView === 'registrations' ? allRegistrations : allNewConverts;
    if (selectedDate) {
      dataset = dataset.filter((item) => {
        const itemDate = currentView === 'registrations'
          ? (item.registration_date || item.registered_at || item.registeredAt || item['Registered At'])
          : (item.created_at || item.createdAt || item.recorded_at);
        return extractDateYMD(itemDate) === selectedDate;
      });
    }

    if (!dataset || dataset.length === 0) {
      showToast('No records available for Bulk SMS export.', 'warn');
      return;
    }

    // Sort ascending by registration timestamp so the first person who registered with the number is selected
    const ascList = [...dataset].sort((a, b) => {
      const dateA = new Date(a.registration_date || a.registered_at || a.registeredAt || a.created_at || a.createdAt || 0).getTime();
      const dateB = new Date(b.registration_date || b.registered_at || b.registeredAt || b.created_at || b.createdAt || 0).getTime();
      return dateA - dateB;
    });

    const seen = new Set();
    const uniqueRecords = [];
    ascList.forEach((item) => {
      const raw = item.contact || item.Contact || item.contact_normalized || '';
      const norm = normalizePhoneForDedup(raw);
      if (!norm) return;
      if (!seen.has(norm)) {
        seen.add(norm);
        uniqueRecords.push(item);
      }
    });

    if (uniqueRecords.length === 0) {
      showToast('No valid phone numbers found for Bulk SMS export.', 'warn');
      return;
    }

    try {
      if (currentView === 'registrations') {
        const headers = ['#', 'Ticket ID', 'Full Name', 'Phone Number', 'Attendee Status', 'Location', 'Registered At'];
        const rows = uniqueRecords.map((reg, idx) => [
          idx + 1,
          csvEscape(reg.ticket_id || reg.ticketId || reg['Ticket ID'] || ''),
          csvEscape(reg.name || reg.Name || ''),
          formatPhoneForCsvFormula(reg.contact || reg.Contact),
          csvEscape(reg.member_status || reg.memberStatus || 'Church Member'),
          csvEscape(reg.location || reg.Location || ''),
          csvEscape(formatDate(reg.registration_date || reg.registered_at || ''))
        ].join(','));
        downloadCsvFile(headers, rows, 'sbm2026-bulk-sms-contacts');
      } else {
        const headers = ['#', 'Full Name', 'Phone Number', 'Location / Branch', 'Recorded At'];
        const rows = uniqueRecords.map((c, idx) => [
          idx + 1,
          csvEscape(c.name || ''),
          formatPhoneForCsvFormula(c.contact),
          csvEscape(c.location || 'Accra'),
          csvEscape(formatDate(c.created_at || ''))
        ].join(','));
        downloadCsvFile(headers, rows, 'sbm2026-bulk-sms-converts');
      }
      showToast(`Exported ${uniqueRecords.length} deduplicated contacts ready for Bulk SMS!`, 'ok');
    } catch (err) {
      console.error('Bulk SMS export error:', err);
      showToast('Export failed. Please try again.', 'err');
    }
  }

  async function exportMasterCSV() {
    const dataset = currentView === 'registrations' ? allRegistrations : allNewConverts;
    if (!dataset || dataset.length === 0) {
      showToast('No database records available to export.', 'warn');
      return;
    }

    try {
      if (currentView === 'registrations') {
        const headers = [
          '#',
          'Ticket ID',
          'Full Name',
          'Phone Number',
          'Attendee Status',
          'Location',
          'Email',
          'SMS Sent',
          'Email Sent',
          'Registered At'
        ];
        const rows = dataset.map((reg, idx) => {
          const ticketId = reg.ticket_id || reg.ticketId || reg['Ticket ID'] || '';
          const name = reg.name || reg.Name || '';
          const phoneFormatted = formatPhoneForCsvFormula(reg.contact || reg.Contact);
          const status = reg.member_status || reg.memberStatus || 'Church Member';
          const location = reg.location || reg.Location || '';
          const email = reg.email || reg.Email || '';
          const sSent = (reg.sms_sent === true || reg.smsSent === true) ? 'Yes' : 'No';
          const eSent = (reg.email_sent === true || reg.emailSent === true) ? 'Yes' : 'No';
          const regAt = formatDate(reg.registration_date || reg.registered_at || reg.registeredAt || '');
          return [
            idx + 1,
            csvEscape(ticketId),
            csvEscape(name),
            phoneFormatted,
            csvEscape(status),
            csvEscape(location),
            csvEscape(email),
            sSent,
            eSent,
            csvEscape(regAt)
          ].join(',');
        });
        downloadCsvFile(headers, rows, 'sbm2026-registrations-master');
      } else {
        const headers = ['#', 'Full Name', 'Phone Number', 'Location / Branch', 'Recorded At'];
        const rows = dataset.map((c, idx) => [
          idx + 1,
          csvEscape(c.name || ''),
          formatPhoneForCsvFormula(c.contact),
          csvEscape(c.location || 'Accra'),
          csvEscape(formatDate(c.created_at || ''))
        ].join(','));
        downloadCsvFile(headers, rows, 'sbm2026-new-converts-master');
      }
      showToast(`Exported full master list (${dataset.length} records)`, 'ok');
    } catch (err) {
      console.error('Master export error:', err);
      showToast('Export failed. Please try again.', 'err');
    }
  }

  function downloadCsvFile(headers, rows, filePrefix) {
    const csvContent = '\uFEFF' + [headers.map(csvEscape).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `${filePrefix}-${stamp}.csv`;

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (link.parentNode) link.parentNode.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 500);
  }

  function csvEscape(v) {
    const s = String(v ?? '');
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function attachAutoRefreshToggle() {
    const cb = state.el.autoRefresh;
    if (!cb) return;

    const stored = localStorage.getItem('adminAutoRefresh');
    if (stored !== null) {
      cb.checked = stored === 'true';
    }

    cb.addEventListener('change', () => {
      localStorage.setItem('adminAutoRefresh', String(cb.checked));
      if (cb.checked) startAutoRefresh();
      else stopAutoRefresh();
      showToast(cb.checked ? 'Auto-refresh enabled (every 15s)' : 'Auto-refresh paused', cb.checked ? 'ok' : 'warn');
    });
  }

  function startAutoRefresh() {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(() => {
      const cb = state.el.autoRefresh;
      if (cb && !cb.checked) {
        stopAutoRefresh();
        return;
      }
      if (document.visibilityState === 'visible' && !isFetching) {
        loadDashboardData().catch(() => {});
      }
    }, 15000);
  }

  function stopAutoRefresh() {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
  }

  // Expose global methods
  window.switchView = switchView;
  window.switchContactFilter = switchContactFilter;
  window.filterTable = filterTable;
  window.refreshData = refreshData;
  window.exportCSV = exportCSV;
  window.exportUniqueCSV = exportUniqueCSV;
  window.exportMasterCSV = exportMasterCSV;
  window.goToPage = goToPage;
  window.nextPage = nextPage;
  window.previousPage = previousPage;
  window.goToFirstPage = goToFirstPage;
  window.goToLastPage = goToLastPage;
})();
