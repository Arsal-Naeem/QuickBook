# QuickBook Setup Guide

This project has two parts:
- api: Express backend for QuickBooks OAuth and company info API calls
- react: Vite + React frontend

## 1) Prerequisites

- Node.js 18+ and npm
- A QuickBooks Developer account
- A QuickBooks Sandbox company (recommended for testing)

## 2) Create and Configure Your QuickBooks App

1. Sign in to the Intuit Developer portal.
2. Create an app and enable QuickBooks Online API access.
3. Copy your Client ID and Client Secret.
4. Important: In your app, go to App details > Settings > Redirect URI and add:

	 http://localhost:8000/callback

5. Save the app settings.

If this Redirect URI does not exactly match your backend value, OAuth login will fail.

## 3) Backend Setup (api)

Open a terminal in the api folder:

```bash
cd api
npm install
```

Create or update api/.env:

```env
PORT=8000
QBO_CLIENT_ID=YOUR_CLIENT_ID
QBO_CLIENT_SECRET=YOUR_CLIENT_SECRET
QBO_ENVIRONMENT=sandbox
QBO_REDIRECT_URI=http://localhost:8000/callback
QBO_STATE=testState
```

Start the backend:

```bash
npm run dev
```

The backend runs on http://localhost:8000.

## 4) Frontend Setup (react)

Open a second terminal in the react folder:

```bash
cd react
npm install
npm run dev
```

The frontend runs on http://localhost:5173.

Note: The frontend uses a Vite proxy for /api requests to http://localhost:8000, so both backend and frontend must be running.

## 5) Test the Full Flow

1. Start backend and frontend.
2. Open http://localhost:5173.
3. Click Connect to QuickBooks.
4. Sign in and authorize access.
5. After callback, click Get Company Info.

You should see company details in the UI.

## 6) Common Issues

- redirect_uri mismatch:
	Ensure the Redirect URI in QuickBooks App details > Settings exactly matches QBO_REDIRECT_URI in api/.env.
- Missing required environment variables:
	Check all QBO_* values in api/.env.
- No company info after restart:
	Reconnect to QuickBooks, because OAuth token is kept in memory during runtime.

## Security Note

- Do not commit real QuickBooks credentials.
- Keep secrets only in api/.env (already ignored by api/.gitignore).
