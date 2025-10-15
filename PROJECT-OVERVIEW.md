# HHC-SBM Registration App - Project Overview

## 🎯 Project Description

A comprehensive event registration system for HHC-SBM that collects participant information, sends automated email and SMS notifications with unique ticket IDs, and provides an admin dashboard for monitoring registrations.

## ✨ Key Features

### 1. Registration Form
- **Mobile-responsive** design (works on Android, iPhone, and web)
- **Required fields:** Name, Phone Number
- **Optional fields:** Email, Location
- **Auto-refresh** after successful registration
- **Real-time validation** with user-friendly error messages
- **Beautiful UI** with gradient design and smooth animations

### 2. Email Notifications
- **Custom HTML template** matching your provided design
- **Sender name:** HHC-SBM
- **Includes:**
  - Personalized greeting
  - Unique ticket ID
  - Download button linking to ticket page
  - Event branding
- **Powered by:** Gmail SMTP

### 3. SMS Notifications
- **Sender name:** HHC-SBM
- **Content:**
  - Thank you message
  - Unique ticket ID
  - Ticket download link
- **API:** Deywuro SMS Service
- **Pre-configured** with test credentials

### 4. Data Storage
- **Dual storage system:**
  - **Excel (.xlsx):** Automatic, real-time updates
  - **MySQL Database:** Optional, for better performance
- **Fallback mechanism:** Works with Excel only if database unavailable
- **Data tracked:**
  - Ticket ID (UUID)
  - Name
  - Contact
  - Location (optional)
  - Email (optional)
  - Registration timestamp
  - Email delivery status
  - SMS delivery status

### 5. Admin Dashboard
- **Real-time statistics:**
  - Total registrations
  - Emails sent count
  - SMS sent count
- **Participant table:**
  - Searchable by name, contact, email, location
  - Shows all registration details
  - Status badges for email/SMS delivery
- **Export functionality:** Download data as CSV
- **Auto-refresh:** Updates every 30 seconds
- **Responsive design:** Works on all devices

### 6. Ticket System
- **Unique ticket ID** for each registration (UUID format)
- **Ticket download page** with:
  - Participant details
  - QR code for scanning
  - Downloadable HTML version
  - Print-friendly format
- **Shareable links:** `https://your-domain/ticket/{ticket-id}`

### 7. QR Code Generator
- **Built-in tool** to generate QR codes
- **Points to:** Registration page
- **Downloadable:** High-resolution PNG
- **Use case:** Print and display at event locations

## 📁 Project Structure

```
sbm-recordapp/
├── public/                      # Frontend (deploy to GitHub Pages)
│   ├── index.html              # Registration form
│   ├── admin.html              # Admin dashboard
│   ├── ticket.html             # Ticket download page
│   ├── qr-generator.html       # QR code generator
│   ├── css/
│   │   ├── styles.css          # Registration form styles
│   │   ├── admin.css           # Admin dashboard styles
│   │   └── ticket.css          # Ticket page styles
│   └── js/
│       ├── app.js              # Registration form logic
│       ├── admin.js            # Admin dashboard logic
│       └── ticket.js           # Ticket page logic
│
├── services/                    # Backend services
│   ├── emailService.js         # Gmail SMTP integration
│   ├── smsService.js           # Deywuro SMS API integration
│   ├── excelService.js         # Excel file operations
│   └── dbService.js            # MySQL database operations
│
├── database/
│   └── schema.sql              # MySQL database schema
│
├── server.js                   # Main Express server
├── package.json                # Node.js dependencies
├── .env.example                # Environment variables template
├── .gitignore                  # Git ignore rules
│
├── README.md                   # Main documentation
├── SETUP.md                    # Quick setup guide
├── deploy-github.md            # GitHub Pages deployment
├── backend-deployment.md       # Backend hosting guide
└── PROJECT-OVERVIEW.md         # This file
```

## 🛠️ Technology Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with gradients and animations
- **Vanilla JavaScript** - No frameworks, lightweight and fast
- **Responsive Design** - Mobile-first approach

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Nodemailer** - Email sending
- **Axios** - HTTP client for SMS API
- **XLSX** - Excel file operations
- **MySQL2** - Database driver
- **UUID** - Unique ID generation

### APIs & Services
- **Gmail SMTP** - Email delivery
- **Deywuro SMS API** - SMS delivery
- **QR Server API** - QR code generation

