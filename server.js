require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const emailService = require('./services/emailService');
const smsService = require('./services/smsService');
const excelService = require('./services/excelService');
const dbService = require('./services/dbService');
const databaseService = require('./services/databaseService');
const pdfTicketService = require('./services/pdfTicketService');
const { verifyToken, generateToken, verifyCredentials } = require('./middleware/auth');
const {
  loginLimiter,
  registrationValidation,
  checkValidation,
  sanitizeInput
} = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust reverse proxy (Render, Railway, Heroku) for accurate client IP detection with rate limiting
if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
  app.set('trust proxy', 1);
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://cdnjs.cloudflare.com', 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:', 'api.qrserver.com', 'img.icons8.com'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"]
      }
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
  })
);
app.use(cors());
app.use(bodyParser.json({ limit: '256kb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '256kb' }));
app.use(express.static('public', { maxAge: '1h' }));

app.disable('x-powered-by');

function isEventRegistrationClosed() {
  if (process.env.EVENT_REGISTRATION_CLOSED === 'true') return true;
  if (process.env.EVENT_REGISTRATION_CLOSED === 'false') return false;
  // Default cutoff: November 15, 2026 00:00:00 UTC (Event: Nov 14, 2026)
  const cutoffDate = process.env.EVENT_CUTOFF_DATE
    ? new Date(process.env.EVENT_CUTOFF_DATE)
    : new Date('2026-11-15T00:00:00Z');
  return new Date() >= cutoffDate;
}

app.get('/api/config', (req, res) => {
  res.json({
    apiUrl: process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}/api`,
    isClosed: isEventRegistrationClosed()
  });
});

dbService.initDatabase().catch(console.error);
excelService.initStorage().catch(console.error);

if (process.env.DATABASE_URL) {
  databaseService.initializeDatabase().catch(console.error);
  console.log('🐘 Using PostgreSQL for primary storage');
} else {
  console.log('📊 Using Google Sheets for primary storage (PostgreSQL not configured)');
}

app.post('/api/admin/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!verifyCredentials(username, password)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    const token = generateToken(username);
    res.json({
      success: true,
      message: 'Login successful',
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
});

function normalizePhone(phone) {
  if (!phone) return '';
  const cleaned = String(phone).replace(/[\s\-+()]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '233' + cleaned.substring(1);
  }
  return cleaned;
}

function sheetsHasDuplicate(allRegs, normalizedContact, name) {
  const normName = String(name || '').trim().toLowerCase();
  return allRegs.some((reg) => {
    const existingRaw =
      reg.contact || reg.Contact || reg.contact_normalized || '';
    const existingNorm = normalizePhone(existingRaw);
    const existingName = String(reg.name || reg.Name || '').trim().toLowerCase();
    return existingNorm === normalizedContact && existingName === normName;
  });
}

function sheetsHasTicketId(allRegs, candidateId) {
  return allRegs.some(
    (reg) =>
      reg.ticket_id === candidateId ||
      reg.ticketId === candidateId ||
      reg['Ticket ID'] === candidateId
  );
}

app.post(
  '/api/register',
  registrationValidation,
  checkValidation,
  async (req, res) => {
    try {
      if (isEventRegistrationClosed() && req.query.force !== 'true') {
        return res.status(403).json({
          success: false,
          message: 'Online registration for Supernatural Breakfast Meeting 2026 has concluded. Thank you for your support!'
        });
      }

      const raw = req.body || {};
      const name = sanitizeInput(String(raw.name || '').trim());
      const contact = sanitizeInput(String(raw.contact || '').trim());
      const memberStatus = sanitizeInput(String(raw.memberStatus || '').trim());
      const location = sanitizeInput(String(raw.location || '').trim()) || 'N/A';
      let email = sanitizeInput(String(raw.email || '').trim());
      if (!email || email.toLowerCase() === 'n/a') email = '';

      if (!name || name.length < 2) {
        return res
          .status(400)
          .json({ success: false, message: 'Name is required (min 2 characters).' });
      }
      if (!/^[A-Za-z\u00C0-\u024F\s'.-]+$/.test(name)) {
        return res
          .status(400)
          .json({ success: false, message: 'Name can only contain letters, spaces, hyphens, apostrophes.' });
      }
      if (!contact) {
        return res
          .status(400)
          .json({ success: false, message: 'Phone number is required.' });
      }
      const digits = contact.replace(/\D/g, '');
      if (digits.length !== 10) {
        return res
          .status(400)
          .json({ success: false, message: 'Phone number must be exactly 10 digits (e.g. 0244123456).' });
      }

      const normalizedContact = normalizePhone(contact);
      let ticketId;
      let registration;
      let useSheetsPrimary = !process.env.DATABASE_URL;

      if (process.env.DATABASE_URL) {
        registration = {
          name,
          contact,
          memberStatus: memberStatus || null,
          location,
          email: email || null
        };
        const saveResult = await databaseService.saveRegistrationWithDedup(registration);
        if (!saveResult.success) {
          return res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again.'
          });
        }
        ticketId = saveResult.ticketId;
        registration.ticketId = ticketId;
        registration.registeredAt =
          saveResult.row && saveResult.row.registration_date
            ? new Date(saveResult.row.registration_date).toISOString()
            : new Date().toISOString();
        registration.emailSent = false;
        registration.smsSent = false;

        (async () => {
          try {
            await excelService.saveToExcel(registration);
            console.log('✅ Backup saved to Google Sheets:', ticketId);
          } catch (sheetError) {
            console.error('⚠️ Google Sheets backup failed (non-critical):', sheetError.message);
          }
        })();
      } else {
        const allRegs = await excelService.getAllRegistrations();
        if (sheetsHasDuplicate(allRegs, normalizedContact, name)) {
          console.log('ℹ️ Duplicate submission detected in Sheets for:', name);
        }
        const maxAttempts = 50;
        let attempts = 0;
        while (attempts < maxAttempts) {
          const randomNumber = Math.floor(100000 + Math.random() * 900000);
          const candidateId = `SBM26-${randomNumber}`;
          if (!sheetsHasTicketId(allRegs, candidateId)) {
            ticketId = candidateId;
            break;
          }
          attempts++;
        }
        if (!ticketId) {
          throw new Error('Failed to generate unique ticket ID after multiple attempts');
        }
        registration = {
          ticketId,
          name,
          contact,
          location,
          email: email || 'N/A',
          registeredAt: new Date().toISOString(),
          emailSent: false,
          smsSent: false
        };
        await excelService.saveToExcel(registration);
      }

      const ticketDownloadUrl = `${process.env.TICKET_DOWNLOAD_BASE_URL}/${ticketId}`;

      (async () => {
        try {
          console.log('📱 Sending SMS to:', contact);
          const smsResult = await smsService.sendRegistrationSMS(
            contact,
            name,
            ticketId,
            ticketDownloadUrl
          );
          if (smsResult && smsResult.success) {
            console.log('✅ SMS sent successfully to:', contact);
            if (process.env.DATABASE_URL) {
              await databaseService
                .updateRegistrationStatus(ticketId, null, true)
                .catch((err) =>
                  console.error('Failed to update SMS status in PostgreSQL:', err)
                );
              await excelService
                .updateRegistrationStatus(ticketId, { smsSent: true })
                .catch((err) =>
                  console.error(
                    'Failed to update SMS status in Sheets (non-critical):',
                    err
                  )
                );
            } else {
              await excelService
                .updateRegistrationStatus(ticketId, { smsSent: true })
                .catch((err) => console.error('Failed to update SMS status:', err));
            }
          } else {
            console.error(
              '❌ SMS sending failed:',
              smsResult?.message || 'Unknown error'
            );
          }
        } catch (smsError) {
          console.error('❌ SMS sending error:', smsError.message);
        }
      })();

      if (email && email.trim() !== '') {
        (async () => {
          try {
            console.log('📧 Sending email to:', email);
            await emailService.sendRegistrationEmail(
              name,
              email,
              ticketId,
              ticketDownloadUrl,
              { contact, memberStatus, location }
            );
            console.log('✅ Email sent successfully to:', email);
            if (process.env.DATABASE_URL) {
              await databaseService
                .updateRegistrationStatus(ticketId, true, null)
                .catch((err) =>
                  console.error('Failed to update email status in PostgreSQL:', err)
                );
              await excelService
                .updateRegistrationStatus(ticketId, { emailSent: true })
                .catch((err) =>
                  console.error(
                    'Failed to update email status in Sheets (non-critical):',
                    err
                  )
                );
            } else {
              await excelService
                .updateRegistrationStatus(ticketId, { emailSent: true })
                .catch((err) =>
                  console.error('Failed to update email status:', err)
                );
            }
          } catch (emailError) {
            console.error('❌ Email sending failed:', emailError.message);
          }
        })();
      }

      (async () => {
        try {
          await dbService.saveRegistration(registration);
        } catch (dbError) {
          console.log('⚠️  MySQL save skipped (database not configured)');
        }
      })();

      res.json({
        success: true,
        message: 'Registration successful!',
        ticketId,
        ticketDownloadUrl,
        name
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (
        error.code === '23505' &&
        /contact/.test(error.constraint || '')
      ) {
        return res.status(409).json({
          success: false,
          code: 'DUPLICATE_CONTACT',
          message:
            'This phone number has already been registered. Each person can only register once.'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Registration failed. Please try again.'
      });
    }
  }
);

app.get('/api/registrations', verifyToken, async (req, res) => {
  try {
    let registrations;
    if (process.env.DATABASE_URL) {
      registrations = await databaseService.getAllRegistrations();
    } else {
      registrations = await excelService.getAllRegistrations();
    }
    res.json({ success: true, data: registrations });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch registrations' });
  }
});

function formatPhoneForCsv(rawPhone) {
  if (!rawPhone || !String(rawPhone).trim() || String(rawPhone).trim().toLowerCase() === 'n/a') {
    return '""';
  }
  const digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return '""';
  let localPhone = digits;
  if (digits.startsWith('233') && digits.length === 12) {
    localPhone = '0' + digits.substring(3);
  } else if (digits.length === 9 && !digits.startsWith('0')) {
    localPhone = '0' + digits;
  } else if (!localPhone.startsWith('0') && localPhone.length === 10) {
    localPhone = '0' + localPhone.substring(1);
  } else if (!localPhone.startsWith('0')) {
    localPhone = '0' + localPhone;
  }
  // Formula format ="0XXXXXXXXX" forces Excel & Sheets to display the leading zero!
  return `="${localPhone}"`;
}

app.get('/api/export-csv', verifyToken, async (req, res) => {
  try {
    let registrations;
    if (process.env.DATABASE_URL) {
      registrations = await databaseService.getAllRegistrations();
    } else {
      registrations = await excelService.getAllRegistrations();
    }

    const isUniqueOnly = String(req.query.unique || req.query.mode || '').toLowerCase() === 'true' || String(req.query.mode || '').toLowerCase() === 'unique';
    let dataToExport = registrations || [];

    if (isUniqueOnly) {
      // Sort ascending by registration date so first person that registered with each number is exported
      const ascList = [...dataToExport].sort((a, b) => {
        const dateA = new Date(a.registration_date || a.registered_at || a.registeredAt || a.created_at || 0).getTime();
        const dateB = new Date(b.registration_date || b.registered_at || b.registeredAt || b.created_at || 0).getTime();
        return dateA - dateB;
      });
      const seen = new Set();
      const uniqueAsc = [];
      ascList.forEach((reg) => {
        const raw = reg.contact || reg.Contact || reg.contact_normalized || '';
        const norm = normalizePhone(raw);
        if (!norm) {
          uniqueAsc.push(reg); // keep empty phone records
        } else if (!seen.has(norm)) {
          seen.add(norm);
          uniqueAsc.push(reg);
        }
      });
      dataToExport = uniqueAsc;
    }

    const csvEscape = (v) => {
      const s = String(v ?? '');
      if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const headers = [
      '#',
      'Ticket ID',
      'Full Name',
      'Phone Number',
      'Attendee Status',
      'Location',
      'Email',
      'SMS Sent',
      'Email Sent',
      'Registered At'
    ];

    const rows = dataToExport.map((reg, idx) => {
      const ticketId = reg.ticket_id || reg.ticketId || reg['Ticket ID'] || '';
      const name = reg.name || reg.Name || '';
      const rawContact = reg.contact || reg.Contact || '';
      const formattedContact = formatPhoneForCsv(rawContact);
      const status = reg.member_status || reg.memberStatus || reg['Member Status'] || 'Church Member';
      const location = reg.location || reg.Location || '';
      const email = reg.email || reg.Email || '';
      const sSent = (reg.sms_sent === true || reg['SMS Sent'] === 'Yes' || reg.smsSent === true) ? 'Yes' : 'No';
      const eSent = (reg.email_sent === true || reg['Email Sent'] === 'Yes' || reg.emailSent === true) ? 'Yes' : 'No';
      const regAt = reg.registration_date || reg.registered_at || reg.registeredAt || reg['Registered At'] || '';
      const dateStr = regAt ? new Date(regAt).toLocaleString('en-US') : '';
      return [
        idx + 1,
        csvEscape(ticketId),
        csvEscape(name),
        formattedContact,
        csvEscape(status),
        csvEscape(location),
        csvEscape(email),
        sSent,
        eSent,
        csvEscape(dateStr)
      ].join(',');
    });

    const csv = '\uFEFF' + [headers.map(csvEscape).join(','), ...rows].join('\r\n');
    const stamp = new Date().toISOString().slice(0, 10);
    const filenamePrefix = isUniqueOnly ? 'sbm2026-unique-contacts' : 'sbm2026-registrations';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filenamePrefix}-${stamp}.csv"`
    );
    res.send(csv);
  } catch (error) {
    console.error('Error generating CSV export:', error);
    res.status(500).json({ success: false, message: 'Failed to export CSV' });
  }
});

// New Converts (Altar Call) Endpoints
app.post(['/api/new-converts', '/api/newconverts'], async (req, res) => {
  try {
    if (isEventRegistrationClosed() && req.query.force !== 'true') {
      return res.status(403).json({
        success: false,
        message: 'New converts record submission for SBM 2026 has concluded. Thank you!'
      });
    }

    const raw = req.body || {};
    const name = sanitizeInput(String(raw.name || raw.fullName || '').trim());
    let contact = sanitizeInput(String(raw.contact || raw.phone || '').trim());
    const location = sanitizeInput(String(raw.location || '').trim()) || 'Accra';

    if (!name || name.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name is required (at least 2 characters).'
      });
    }

    if (!/^[A-Za-z\u00C0-\u024F\s'.-]+$/.test(name)) {
      return res.status(400).json({
        success: false,
        message: 'Name can only contain letters, spaces, hyphens, and apostrophes.'
      });
    }

    // Contact is optional for altar call converts
    if (contact && contact.trim() !== '') {
      const digits = contact.replace(/\D/g, '');
      if (digits.length !== 10) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be exactly 10 digits if provided (e.g. 0244123456).'
        });
      }
      contact = digits;
    } else {
      contact = null;
    }

    let savedRow;
    if (process.env.DATABASE_URL) {
      const result = await databaseService.saveNewConvert({ name, contact, location });
      savedRow = result.row;
    } else {
      savedRow = {
        id: Date.now(),
        name,
        contact: contact || '',
        location,
        created_at: new Date().toISOString()
      };
    }

    res.json({
      success: true,
      message: 'New convert record saved successfully!',
      data: savedRow
    });
  } catch (error) {
    console.error('Error saving new convert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save record. Please try again.'
    });
  }
});

