// API_BASE_URL is loaded from config.js

// Check if already logged in (for login page)
if (window.location.pathname === '/login' || window.location.pathname === '/login.html') {
  const token = localStorage.getItem('adminToken');
  if (token) {
    // Already logged in, redirect to admin
    window.location.href = '/admin-dashboard';
  }
}

// Login form handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginSpinner = document.getElementById('loginSpinner');

    // Clear previous error
    errorMessage.style.display = 'none';

    // Disable button and show spinner
    loginBtn.disabled = true;
    loginBtnText.style.display = 'none';
    loginSpinner.style.display = 'inline-block';

    try {
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success) {
        // Save token to localStorage
        localStorage.setItem('adminToken', data.token);
        
        // Redirect to admin dashboard
        window.location.href = '/admin-dashboard';
      } else {
        // Show error message
        errorMessage.textContent = data.message || 'Invalid credentials';
        errorMessage.style.display = 'block';
      }
    } catch (error) {
      console.error('Login error:', error);
      errorMessage.textContent = 'Login failed. Please try again.';
      errorMessage.style.display = 'block';
    } finally {
      // Re-enable button and hide spinner
      loginBtn.disabled = false;
      loginBtnText.style.display = 'inline-block';
      loginSpinner.style.display = 'none';
    }
  });
}

// Check authentication (for protected pages)
function checkAuth() {
  const token = localStorage.getItem('adminToken');
  
  if (!token) {
    // Not logged in, redirect to login
    window.location.href = '/login';
    return false;
  }
  
  return true;
}

// Logout function - Make it globally available
window.logout = function() {
  localStorage.removeItem('adminToken');
  window.location.href = '/login';
}

// Check authentication - Make it globally available
window.checkAuth = function() {
  const token = localStorage.getItem('adminToken');
  
  if (!token) {
    // Not logged in, redirect to login
    window.location.href = '/login';
    return false;
  }
  
  return true;
}

// Get token for API calls
function getAuthToken() {
  return localStorage.getItem('adminToken');
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { checkAuth: window.checkAuth, logout: window.logout, getAuthToken };
}