### Hosting
- **Frontend:** GitHub Pages (free)
- **Backend:** Render/Railway (free tier available)
- **Database:** PlanetScale/MySQL (optional)

## 🔌 API Endpoints

### Public Endpoints

#### POST `/api/register`
Register a new participant.

**Request Body:**
```json
{
  "name": "John Doe",
  "contact": "0241234567",
  "email": "john@example.com",
  "location": "Accra"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful!",
  "ticketId": "b7a4295c-2ad8-46f8-b921-e7f8547d5d30",
  "ticketDownloadUrl": "https://your-domain/ticket/b7a4295c-..."
}
```

#### GET `/api/ticket/:ticketId`
Get ticket details.

**Response:**
```json
{
  "success": true,
  "data": {
    "ticket_id": "b7a4295c-...",
    "name": "John Doe",
    "contact": "0241234567",
    "email": "john@example.com",
    "location": "Accra",
    "registered_at": "2023-10-13T12:00:00.000Z",
    "email_sent": true,
    "sms_sent": true
  }
}
```

### Admin Endpoints

#### GET `/api/registrations`
Get all registrations.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "ticket_id": "b7a4295c-...",
      "name": "John Doe",
      "contact": "0241234567",
      "email": "john@example.com",
      "location": "Accra",
      "registered_at": "2023-10-13T12:00:00.000Z",
      "email_sent": true,
      "sms_sent": true
    }
  ]
}
```

#### GET `/api/stats`
Get registration statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "emailsSent": 120,
    "smsSent": 148
  }
}
```

#### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2023-10-13T12:00:00.000Z"
}
```

## 🔐 Environment Variables

Required configuration in `.env`:

```env
# Server
PORT=3000
NODE_ENV=production

# Gmail SMTP
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# SMS API (Deywuro)
SMS_API_URL=https://deywuro.com/api/sms
SMS_API_USERNAME=npontutest
SMS_API_PASSWORD=npontutest
SMS_API_SOURCE=npontutest

# MySQL (Optional)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=hhc_sbm_registration

