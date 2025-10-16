require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const emailService = require('./services/emailService');
const smsService = require('./services/smsService');
const excelService = require('./services/excelService');
const dbService = require('./services/dbService');
const pdfTicketService = require('./services/pdfTicketService');
const { verifyToken, generateToken, verifyCredentials } = require('./middleware/auth');
const { loginLimiter } = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Serve API configuration to frontend
app.get('/api/config', (req, res) => {
  res.json({
    apiUrl: process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}/api`
  });
});

// Initialize database and storage
dbService.initDatabase().catch(console.error);
excelService.initStorage().catch(console.error);

// Admin login endpoint
app.post('/api/admin/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate credentials
    if (!verifyCredentials(username, password)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Generate JWT token
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

// Registration endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { name, contact, location, email } = req.body;

    // Validate required fields
    if (!name || !contact) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and contact are required' 
      });
    }

    // Normalize phone number for comparison (remove spaces, dashes, etc.)
    const normalizePhone = (phone) => {
      return phone.replace(/[\s\-\(\)]/g, '');
    };

    const normalizedContact = normalizePhone(contact);

    // Check for duplicate phone number
    const existingRegistrations = await excelService.getAllRegistrations();
    const isDuplicate = existingRegistrations.some(reg => {
      const existingPhone = normalizePhone(reg.contact || reg.Contact || '');
      
      // Check if phones match exactly
      if (existingPhone === normalizedContact) {
        return true;
      }
      
      // Check if one has country code and other doesn't
      // 23324XXXXXXX vs 024XXXXXXX
      if (existingPhone.startsWith('233') && normalizedContact.startsWith('0')) {
        return existingPhone === '233' + normalizedContact.substring(1);
      }
      if (normalizedContact.startsWith('233') && existingPhone.startsWith('0')) {
        return normalizedContact === '233' + existingPhone.substring(1);
      }
      
      return false;
    });

    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        message: 'This phone number has already been registered. Each person can only register once.'
      });
    }

    // Generate unique ticket ID (SMB25-XXXXXX format)
    const randomNumber = Math.floor(100000 + Math.random() * 900000); // 6-digit number
    const ticketId = `SMB25-${randomNumber}`;
    const ticketDownloadUrl = `${process.env.TICKET_DOWNLOAD_BASE_URL}/${ticketId}`;
    
    const registration = {
      ticketId,
      name,
      contact,
      location: location || 'N/A',
      email: email || 'N/A',
      registeredAt: new Date().toISOString(),
      emailSent: false,
      smsSent: false
    };

    // Save to Google Sheets immediately (fast operation)
    await excelService.saveToExcel(registration);

    // Respond to user immediately for better UX
    res.json({
      success: true,
      message: 'Registration successful!',
      ticketId,
      ticketDownloadUrl
    });

    // Process email and SMS in the background (don't wait for them)
    // This makes the response instant for the user
    setImmediate(async () => {
      // Send Email if provided
      if (email && email.trim() !== '') {
        try {
          await emailService.sendRegistrationEmail(name, email, ticketId, ticketDownloadUrl);
          registration.emailSent = true;
          console.log('✅ Email sent successfully to:', email);
          
          // Update Google Sheets with email status
          await excelService.updateRegistrationStatus(ticketId, { emailSent: true });
        } catch (emailError) {
          console.error('❌ Email sending failed:', emailError);
        }
      }

      // Send SMS
      try {
        const smsResult = await smsService.sendRegistrationSMS(contact, name, ticketId, ticketDownloadUrl);
        if (smsResult && smsResult.success) {
          registration.smsSent = true;
          console.log('✅ SMS sent successfully to:', contact);
          
          // Update Google Sheets with SMS status
          await excelService.updateRegistrationStatus(ticketId, { smsSent: true });
        } else {
          console.error('❌ SMS sending failed:', smsResult?.message || 'Unknown error');
        }
      } catch (smsError) {
        console.error('❌ SMS sending error:', smsError);
      }

      // Save to MySQL (optional, in background)
      try {
        await dbService.saveRegistration(registration);
      } catch (dbError) {
        console.log('⚠️  MySQL save skipped (database not configured)');
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

// Get all registrations (Admin) - from Excel/Google Sheets - PROTECTED
app.get('/api/registrations', verifyToken, async (req, res) => {
  try {
    const registrations = await excelService.getAllRegistrations();
    res.json({ success: true, data: registrations });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch registrations' });
  }
});

// Get statistics (Admin) - from Google Sheets - PROTECTED
app.get('/api/stats', verifyToken, async (req, res) => {
  try {
    const registrations = await excelService.getAllRegistrations();
    
    const stats = {
      total: registrations.length,
      emailsSent: registrations.filter(r => r.email_sent === true || r['Email Sent'] === 'Yes' || r.emailSent === true).length,
      smsSent: registrations.filter(r => r.sms_sent === true || r['SMS Sent'] === 'Yes' || r.smsSent === true).length
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
});

// Get ticket details - from Google Sheets
app.get('/api/ticket/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const registrations = await excelService.getAllRegistrations();
    const ticket = registrations.find(r => 
      (r.ticket_id === ticketId || r['Ticket ID'] === ticketId || r.ticketId === ticketId)
    );
    
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    
    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ticket' });
  }
});

// Download ticket as PDF
app.get('/ticket/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const registrations = await excelService.getAllRegistrations();
    const ticket = registrations.find(r => 
      (r.ticket_id === ticketId || r['Ticket ID'] === ticketId || r.ticketId === ticketId)
    );
    
    if (!ticket) {
      return res.status(404).send('<h1>Ticket not found</h1><p>The ticket ID you provided does not exist.</p>');
    }
    
    // Generate PDF
    const doc = pdfTicketService.generateTicketPDF(ticket);
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Ticket-${ticketId}.pdf"`);
    
    // Pipe the PDF to the response
    doc.pipe(res);
    doc.end();
    
    console.log(`📄 PDF ticket downloaded: ${ticketId}`);
  } catch (error) {
    console.error('Error generating PDF ticket:', error);
    res.status(500).send('<h1>Error</h1><p>Failed to generate ticket. Please try again later.</p>');
  }
});

// Clean URL routes
app.get('/register', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(__dirname + '/public/admin.html');
});

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

// Redirect root to registration
app.get('/', (req, res) => {
  res.redirect('/register');
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Email service: ${process.env.GMAIL_USER ? 'Configured' : 'Not configured'}`);
  console.log(`📱 SMS service: Configured`);
});