app.get(['/api/new-converts', '/api/newconverts'], verifyToken, async (req, res) => {
  try {
    let converts = [];
    if (process.env.DATABASE_URL) {
      converts = await databaseService.getAllNewConverts();
    }
    res.json({ success: true, data: converts });
  } catch (error) {
    console.error('Error fetching new converts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch new converts' });
  }
});

app.get('/api/new-converts/stats', verifyToken, async (req, res) => {
  try {
    let stats = { total: 0, uniqueContacts: 0, sharedContacts: 0, withPhone: 0, today: 0 };
    if (process.env.DATABASE_URL) {
      stats = await databaseService.getNewConvertsStatistics();
    }
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching new converts stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
});

app.get('/api/export-new-converts', verifyToken, async (req, res) => {
  try {
    let converts = [];
    if (process.env.DATABASE_URL) {
      converts = await databaseService.getAllNewConverts();
    }

    const isUniqueOnly = String(req.query.unique || req.query.mode || '').toLowerCase() === 'true' || String(req.query.mode || '').toLowerCase() === 'unique';
    let dataToExport = converts || [];

    if (isUniqueOnly) {
      // Sort ascending by creation date so first person that registered with each number is exported
      const ascList = [...dataToExport].sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt || a.registration_date || 0).getTime();
        const dateB = new Date(b.created_at || b.createdAt || b.registration_date || 0).getTime();
        return dateA - dateB;
      });
      const seen = new Set();
      const uniqueAsc = [];
      ascList.forEach((c) => {
        const raw = c.contact || c.contact_normalized || '';
        const norm = normalizePhone(raw);
        if (!norm) {
          uniqueAsc.push(c); // keep records without phone
        } else if (!seen.has(norm)) {
          seen.add(norm);
          uniqueAsc.push(c);
        }
      });
      dataToExport = uniqueAsc;
    }

    const csvEscape = (v) => {
      const s = String(v ?? '');
      if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const headers = [
      '#',
      'Full Name',
      'Phone Number',
      'Location / Branch',
      'Recorded At'
    ];

    const rows = dataToExport.map((c, idx) => {
      const name = c.name || '';
      const rawContact = c.contact || '';
      const formattedContact = formatPhoneForCsv(rawContact);
      const location = c.location || 'Accra';
      const regAt = c.created_at || '';
      const dateStr = regAt ? new Date(regAt).toLocaleString('en-US') : '';
      return [
        idx + 1,
        csvEscape(name),
        formattedContact,
        csvEscape(location),
        csvEscape(dateStr)
      ].join(',');
    });

    const csv = '\uFEFF' + [headers.map(csvEscape).join(','), ...rows].join('\r\n');
    const stamp = new Date().toISOString().slice(0, 10);
    const filenamePrefix = isUniqueOnly ? 'sbm2026-new-converts-unique' : 'sbm2026-new-converts';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filenamePrefix}-${stamp}.csv"`
    );
    res.send(csv);
  } catch (error) {
    console.error('Error exporting new converts CSV:', error);
    res.status(500).json({ success: false, message: 'Failed to export CSV' });
  }
});

