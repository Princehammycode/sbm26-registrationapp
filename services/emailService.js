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
  console.error('❌ Brevo not configured! Please set BREVO_API_KEY and BREVO_FROM_EMAIL in .env');
}

/**
 * Professional HTML Email Template for SBM 2026
 * Streamlined, clean, single-line header, cross-client email compatible
 */
const getEmailTemplate = (name, ticketCode, downloadUrl, options = {}) => {
  const memberStatus = options.memberStatus || 'Church Member';

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>SBM 2026 Ticket Confirmation</title>
  <style>
    /* Reset & Client-Specific Styles */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #f1f5f9; }
    
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .header-title { font-size: 17px !important; }
      .ticket-code { font-size: 22px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">

  <!-- Main Wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 10px 14px;">
        
        <!-- Email Container -->
        <table role="presentation" class="email-container" width="580" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1.5px solid #e2e8f0; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);">
          
          <!-- Top Accent Gradient Line -->
          <tr>
            <td height="5" style="background: linear-gradient(90deg, #e11d48 0%, #f43f5e 50%, #fb7185 100%); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header / Brand Section -->
          <tr>
            <td align="center" style="background-color: #ffffff; padding: 32px 28px 20px; border-bottom: 1px solid #f1f5f9;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td align="center">
                    <!-- Church Badge -->
                    <div style="display: inline-block; padding: 6px 18px; border-radius: 50px; background-color: #fff1f2; border: 1.5px solid #fecdd3; margin-bottom: 14px;">
                      <span style="font-size: 13.5px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: #be123c;">HOLY HILL CHAPEL &middot; ASSEMBLIES OF GOD</span>
                    </div>
                    
                    <!-- Cohesive Single-Line Event Title -->
                    <h1 class="header-title" style="margin: 0; font-size: 21px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; color: #0f172a; line-height: 1.3;">
                      SUPERNATURAL <span style="color: #e11d48; font-style: italic; font-weight: 700; text-transform: none;">Breakfast Meeting</span> 2026
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Confirmation Status Banner -->
          <tr>
            <td align="center" class="mobile-padding" style="padding: 24px 36px 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; padding: 6px 16px; border-radius: 50px; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; font-size: 12px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 10px;">
                      &#10003; REGISTRATION CONFIRMED
                    </div>
                    <p style="margin: 0; font-size: 14px; color: #64748b; font-weight: 500;">Your seat is secured. Please find your official e-ticket pass below.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting Body -->
          <tr>
            <td class="mobile-padding" style="padding: 16px 36px 12px; color: #334155; font-size: 14.5px; line-height: 1.65;">
              <p style="margin: 0 0 10px 0; font-weight: 700; color: #0f172a; font-size: 15.5px;">Dear ${name},</p>
              <p style="margin: 0; color: #475569;">
                Thank you for registering for the <strong>Supernatural Breakfast Meeting 2026</strong>. We look forward to welcoming you to this morning of divine breakthrough, prayer, and inspiration.
              </p>
            </td>
          </tr>

          <!-- Official Ticket Pass Card -->
          <tr>
            <td class="mobile-padding" style="padding: 12px 36px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #fff1f2; border: 1.5px dashed #f43f5e; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px 22px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <div style="font-size: 10.5px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #e11d48; margin-bottom: 4px;">
                            OFFICIAL E-TICKET PASS
                          </div>
                          <div class="ticket-code" style="font-family: 'Courier New', Courier, monospace; font-size: 24px; font-weight: 900; letter-spacing: 1.5px; color: #881337; margin-bottom: 6px;">
                            ${ticketCode}
                          </div>
                        </td>
                        <td align="right" valign="top">
                          <div style="display: inline-block; padding: 4px 10px; border-radius: 50px; background-color: #ffffff; border: 1px solid #fecdd3; font-size: 11px; font-weight: 700; color: #be123c;">
                            ${memberStatus}
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 10px; border-top: 1px dashed #fecdd3;">
                          <span style="font-size: 11.5px; color: #64748b; font-weight: 600;">Attendee:</span>
                          <strong style="font-size: 13.5px; color: #0f172a; margin-left: 4px;">${name}</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Download Button CTA -->
          <tr>
            <td align="center" class="mobile-padding" style="padding: 0 36px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 50px; background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); box-shadow: 0 6px 18px rgba(225, 29, 72, 0.3);">
                    <a href="${downloadUrl}" target="_blank" style="display: inline-block; padding: 14px 34px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13.5px; font-weight: 800; color: #ffffff; text-decoration: none; text-transform: uppercase; letter-spacing: 0.8px; border-radius: 50px;">
                      &#128196; Download Official E-Ticket (PDF)
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Event Schedule & Location Card -->
          <tr>
            <td class="mobile-padding" style="padding: 0 36px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <div style="font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #e11d48; margin-bottom: 12px;">
                      EVENT SCHEDULE &amp; LOCATION
                    </div>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13.5px; color: #1e293b;">
                      <tr>
                        <td width="26" valign="top" style="padding-bottom: 8px;">📅</td>
                        <td valign="top" style="padding-bottom: 8px;">
                          <strong style="color: #0f172a;">Date:</strong> Saturday, 14th November 2026
                        </td>
                      </tr>
                      <tr>
                        <td width="26" valign="top" style="padding-bottom: 8px;">⏰</td>
                        <td valign="top" style="padding-bottom: 8px;">
                          <strong style="color: #0f172a;">Time:</strong> 7:00 AM (Prompt)
                        </td>
                      </tr>
                      <tr>
                        <td width="26" valign="top" style="padding-bottom: 8px;">📍</td>
                        <td valign="top" style="padding-bottom: 8px;">
                          <strong style="color: #0f172a;">Venue:</strong> Accra International Conference Centre, Grand Arena
                        </td>
                      </tr>
                      <tr>
                        <td width="26" valign="top">🎙️</td>
                        <td valign="top">
                          <strong style="color: #0f172a;">Host:</strong> Rev. Dr. Kwadwo Bempah
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Quick Notice -->
          <tr>
            <td class="mobile-padding" style="padding: 0 36px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fff8f9; border-left: 3.5px solid #e11d48; border-radius: 0 8px 8px 0;">
                <tr>
                  <td style="padding: 12px 16px; font-size: 12.5px; color: #64748b; line-height: 1.55;">
                    <strong style="color: #be123c;">Entrance Note:</strong> Please have your digital or printed pass ready at the venue entrance. Gates open promptly at 7:00 AM.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Enquiries Section -->
          <tr>
            <td class="mobile-padding" style="padding: 0 36px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px;">
                <tr>
                  <td style="padding: 13px 18px; font-size: 13px; color: #334155; line-height: 1.5;">
                    <strong style="color: #0f172a;">For further enquiries please contact:</strong>
                    <a href="tel:0242818976" style="color: #be123c; text-decoration: none; font-weight: 700; margin-left: 4px;">0242818976</a> or 
                    <a href="tel:0559576485" style="color: #be123c; text-decoration: none; font-weight: 700;">0559576485</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Sign-Off Section -->
          <tr>
            <td class="mobile-padding" style="padding: 0 36px 24px; color: #475569; font-size: 13.5px; line-height: 1.6;">
              <p style="margin: 0 0 3px 0;">With warm regards,</p>
              <strong style="color: #0f172a; font-size: 14px;">HHC-SBM26 Registration Team</strong><br/>
              <span style="color: #64748b; font-size: 12.5px;">Holy Hill Chapel &middot; Assemblies of God</span>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #f8fafc; padding: 20px 24px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 11.5px; color: #64748b;">
                @Dr. Kwadwo Bempah &middot; @Holy Hill Chapel AG
              </p>
              
              <!-- Social Links -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 12px auto;">
                <tr>
                  <td style="padding: 0 6px;">
                    <a href="https://www.facebook.com/holyhill.chapel.1" target="_blank" style="display: inline-block; width: 30px; height: 30px; border-radius: 50%; background-color: #ffffff; border: 1px solid #cbd5e1; text-align: center; line-height: 30px; text-decoration: none;">
                      <img src="https://img.icons8.com/color/48/facebook-new.png" alt="Facebook" width="16" height="16" style="vertical-align: middle;" />
                    </a>
                  </td>
                  <td style="padding: 0 6px;">
                    <a href="https://www.youtube.com/@HolyHillChapelAG" target="_blank" style="display: inline-block; width: 30px; height: 30px; border-radius: 50%; background-color: #ffffff; border: 1px solid #cbd5e1; text-align: center; line-height: 30px; text-decoration: none;">
                      <img src="https://img.icons8.com/color/48/youtube-play.png" alt="YouTube" width="16" height="16" style="vertical-align: middle;" />
                    </a>
                  </td>
                  <td style="padding: 0 6px;">
                    <a href="https://www.instagram.com/holyhillchapelag?igshid=YmMyMTA2M2Y=" target="_blank" style="display: inline-block; width: 30px; height: 30px; border-radius: 50%; background-color: #ffffff; border: 1px solid #cbd5e1; text-align: center; line-height: 30px; text-decoration: none;">
                      <img src="https://img.icons8.com/color/48/instagram-new.png" alt="Instagram" width="16" height="16" style="vertical-align: middle;" />
                    </a>
                  </td>
                  <td style="padding: 0 6px;">
                    <a href="https://twitter.com/holyhillag?s=21&t=1JwTZBP4lyQ0vp-04e7pPg" target="_blank" style="display: inline-block; width: 30px; height: 30px; border-radius: 50%; background-color: #ffffff; border: 1px solid #cbd5e1; text-align: center; line-height: 30px; text-decoration: none;">
                      <img src="https://img.icons8.com/color/48/twitterx--v1.png" alt="X" width="16" height="16" style="vertical-align: middle;" />
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                &copy; 2026 Holy Hill Chapel &middot; Assemblies of God. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- End Email Container -->

      </td>
    </tr>
  </table>

</body>
</html>
  `;
};

// Send registration email via Brevo
async function sendRegistrationEmail(name, email, ticketCode, downloadUrl, options = {}) {
  if (!useBrevo || !brevoClient) {
    throw new Error('Brevo not configured. Please set BREVO_API_KEY and BREVO_FROM_EMAIL in .env');
  }

  const htmlContent = getEmailTemplate(name, ticketCode, downloadUrl, options);
  const subject = `Your SBM 2026 Ticket (${ticketCode}) · Holy Hill Chapel`;
  const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@hhc-sbm.com';
  const fromName = process.env.EMAIL_FROM_NAME || 'Holy Hill Chapel - SBM 2026';

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
    const errorDetails = error.response && error.response.text ? error.response.text : error.message;
    console.error('❌ Brevo error details:', errorDetails);
    throw new Error(errorDetails);
  }
}

module.exports = {
  getEmailTemplate,
  sendRegistrationEmail
};
