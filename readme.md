# QuickBook Project Guide

This project has two apps that work together:
- api: Express backend for QuickBooks OAuth, token persistence, defaults management, and QBO entity APIs
- react: Vite + React frontend with three pages (Home, API Test Dashboard, QB Defaults)

## Architecture Overview

High-level flow:
1. User opens the React app at http://localhost:5173.
2. Frontend calls /api/* endpoints.
3. Vite proxy rewrites /api/* to backend routes at http://localhost:8000/*.
4. Backend handles OAuth with QuickBooks, stores encrypted tokens in MySQL, and calls QBO APIs.
5. Frontend displays results or allows setting QuickBooks defaults.

Core backend modules:
- server.js mounts all route groups under /qbo
- routes/quickbooksRoutes.js handles OAuth and company info
- routes/itemRoutes.js handles item create/update/list
- routes/customerRoutes.js handles customer create/update/list
- routes/vendorRoutes.js handles vendor create/update/list
- routes/defaultsRoutes.js handles qb_defaults load/save/search
- utils/qboHelpers.js centralizes token upsert, refresh, decrypt/encrypt, and error handling
- database/pool.js creates and tracks the MySQL pool
- middlewares/mockAuthMW.js injects a mock authenticated user (tenantId: 2)

Core frontend pages:
- Home (src/pages/Home/App.jsx): Connect to QBO and fetch company info
- QBDefaults (src/pages/QBDefaults/QBDefaults.jsx): Search and save QuickBooks defaults
- QboTestDashboard (src/pages/QBOTestDashboard/QboTestDashboard.jsx): Manual test buttons for item/customer/vendor routes

## Prerequisites

- Node.js 18+ and npm
- MySQL 8+
- QuickBooks Developer account and a sandbox company

## QuickBooks App Configuration

In Intuit Developer settings, set Redirect URI to:

http://localhost:8000/qbo/callback

This must exactly match QBO_REDIRECT_URI in your backend .env.

## Backend Setup (api)

From the project root:

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
QBO_REDIRECT_URI=http://localhost:8000/qbo/callback
QBO_TOKEN_ENCRYPTION_KEY=YOUR_AES_KEY
QBO_FRONTEND_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=quickbook
DB_USERNAME=root
DB_PASSWORD=YOUR_DB_PASSWORD

# Optional fallbacks/tuning
# LOCAL_DB_PASSWORD=YOUR_LOCAL_DB_PASSWORD
# CONNECTION_LIMIT=10
# DB_CONNECT_TIMEOUT=10000
```

Important notes:
- QBO_TOKEN_ENCRYPTION_KEY is required. The backend throws on startup if missing.
- Database variable is DB_DATABASE (not DB_NAME).
- OAuth state is taken from mockAuthMW tenantId, not from an env variable.

## Database Setup (MySQL)

Run the SQL script from the project root:

```bash
mysql -u root -p < sql/quickbook.sql
```

The script creates:
- qbo_tokens
	- Composite primary key: (Tenant_ID, Realm_ID)
	- Encrypted columns (stored with AES_ENCRYPT in SQL): ID_Token, Access_Token, Refresh_Token
	- Updated_At timestamp used to pick the latest token row per tenant
- qb_defaults
	- Unique Name key for upserted defaults

## Run the Project

Start backend:

```bash
cd api
npm run dev
```

Start frontend in a second terminal:

```bash
cd react
npm install
npm run dev
```

Frontend runs at http://localhost:5173 and backend at http://localhost:8000.

## Frontend Routing and Behavior

- / (Home)
	- Connect to QuickBooks button redirects to /qbo/authUri
	- Get Company Info calls /api/qbo/getCompanyInfo
	- If backend returns 401 { requiresAuth: true }, frontend redirects to /qbo/authUri

- /qb-defaults (QB Defaults)
	- Loads saved defaults from /api/qbo/defaults/getDefaults
	- Debounced search (400ms, minimum 2 chars) against:
		- /api/qbo/defaults/searchCustomers
		- /api/qbo/defaults/searchAccounts
		- /api/qbo/defaults/searchTaxCodes
		- /api/qbo/defaults/searchPaymentMethods
	- Saves selected default via /api/qbo/defaults/saveDefault
	- Special case: saving tax_code also saves tax_rate_ref

- /test (QBO Test Dashboard)
	- Manual create/update/get-all calls for items, customers, vendors
	- Uses sample payloads and displays raw JSON response

## Backend API Reference

All routes are mounted under /qbo.

Auth and company info:
- GET /qbo/authUri
	- Starts OAuth flow with state = tenantId from mock auth
- GET /qbo/callback
	- Exchanges auth code, upserts encrypted token row, redirects to QBO_FRONTEND_URL
- GET /qbo/getCompanyInfo
	- Loads latest token for tenant, refreshes if expired, returns company info

Items:
- POST /qbo/items/createItem
- POST /qbo/items/updateItem
- GET /qbo/items/getAllItems
	- Also writes the raw result to items.json in the backend process working directory

Customers:
- POST /qbo/customers/createCustomer
- POST /qbo/customers/updateCustomer
- GET /qbo/customers/getAllCustomers
	- Also writes the raw result to customers.json in the backend process working directory

Vendors:
- POST /qbo/vendors/createVendor
- POST /qbo/vendors/updateVendor
- GET /qbo/vendors/getAllVendors
	- Also writes the raw result to vendors.json in the backend process working directory

Defaults:
- GET /qbo/defaults/getDefaults
- POST /qbo/defaults/saveDefault
- GET /qbo/defaults/searchCustomers?q=...
- GET /qbo/defaults/searchAccounts?q=...
- GET /qbo/defaults/searchTaxCodes?q=...
- GET /qbo/defaults/searchPaymentMethods?q=...

## Token and Tenant Behavior

- Mock authentication is always applied on business routes and sets req.user.tenantId = 2.
- Tokens are read from qbo_tokens by Tenant_ID, ordered by Updated_At DESC, limited to latest row.
- If access token is expired, backend refreshes token and upserts updated values.
- If no token exists for tenant, routes return 401 with { requiresAuth: true }.

## Common Issues

- Redirect URI mismatch:
	- Ensure Intuit app redirect URI exactly equals QBO_REDIRECT_URI.
- Missing required env vars:
	- Ensure QBO_CLIENT_ID, QBO_CLIENT_SECRET, QBO_ENVIRONMENT, QBO_REDIRECT_URI, and QBO_TOKEN_ENCRYPTION_KEY are set.
- Wrong DB env variable:
	- Use DB_DATABASE, not DB_NAME.
- No token stored yet:
	- Authenticate first via /qbo/authUri.
- Invalid token decrypt/refresh behavior:
	- Verify QBO_TOKEN_ENCRYPTION_KEY matches the key used when tokens were stored.

## Security Notes

- Never commit real QuickBooks credentials.
- Keep all secrets in api/.env.
- mockAuthMW is for local development only; replace with real authentication/tenant resolution for production.
