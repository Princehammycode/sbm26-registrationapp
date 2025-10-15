// API_BASE_URL is loaded from config.js

let allRegistrations = [];
let filteredRegistrations = [];
let currentPage = 1;
const itemsPerPage = 20;

// Load data on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Wait for config to load before making API calls
  await configPromise;
  loadStats();
  loadRegistrations();
});

// Get auth token
function getAuthHeaders() {
  const token = localStorage.getItem('adminToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// Load statistics
async function loadStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/stats`, {
      headers: getAuthHeaders()
    });
    
    // Check if unauthorized
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
      return;
    }
    
    const data = await response.json();

    if (data.success) {
      document.getElementById('totalRegistrations').textContent = data.data.total;
      document.getElementById('emailsSent').textContent = data.data.emailsSent;
      document.getElementById('smsSent').textContent = data.data.smsSent;
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Load registrations
async function loadRegistrations() {
  const tableBody = document.getElementById('tableBody');
  
  try {
    const response = await fetch(`${API_BASE_URL}/registrations`, {
      headers: getAuthHeaders()
    });
    
    // Check if unauthorized
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
      return;
    }
    
    const data = await response.json();

    if (data.success && data.data.length > 0) {
      allRegistrations = data.data;
      filteredRegistrations = data.data;
      currentPage = 1;
      displayRegistrations();
    } else {
      tableBody.innerHTML = '<tr><td colspan="9" class="no-data">No registrations found</td></tr>';
      updatePaginationInfo(0, 0, 0);
    }
  } catch (error) {
    console.error('Error loading registrations:', error);
    tableBody.innerHTML = '<tr><td colspan="9" class="no-data">Error loading data. Please refresh.</td></tr>';
  }
}

// Display registrations in table with pagination
function displayRegistrations() {
  const tableBody = document.getElementById('tableBody');
  
  if (filteredRegistrations.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="9" class="no-data">No registrations match your search</td></tr>';
    updatePaginationInfo(0, 0, 0);
    return;
  }

  // Calculate pagination
  const totalPages = Math.ceil(filteredRegistrations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredRegistrations.length);
  const pageData = filteredRegistrations.slice(startIndex, endIndex);

  const rows = pageData.map((reg, index) => {
    // Handle Google Sheets format (snake_case from API)
    const ticketId = reg.ticket_id || reg.ticketId || reg['Ticket ID'];
    const name = reg.name || reg['Name'];
    const contact = reg.contact || reg['Contact'];
    const email = reg.email || reg['Email'];
    const location = reg.location || reg['Location'];
    const registeredAt = reg.registered_at || reg.registeredAt || reg['Registered At'];
    const emailStatus = reg.email_sent === true || reg['Email Sent'] === 'Yes' || reg.emailSent === true;
    const smsStatus = reg.sms_sent === true || reg['SMS Sent'] === 'Yes' || reg.smsSent === true;

    return `
      <tr>
        <td>${startIndex + index + 1}</td>
        <td><code>${ticketId}</code></td>
        <td><strong>${name}</strong></td>
        <td>${contact}</td>
        <td>${email || 'N/A'}</td>
        <td>${location || 'N/A'}</td>
        <td>${new Date(registeredAt).toLocaleString()}</td>
        <td>
          <span class="status-badge ${emailStatus ? 'success' : 'failed'}">
            ${emailStatus ? '✓ Sent' : '✗ Not Sent'}
          </span>
        </td>
        <td>
          <span class="status-badge ${smsStatus ? 'success' : 'failed'}">
            ${smsStatus ? '✓ Sent' : '✗ Not Sent'}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  tableBody.innerHTML = rows;
  updatePaginationInfo(startIndex + 1, endIndex, filteredRegistrations.length);
  updatePaginationControls(totalPages);
}

// Filter table based on search input
function filterTable() {
  const searchInput = document.getElementById('searchInput').value.toLowerCase();
  
  filteredRegistrations = allRegistrations.filter(reg => {
    const name = (reg.name || '').toLowerCase();
    const contact = (reg.contact || '').toLowerCase();
    const email = (reg.email || '').toLowerCase();
    const location = (reg.location || '').toLowerCase();
    const ticketId = (reg.ticket_id || reg.ticketId || '').toLowerCase();

    return name.includes(searchInput) || 
           contact.includes(searchInput) || 
           email.includes(searchInput) || 
           location.includes(searchInput) ||
           ticketId.includes(searchInput);
  });

  currentPage = 1; // Reset to first page when filtering
  displayRegistrations();
}

// Pagination functions
function updatePaginationInfo(start, end, total) {
  document.getElementById('paginationInfo').textContent = 
    `Showing ${start} - ${end} of ${total} entries`;
}

function updatePaginationControls(totalPages) {
  const firstBtn = document.getElementById('firstPageBtn');
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  const lastBtn = document.getElementById('lastPageBtn');
  const pageNumbers = document.getElementById('pageNumbers');

  // Enable/disable buttons
  firstBtn.disabled = currentPage === 1;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
  lastBtn.disabled = currentPage === totalPages;

  // Generate page numbers
  let pages = '';
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages += `<button onclick="goToPage(${i})" class="page-number ${i === currentPage ? 'active' : ''}">${i}</button>`;
  }

  pageNumbers.innerHTML = pages;
}

function goToPage(page) {
  currentPage = page;
  displayRegistrations();
}

function nextPage() {
  const totalPages = Math.ceil(filteredRegistrations.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    displayRegistrations();
  }
}

function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    displayRegistrations();
  }
}

function goToFirstPage() {
  currentPage = 1;
  displayRegistrations();
}

function goToLastPage() {
  currentPage = Math.ceil(filteredRegistrations.length / itemsPerPage);
  displayRegistrations();
}

// Refresh data - Make it globally available
window.refreshData = function() {
  loadStats();
  loadRegistrations();
  
  // Visual feedback
  const refreshBtn = document.querySelector('.refresh-btn');
  const icon = refreshBtn.querySelector('.refresh-icon');
  icon.style.transform = 'rotate(360deg)';
  
  setTimeout(() => {
    icon.style.transform = 'rotate(0deg)';
  }, 500);
}

// Export to Excel
function exportToExcel() {
  if (allRegistrations.length === 0) {
    alert('No data to export');
    return;
  }

  // Prepare data for export
  const exportData = allRegistrations.map((reg, index) => ({
    '#': index + 1,
    'Ticket ID': reg.ticket_id || reg.ticketId,
    'Name': reg.name,
    'Contact': reg.contact,
    'Email': reg.email || 'N/A',
    'Location': reg.location || 'N/A',
    'Registered At': new Date(reg.registered_at || reg.registeredAt).toLocaleString(),
    'Email Sent': (reg.email_sent || reg.emailSent) ? 'Yes' : 'No',
    'SMS Sent': (reg.sms_sent || reg.smsSent) ? 'Yes' : 'No'
  }));

  // Convert to CSV
  const headers = Object.keys(exportData[0]);
  const csvContent = [
    headers.join(','),
    ...exportData.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in values
        return typeof value === 'string' && (value.includes(',') || value.includes('"'))
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      }).join(',')
    )
  ].join('\n');

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `registrations_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Auto-refresh every 30 seconds
setInterval(() => {
  loadStats();
  loadRegistrations();
}, 30000);
