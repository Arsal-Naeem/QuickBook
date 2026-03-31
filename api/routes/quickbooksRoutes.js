import express from "express";
import OAuthClient from "intuit-oauth";
import dotenv from "dotenv";
import pool from "../database/pool.js";
import { getValidQboClient, upsertToken } from "../utils/qboHelpers.js";
import mockAuthMW from "../middlewares/mockAuthMW.js";

dotenv.config();

const requiredEnvVars = [
  "QBO_CLIENT_ID",
  "QBO_CLIENT_SECRET",
  "QBO_ENVIRONMENT",
  "QBO_REDIRECT_URI",
  "QBO_TOKEN_ENCRYPTION_KEY",
];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`,
  );
}

const apiBaseUrl =
  process.env.QBO_ENVIRONMENT === "production"
    ? OAuthClient.environment.production
    : OAuthClient.environment.sandbox;

function createOAuthClient() {
  return new OAuthClient({
    clientId: process.env.QBO_CLIENT_ID,
    clientSecret: process.env.QBO_CLIENT_SECRET,
    environment: process.env.QBO_ENVIRONMENT,
    redirectUri: process.env.QBO_REDIRECT_URI,
  });
}

const router = express.Router();

router.get("/authUri", mockAuthMW, (req, res) => {
  try {
    const oauthClient = createOAuthClient();
    const authUri = oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
      state: String(req.user.tenantId),
    });

    return res.redirect(authUri);
  } catch (error) {
    console.error("Failed to build QBO auth URI:", error);
    return res.status(500).json({
      error: "Failed to start QuickBooks authentication.",
      details: error.originalMessage || error.message || "Unknown error",
    });
  }
});

router.get("/callback", async (req, res) => {
  let con;
  try {
    const oauthClient = createOAuthClient();
    await oauthClient.createToken(req.url);

    const token = oauthClient.getToken();
    const Realm_ID = token?.realmId;
    const tenantId = Number(req.query.state);

    if (!Realm_ID) {
      return res.status(400).json({
        error: "Authentication succeeded but Realm_ID was not returned.",
      });
    }

    con = await pool.getConnection();
    await upsertToken(con, token, Realm_ID, tenantId);

    return res.redirect(
      process.env.QBO_FRONTEND_URL || "http://localhost:5173",
    );
  } catch (error) {
    console.error("QBO callback failed:", error);
    return res.status(500).json({
      error: "Failed to complete QuickBooks authentication.",
      details: error.originalMessage || error.message || "Unknown error",
    });
  } finally {
    if (con) con.release();
  }
});

router.get("/getCompanyInfo", mockAuthMW, async (req, res) => {
  console.log("GET Company Info called for tenant:", req.user.tenantId);
  let con;

  const tenantId = req.user.tenantId;

  try {
    con = await pool.getConnection();

    const { oauthClient, Realm_ID } = await getValidQboClient(con, tenantId);

    const companyInfoUrl = `${apiBaseUrl}v3/company/${Realm_ID}/companyinfo/${Realm_ID}`;
    const apiResponse = await oauthClient.makeApiCall({ url: companyInfoUrl });

    const companyInfoData =
      typeof apiResponse.json === "string"
        ? JSON.parse(apiResponse.json)
        : apiResponse.json;

    return res.json(companyInfoData);
  } catch (error) {
    if (
      error.message ===
      "No stored token found. Authenticate first via /authUri."
    ) {
      return res.status(400).json({ error: error.message });
    }

    console.error("Failed to fetch company info:", error);
    return res.status(500).json({
      error: "Unable to fetch company info from QuickBooks.",
      details: error.originalMessage || error.message || "Unknown error",
    });
  } finally {
    if (con) con.release();
  }
});

export default router;
