// API Configuration - Loaded dynamically from server
let API_BASE_URL = 'http://localhost:3000/api'; // Default fallback

// Load API configuration from server
(async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    API_BASE_URL = config.apiUrl;
    console.log('✅ API URL loaded:', API_BASE_URL);
  } catch (error) {
    console.warn('⚠️ Could not load API config, using default:', API_BASE_URL);
  }
})();
