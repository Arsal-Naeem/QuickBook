# QuickBook Setup Guide

This project has two parts:
- api: Express backend for QuickBooks OAuth and company info API calls
- react: Vite + React frontend

## 1) Prerequisites

- Node.js 18+ and npm
- A QuickBooks Developer account
- A QuickBooks Sandbox company (recommended for testing)
- MySQL 8+ (or compatible MySQL with JSON column support)

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
QBO_FRONTEND_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=3306
DB_NAME=quickbook
DB_USERNAME=root
DB_PASSWORD=YOUR_DB_PASSWORD
# Optional fallback used by pool.js
# LOCAL_DB_PASSWORD=YOUR_LOCAL_DB_PASSWORD
# Optional pool size
# CONNECTION_LIMIT=10
```

## 4) Database Setup (MySQL)

Create the schema/table used for OAuth token persistence:

```bash
mysql -u root -p < sql/quickbook.sql
```

The backend stores one token record per QuickBooks company in the qbo_tokens table:
- Realm_ID: primary key
- State
- Latency
- ID_Token
- Created_At
- Expires_In
- Token_Type
- Access_Token
- Refresh_Token
- X_Refresh_Token_Expires_In

Note: The SQL script includes ALTER statements so existing qbo_tokens tables can be migrated to the new column-based format.
It also backfills legacy Token_Data JSON into dedicated columns when old rows already exist.

## 5) Start Backend

From the api folder:

```bash
npm run dev
```

The backend runs on http://localhost:8000.

## 6) Frontend Setup (react)

Open a second terminal in the react folder:

```bash
cd react
npm install
npm run dev
```

The frontend runs on http://localhost:5173.

Note: The frontend uses a Vite proxy for /api requests to http://localhost:8000, so both backend and frontend must be running.

## 7) API Endpoints

- GET /authUri
	Starts QuickBooks OAuth login.
- GET /callback
	Handles OAuth callback, stores/upserts token values in dedicated qbo_tokens columns by Realm_ID, then redirects to QBO_FRONTEND_URL.
- GET /getCompanyInfo/:Realm_ID
	Loads token for the given Realm_ID, refreshes automatically if expired, and returns company info from QBO.

## 8) Test the Full Flow

1. Start backend and frontend.
2. Open http://localhost:5173.
3. Click Connect to QuickBooks (or visit http://localhost:8000/authUri).
4. Sign in and authorize access.
5. Use the returned Realm_ID to call:

	 http://localhost:8000/getCompanyInfo/<Realm_ID>

You should see company details in the response.

## 9) Common Issues

- redirect_uri mismatch:
	Ensure Redirect URI in Intuit app settings exactly matches QBO_REDIRECT_URI in api/.env.
- Missing required environment variables:
	Ensure QBO_CLIENT_ID, QBO_CLIENT_SECRET, QBO_ENVIRONMENT, and QBO_REDIRECT_URI are set.
- Database connection errors:
	Verify DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD and confirm MySQL is running.
- Missing token for Realm_ID:
	Authenticate first via /authUri so /callback can store token values in qbo_tokens.
- Legacy records still in Token_Data only:
	Re-run sql/quickbook.sql once so legacy JSON values are backfilled into dedicated columns.

## Security Note

- Do not commit real QuickBooks credentials.
- Keep secrets only in api/.env (already ignored by api/.gitignore).
