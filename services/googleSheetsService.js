const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Google Sheets configuration
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

let sheets = null;
let auth = null;

// Initialize Google Sheets API
async function initGoogleSheets() {
  try {
    if (!SPREADSHEET_ID) {
      console.log('⚠️  GOOGLE_SPREADSHEET_ID not set. Using local Excel instead.');
      return false;
    }

    let credentials;

    // Check if credentials are provided as base64 environment variable (for deployment)
    if (process.env.GOOGLE_CREDENTIALS_BASE64) {
      console.log('📄 Loading Google credentials from environment variable');
      const credentialsJson = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8');
      credentials = JSON.parse(credentialsJson);
    } else {
      // Check if credentials file exists (for local development)
      const credentialsPath = path.join(__dirname, '..', 'google-credentials.json');
      
      if (!fs.existsSync(credentialsPath)) {
        console.log('⚠️  Google Sheets credentials not found. Using local Excel instead.');
        return false;
      }

      console.log('📄 Loading Google credentials from file');
      credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    }
    
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });

    sheets = google.sheets({ version: 'v4', auth });
    
    // Test connection by getting spreadsheet info
    await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    console.log('✅ Google Sheets connected');
    return true;
  } catch (error) {
    console.error('❌ Google Sheets initialization error:', error.message);
    console.log('⚠️  Falling back to local Excel');
    return false;
  }
}

// Save registration to Google Sheets
async function saveToGoogleSheets(registration) {
  if (!sheets || !SPREADSHEET_ID) {
    throw new Error('Google Sheets not initialized');
  }

  try {
    const values = [[
      registration.ticketId,
      registration.name,
      registration.contact,
      registration.location,
      registration.email,
      registration.registeredAt,
      registration.emailSent ? 'Yes' : 'No',
      registration.smsSent ? 'Yes' : 'No'
    ]];

    const resource = {
      values,
    };

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Registrations!A:H',
      valueInputOption: 'USER_ENTERED',
      resource,
    });

    console.log('Registration saved to Google Sheets:', registration.ticketId);
    return { success: true };
  } catch (error) {
    console.error('Google Sheets save error:', error.message);
    throw error;
  }
}

// Get all registrations from Google Sheets
async function getAllRegistrations() {
  if (!sheets || !SPREADSHEET_ID) {
    return [];
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Registrations!A2:H',
    });

    const rows = response.data.values || [];
    
    return rows.map(row => ({
      ticket_id: row[0],
      name: row[1],
      contact: row[2],
      location: row[3],
      email: row[4],
      registered_at: row[5],
      email_sent: row[6] === 'Yes',
      sms_sent: row[7] === 'Yes'
    }));
  } catch (error) {
    console.error('Google Sheets read error:', error.message);
    return [];
  }
}

// Update registration status (email/SMS sent) in Google Sheets
async function updateRegistrationStatus(ticketId, status) {
  if (!sheets || !SPREADSHEET_ID) {
    throw new Error('Google Sheets not initialized');
  }

  try {
    // Get all rows to find the ticket
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Registrations!A2:H',
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === ticketId);

    if (rowIndex === -1) {
      console.error('Ticket not found for status update:', ticketId);
      return;
    }

    // Calculate actual row number (add 2 for header and 0-based index)
    const actualRow = rowIndex + 2;

    // Update email status (column G)
    if (status.emailSent !== undefined) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Registrations!G${actualRow}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[status.emailSent ? 'Yes' : 'No']]
        }
      });
    }

    // Update SMS status (column H)
    if (status.smsSent !== undefined) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Registrations!H${actualRow}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[status.smsSent ? 'Yes' : 'No']]
        }
      });
    }

    console.log('✅ Status updated in Google Sheets:', ticketId);
  } catch (error) {
    console.error('Google Sheets status update error:', error.message);
  }
}

// Create header row if spreadsheet is empty
async function initializeSpreadsheet() {
  if (!sheets || !SPREADSHEET_ID) {
    return;
  }

  try {
    // Check if sheet exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetExists = spreadsheet.data.sheets.some(
      sheet => sheet.properties.title === 'Registrations'
    );

    if (!sheetExists) {
      // Create the sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: 'Registrations'
              }
            }
          }]
        }
      });
    }

    // Check if header exists
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Registrations!A1:H1',
    });

    if (!response.data.values || response.data.values.length === 0) {
      // Add header row
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Registrations!A1:H1',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[
            'Ticket ID',
            'Name',
            'Contact',
            'Location',
            'Email',
            'Registered At',
            'Email Sent',
            'SMS Sent'
          ]]
        }
      });
    }
  } catch (error) {
    console.error('Spreadsheet initialization error:', error.message);
  }
}

module.exports = {
  initGoogleSheets,
  saveToGoogleSheets,
  getAllRegistrations,
  updateRegistrationStatus,
  initializeSpreadsheet
};
