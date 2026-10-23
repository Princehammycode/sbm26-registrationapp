# HHC-SBM Registration App

A comprehensive event registration system with email and SMS notifications.

## Features

- ✅ Mobile-responsive registration form with branded design
- ✅ Email notifications with ticket download link
- ✅ SMS notifications via mNotify API
- ✅ Google Sheets integration for data storage
- ✅ Admin dashboard with real-time statistics
- ✅ Automatic ticket ID generation (SBM25-XXXXXX)
- ✅ Full branding with orange/red/gold color scheme
- ✅ Social media links in email footer

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

**Required Configuration:**

1. **Gmail SMTP:**
   - Enable 2-Factor Authentication on your Gmail account
   - Generate an App Password: https://myaccount.google.com/apppasswords
   - Use the App Password in `GMAIL_APP_PASSWORD`

2. **mNotify SMS API:**
   - Sign up at https://www.mnotify.com/
   - Get your API key from Dashboard → Settings → API Keys
   - Register sender ID `SMB-2026` (approval takes 24-48 hours)
   - Add credentials to `.env`:
     ```env
     MNOTIFY_API_KEY=your-api-key-here
     MNOTIFY_SENDER_ID=SBM-2026
     ```

3. **Google Sheets:**
   - Set `USE_GOOGLE_SHEETS=true` in `.env`
   - Add your spreadsheet ID
   - Place `google-credentials.json` in root directory

### 3. Start the Server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

### 5. Deploy Frontend to GitHub Pages

1. Push the `public` folder to GitHub
2. Enable GitHub Pages in repository settings
3. Update `TICKET_DOWNLOAD_BASE_URL` in `.env` with your GitHub Pages URL

## Project Structure

```
sbm-recordapp/
├── public/              # Frontend files (deploy to GitHub Pages)
│   ├── index.html       # Registration form
│   ├── admin.html       # Admin dashboard
│   ├── ticket.html      # Ticket download page
│   ├── css/
│   └── js/
├── server.js            # Main server file
├── services/            # Business logic
│   ├── emailService.js
│   ├── smsService.js
│   ├── excelService.js
│   └── dbService.js
├── database/            # Database schemas
```

## API Endpoints

- `POST /api/register` - Register a new participant
- `GET /api/registrations` - Get all registrations (admin)
- `GET /api/stats` - Get registration statistics (admin)
- `GET /api/ticket/:ticketId` - Get ticket details

## SMS API Configuration

The app uses Deywuro SMS API with the following credentials:
- **Sender Name:** your-mnotify-sender-id
- **MNOTIFY API:** Your mnotify api key

## Email Template

Emails are sent with a custom HTML template matching the provided design, including:
- Personalized greeting
- Ticket code
- Download button
- Event details

## Admin Dashboard

Access the admin dashboard at `/admin-dashboard` to view:
- Total registrations
- Email delivery status
- SMS delivery status
- Complete participant list

## Event Conclusion & Closed Page (Post-Program)

The application automatically closes registrations starting **November 15, 2026** (or when `EVENT_REGISTRATION_CLOSED=true` is set). Any attempts to access `/register`, `/`, or `/newconverts` will automatically redirect attendees to a branded Thank You page.

### Admin Form Preview (Anytime):
You or administrators can always preview the closed page directly at: 👉 [http://localhost:3001/closed](http://localhost:3001/closed)

If after November 15th you ever need to inspect or preview the active forms, you can append `?preview=form` (e.g. `/register?preview=form` or `/newconverts?preview=form`).

## Support

For issues or questions, contact the development team.

