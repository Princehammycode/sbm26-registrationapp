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

  function getApiUrl() {
    return (window._APP_CONFIG && window._APP_CONFIG.apiUrl) ||
      window.API_BASE_URL ||
      (window.location.origin + '/api');
  }

  const form = document.getElementById('convertForm');
  const submitBtn = document.getElementById('submitBtn');
  const btnDefault = submitBtn?.querySelector('.btn-default');
  const btnLoading = submitBtn?.querySelector('.btn-loading');

  const topSuccessBanner = document.getElementById('topSuccessBanner');
  const topBannerDesc = document.getElementById('topBannerDesc');
  const topBannerCloseBtn = document.getElementById('topBannerCloseBtn');
  const topBannerProgressBar = document.getElementById('topBannerProgressBar');

  const nameInput = document.getElementById('name');
  const contactInput = document.getElementById('contact');
  const locationInput = document.getElementById('location');

  let bannerTimer = null;

  if (topBannerCloseBtn) {
    topBannerCloseBtn.addEventListener('click', hideTopSuccess);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideTopSuccess();
  });

  // Focus on name on load
  if (nameInput) {
    setTimeout(() => nameInput.focus(), 150);
  }

  initValidators();
  if (form) {
    form.addEventListener('submit', onSubmit);
  }

  function showTopSuccess(name) {
    if (!topSuccessBanner) return;

    if (topBannerDesc) {
      topBannerDesc.textContent = `Record for ${name || 'New Convert'} saved successfully. Form ready for the next person.`;
    }

    if (bannerTimer) {
      clearTimeout(bannerTimer);
      bannerTimer = null;
    }

    topSuccessBanner.classList.remove('show', 'animate-progress');
    if (topBannerProgressBar) {
      void topBannerProgressBar.offsetWidth; // trigger reflow
    }

    requestAnimationFrame(() => {
      topSuccessBanner.classList.add('show', 'animate-progress');
    });

    bannerTimer = setTimeout(() => {
      hideTopSuccess();
    }, 4000);
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

    const fields = ['name', 'contact', 'location'];
    fields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        delete el.dataset.touched;
        const grp = el.closest('.form-group');
        if (grp) grp.classList.remove('valid', 'invalid');
        const helper = document.getElementById(id + 'Helper');
        if (helper) {
          const icon = helper.querySelector('i')?.outerHTML || '';
          const def = helper.getAttribute('data-default') || '';
          if (def) helper.innerHTML = icon + ' ' + def;
        }
      }
    });

    // Auto focus name input for next person
    setTimeout(() => {
      if (nameInput) nameInput.focus();
    }, 80);
  }

  function initValidators() {
    enforceDigitsOnly(contactInput, 10);
    bindField(nameInput, validateName);
    bindField(contactInput, validatePhone);
    bindField(locationInput, validateLocation);
  }

  function enforceDigitsOnly(input, maxLen = 10) {
    if (!input) return;

    input.addEventListener('keydown', (e) => {
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
    const run = () => {
      const res = fn(input.value);
      applyState(group, helper, res);
      return res.valid;
    };
    input.addEventListener('blur', run);
    input.addEventListener('input', () => {
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
    if (!v) return { valid: false, showError: false, touched: false, message: 'Please enter the full name.' };
    if (/\d/.test(v)) {
      return { valid: false, showError: true, touched: true, message: 'Name cannot contain numbers. Use letters only.' };
    }
    if (v.length < 2) return { valid: false, showError: true, touched: true, message: 'Name must be at least 2 characters long.' };
    if (!/^[A-Za-z\u00C0-\u024F\s'.-]+$/.test(v)) {
      return { valid: false, showError: true, touched: true, message: 'Name can only contain letters, spaces, hyphens, and apostrophes.' };
    }
    return { valid: true, touched: true, message: 'Name looks great.' };
  }

  function validatePhone(raw) {
    const v = (raw || '').trim();
    const digits = v.replace(/\D/g, '');
    if (!digits) {
      return { valid: true, touched: false, message: 'Optional — 10 digits only (leave blank if no phone).' };
    }
    if (digits.length < 10) {
      return {
        valid: false, showError: true, touched: true,
        message: `Phone number must be exactly 10 digits (${digits.length}/10 entered).`
      };
    }
    if (!digits.startsWith('0')) {
      return {
        valid: false, showError: true, touched: true,
        message: 'Phone number must start with 0 (e.g. 0244123456).'
      };
    }
    return { valid: true, touched: true, message: 'Valid phone number (' + digits + ').' };
  }

  function validateLocation(raw) {
    const v = (raw || '').trim();
    if (!v) return { valid: true, touched: false, message: 'Helps with follow-up and cell fellowship connection.' };
    return { valid: true, touched: true, message: 'Location saved.' };
  }

  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    if (btnDefault) btnDefault.style.display = loading ? 'none' : 'inline-flex';
    if (btnLoading) btnLoading.style.display = loading ? 'inline-flex' : 'none';
  }

  async function onSubmit(e) {
    e.preventDefault();

    let isNameValid = nameInput ? (typeof nameInput.__validate === 'function' ? nameInput.__validate() : !!nameInput.value.trim()) : false;
    let isPhoneValid = contactInput ? (typeof contactInput.__validate === 'function' ? contactInput.__validate() : true) : true;

    if (!isNameValid) {
      if (nameInput) nameInput.focus();
      return;
    }
    if (!isPhoneValid) {
      if (contactInput) contactInput.focus();
      return;
    }

    setLoading(true);

    try {
      const apiUrl = getApiUrl();
      const payload = {
        name: (nameInput?.value || '').trim(),
        contact: (contactInput?.value || '').trim(),
        location: (locationInput?.value || '').trim() || 'Accra'
      };

      const response = await fetch(`${apiUrl}/new-converts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let data;
      try { data = await response.json(); } catch (_) { data = {}; }

      if (!response.ok || !data || data.success === false) {
        alert(data.message || 'Failed to save record. Please try again.');
        setLoading(false);
        return;
      }

      showTopSuccess(payload.name);
      resetForm();
    } catch (err) {
      console.error('Error submitting new convert:', err);
      alert('Network error. Please verify your connection and try again.');
    } finally {
      setLoading(false);
    }
  }
})();
