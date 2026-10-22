/* eslint-disable no-unused-vars */
(function () {
  'use strict';

  const API_BASE_URL = window.API_BASE_URL || (window.location.origin + '/api');
  let currentTicket = null;

  const els = {
    get loadingState() { return document.getElementById('loadingState'); },
    get errorState() { return document.getElementById('errorState'); },
    get ticketCard() { return document.getElementById('ticketCard'); },
    get ticketCode() { return document.getElementById('ticketCode'); },
    get stubTicketCode() { return document.getElementById('stubTicketCode'); },
    get qrImage() { return document.getElementById('qrImage'); },
    get infoName() { return document.getElementById('infoName'); },
    get infoContact() { return document.getElementById('infoContact'); },
    get infoLocation() { return document.getElementById('infoLocation'); },
    get infoEmail() { return document.getElementById('infoEmail'); },
    get infoRegistered() { return document.getElementById('infoRegistered'); },
    get retryBtn() { return document.getElementById('retryBtn'); },
    get downloadBtn() { return document.getElementById('downloadBtn'); },
    get printBtn() { return document.getElementById('printBtn'); },
    get copyTicketId() { return document.getElementById('copyTicketId'); },
  };

  document.addEventListener('DOMContentLoaded', () => {
    const ticketId = getTicketIdFromURL();
    if (!ticketId) {
      showErrorPanel('Invalid Ticket Link', 'No ticket ID was provided in the URL. Please check the link and try again.');
      return;
    }
    attachEvents();
    loadTicket(ticketId);
  });

  function attachEvents() {
    if (els.retryBtn) {
      els.retryBtn.addEventListener('click', () => {
        const id = getTicketIdFromURL();
        if (id) loadTicket(id);
      });
    }
    if (els.printBtn) {
      els.printBtn.addEventListener('click', () => {
        window.print();
      });
    }
    if (els.downloadBtn) {
      els.downloadBtn.addEventListener('click', () => {
        if (currentTicket) downloadTicket();
      });
    }
    if (els.copyTicketId) {
      els.copyTicketId.addEventListener('click', async () => {
        const id = els.ticketCode ? els.ticketCode.textContent.trim() : '';
        if (!id) return;
        const ok = await copyText(id);
        if (ok) {
          els.copyTicketId.classList.add('copied');
          setTimeout(() => els.copyTicketId && els.copyTicketId.classList.remove('copied'), 1600);
        }
      });
    }
  }

  function getTicketIdFromURL() {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    let fromPath = parts.length ? parts[parts.length - 1] : null;
    if (!fromPath || fromPath === 'ticket.html' || fromPath === 'ticket') {
      fromPath = null;
    }
    const qs = new URLSearchParams(window.location.search).get('id');
    return (fromPath && fromPath.toLowerCase().startsWith('sbm')) ? fromPath
           : qs && qs.toLowerCase().startsWith('sbm') ? qs
           : fromPath || qs;
  }

  async function loadTicket(ticketId) {
    showLoading();
    try {
      const res = await fetch(`${API_BASE_URL}/ticket/${encodeURIComponent(ticketId)}`, {
        cache: 'no-store'
      });
      let data;
      try { data = await res.json(); } catch (_) { data = {}; }
      if (!res.ok || !data.success || !data.data) {
        showErrorPanel(
          'Ticket Not Found',
          (data && data.message) ||
          'We couldn\u2019t locate this ticket. It may have been revoked or the link is invalid.'
        );
        return;
      }
      currentTicket = data.data;
      displayTicket(data.data);
    } catch (err) {
      console.error(err);
      showErrorPanel(
        'Connection Error',
        'We couldn\u2019t reach the server. Check your connection and try again.'
      );
    }
  }

  function showLoading() {
    if (els.loadingState) els.loadingState.classList.remove('hidden');
    if (els.errorState) els.errorState.classList.add('hidden');
    if (els.ticketCard) els.ticketCard.classList.add('hidden');
  }

  function showErrorPanel(title, msg) {
    if (els.loadingState) els.loadingState.classList.add('hidden');
    if (els.ticketCard) els.ticketCard.classList.add('hidden');
    if (!els.errorState) return;
    els.errorState.classList.remove('hidden');
    const h = els.errorState.querySelector('.state-title');
    const p = els.errorState.querySelector('.state-sub');
    if (h) h.textContent = title || 'Error';
    if (p) p.textContent = msg || 'Something went wrong.';
  }

  function displayTicket(ticket) {
    const ticketId = ticket.ticket_id || ticket.ticketId || ticket['Ticket ID'] || '';
    const name = ticket.name || ticket['Name'] || '';
    const contact = ticket.contact || ticket['Contact'] || '';
    const location = ticket.location || ticket['Location'] || '';
    const email = ticket.email || ticket['Email'] || '';
    const rawReg = ticket.registration_date || ticket.registered_at || ticket.registeredAt || ticket['Registered At'] || '';

    if (els.ticketCode) els.ticketCode.textContent = ticketId;
    if (els.stubTicketCode) els.stubTicketCode.textContent = ticketId;
    if (els.qrImage) {
      const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=' +
                    encodeURIComponent(ticketId + ' | ' + name + ' | SBM2026');
      els.qrImage.src = qrUrl;
      els.qrImage.alt = 'QR Code for ' + ticketId;
    }
    if (els.infoName) els.infoName.textContent = name || '—';
    if (els.infoContact) els.infoContact.textContent = contact || '—';
    if (els.infoLocation) els.infoLocation.textContent = location || '—';
    if (els.infoEmail) els.infoEmail.textContent = email || '—';
    if (els.infoRegistered) els.infoRegistered.textContent = formatDate(rawReg);

    if (els.loadingState) els.loadingState.classList.add('hidden');
    if (els.errorState) els.errorState.classList.add('hidden');
    if (els.ticketCard) els.ticketCard.classList.remove('hidden');
  }

  function formatDate(dateString) {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return String(dateString).slice(0, 24);
      return d.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
      });
    } catch (_) { return String(dateString).slice(0, 24); }
  }

  function downloadTicket() {
    if (!currentTicket) return;
    const html = generateTicketHTML(currentTicket);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const ticketId = currentTicket.ticket_id || currentTicket.ticketId || 'ticket';
    const a = document.createElement('a');
    a.href = url;
    a.download = `SBM26-Ticket-${ticketId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function generateTicketHTML(ticket) {
    const ticketId = ticket.ticket_id || ticket.ticketId || '';
    const name = ticket.name || '';
    const contact = ticket.contact || '';
    const location = ticket.location || '';
    const email = ticket.email || '';
    const rawReg = ticket.registration_date || ticket.registered_at || ticket.registeredAt || '';
    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=' +
                  encodeURIComponent(ticketId + ' | ' + name + ' | SBM2026');
    const regDate = formatDate(rawReg);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SBM26 Ticket — ${escapeAttr(name || ticketId)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 40px 20px; font-family: 'Poppins', Arial, sans-serif; background: #f2f2f5; color: #232326; }
    .t { max-width: 640px; margin: 0 auto; background: #fff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.15); }
    .h { background: linear-gradient(135deg, #2b2b2e 0%, #36363a 100%); color: #fff; padding: 36px 36px 28px; position: relative; }
    .h::after { content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 4px; background: linear-gradient(90deg, #e89ab0, #d77f99); }
    .h-top { display: flex; align-items: center; justify-content: space-between; }
    .logo { display: inline-flex; align-items: center; gap: 12px; }
    .badge { width: 48px; height: 48px; border-radius: 14px; display: grid; place-items: center; background: linear-gradient(140deg, #e89ab0, #d77f99); color: #fff; font-size: 20px; }
    .eyebrow { font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #f4c9d5; font-weight: 700; }
    .title { margin: 4px 0 0; font-size: 20px; font-weight: 800; }
    .pill { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 999px; background: rgba(232,154,176,0.15); color: #f4c9d5; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; border: 1px solid rgba(232,154,176,0.3); }
    .code-sec { padding: 26px 36px 10px; text-align: center; }
    .code-label { font-size: 11px; letter-spacing: 0.22em; color: #7c7c84; text-transform: uppercase; font-weight: 700; }
    .code { font-family: ui-monospace, Menlo, monospace; font-size: 32px; font-weight: 700; letter-spacing: 0.06em; margin: 8px 0 0; color: #232326; }
    .info { padding: 14px 36px 4px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .r { display: flex; gap: 12px; align-items: flex-start; }
    .ricon { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: rgba(232,154,176,0.12); color: #d77f99; flex-shrink: 0; }
    .rlab { margin: 0; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #7c7c84; font-weight: 700; }
    .rval { margin: 2px 0 0; font-weight: 600; color: #232326; word-break: break-word; }
    .stub { margin: 24px 36px 0; border-top: 1px dashed #e89ab0; padding-top: 22px; position: relative; }
    .stub::before, .stub::after { content: ""; position: absolute; top: -14px; width: 28px; height: 28px; border-radius: 50%; background: #f2f2f5; }
    .stub::before { left: -50px; }
    .stub::after  { right: -50px; }
    .stub-inner { display: grid; grid-template-columns: 190px 1fr; gap: 22px; align-items: center; }
    .qr-block { text-align: center; }
    .qr-block img { background: #fff; padding: 10px; border-radius: 14px; border: 1px solid rgba(232,154,176,0.25); width: 180px; height: 180px; }
    .qr-cap { margin-top: 6px; font-size: 11px; color: #7c7c84; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    .stub-note { font-size: 13px; line-height: 1.6; color: #46464b; margin: 0; }
    .foot { padding: 24px 36px 30px; border-top: 1px solid #eaeaf0; margin-top: 20px; }
    .quote { margin: 0 0 18px; padding: 16px 18px; border-left: 4px solid #e89ab0; background: #fcedf2; border-radius: 10px; }
    .qtxt { margin: 0; font-family: Georgia, serif; font-style: italic; font-size: 16px; color: #36363a; font-weight: 600; }
    .qref { margin: 6px 0 0; font-size: 12px; color: #7c7c84; letter-spacing: 0.08em; }
    .fin { margin: 18px 0 0; font-size: 12px; color: #7c7c84; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
    @media (max-width: 580px) {
      .info { grid-template-columns: 1fr; }
      .stub-inner { grid-template-columns: 1fr; justify-items: center; text-align: center; }
      .stub::before, .stub::after { display: none; }
      .h { padding: 28px 22px 22px; }
      .code-sec, .info, .foot { padding-left: 22px; padding-right: 22px; }
      .stub { margin-left: 22px; margin-right: 22px; }
      .code { font-size: 24px; }
    }
    @media print {
      body { background: #fff; padding: 0; }
      .t { box-shadow: none; border: 1px solid #e3e3e7; }
    }
  </style>
</head>
<body>
  <div class="t">
    <div class="h">
      <div class="h-top">
        <div class="logo">
          <div class="badge">✝</div>
          <div>
            <div class="eyebrow">Holy Hill Chapel</div>
            <div class="title">SBM 2026</div>
          </div>
        </div>
        <div class="pill">E-Ticket</div>
      </div>
    </div>
    <div class="code-sec">
      <div class="code-label">Ticket ID</div>
      <div class="code">${escapeHtml(ticketId)}</div>
    </div>
    <div class="info">
      ${infoRow('👤', 'Full Name', name)}
      ${infoRow('📞', 'Contact Number', contact)}
      ${infoRow('📍', 'Location', location || '—')}
      ${infoRow('✉️', 'Email Address', email || '—')}
      ${infoRow('🗓', 'Registered At', regDate)}
    </div>
    <div class="stub">
      <div class="stub-inner">
        <div class="qr-block">
          <img src="${qrUrl}" alt="QR Code">
          <div class="qr-cap">Scan at gate</div>
        </div>
        <p class="stub-note">
          This ticket is non-transferable. Please present this e-ticket (digital or printed) together with a valid photo ID at the registration counter for verification. For help, contact the SBM2026 team at your nearest Holy Hill Chapel office.
        </p>
      </div>
    </div>
    <div class="foot">
      <div class="quote">
        <p class="qtxt">"Prayer Births Miracles"</p>
        <p class="qref">— Luke 18:27 · SBM 2026 Theme</p>
      </div>
      <div class="fin">
        <span>Holy Hill Chapel &copy; 2026. All rights reserved.</span>
        <span>Gate entry · One seat per ticket</span>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  function infoRow(icon, label, value) {
    return `<div class="r">
      <div class="ricon">${icon}</div>
      <div>
        <p class="rlab">${escapeHtml(label)}</p>
        <p class="rval">${escapeHtml(value || '—')}</p>
      </div>
    </div>`;
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s); }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) { /* fallback */ }
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
    } catch (_) { return false; }
  }
})();
