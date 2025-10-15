const googleSheetsService = require('./googleSheetsService');

const USE_GOOGLE_SHEETS = process.env.USE_GOOGLE_SHEETS === 'true';

let googleSheetsEnabled = false;

// Initialize Google Sheets (no local Excel file)
async function initStorage() {
  if (USE_GOOGLE_SHEETS) {
    googleSheetsEnabled = await googleSheetsService.initGoogleSheets();
    if (googleSheetsEnabled) {
      await googleSheetsService.initializeSpreadsheet();
    }
  } else {
    console.error('⚠️  Google Sheets is not enabled. Please set USE_GOOGLE_SHEETS=true in .env');
  }
}

// Save registration to Google Sheets only
async function saveToExcel(registration) {
  try {
    if (!googleSheetsEnabled) {
      throw new Error('Google Sheets is not enabled. Please set USE_GOOGLE_SHEETS=true in .env');
    }

    await googleSheetsService.saveToGoogleSheets(registration);
    console.log('Registration saved to Google Sheets:', registration.ticketId);
    return { success: true };
  } catch (error) {
    console.error('Google Sheets save error:', error);
    throw error;
  }
}

// Get all registrations from Google Sheets only
async function getAllRegistrations() {
  try {
    if (!googleSheetsEnabled) {
      console.error('Google Sheets is not enabled');
      return [];
    }

    const data = await googleSheetsService.getAllRegistrations();
    return data;
  } catch (error) {
    console.error('Google Sheets read error:', error);
    return [];
  }
}

// Update registration status (email/SMS sent) in Google Sheets
async function updateRegistrationStatus(ticketId, status) {
  try {
    if (!googleSheetsEnabled) {
      console.error('Google Sheets is not enabled');
      return { success: false };
    }

    await googleSheetsService.updateRegistrationStatus(ticketId, status);
    return { success: true };
  } catch (error) {
    console.error('Google Sheets update error:', error);
    return { success: false };
  }
}

module.exports = {
  initStorage,
  saveToExcel,
  getAllRegistrations,
  updateRegistrationStatus
};
