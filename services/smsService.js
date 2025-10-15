const axios = require('axios');

/**
 * Send registration SMS via mNotify API
 * @param {string} phoneNumber - Recipient phone number (e.g., "0244123456" or "233244123456")
 * @param {string} name - Recipient's name
 * @param {string} ticketId - Generated ticket ID
 * @param {string} downloadUrl - URL to download ticket
 * @returns {Promise<Object>} Response object with success status
 */
async function sendRegistrationSMS(phoneNumber, name, ticketId, downloadUrl) {
  // Format phone number to ensure it's in the correct format
  const formattedPhone = formatPhoneNumber(phoneNumber);
  
  // Shorten message - remove URL to avoid fraud detection
  // Users can access ticket via email or by visiting the website
  const message = `Dear ${name}, Thank you for registering for Supernatural Breakfast Meeting 2025.\nYour TicketID is: ${ticketId}\nGod bless you and Enjoy the Service.`;

  // mNotify API payload structure
  const smsData = {
    key: process.env.MNOTIFY_API_KEY,        // Your mNotify API key
    recipient: [formattedPhone],              // Array of phone numbers
    sender: process.env.MNOTIFY_SENDER_ID,   // Your approved sender ID
    message: message,
    is_schedule: false,                       // Send immediately
    schedule_date: ''                         // Empty for immediate sending
  };

  try {
    // mNotify API endpoint
    const response = await axios.post('https://api.mnotify.com/api/sms/quick', smsData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 15 seconds timeout
    });

    console.log('SMS sent successfully:', response.data);
    
    // Check if the API returned success
    if (response.data && response.data.code === '2000') {
      return { 
        success: true, 
        message: 'SMS sent successfully',
        response: response.data 
      };
    } else {
      return { 
        success: false, 
        message: response.data?.message || 'Failed to send SMS',
        response: response.data 
      };
    }
  } catch (error) {
    console.error('SMS sending error:', error.response?.data || error.message);
    
    return {
      success: false,
      message: error.response?.data?.message || error.message,
      error: error.response?.data || error.message
    };
  }
}

/**
 * Format phone number to international format
 * @param {string} phoneNumber - Phone number in various formats
 * @returns {string} Formatted phone number
 */
function formatPhoneNumber(phoneNumber) {
  // Remove all spaces, dashes, and plus signs
  let cleaned = phoneNumber.replace(/[\s\-+]/g, '');
  
  // If number starts with 0, replace with 233 (Ghana country code)
  if (cleaned.startsWith('0')) {
    cleaned = '233' + cleaned.substring(1);
  }
  
  // If number doesn't start with 233, add it
  if (!cleaned.startsWith('233')) {
    cleaned = '233' + cleaned;
  }
  
  return cleaned;
}

/**
 * Send bulk SMS to multiple recipients (optional utility function)
 * @param {Array} recipients - Array of objects with {phoneNumber, name, ticketId, downloadUrl}
 * @returns {Promise<Array>} Array of results for each SMS
 */
async function sendBulkRegistrationSMS(recipients) {
  const results = [];
  
  for (const recipient of recipients) {
    try {
      const result = await sendRegistrationSMS(
        recipient.phoneNumber,
        recipient.name,
        recipient.ticketId,
        recipient.downloadUrl
      );
      results.push({
        phoneNumber: recipient.phoneNumber,
        ...result
      });
      
      // Add small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      results.push({
        phoneNumber: recipient.phoneNumber,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

module.exports = {
  sendRegistrationSMS,
  sendBulkRegistrationSMS
};