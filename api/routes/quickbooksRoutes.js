import express from 'express';
import OAuthClient from 'intuit-oauth';
import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = ['QBO_CLIENT_ID', 'QBO_CLIENT_SECRET', 'QBO_REDIRECT_URI'];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const oauthClient = new OAuthClient({
  clientId: process.env.QBO_CLIENT_ID,
  clientSecret: process.env.QBO_CLIENT_SECRET,
  environment: process.env.QBO_ENVIRONMENT || 'sandbox',
  redirectUri: process.env.QBO_REDIRECT_URI,
});

const router = express.Router();

router.get('/authUri', (req, res) => {
  const authUri = oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
    state: process.env.QBO_STATE || 'testState',
  });

  res.redirect(authUri);
});

router.get('/callback', async (req, res) => {
  try {
    const authResponse = await oauthClient.createToken(req.url);
    console.log('The Token is:', JSON.stringify(authResponse.getToken()));
    res.redirect('http://localhost:5173');
  } catch (error) {
    console.error('The error message is:', error.originalMessage || error.message);
    res.status(500).send('Authentication failed.');
  }
});

router.get('/getCompanyInfo', async (req, res) => {
  try {
    const token = oauthClient.getToken();
    const realmId = token?.realmId;

    if (!realmId) {
      return res.status(400).json({
        error: 'No realmId found in token. Complete the OAuth flow first via /authUri.',
      });
    }

    const apiBaseUrl =
      oauthClient.environment === 'production'
        ? OAuthClient.environment.production
        : OAuthClient.environment.sandbox;

    const companyInfoUrl = `${apiBaseUrl}v3/company/${realmId}/companyinfo/${realmId}`;
    const apiResponse = await oauthClient.makeApiCall({ url: companyInfoUrl });

    const companyInfoData =
      typeof apiResponse.json === 'string'
        ? JSON.parse(apiResponse.json)
        : apiResponse.json;

    return res.json(companyInfoData);
  } catch (error) {
    console.error('Failed to fetch company info:', error);
    return res.status(500).json({
      error: 'Unable to fetch company info from QuickBooks.',
      details: error.originalMessage || error.message || 'Unknown error',
    });
  }
});

export default router;