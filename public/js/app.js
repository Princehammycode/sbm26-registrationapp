(function () {
  'use strict';

  // Automatic event conclusion redirect (Nov 15, 2026 onwards)
  const isPreview = new URLSearchParams(window.location.search).get('preview') === 'form';
  const cutoffDate = new Date('2026-11-15T00:00:00Z');
  const isServerClosed = window._APP_CONFIG && window._APP_CONFIG.isClosed === true;
  if (!isPreview && (isServerClosed || new Date() >= cutoffDate)) {
    window.location.replace('closed.html');
    return;
  }

  const form = document.getElementById('registrationForm');
  const submitBtn = document.getElementById('submitBtn');
  const liveCount = document.getElementById('liveCount');

  const errorModal = document.getElementById('errorModal');
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toastText');
  const toastIcon = toast ? toast.querySelector('.toast-icon') : null;

  const errorMessage = document.getElementById('errorMessage');

  // Top floating success banner elements (Tablet / Kiosk stand mode)
  const topSuccessBanner = document.getElementById('topSuccessBanner');
  const topBannerTicketCode = document.getElementById('topBannerTicketCode');
  const topBannerDesc = document.getElementById('topBannerDesc');
  const topBannerCloseBtn = document.getElementById('topBannerCloseBtn');
  const topBannerProgressBar = document.getElementById('topBannerProgressBar');

  let bannerTimer = null;

  if (topBannerCloseBtn && topSuccessBanner) {
    topBannerCloseBtn.addEventListener('click', hideTopSuccess);
  }

  document.getElementById('errorCloseBtn')?.addEventListener('click', () => {
    closeModal(errorModal);
  });
  document.querySelectorAll('.modal-backdrop').forEach((bd) => {
    bd.addEventListener('click', () => {
      closeModal(errorModal);
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(errorModal);
      hideTopSuccess();
    }
  });

  loadLiveCount();
  initValidators();
  initCustomDropdown();

  form.addEventListener('submit', onSubmit);

  function showTopSuccess(name, ticketId) {
    if (!topSuccessBanner) return;

    if (topBannerTicketCode) {
      topBannerTicketCode.textContent = ticketId || 'SBM26-SUCCESS';
    }
    if (topBannerDesc) {
      const firstName = extractFirst(name);
      topBannerDesc.textContent = `Thank you, ${firstName}! Your e-ticket was sent via SMS.`;
    }

    if (bannerTimer) {
      clearTimeout(bannerTimer);
      bannerTimer = null;
    }

    // Reset progress bar animation
    topSuccessBanner.classList.remove('show', 'animate-progress');
    if (topBannerProgressBar) {
      void topBannerProgressBar.offsetWidth; // force DOM reflow
    }

    requestAnimationFrame(() => {
      topSuccessBanner.classList.add('show', 'animate-progress');
    });

    // Auto-dismiss after 4.5 seconds
    bannerTimer = setTimeout(() => {
      hideTopSuccess();
    }, 4500);
  }

  function hideTopSuccess() {
    if (!topSuccessBanner) return;
    if (bannerTimer) {
      clearTimeout(bannerTimer);
      bannerTimer = null;
    }
    topSuccessBanner.classList.remove('show', 'animate-progress');
  }

  function resetForm() {
    if (!form) return;
    form.reset();

    // Reset custom dropdown
    const hiddenInput = document.getElementById('memberStatus');
    const valueDisplay = document.getElementById('selectValue');
    const wrap = document.getElementById('customSelectWrap');
    const menu = document.getElementById('customDropdownMenu');

    if (hiddenInput) {
      hiddenInput.value = '';
      delete hiddenInput.dataset.touched;
    }
    if (valueDisplay) {
      valueDisplay.textContent = 'Select attendee status';
    }
    if (wrap) {
      wrap.classList.remove('has-value', 'is-open');
    }
    if (menu) {
      menu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('selected'));
    }

    // Reset validation states & helper texts
    const fields = ['name', 'contact', 'memberStatus', 'email', 'location'];
    fields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        delete el.dataset.touched;
        const grp = el.closest('.form-group');
        if (grp) grp.classList.remove('valid', 'invalid');
        const helper = document.getElementById(id + 'Helper');
        if (helper) {
          const icon = helper.querySelector('i')?.outerHTML || '';
          const defaultMsg = helper.getAttribute('data-default') || '';
          if (defaultMsg) {
            helper.innerHTML = icon + ' ' + defaultMsg;
          }
        }
      }
    });

    // Immediately focus on Full Name for the next person standing at the tablet
    setTimeout(() => {
      const nameEl = document.getElementById('name');
      if (nameEl) {
        nameEl.focus();
      }
    }, 80);
  }

  function initCustomDropdown() {
    const wrap = document.getElementById('customSelectWrap');
    const hiddenInput = document.getElementById('memberStatus');
    const valueDisplay = document.getElementById('selectValue');
    const menu = document.getElementById('customDropdownMenu');
    if (!wrap || !hiddenInput || !valueDisplay || !menu) return;

    const parentGroup = wrap.closest('.form-group');
    const parentRow = wrap.closest('.form-grid-row');

    function openDropdown() {
      wrap.classList.add('is-open');
      if (parentGroup) parentGroup.classList.add('is-active-field');
      if (parentRow) parentRow.classList.add('is-active-row');
    }

    function closeDropdown() {
      wrap.classList.remove('is-open');
      if (parentGroup) parentGroup.classList.remove('is-active-field');
      if (parentRow) parentRow.classList.remove('is-active-row');
    }

    wrap.addEventListener('click', (e) => {
      e.stopPropagation();
      if (wrap.classList.contains('is-open')) {
        closeDropdown();
      } else {
        openDropdown();
      }
    });

    menu.querySelectorAll('.dropdown-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = item.getAttribute('data-value');
        hiddenInput.value = val;
        valueDisplay.textContent = val;
        wrap.classList.add('has-value');
        closeDropdown();

        menu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');

        hiddenInput.dataset.touched = '1';
        hiddenInput.dispatchEvent(new Event('change'));
      });
    });

    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) {
        closeDropdown();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDropdown();
      }
    });
  }

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      const close = modal.querySelector('button, a');
      if (close) close.focus({ preventScroll: true });
    }, 120);
  }
  function closeModal(modal) {
    if (!modal || !modal.classList.contains('open')) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function showToast(message, kind) {
    if (!toast || !toastText) return;
    toast.className = 'toast' + (kind ? ' ' + kind : '');
    toastText.textContent = message;
    if (toastIcon) {
      toastIcon.className = 'toast-icon ' + iconClassFor(kind);
    }
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 4200);
  }
  function iconClassFor(kind) {
    if (kind === 'ok') return 'fa-solid fa-circle-check';
    if (kind === 'err') return 'fa-solid fa-triangle-exclamation';
    if (kind === 'warn') return 'fa-solid fa-circle-exclamation';
    return 'fa-solid fa-circle-info';
  }

  function initValidators() {
    const nameInput = document.getElementById('name');
    const contactInput = document.getElementById('contact');
    const memberStatusInput = document.getElementById('memberStatus');
    const emailInput = document.getElementById('email');
    const locationInput = document.getElementById('location');

    // Strict 10-digit numeric constraint
    enforceDigitsOnly(contactInput, 10);

    bindField(nameInput, validateName);
    bindField(contactInput, validatePhone);
    bindField(memberStatusInput, validateMemberStatus);
    bindField(emailInput, validateEmail);
    bindField(locationInput, validateLocation);
  }

  function enforceDigitsOnly(input, maxLen = 10) {
    if (!input) return;

    input.addEventListener('keydown', (e) => {
      // Allow navigation and shortcut keys
      if (
        e.key === 'Backspace' ||
        e.key === 'Delete' ||
        e.key === 'Tab' ||
        e.key === 'Escape' ||
        e.key === 'Enter' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'Home' ||
        e.key === 'End' ||
        e.ctrlKey ||
        e.metaKey
      ) {
        return;
      }
      // Block non-digit keys
      if (!/^[0-9]$/.test(e.key)) {
        e.preventDefault();
      }
    });

    input.addEventListener('input', () => {
      const cleaned = input.value.replace(/\D/g, '').slice(0, maxLen);
      if (input.value !== cleaned) {
        input.value = cleaned;
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteText = (e.clipboardData || window.clipboardData)?.getData('text') || '';
      const digitsOnly = pasteText.replace(/\D/g, '').slice(0, maxLen);
      input.value = digitsOnly;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function bindField(input, fn) {
    if (!input) return;
    const group = input.closest('.form-group');
    const helper = document.getElementById(input.id + 'Helper');
    const run = (opts) => {
      const res = fn(input.value);
      applyState(group, helper, res);
      return res.valid;
    };
    input.addEventListener('blur', () => run({ t: 'blur' }));
    input.addEventListener('input', () => {
      if (input.dataset.touched === '1') run({ t: 'input' });
    });
    input.addEventListener('change', () => {
      input.dataset.touched = '1';
      run({ t: 'change' });
    });
    input.__validate = () => {
      input.dataset.touched = '1';
      return run({ t: 'submit' });
    };
  }
  function applyState(group, helper, result) {
    group.classList.remove('valid', 'invalid');
    if (!result.touched && !result.forced) return;
    if (result.valid) group.classList.add('valid');
    else if (result.showError) group.classList.add('invalid');
    if (helper) {
      const prefix = helper.querySelector('i')?.outerHTML ?? '';
      helper.innerHTML = prefix + ' ' + (result.message || helper.dataset.default || '');
    }
  }

  function validateName(raw) {
    const v = (raw || '').trim();
    if (!v) return { valid: false, showError: false, touched: !!v, message: 'Please enter your full name.' };
    if (/\d/.test(v)) {
      return { valid: false, showError: true, touched: true, message: 'Name cannot contain numbers. Please use letters only.' };
    }
    if (v.length < 2) return { valid: false, showError: true, touched: true, message: 'Name must be at least 2 characters long.' };
    if (v.length > 100) return { valid: false, showError: true, touched: true, message: 'Name is too long (maximum 100 characters).' };
    if (!/^[A-Za-z\u00C0-\u024F\s'.-]+$/.test(v)) {
      return {
        valid: false, showError: true, touched: true,
        message: 'Name can only contain letters, spaces, hyphens, and apostrophes.'
      };
    }
    return { valid: true, touched: true, message: 'Name looks great.' };
  }

  function normalizePhone(phone) {
    if (!phone) return '';
    const cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      return '233' + cleaned.substring(1);
    }
    if (cleaned.startsWith('233') && cleaned.length === 12) {
      return cleaned;
    }
    return cleaned;
  }
  function formatPhoneForDisplay(phone) {
    const s = String(phone || '').replace(/\D/g, '');
    if (s.length === 10) return s;
    if (s.startsWith('233') && s.length === 12) return '0' + s.substring(3);
    return s;
  }
  function validatePhone(raw) {
    const v = raw || '';
    const digits = v.replace(/\D/g, '');
    if (!digits) return { valid: false, showError: false, touched: !!v, message: 'Please enter your 10-digit phone number.' };

    if (digits.length < 10) {
      return {
        valid: false, showError: true, touched: true,
        message: `Phone number must be exactly 10 digits (${digits.length}/10 entered).`
      };
    }
    if (!digits.startsWith('0')) {
      return {
        valid: false, showError: true, touched: true,
        message: 'Local phone number must start with 0 (e.g. 0244123456).'
      };
    }

    const validPrefixes = ['020', '023', '024', '025', '026', '027', '028', '029', '050', '053', '054', '055', '056', '057', '058', '059'];
    const pre = digits.substring(0, 3);
    if (!validPrefixes.includes(pre)) {
      return {
        valid: false, showError: true, touched: true,
        message: 'Unrecognized Ghana network prefix (024, 054, 020, etc.). Please verify.'
      };
    }
    return {
      valid: true, touched: true,
      message: 'Valid phone number (' + digits + ').'
    };
  }

  function validateEmail(raw) {
    const v = (raw || '').trim();
    if (!v) return { valid: true, touched: !!raw, message: 'Optional — leave blank if you don\u2019t have an email.' };
    if (v.length > 254) return { valid: false, showError: true, touched: true, message: 'Email address is too long.' };

    // Strict RFC 5322 compliant regex for standard email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!emailRegex.test(v)) {
      return { valid: false, showError: true, touched: true, message: 'Please enter a valid email address (e.g. name@example.com).' };
    }
    const [localPart, domain] = v.split('@');
    if (localPart.length > 64) return { valid: false, showError: true, touched: true, message: 'The username part of your email is too long.' };
    if (!domain || !domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
      return { valid: false, showError: true, touched: true, message: 'Email domain is invalid (e.g. gmail.com).' };
    }
    return { valid: true, touched: true, message: 'Valid email address. We will send a copy of your e-ticket here.' };
  }

  function validateMemberStatus(raw) {
    const v = (raw || '').trim();
    if (!v) return { valid: false, showError: false, touched: !!v, message: 'Please select your membership / attendee status.' };
    return { valid: true, touched: true, message: 'Status selected.' };
  }

  function validateLocation(raw) {
    const v = (raw || '').trim();
    if (!v) return { valid: true, touched: !!raw, message: 'Optional — helps us plan logistics.' };
    if (v.length > 100) return { valid: false, showError: true, touched: true, message: 'Location is too long (max 100 characters).' };
    if (!/^[A-Za-z0-9\u00C0-\u024F\s,.'-]+$/.test(v)) {
      return { valid: false, showError: true, touched: true, message: 'Only letters, digits, spaces and common punctuation allowed.' };
    }
    return { valid: true, touched: true, message: 'Thanks! This helps with transport planning.' };
  }

  async function loadLiveCount() {
    if (!liveCount) return;
    try {
      const API_URL = window._APP_CONFIG && window._APP_CONFIG.apiUrl;
      if (!API_URL) return;
      const res = await fetch(API_URL + '/health', { cache: 'no-store' });
      if (res.ok) {
        liveCount.innerHTML = '<i class="fa-solid fa-circle-check" style="color:#35d39a"></i> Online';
      }
    } catch (_) {
      liveCount.textContent = 'Accepting';
    }
  }

  function setLoading(loading) {
    if (loading) {
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
    } else {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  }

  async function onSubmit(e) {
    e.preventDefault();

    const fields = ['name', 'contact', 'memberStatus', 'email', 'location'];
    let firstInvalid = null;
    for (const id of fields) {
      const el = document.getElementById(id);
      if (el && typeof el.__validate === 'function') {
        const ok = el.__validate();
        if (!ok && !firstInvalid) firstInvalid = el;
      }
    }
    if (firstInvalid) {
      showToast('Please fix the highlighted fields before submitting.', 'warn');
      firstInvalid.focus({ preventScroll: false });
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setLoading(true);
    try {
      const API_URL = (window._APP_CONFIG && window._APP_CONFIG.apiUrl) || window.API_BASE_URL || (window.location.origin + '/api');

      const payload = {
        name: document.getElementById('name').value.trim(),
        contact: document.getElementById('contact').value.trim(),
        memberStatus: (document.getElementById('memberStatus')?.value || '').trim(),
        email: document.getElementById('email').value.trim(),
        location: document.getElementById('location').value.trim()
      };

      const response = await fetch(API_URL + '/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let data;
      try { data = await response.json(); } catch (_) { data = {}; }

      if (!response.ok || !data || data.success === false) {
        const code = data && data.code;
        let msg = (data && data.message) || 'Something went wrong. Please try again.';
        if (code === 'DUPLICATE_CONTACT') {
          msg = 'This phone number has already been registered. ' +
            'If this is you, check your SMS for the ticket we sent. ' +
            'Each person may register only once.';
        } else if (response.status === 400) {
          msg = (data && data.message) || 'Some fields need your attention — please review and try again.';
        } else if (response.status >= 500) {
          msg = 'Server is temporarily busy. Please try again in a moment.';
        }
        showErrorModal(msg);
        setLoading(false);
        return;
      }

      const name = data.name || payload.name;
      const ticketId = data.ticketId;

      // Tablet / Kiosk Mode:
      // 1. Show sleek top banner with timer/loading countdown
      showTopSuccess(name, ticketId);

      // 2. Immediately clear form for the next user in line & focus first field
      resetForm();

    } catch (err) {
      console.error(err);
      showErrorModal('We couldn\u2019t reach the server right now. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  function extractFirst(full) {
    if (!full) return 'friend';
    const parts = full.trim().split(/\s+/);
    return parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase() : 'friend';
  }

  function showErrorModal(msg) {
    errorMessage.textContent = msg;
    openModal(errorModal);
  }
})();
