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
  let errorModalTimer = null;

  if (topBannerCloseBtn && topSuccessBanner) {
    topBannerCloseBtn.addEventListener('click', hideTopSuccess);
  }

  document.getElementById('errorCloseBtn')?.addEventListener('click', () => {
    if (errorModalTimer) {
      clearTimeout(errorModalTimer);
      errorModalTimer = null;
    }
    closeModal(errorModal);
    resetForm();
  });
  document.querySelectorAll('.modal-backdrop').forEach((bd) => {
    bd.addEventListener('click', () => {
      if (errorModalTimer) {
        clearTimeout(errorModalTimer);
        errorModalTimer = null;
      }
      closeModal(errorModal);
      resetForm();
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (errorModalTimer) {
        clearTimeout(errorModalTimer);
        errorModalTimer = null;
      }
      closeModal(errorModal);
      hideTopSuccess();
      resetForm();
    }
  });

  loadLiveCount();
  initValidators();
  initCustomDropdown();
  initCountryPicker();

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
      valueDisplay.textContent = '';
    }
    if (wrap) {
      wrap.classList.remove('has-value', 'is-open');
    }
    if (menu) {
      menu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('selected'));
    }

    // Reset country selector back to Ghana default
    const countryPicker = document.getElementById('countryPicker');
    if (countryPicker) countryPicker.classList.remove('is-open');
    const countrySelect = document.getElementById('countrySelect');
    if (countrySelect) {
      countrySelect.value = 'GH';
      countrySelect.dispatchEvent(new Event('change'));
    }

    // Reset validation states & helper texts
    const defaultHelpers = {
      name: 'Enter your full legal name (letters, spaces, hyphens, apostrophes)',
      contact: 'e.g. 0244123456 (10 digits)',
      memberStatus: 'Select membership status',
      email: 'For your e-ticket & event reminders',
      location: 'City or residential area'
    };
    const fields = ['name', 'contact', 'memberStatus', 'email', 'location'];
    fields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        delete el.dataset.touched;
        const grp = el.closest('.form-group');
        if (grp) grp.classList.remove('valid', 'invalid');
        const helper = document.getElementById(id + 'Helper');
        if (helper) {
          const icon = helper.querySelector('i')?.outerHTML || '<i class="fa-solid fa-circle-info"></i>';
          const defaultMsg = helper.getAttribute('data-default') || defaultHelpers[id] || '';
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

  function getSelectedCountry() {
    const countrySelect = document.getElementById('countrySelect');
    if (!countrySelect) {
      return { code: 'GH', dial: '+233', digits: 10, omitZero: true };
    }
    const opt = countrySelect.selectedOptions[0] || countrySelect.options[0];
    return {
      code: opt.value,
      dial: opt.getAttribute('data-dial') || '+233',
      digits: parseInt(opt.getAttribute('data-digits'), 10) || 15,
      omitZero: opt.getAttribute('data-omit-zero') === 'true'
    };
  }

  function initCountryPicker() {
    const countryPicker = document.getElementById('countryPicker');
    const countrySelect = document.getElementById('countrySelect');
    const countryIso = document.getElementById('countryIso');
    const countryDialCode = document.getElementById('countryDialCode');
    const countrySearchInput = document.getElementById('countrySearchInput');
    const countryList = document.getElementById('countryList');
    const contactInput = document.getElementById('contact');
    const phoneHelper = document.getElementById('phoneHelper');
    const parentRow = countryPicker?.closest('.form-grid-row');
    const parentGroup = countryPicker?.closest('.form-group');
    if (!countryPicker || !countrySelect || !countryList) return;

    // Populate custom country items from select options
    const countries = Array.from(countrySelect.options).map((opt) => {
      const code = opt.value;
      const dial = opt.getAttribute('data-dial') || '';
      const digits = opt.getAttribute('data-digits') || '15';
      const omitZero = opt.getAttribute('data-omit-zero') || 'false';
      const name = opt.textContent.replace(/\s*\(\+[^)]+\)\s*$/, '').trim();
      return { code, dial, digits, omitZero, name };
    });

    countryList.innerHTML = countries.map((c) => {
      const isSel = c.code === countrySelect.value ? ' selected' : '';
      return `
        <div class="country-item${isSel}" data-code="${c.code}" data-dial="${c.dial}" data-name="${c.name.toLowerCase()}" role="option">
          <span class="country-item-iso">${c.code}</span>
          <span class="country-item-name">${c.name}</span>
          <span class="country-item-dial">${c.dial}</span>
          <i class="fa-solid fa-check country-item-check"></i>
        </div>
      `;
    }).join('');

    function openPicker() {
      // Close attendee status dropdown if open
      const customSelectWrap = document.getElementById('customSelectWrap');
      if (customSelectWrap && customSelectWrap.classList.contains('is-open')) {
        customSelectWrap.classList.remove('is-open');
      }

      countryPicker.classList.add('is-open');
      countryPicker.setAttribute('aria-expanded', 'true');
      if (parentGroup) parentGroup.classList.add('is-active-field');
      if (parentRow) parentRow.classList.add('is-active-row');

      if (countrySearchInput) {
        countrySearchInput.value = '';
        filterCountries('');
        setTimeout(() => countrySearchInput.focus(), 60);
      }

      const selectedItem = countryList.querySelector('.country-item.selected');
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }

    function closePicker() {
      countryPicker.classList.remove('is-open');
      countryPicker.setAttribute('aria-expanded', 'false');
      if (parentGroup) parentGroup.classList.remove('is-active-field');
      if (parentRow) parentRow.classList.remove('is-active-row');
    }

    // Toggle dropdown on badge click
    countryPicker.addEventListener('click', (e) => {
      if (e.target.closest('.country-dropdown-menu')) return;
      e.stopPropagation();
      if (countryPicker.classList.contains('is-open')) {
        closePicker();
      } else {
        openPicker();
      }
    });

    // Select country item
    countryList.addEventListener('click', (e) => {
      const item = e.target.closest('.country-item');
      if (!item) return;
      e.stopPropagation();

      const code = item.getAttribute('data-code');
      countrySelect.value = code;
      countrySelect.dispatchEvent(new Event('change'));

      countryList.querySelectorAll('.country-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');

      closePicker();
      if (contactInput) contactInput.focus();
    });

    // Instant real-time search filtering
    function filterCountries(q) {
      const term = q.trim().toLowerCase();
      let matches = 0;
      countryList.querySelectorAll('.country-item').forEach((item) => {
        const name = item.getAttribute('data-name') || '';
        const code = (item.getAttribute('data-code') || '').toLowerCase();
        const dial = (item.getAttribute('data-dial') || '').toLowerCase();
        const ok = !term || name.includes(term) || code.includes(term) || dial.includes(term);
        item.style.display = ok ? 'flex' : 'none';
        if (ok) matches++;
      });

      let noRes = countryList.querySelector('.country-no-results');
      if (matches === 0) {
        if (!noRes) {
          noRes = document.createElement('div');
          noRes.className = 'country-no-results';
          noRes.textContent = 'No matching country found';
          countryList.appendChild(noRes);
        }
        noRes.style.display = 'block';
      } else if (noRes) {
        noRes.style.display = 'none';
      }
    }

    if (countrySearchInput) {
      countrySearchInput.addEventListener('input', (e) => {
        filterCountries(e.target.value);
      });
      countrySearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const firstVisible = countryList.querySelector('.country-item[style*="display: flex"], .country-item:not([style*="display: none"])');
          if (firstVisible) {
            firstVisible.click();
          }
        }
      });
    }

    // Outside click closes dropdown
    document.addEventListener('click', (e) => {
      if (!countryPicker.contains(e.target)) {
        closePicker();
      }
    });

    // Escape key closes dropdown
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && countryPicker.classList.contains('is-open')) {
        closePicker();
      }
    });

    function syncCountry() {
      const c = getSelectedCountry();
      if (countryIso) countryIso.textContent = c.code;
      if (countryDialCode) countryDialCode.textContent = c.dial;

      if (countryList) {
        countryList.querySelectorAll('.country-item').forEach((item) => {
          if (item.getAttribute('data-code') === c.code) {
            item.classList.add('selected');
          } else {
            item.classList.remove('selected');
          }
        });
      }

      if (contactInput) {
        contactInput.setAttribute('maxlength', c.digits);
        const cleaned = contactInput.value.replace(/\D/g, '').slice(0, c.digits);
        if (contactInput.value !== cleaned) {
          contactInput.value = cleaned;
        }

        const helperDefault = c.code === 'GH'
          ? 'e.g. 0244123456 (10 digits)'
          : `e.g. up to ${c.digits} digits for ${c.code} (${c.dial})`;
        if (phoneHelper) {
          phoneHelper.setAttribute('data-default', helperDefault);
          if (!contactInput.value) {
            phoneHelper.innerHTML = `<i class="fa-solid fa-circle-info"></i> ${helperDefault}`;
          }
        }

        if (contactInput.dataset.touched === '1' && typeof contactInput.__validate === 'function') {
          contactInput.__validate();
        }
      }
    }

    countrySelect.addEventListener('change', syncCountry);
    syncCountry();
  }

  function initValidators() {
    const nameInput = document.getElementById('name');
    const contactInput = document.getElementById('contact');
    const memberStatusInput = document.getElementById('memberStatus');
    const emailInput = document.getElementById('email');
    const locationInput = document.getElementById('location');

    // Dynamic numeric constraint (respects country's max digits)
    enforceDigitsOnly(contactInput);

    bindField(nameInput, validateName);
    bindField(contactInput, validatePhone);
    bindField(memberStatusInput, validateMemberStatus);
    bindField(emailInput, validateEmail);
    bindField(locationInput, validateLocation);
  }

  function bindField(input, fn) {
    if (!input) return;
    const group = input.closest('.form-group');
    const helper = document.getElementById(input.id + 'Helper');
    const run = () => {
      const res = fn(input.value);
      applyState(group, helper, res);
      return res.valid;
    };
    input.addEventListener('blur', run);
    input.addEventListener('input', () => {
      if (input.dataset.touched === '1') run();
    });
    input.addEventListener('change', () => {
      if (input.dataset.touched === '1') run();
    });
    input.__validate = () => {
      input.dataset.touched = '1';
      return run();
    };
  }

  function applyState(group, helper, result) {
    if (!group) return;
    group.classList.remove('valid', 'invalid');
    if (!result.touched) return;
    if (result.valid) group.classList.add('valid');
    else if (result.showError) group.classList.add('invalid');
    if (helper && result.message) {
      const prefix = helper.querySelector('i')?.outerHTML || '';
      helper.innerHTML = prefix + ' ' + result.message;
    }
  }

  function validateName(raw) {
    const v = (raw || '').trim();
    if (!v) return { valid: false, showError: false, touched: false, message: 'Please enter your full legal name.' };
    if (/\d/.test(v)) {
      return { valid: false, showError: true, touched: true, message: 'Name cannot contain numbers. Use letters only.' };
    }
    if (v.length < 2) return { valid: false, showError: true, touched: true, message: 'Name must be at least 2 characters long.' };
    if (!/^[A-Za-z\u00C0-\u024F\s'.-]+$/.test(v)) {
      return { valid: false, showError: true, touched: true, message: 'Name can only contain letters, spaces, hyphens, and apostrophes.' };
    }
    return { valid: true, touched: true, message: 'Name looks great.' };
  }

  function enforceDigitsOnly(input) {
    if (!input) return;

    function getMaxLen() {
      const attr = parseInt(input.getAttribute('maxlength'), 10);
      return !isNaN(attr) && attr > 0 ? attr : 15;
    }

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
      const maxLen = getMaxLen();
      const cleaned = input.value.replace(/\D/g, '').slice(0, maxLen);
      if (input.value !== cleaned) {
        input.value = cleaned;
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const maxLen = getMaxLen();
      const pasteText = (e.clipboardData || window.clipboardData)?.getData('text') || '';
      const digitsOnly = pasteText.replace(/\D/g, '').slice(0, maxLen);
      input.value = digitsOnly;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function formatArrangedPhone(rawDigits, country) {
    let clean = (rawDigits || '').replace(/\D/g, '');
    if (country.omitZero && clean.startsWith('0')) {
      clean = clean.replace(/^0+/, '');
    }
    const dial = country.dial || '+';
    return `${dial}${clean}`;
  }

  function validatePhone(raw) {
    const v = raw || '';
    const digits = v.replace(/\D/g, '');
    const country = getSelectedCountry();

    if (!digits) {
      return { valid: false, showError: false, touched: !!v, message: `Please enter phone number (${country.digits} digits max).` };
    }

    if (country.code === 'GH') {
      if (digits.length < 10) {
        return {
          valid: false, showError: true, touched: true,
          message: `Ghana phone number must be exactly 10 digits (${digits.length}/10 entered).`
        };
      }
      if (!digits.startsWith('0')) {
        return {
          valid: false, showError: true, touched: true,
          message: 'Ghana phone number must start with 0 (e.g. 0244123456).'
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
        message: `Valid Ghana number (${digits}) → +233 ${digits.substring(1)}`
      };
    }

    // Other country validation (e.g. USA, UK, Canada, Nigeria, etc.)
    const minDigits = (country.code === 'US' || country.code === 'CA') ? 10 : 7;
    const maxDigits = country.digits || 15;

    if (digits.length < minDigits) {
      return {
        valid: false, showError: true, touched: true,
        message: `Phone number is too short (${digits.length}/${minDigits} min digits).`
      };
    }
    if (digits.length > maxDigits) {
      return {
        valid: false, showError: true, touched: true,
        message: `Phone number cannot exceed ${maxDigits} digits.`
      };
    }

    const arranged = formatArrangedPhone(digits, country);
    return {
      valid: true, touched: true,
      message: `Valid phone number → ${arranged}`
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

      const country = getSelectedCountry();
      const rawContact = document.getElementById('contact').value.trim();
      const arrangedContact = formatArrangedPhone(rawContact, country);

      const payload = {
        name: document.getElementById('name').value.trim(),
        contact: arrangedContact,
        rawContact: rawContact,
        countryCode: country.code,
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
        let title = 'We hit a snag';
        let isDuplicate = false;

        if (code === 'DUPLICATE_REGISTRATION' || code === 'DUPLICATE_CONTACT' || /already exists|already registered/i.test(msg)) {
          title = "You're Already Registered!";
          msg = 'You are already registered! Please check your SMS for your ticket ID.';
          isDuplicate = true;
        } else if (response.status === 400) {
          title = 'Please Check Your Details';
          msg = (data && data.message) || 'Some fields need your attention — please review and try again.';
        } else if (response.status >= 500) {
          title = 'Server Busy';
          msg = 'Server is temporarily busy. Please try again in a moment.';
        }
        showErrorModal(msg, title, isDuplicate);
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
      showErrorModal('We couldn\u2019t reach the server right now. Check your connection and try again.', 'Connection Issue', false);
    } finally {
      setLoading(false);
    }
  }

  function extractFirst(full) {
    if (!full) return 'friend';
    const parts = full.trim().split(/\s+/);
    return parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase() : 'friend';
  }

  function showErrorModal(msg, title = 'We hit a snag', isDuplicate = false) {
    const errorTitle = document.getElementById('errorTitle');
    const errorIconCircle = document.querySelector('.error-icon-circle');
    const errorIcon = errorIconCircle ? errorIconCircle.querySelector('i') : null;
    const errorCloseBtn = document.getElementById('errorCloseBtn');

    if (errorTitle) errorTitle.textContent = title;
    if (errorMessage) errorMessage.textContent = msg;

    if (errorCloseBtn) {
      errorCloseBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> Close';
    }

    if (errorModalTimer) {
      clearTimeout(errorModalTimer);
      errorModalTimer = null;
    }

    if (errorIconCircle) {
      if (isDuplicate) {
        errorIconCircle.classList.add('is-info');
        if (errorIcon) errorIcon.className = 'fa-solid fa-circle-check';
        // Immediately clear input fields so the form is fresh
        resetForm();
        // Automatically close modal after 3.5s
        errorModalTimer = setTimeout(() => {
          closeModal(errorModal);
          resetForm();
        }, 3500);
      } else {
        errorIconCircle.classList.remove('is-info');
        if (errorIcon) errorIcon.className = 'fa-solid fa-xmark';
      }
    }

    openModal(errorModal);
  }
})();