app.get('/api/stats', verifyToken, async (req, res) => {
  try {
    let stats;
    if (process.env.DATABASE_URL) {
      stats = await databaseService.getStatistics();
    } else {
      const registrations = await excelService.getAllRegistrations();
      const uniqueContactsSet = new Set(
        registrations
          .map((r) => normalizePhone(r.contact || r.Contact || ''))
          .filter(Boolean)
      );
      const total = registrations.length;
      stats = {
        total,
        uniqueContacts: uniqueContactsSet.size,
        sharedContacts: Math.max(0, total - uniqueContactsSet.size),
        emailSent: registrations.filter(
          (r) =>
            r.email_sent === true ||
            r['Email Sent'] === 'Yes' ||
            r.emailSent === true
        ).length,
        smsSent: registrations.filter(
          (r) =>
            r.sms_sent === true ||
            r['SMS Sent'] === 'Yes' ||
            r.smsSent === true
        ).length,
        today: 0
      };
    }
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch statistics' });
  }
});

app.get('/api/ticket/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    let ticket;
    if (process.env.DATABASE_URL) {
      ticket = await databaseService.getRegistrationByTicketId(ticketId);
    } else {
      const registrations = await excelService.getAllRegistrations();
      ticket = registrations.find(
        (r) =>
          r.ticket_id === ticketId ||
          r['Ticket ID'] === ticketId ||
          r.ticketId === ticketId
      );
    }
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: 'Ticket not found' });
    }
    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch ticket' });
  }
});

