const axios = require('axios');

let intervalId = null;
let initialTimeoutId = null;

/**
 * Determine the URL to ping to keep the service awake.
 * Render automatically injects RENDER_EXTERNAL_URL (e.g. https://sbm-recordapp.onrender.com).
 */
function getPingUrl() {
  if (process.env.SELF_PING_URL) {
    return process.env.SELF_PING_URL.trim();
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    return `${process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '')}/api/health`;
  }
  if (process.env.RENDER_EXTERNAL_HOSTNAME) {
    return `https://${process.env.RENDER_EXTERNAL_HOSTNAME}/api/health`;
  }
  if (process.env.APP_URL) {
    return `${process.env.APP_URL.replace(/\/+$/, '')}/api/health`;
  }
  if (process.env.API_URL) {
    return `${process.env.API_URL.replace(/\/+$/, '')}/health`;
  }
  const port = process.env.PORT || 3000;
  return `http://127.0.0.1:${port}/api/health`;
}

/**
 * Perform a single keep-alive ping.
 */
async function pingSelf() {
  const pingUrl = getPingUrl();
  const timestamp = new Date().toISOString();

  try {
    const response = await axios.get(pingUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'SBM-KeepAlive-Ping/1.0',
        'Cache-Control': 'no-cache'
      },
      validateStatus: (status) => status < 500
    });

    console.log(`[KeepAlive] 💓 Heartbeat ping to ${pingUrl} - Status: ${response.status} (${timestamp})`);
    return { success: true, status: response.status, url: pingUrl };
  } catch (error) {
    console.warn(`[KeepAlive] ⚠️ Ping to ${pingUrl} returned: ${error.message} (${timestamp})`);

    // Fallback: If external ping failed, try local loopback to keep process warm
    const port = process.env.PORT || 3000;
    const localUrl = `http://127.0.0.1:${port}/api/health`;
    if (pingUrl !== localUrl) {
      try {
        await axios.get(localUrl, { timeout: 5000 });
        console.log(`[KeepAlive] 💓 Internal fallback ping succeeded (${localUrl})`);
      } catch (_) {}
    }
    return { success: false, error: error.message };
  }
}

/**
 * Start the background keep-alive scheduler.
 * Render free tier spins down after 15 mins of inactivity.
 * Pinging every 10 minutes (600,000 ms) guarantees it never reaches the 15-min idle limit.
 */
function startKeepAlive() {
  if (process.env.DISABLE_KEEP_ALIVE === 'true') {
    console.log('[KeepAlive] Disabled via DISABLE_KEEP_ALIVE env variable.');
    return;
  }

  if (intervalId) {
    return; // Already running
  }

  const intervalMs = parseInt(process.env.KEEP_ALIVE_INTERVAL_MS, 10) || 10 * 60 * 1000; // 10 minutes
  const pingUrl = getPingUrl();

  console.log(`[KeepAlive] 🚀 Keep-alive background service started.`);
  console.log(`[KeepAlive] Target: ${pingUrl} | Interval: ${intervalMs / 60000} minutes`);

  // First ping after 45 seconds to let server finish initial startup
  initialTimeoutId = setTimeout(() => {
    pingSelf();
  }, 45000);

  // Then recurring ping every 10 minutes
  intervalId = setInterval(() => {
    pingSelf();
  }, intervalMs);

  // Ensure timer does not prevent process exit during clean shutdown
  if (intervalId.unref) intervalId.unref();
  if (initialTimeoutId.unref) initialTimeoutId.unref();
}

/**
 * Stop keep-alive timer (for testing or shutdown)
 */
function stopKeepAlive() {
  if (initialTimeoutId) {
    clearTimeout(initialTimeoutId);
    initialTimeoutId = null;
  }
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[KeepAlive] Stopped.');
  }
}

module.exports = {
  startKeepAlive,
  stopKeepAlive,
  pingSelf,
  getPingUrl
};
