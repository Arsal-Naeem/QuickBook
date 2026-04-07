import express from "express";
import OAuthClient from "intuit-oauth";
import pool from "../database/pool.js";
import { getValidQboClient, handleQboRouteError } from "../utils/qboHelpers.js";
import mockAuthMW from "../middlewares/mockAuthMW.js";

const apiBaseUrl =
  process.env.QBO_ENVIRONMENT === "production"
    ? OAuthClient.environment.production
    : OAuthClient.environment.sandbox;

const UPSERT_DEFAULT_QUERY = `
  INSERT INTO qb_defaults (Name, QB_ID, QB_Name)
  VALUES (?, ?, ?)
  ON DUPLICATE KEY UPDATE
    QB_ID = VALUES(QB_ID),
    QB_Name = VALUES(QB_Name)
`;

function parseQboApiResponse(apiResponse) {
  return typeof apiResponse.json === "string"
    ? JSON.parse(apiResponse.json)
    : apiResponse.json;
}

function sanitizeQboSearchTerm(term) {
  return String(term ?? "")
    .trim()
    .replace(/'/g, "\\'");
}

const router = express.Router();

router.get("/getDefaults", mockAuthMW, async (req, res) => {
  let con;
  try {
    con = await pool.getConnection();
    const [rows] = await con.query(
      "SELECT Name, QB_ID, QB_Name FROM qb_defaults",
    );

    return res.json(rows);
  } catch (error) {
    return handleQboRouteError(error, res);
  } finally {
    if (con) con.release();
  }
});

router.post("/saveDefault", mockAuthMW, async (req, res) => {
  let con;
  try {
    const { name, qb_id, qb_name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "name is required." });
    }

    con = await pool.getConnection();
    await con.query(UPSERT_DEFAULT_QUERY, [
      name,
      qb_id ?? null,
      qb_name ?? null,
    ]);

    return res.json({ success: true });
  } catch (error) {
    return handleQboRouteError(error, res);
  } finally {
    if (con) con.release();
  }
});

router.get("/searchCustomers", mockAuthMW, async (req, res) => {
  let con;
  try {
    const searchTerm = sanitizeQboSearchTerm(req.query.q);

    con = await pool.getConnection();
    const { oauthClient, Realm_ID } = await getValidQboClient(
      con,
      req.user.tenantId,
    );

    const query = encodeURIComponent(
      `SELECT Id, DisplayName, GivenName, CompanyName FROM Customer WHERE DisplayName LIKE '%${searchTerm}%' MAXRESULTS 50`,
    );
    const url = `${apiBaseUrl}v3/company/${Realm_ID}/query?query=${query}`;
    const apiResponse = await oauthClient.makeApiCall({ url });
    const data = parseQboApiResponse(apiResponse);

    const normalizedCustomers = (data?.QueryResponse?.Customer ?? []).map(
      (item) => ({
        id: item?.Id ?? null,
        displayName: item?.DisplayName ?? item?.GivenName ?? "",
        companyName: item?.CompanyName ?? "",
      }),
    );

    return res.json(normalizedCustomers);
  } catch (error) {
    return handleQboRouteError(error, res);
  } finally {
    if (con) con.release();
  }
});

router.get("/searchAccounts", mockAuthMW, async (req, res) => {
  let con;
  try {
    const searchTerm = sanitizeQboSearchTerm(req.query.q);

    con = await pool.getConnection();
    const { oauthClient, Realm_ID } = await getValidQboClient(
      con,
      req.user.tenantId,
    );

    const query = encodeURIComponent(
      `SELECT Id, Name, AccountType FROM Account WHERE Name LIKE '%${searchTerm}%' MAXRESULTS 50`,
    );
    const url = `${apiBaseUrl}v3/company/${Realm_ID}/query?query=${query}`;
    const apiResponse = await oauthClient.makeApiCall({ url });
    const data = parseQboApiResponse(apiResponse);

    const normalizedAccounts = (data?.QueryResponse?.Account ?? []).map(
      (item) => ({
        id: item?.Id ?? null,
        name: item?.Name ?? "",
        accountType: item?.AccountType ?? "",
      }),
    );

    return res.json(normalizedAccounts);
  } catch (error) {
    return handleQboRouteError(error, res);
  } finally {
    if (con) con.release();
  }
});

router.get("/searchTaxCodes", mockAuthMW, async (req, res) => {
  let con;
  try {
    const searchTerm = sanitizeQboSearchTerm(req.query.q);

    con = await pool.getConnection();
    const { oauthClient, Realm_ID } = await getValidQboClient(
      con,
      req.user.tenantId,
    );

    const query = encodeURIComponent(
      `SELECT Id, Name, SalesTaxRateList FROM TaxCode WHERE Name LIKE '%${searchTerm}%' MAXRESULTS 50`,
    );
    const url = `${apiBaseUrl}v3/company/${Realm_ID}/query?query=${query}`;
    const apiResponse = await oauthClient.makeApiCall({ url });
    const data = parseQboApiResponse(apiResponse);

    const normalizedTaxCodes = (data?.QueryResponse?.TaxCode ?? []).map(
      (item) => {
        const taxRateRefId =
          item?.SalesTaxRateList?.TaxRateDetail?.[0]?.TaxRateRef?.value ?? null;

        return {
          id: item?.Id ?? null,
          name: item?.Name ?? "",
          taxRateRefId,
        };
      },
    );

    return res.json(normalizedTaxCodes);
  } catch (error) {
    return handleQboRouteError(error, res);
  } finally {
    if (con) con.release();
  }
});

router.get("/searchPaymentMethods", mockAuthMW, async (req, res) => {
  let con;
  try {
    const searchTerm = sanitizeQboSearchTerm(req.query.q);

    con = await pool.getConnection();
    const { oauthClient, Realm_ID } = await getValidQboClient(
      con,
      req.user.tenantId,
    );

    const query = encodeURIComponent(
      `SELECT Id, Name, Type FROM PaymentMethod WHERE Name LIKE '%${searchTerm}%' MAXRESULTS 50`,
    );
    const url = `${apiBaseUrl}v3/company/${Realm_ID}/query?query=${query}`;
    const apiResponse = await oauthClient.makeApiCall({ url });
    const data = parseQboApiResponse(apiResponse);

    const normalizedPaymentMethods = (
      data?.QueryResponse?.PaymentMethod ?? []
    ).map((item) => ({
      id: item?.Id ?? null,
      name: item?.Name ?? "",
      paymentType: item?.Type ?? "",
    }));

    return res.json(normalizedPaymentMethods);
  } catch (error) {
    return handleQboRouteError(error, res);
  } finally {
    if (con) con.release();
  }
});

export default router;
