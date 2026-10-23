# 🚀 Render Production Deployment Guide

This guide details how to deploy the **HHC-SBM Registration App** (frontend + backend + PostgreSQL database) on **Render** in production mode.

---

## 📋 Overview of What Was Configured

1. **`render.yaml` (Blueprint Spec)**:
   - Web Service: Node runtime, `npm install`, `node server.js`
   - Managed PostgreSQL database (`sbm-postgres`) automatically linked via `DATABASE_URL`
   - Production health check endpoint at `/api/health`
   - Automated `JWT_SECRET` generation
2. **Reverse Proxy Support**: Added `app.set('trust proxy', 1)` in `server.js` so client IPs are correctly detected behind Render's proxy without triggering rate-limiter false positives.
3. **Resilient Database SSL**: `services/databaseService.js` automatically enables SSL with `{ rejectUnauthorized: false }` for cloud PostgreSQL instances.
4. **Flexible Google Credentials**: `services/googleSheetsService.js` supports Base64 environment variables, raw JSON, Render Secret Files (`/etc/secrets/google-credentials.json`), or fallback to local files.

---

## 🚀 Deployment Method 1: Render Blueprint (Recommended - 1 Click)

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Configure production deployment for Render"
   git push origin main
   ```

2. **Go to Render**:
   - Log in to [dashboard.render.com](https://dashboard.render.com).
   - Click **New +** → **Blueprint**.
   - Connect your GitHub repository (`sbm-recordapp`).
   - Render will detect `render.yaml` and configure both the **Web Service** and the **PostgreSQL Database**.

3. **Fill in the Prompted Secrets**:
   Render will ask for values marked `sync: false`:
   - `ADMIN_USERNAME`: Your admin username
   - `ADMIN_PASSWORD`: Your strong admin password
   - `BREVO_API_KEY`: Your Brevo email API key (`xkeysib-...`)
   - `BREVO_FROM_EMAIL`: Your verified sender email
   - `MNOTIFY_API_KEY`: Your mNotify SMS API key
   - `MNOTIFY_SENDER_ID`: `SBM-2025`
   - `GOOGLE_SPREADSHEET_ID`: Your Google Sheets spreadsheet ID
   - `GOOGLE_CREDENTIALS_BASE64`: Base64 string of your `google-credentials.json` (see below)

4. **Click "Apply"**: Render will provision the database and deploy your service.

---

## 🛠️ Deployment Method 2: Manual Dashboard Setup

If you prefer setting up manually without the blueprint:

### Step 1: Create PostgreSQL Database
1. In Render Dashboard, click **New +** → **PostgreSQL**.
2. **Name**: `sbm-postgres`
3. **Database**: `sbm_records`
4. **User**: `sbm_user`
5. **Plan**: Free (or Starter)
6. Click **Create Database**.
7. Copy the **Internal Database URL** (e.g., `postgres://sbm_user:...@dpg-...:5432/sbm_records`).

### Step 2: Create Web Service
1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the settings:
   - **Name**: `hhc-sbm-registration`
   - **Region**: Same region as your database (e.g., Oregon)
   - **Branch**: `main`
   - **Root Directory**: Leave blank (root of repository)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Health Check Path**: `/api/health`
   - **Plan**: Free (or Starter)

### Step 3: Add Environment Variables
Under the **Environment** tab, add:

| Key | Value / Description |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `10000` *(Render default)* |
| `DATABASE_URL` | *Paste the Internal Database URL from Step 1* |
| `ADMIN_USERNAME` | *Your admin login username* |
| `ADMIN_PASSWORD` | *Your admin login password* |
| `JWT_SECRET` | *Random 32+ character string* |
| `SESSION_TIMEOUT` | `21600000` *(6 hours)* |
| `BREVO_API_KEY` | *Your Brevo API Key (`xkeysib-...`)* |
| `BREVO_FROM_EMAIL` | *Your verified Brevo sender email* |
| `MNOTIFY_API_KEY` | *Your mNotify SMS API Key* |
| `MNOTIFY_SENDER_ID` | `HHC-SBM2025` |
| `USE_GOOGLE_SHEETS` | `true` |
| `GOOGLE_SPREADSHEET_ID` | *Your Google Sheets ID* |
| `GOOGLE_CREDENTIALS_BASE64` | *Base64-encoded `google-credentials.json`* |

---

## 🔑 How to Add Google Sheets Credentials

### Option A: Base64 Environment Variable (Easiest)
Run this command in PowerShell to convert your credentials file to base64:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("google-credentials.json")) | Set-Clipboard
```
Then paste it into Render as the value for `GOOGLE_CREDENTIALS_BASE64`.

### Option B: Render Secret File
1. In your Render Web Service dashboard, go to the **Environment** tab.
2. Scroll to **Secret Files**.
3. File Name: `google-credentials.json`
4. Contents: Paste the entire contents of your local `google-credentials.json`.
5. It will be mounted at `/etc/secrets/google-credentials.json` (the app now automatically detects this path).

---

## ✅ Post-Deployment Verification

1. **Check Service Health**:
   Visit `https://your-app.onrender.com/api/health` — it should return:
   ```json
   {"status":"ok","timestamp":"..."}
   ```
2. **Check Registration Page**:
   Visit `https://your-app.onrender.com/` — it should load the registration form.
3. **Check Admin Login**:
   Visit `https://your-app.onrender.com/admin.html` and log in with your `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
