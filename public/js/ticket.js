// Configuration - Update this with your backend URL
const API_BASE_URL = 'http://localhost:3000/api';
// For production, use your deployed backend URL:
// const API_BASE_URL = 'https://your-backend-url.com/api';

let currentTicket = null;

// Load ticket on page load
document.addEventListener('DOMContentLoaded', () => {
  const ticketId = getTicketIdFromURL();
  
  if (ticketId) {
    loadTicket(ticketId);
  } else {
    showError('Invalid ticket link', 'No ticket ID provided in the URL.');
  }
});

// Get ticket ID from URL
function getTicketIdFromURL() {
  const path = window.location.pathname;
  const parts = path.split('/');
  return parts[parts.length - 1] || new URLSearchParams(window.location.search).get('id');
}

// Load ticket data
async function loadTicket(ticketId) {
  try {
    const response = await fetch(`${API_BASE_URL}/ticket/${ticketId}`);
    const data = await response.json();

    if (data.success && data.data) {
      currentTicket = data.data;
      displayTicket(data.data);
    } else {
      showError('Ticket Not Found', 'The ticket you are looking for does not exist.');
    }
  } catch (error) {
    console.error('Error loading ticket:', error);
    showError('Error Loading Ticket', 'Please check your internet connection and try again.');
  }
}

// Display ticket information
function displayTicket(ticket) {
  const ticketContent = document.getElementById('ticketContent');
  const actions = document.getElementById('actions');
  
  const registeredAt = new Date(ticket.registered_at || ticket.registeredAt).toLocaleString();
  
  ticketContent.innerHTML = `
    <div class="ticket-info">
      <div class="ticket-id">
        <h3>TICKET ID</h3>
        <p>${ticket.ticket_id || ticket.ticketId}</p>
      </div>

      <div class="info-row">
        <span class="info-label">Name:</span>
        <span class="info-value"><strong>${ticket.name}</strong></span>
      </div>

      <div class="info-row">
        <span class="info-label">Contact:</span>
        <span class="info-value">${ticket.contact}</span>
      </div>

      ${ticket.email && ticket.email !== 'N/A' ? `
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value">${ticket.email}</span>
        </div>
      ` : ''}

      ${ticket.location && ticket.location !== 'N/A' ? `
        <div class="info-row">
          <span class="info-label">Location:</span>
          <span class="info-value">${ticket.location}</span>
        </div>
      ` : ''}

      <div class="info-row">
        <span class="info-label">Registered:</span>
        <span class="info-value">${registeredAt}</span>
      </div>

      <div class="qr-code">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticket.ticket_id || ticket.ticketId)}" 
             alt="QR Code">
        <p style="margin-top: 10px; color: #666; font-size: 12px;">Scan this QR code at the event</p>
      </div>
    </div>
  `;

  actions.style.display = 'flex';
}

// Show error message
function showError(title, message) {
  const ticketContent = document.getElementById('ticketContent');
  
  ticketContent.innerHTML = `
    <div class="error-message">
      <h3>${title}</h3>
      <p>${message}</p>
    </div>
  `;
}

// Download ticket as HTML
function downloadTicket() {
  if (!currentTicket) return;

  const ticketHTML = generateTicketHTML(currentTicket);
  const blob = new Blob([ticketHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = `ticket_${currentTicket.ticket_id || currentTicket.ticketId}.html`;
  link.click();
  
  URL.revokeObjectURL(url);
}

// Generate standalone ticket HTML
function generateTicketHTML(ticket) {
  const registeredAt = new Date(ticket.registered_at || ticket.registeredAt).toLocaleString();
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Ticket - ${ticket.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .ticket {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 { font-size: 32px; margin-bottom: 10px; }
    .content { padding: 30px; }
    .ticket-id {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 20px;
    }
    .ticket-id p { font-size: 18px; font-weight: bold; letter-spacing: 2px; }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #eee;
    }
    .qr-code { text-align: center; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <h1>HHC-SBM</h1>
      <h2>Event Ticket</h2>
    </div>
    <div class="content">
      <div class="ticket-id">
        <h3>TICKET ID</h3>
        <p>${ticket.ticket_id || ticket.ticketId}</p>
      </div>
      <div class="info-row">
        <strong>Name:</strong>
        <span>${ticket.name}</span>
      </div>
      <div class="info-row">
        <strong>Contact:</strong>
        <span>${ticket.contact}</span>
      </div>
      ${ticket.email && ticket.email !== 'N/A' ? `
        <div class="info-row">
          <strong>Email:</strong>
          <span>${ticket.email}</span>
        </div>
      ` : ''}
      <div class="info-row">
        <strong>Registered:</strong>
        <span>${registeredAt}</span>
      </div>
      <div class="qr-code">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticket.ticket_id || ticket.ticketId)}" alt="QR Code">
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
