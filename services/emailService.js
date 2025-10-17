const SibApiV3Sdk = require('sib-api-v3-sdk');

// Initialize Brevo (Sendinblue)
let brevoClient = null;
const useBrevo = process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim() !== '';

if (useBrevo) {
  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  const apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = process.env.BREVO_API_KEY;
  brevoClient = new SibApiV3Sdk.TransactionalEmailsApi();
  console.log('✅ Brevo initialized - 300 emails/day, send to ANYONE!');
} else {
  console.error('❌ Brevo not configured! Please set BREVO_API_KEY and BREVO_FROM_EMAIL in Railway.');
}

// Email template with inline styles for better email client compatibility
const getEmailTemplate = (name, ticketCode, downloadUrl) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media only screen and (max-width: 600px) {
      .header-title { font-size: 20px !important; }
      .header-year { font-size: 20px !important; }
      .confirmation-heading { font-size: 16px !important; }
      .content-text { font-size: 14px !important; padding-left: 20px !important; padding-right: 20px !important; }
      .ticket-code { font-size: 14px !important; }
      .download-btn { font-size: 14px !important; padding: 12px 25px !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .social-handles { font-size: 11px !important; }
    }
  </style>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0px; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="background-color: #ffffff; border-radius: 8px;">
        
        <!-- Logo/Header -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background: linear-gradient(135deg, #FF6B35 0%, #F7931E 50%, #C1272D 100%); padding: 30px 20px; text-align: center;">
              <h1 class="header-title" style="color: #FFFFFF; font-size: 30px; margin: 0; letter-spacing: 0px; text-transform: uppercase; font-weight: 800; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                SUPERNATURAL<br/>BREAKFAST MEETING
              </h1>
              <p class="header-year" style="color: #FFF5E6; font-size: 30px; margin: 10px 0 0 0; letter-spacing: 0px; font-weight: 800;">2025</p>
            </td>
          </tr>
        </table>
        
        <!-- Title -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center; padding: 20px 0;">
              <h2 class="confirmation-heading" style="color: #555; font-size: 22px; margin: 0; font-weight: normal;">Event Registration Confirmation</h2>
            </td>
          </tr>
        </table>
        
        <!-- Greeting -->
        <p class="content-text mobile-padding" style="margin-bottom: 20px; font-size:18px; padding-left: 40px; padding-right: 40px;">Dear ${name},</p>
        
        <p class="content-text mobile-padding" style="margin-bottom: 15px; font-size:18px; padding-left: 40px; padding-right: 40px;">Thank you for registering for Supernatural Breakfast Meeting 2025!! We're excited to have you join us.</p>
        
        <p class="content-text mobile-padding" style="margin-bottom: 15px; font-size:18px; padding-left: 40px; padding-right: 40px;">Please click the button below to view and download your E-ticket:</p>
        
        <!-- Ticket Code -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
          <tr>
            <td class="mobile-padding" style="padding-left: 40px; padding-right: 40px;">
              <div style="background-color: #FFF5E6; padding: 15px; border-left: 4px solid #F7931E;">
                <strong class="ticket-code" style="color: #C1272D; font-size:18px;">Ticket code: ${ticketCode}</strong>
              </div>
            </td>
          </tr>
        </table>
        sm
        <!-- Download Button -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
          <tr>
            <td style="text-align: center; padding: 0 20px;">
              <a href="${downloadUrl}" target="_blank" class="download-btn" style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #F7931E 50%, #C1272D 100%); color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">DOWNLOAD YOUR E-TICKET</a>
            </td>
          </tr>
        </table>
        
        <!-- Event Details -->
        <p class="content-text mobile-padding" style="margin: 25px 0; line-height: 1.8; font-size:16px; padding-left: 40px; padding-right: 40px;">
          <strong>FROM:</strong> HHC-SBM25 Registration Team
        </p>
        
        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <tr>
            <td style="font-size: 14px; color: #666; text-align: center;">
              <p style="margin-bottom: 20px; font-weight: 600; color: #333;">Follow Us on Social Media</p>
              <p class="social-handles" style="margin-bottom: 15px; color: #777;">@DR. KWADWO BEMPAH | @HOLY HILL CHAPEL AG</p>
              
              <!-- Social Media Icons -->
              <table cellpadding="0" cellspacing="0" style="margin: 20px auto;">
                <tr>
                  <!-- Facebook -->
                  <td style="padding: 0 8px;">
                    <a href="https://facebook.com" style="text-decoration: none; display: block;">
                      <img src="https://img.icons8.com/color/48/facebook-new.png" alt="Facebook" width="45" height="45" style="display: block; border-radius: 50%;" />
                    </a>
                  </td>
                  
                  <!-- YouTube -->
                  <td style="padding: 0 8px;">
                    <a href="https://youtube.com" style="text-decoration: none; display: block;">
                      <img src="https://img.icons8.com/color/48/youtube-play.png" alt="YouTube" width="45" height="45" style="display: block; border-radius: 50%;" />
                    </a>
                  </td>
                  
                  <!-- Instagram -->
                  <td style="padding: 0 8px;">
                    <a href="https://instagram.com" style="text-decoration: none; display: block;">
                      <img src="https://img.icons8.com/color/48/instagram-new.png" alt="Instagram" width="45" height="45" style="display: block; border-radius: 50%;" />
                    </a>
                  </td>
                  
                  <!-- Twitter/X -->
                  <td style="padding: 0 8px;">
                    <a href="https://twitter.com" style="text-decoration: none; display: block;">
                      <img src="https://img.icons8.com/color/48/twitterx--v1.png" alt="Twitter" width="45" height="45" style="display: block; border-radius: 50%;" />
                    </a>
                  </td>
                  
                  <!-- TikTok -->
                  <td style="padding: 0 8px;">
                    <a href="https://tiktok.com" style="text-decoration: none; display: block;">
                      <img src="https://img.icons8.com/color/48/tiktok--v1.png" alt="TikTok" width="45" height="45" style="display: block; border-radius: 50%;" />
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin-top: 20px; font-size: 12px; color: #999;">
                © 2025 Holy Hill Chapel. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// Send registration email via Brevo
async function sendRegistrationEmail(name, email, ticketCode, downloadUrl) {
  if (!useBrevo || !brevoClient) {
    throw new Error('Brevo not configured. Please set BREVO_API_KEY and BREVO_FROM_EMAIL in Railway.');
  }

  const htmlContent = getEmailTemplate(name, ticketCode, downloadUrl);
  const subject = 'Event RSVP Confirmation - HHC-SBM';
  const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@hhc-sbm.com';
  const fromName = process.env.EMAIL_FROM_NAME || 'HHC-SBM25';

  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { name: fromName, email: fromEmail };
    sendSmtpEmail.to = [{ email: email, name: name }];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;

    await brevoClient.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email sent successfully via Brevo to:', email);
    return { success: true, provider: 'Brevo' };
  } catch (error) {
    console.error('❌ Brevo error:', error.message);
    throw error;
  }
}

module.exports = {
  sendRegistrationEmail
};
