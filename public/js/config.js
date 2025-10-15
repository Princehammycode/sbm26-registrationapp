// API Configuration - Loaded dynamically from server
var API_BASE_URL = 'http://localhost:3000/api'; // Default fallback

// Track if config is loaded
var configLoaded = false;
var configPromise = null;

// Load API configuration from server
configPromise = (async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    API_BASE_URL = config.apiUrl;
    configLoaded = true;
    console.log('✅ API URL loaded:', API_BASE_URL);
    return API_BASE_URL;
  } catch (error) {
    console.warn('⚠️ Could not load API config, using default:', API_BASE_URL);
    configLoaded = true;
    return API_BASE_URL;
  }
})();

// Helper function to ensure config is loaded before making API calls
async function getApiUrl() {
  if (!configLoaded) {
    await configPromise;
  }
  return API_BASE_URL;
}