app.get('/ticket/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const registrations = await excelService.getAllRegistrations();
    const ticket = registrations.find(
      (r) =>
        r.ticket_id === ticketId ||
        r['Ticket ID'] === ticketId ||
        r.ticketId === ticketId
    );
    if (!ticket) {
      return res
        .status(404)
        .send(
          '<h1>Ticket not found</h1><p>The ticket ID you provided does not exist.</p>'
        );
    }
    const doc = pdfTicketService.generateTicketPDF(ticket);
    const userAgent = req.headers['user-agent'] || '';
    const isMobile =
      /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        userAgent
      );
    res.setHeader('Content-Type', 'application/pdf');
    if (isMobile) {
      res.setHeader(
        'Content-Disposition',
        `inline; filename="Ticket-${ticketId}.pdf"`
      );
    } else {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Ticket-${ticketId}.pdf"`
      );
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    doc.pipe(res);
    doc.end();
    console.log(`📄 PDF ticket ${isMobile ? 'opened' : 'downloaded'}: ${ticketId}`);
  } catch (error) {
    console.error('Error generating PDF ticket:', error);
    res
      .status(500)
      .send(
        '<h1>Error</h1><p>Failed to generate ticket. Please try again later.</p>'
      );
  }
});

// Thank You / Event Concluded Page routes (accessible directly anytime for preview)
app.get(['/closed', '/thank-you', '/thankyou', '/event-ended'], (req, res) => {
  res.sendFile(__dirname + '/public/closed.html');
});

app.get(['/newconverts', '/newcoverts'], (req, res) => {
  if (isEventRegistrationClosed() && req.query.preview !== 'form') {
    return res.redirect('/closed');
  }
  res.sendFile(__dirname + '/public/newconverts.html');
});

app.get('/register', (req, res) => {
  if (isEventRegistrationClosed() && req.query.preview !== 'form') {
    return res.redirect('/closed');
  }
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(__dirname + '/public/admin.html');
});

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

app.get('/qr-generator', (req, res) => {
  res.sendFile(__dirname + '/public/qr-generator.html');
});

app.get('/', (req, res) => {
  if (isEventRegistrationClosed() && req.query.preview !== 'form') {
    return res.redirect('/closed');
  }
  res.redirect('/register');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(
      `📧 Email service: ${
        process.env.BREVO_API_KEY ? 'Configured (Brevo)' : 'Not configured'
      }`
    );
    console.log(
      `📱 SMS service: ${process.env.MNOTIFY_API_KEY ? 'Configured (mNotify)' : 'Not configured'}`
    );
  });
}

module.exports = app;
