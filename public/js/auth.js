// Authentication Helper for SBM 2026 Admin
(function () {
  'use strict';

  function getApiBaseUrl() {
    return (window._APP_CONFIG && window._APP_CONFIG.apiUrl) ||
      window.API_BASE_URL ||
      (window.location.origin + '/api');
  }

  // Check if already logged in on login page
  const path = window.location.pathname;
  if (path === '/login' || path === '/login.html') {
    const token = localStorage.getItem('adminToken');
    if (token) {
      window.location.replace('/admin-dashboard');
    }
  }

  // Handle Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const usernameInput = document.getElementById('username');
      const passwordInput = document.getElementById('password');
      const errorMessage = document.getElementById('errorMessage');
      const errText = errorMessage ? (errorMessage.querySelector('.err-text') || errorMessage) : null;
      const loginBtn = document.getElementById('loginBtn');
      const loginBtnText = document.getElementById('loginBtnText');
      const loginSpinner = document.getElementById('loginSpinner');

      const username = (usernameInput?.value || '').trim();
      const password = (passwordInput?.value || '').trim();

      if (!username || !password) {
        if (errorMessage) {
          if (errText) errText.textContent = 'Please enter both username and password.';
          errorMessage.style.display = 'flex';
        }
        return;
      }

      // Hide error
      if (errorMessage) errorMessage.style.display = 'none';

      // Set loading
      if (loginBtn) loginBtn.disabled = true;
      if (loginBtnText) loginBtnText.style.display = 'none';
      if (loginSpinner) loginSpinner.style.display = 'inline-flex';

      try {
        const apiUrl = getApiBaseUrl();
        const response = await fetch(`${apiUrl}/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        let data;
        try { data = await response.json(); } catch (_) { data = {}; }

        if (response.ok && data.success && data.token) {
          localStorage.setItem('adminToken', data.token);
          window.location.replace('/admin-dashboard');
        } else {
          if (errorMessage) {
            if (errText) errText.textContent = data.message || 'Invalid username or password.';
            errorMessage.style.display = 'flex';
          }
        }
      } catch (error) {
        console.error('Login error:', error);
        if (errorMessage) {
          if (errText) errText.textContent = 'Unable to connect to server. Please check your network and try again.';
          errorMessage.style.display = 'flex';
        }
      } finally {
        if (loginBtn) loginBtn.disabled = false;
        if (loginBtnText) loginBtnText.style.display = 'inline-flex';
        if (loginSpinner) loginSpinner.style.display = 'none';
      }
    });
  }

  // Global Logout function
  window.logout = function () {
    try {
      localStorage.removeItem('adminToken');
      sessionStorage.clear();
    } catch (_) {}
    window.location.replace('/login');
  };

  // Global Check Auth function
  window.checkAuth = function () {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.replace('/login');
      return false;
    }
    return true;
  };

  window.getAuthToken = function () {
    return localStorage.getItem('adminToken');
  };
})();