# URLs
TICKET_DOWNLOAD_BASE_URL=https://yourusername.github.io/sbm-recordapp/ticket
FRONTEND_URL=https://yourusername.github.io/sbm-recordapp
```

## 📧 Email Template

The email template is based on your provided image and includes:

- **Header:** HHC-SBM branding
- **Title:** "Event Registration Confirmation"
- **Greeting:** Personalized with participant name
- **Ticket Code:** Highlighted in a styled box
- **Download Button:** Blue gradient button
- **Event Details:** FROM: HHC-SBM Event Team
- **Footer:** Social media links and branding
- **Responsive:** Works on all email clients

## 📱 SMS Template

```
Dear [Name], thank you for registering with HHC-SBM! 
Your ticket ID: [TICKET-ID]. 
Download your ticket: [DOWNLOAD-LINK]
```

## 🚀 Deployment Options

### Frontend (GitHub Pages)
- **Cost:** Free
- **Setup:** 5 minutes
- **Custom domain:** Supported
- **SSL:** Automatic

### Backend Options

#### Option 1: Render (Recommended)
- **Free tier:** Yes
- **Auto-sleep:** After 15 min inactivity
- **SSL:** Automatic
- **Setup:** Easy

#### Option 2: Railway
- **Free tier:** Limited hours
- **Always on:** Yes
- **SSL:** Automatic
- **Setup:** Easy

#### Option 3: Your Own Server
- **VPS:** DigitalOcean, Linode, etc.
- **Cost:** ~$5/month
- **Full control:** Yes

### Database Options

#### Option 1: Excel Only (No Setup)
- **Cost:** Free
- **Setup:** None required
- **Limitation:** Single file

#### Option 2: PlanetScale
- **Cost:** Free tier (5GB)
- **Setup:** Easy
- **Serverless:** Yes

#### Option 3: Traditional MySQL
- **Cost:** Varies
- **Setup:** Manual
- **Control:** Full

## 🔒 Security Features

- **Input validation:** All form inputs validated
- **SQL injection protection:** Parameterized queries
- **XSS protection:** Input sanitization
- **CORS:** Configured for cross-origin requests
- **Environment variables:** Sensitive data not in code
- **HTTPS:** Required in production
- **.gitignore:** Prevents committing sensitive files

## 📊 Data Flow

1. **User submits form** → Frontend validates input
2. **Frontend sends POST** → Backend API receives data
3. **Backend generates ticket ID** → UUID created
4. **Data saved to Excel** → Real-time file update
5. **Data saved to MySQL** → Database insert (if configured)
6. **Email sent** → If email provided, via Gmail SMTP
7. **SMS sent** → Via Deywuro API to phone number
8. **Response returned** → Success message with ticket ID
9. **Form auto-refreshes** → Ready for next registration

## 🎨 Design Features

### Color Scheme
- **Primary:** Purple gradient (#667eea to #764ba2)
- **Success:** Green (#28a745)
- **Error:** Red (#e74c3c)
- **Background:** Light gray (#f5f7fa)
- **Text:** Dark gray (#333)

### Animations
- **Slide up:** Form entrance
- **Fade in:** Messages and alerts
- **Hover effects:** Buttons and cards
- **Spin:** Loading indicators
- **Scale:** Success modal

### Responsive Breakpoints
- **Desktop:** > 768px
- **Tablet:** 600px - 768px
- **Mobile:** < 600px

## 📈 Performance

- **Frontend:** Lightweight, no frameworks
- **Backend:** Async/await for non-blocking operations
- **Database:** Indexed queries for fast lookups
- **Excel:** Efficient read/write operations
- **API calls:** Timeout protection
- **Error handling:** Graceful fallbacks

## 🧪 Testing Checklist

Before going live:

- [ ] Registration form submits successfully
- [ ] Email received (check spam folder)
- [ ] SMS received on phone
- [ ] Data appears in Excel file
- [ ] Data appears in MySQL (if configured)
- [ ] Admin dashboard loads correctly
- [ ] Statistics are accurate
- [ ] Search functionality works
- [ ] Export to CSV works
- [ ] Ticket download page works
- [ ] QR code displays correctly
- [ ] Mobile responsiveness
- [ ] Form validation works
- [ ] Error messages display
- [ ] Auto-refresh after submission

## 🐛 Common Issues & Solutions

### Email not sending
- **Cause:** Wrong Gmail App Password
- **Solution:** Generate new App Password from Google

### SMS not sending
- **Cause:** Invalid phone number format
- **Solution:** Ensure 10-15 digits, no spaces

### Database connection failed
- **Cause:** Wrong credentials or MySQL not running
- **Solution:** Check .env or use Excel-only mode

### CORS errors
- **Cause:** Frontend and backend on different domains
- **Solution:** Already configured, check API URL

### Form not submitting
- **Cause:** Backend not running or wrong API URL
- **Solution:** Start backend, verify URL in JS files

## 📞 Support & Maintenance

### Regular Tasks
- **Daily:** Monitor registrations
- **Weekly:** Backup Excel file and database
- **Monthly:** Review and update dependencies
- **As needed:** Clear old registrations

### Monitoring
- **Server uptime:** Use UptimeRobot
- **Error logs:** Check Render/Railway dashboard
- **Email delivery:** Monitor Gmail sent folder
- **SMS delivery:** Check SMS API dashboard

## 🎯 Future Enhancements

Potential features to add:

1. **Email verification** before registration
2. **Bulk SMS** to all participants
3. **Event check-in** system with QR scanner
4. **Analytics dashboard** with charts
5. **Multiple events** support
6. **Custom email templates** per event
7. **Payment integration** for paid events
8. **Attendee badges** generation
9. **Email reminders** before event
10. **Post-event feedback** form

## 📚 Documentation Files

- **README.md** - Main project documentation
- **SETUP.md** - Quick setup guide (5 minutes)
- **deploy-github.md** - GitHub Pages deployment
- **backend-deployment.md** - Backend hosting guide
- **PROJECT-OVERVIEW.md** - This comprehensive overview

## 🎉 Conclusion

This is a complete, production-ready registration system with:

✅ Beautiful, responsive UI
✅ Automated email notifications
✅ Automated SMS notifications
✅ Dual data storage (Excel + MySQL)
✅ Real-time admin dashboard
✅ Unique ticket system with QR codes
✅ Easy deployment to free hosting
✅ Comprehensive documentation
✅ Security best practices
✅ Error handling and fallbacks

**Ready to deploy and use for your event!**

For questions or support, refer to the documentation files or check the troubleshooting sections.

---

**Built with ❤️ for HHC-SBM**
