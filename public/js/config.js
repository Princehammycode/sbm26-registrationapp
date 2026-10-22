// API Configuration - Loaded dynamically with robust fallback
window.API_BASE_URL = window.location.origin + '/api';
window._APP_CONFIG = { apiUrl: window.location.origin + '/api' };

(async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      const config = await response.json();
      if (config && config.apiUrl) {
        window.API_BASE_URL = config.apiUrl;
        window._APP_CONFIG = { apiUrl: config.apiUrl };
        console.log('✅ API URL loaded:', config.apiUrl);
      }
    }
  } catch (error) {
    console.warn('⚠️ Using fallback API URL:', window.API_BASE_URL);
  }
})();
