import express from "express";
import fs from "fs/promises";
import OAuthClient from "intuit-oauth";
import dotenv from "dotenv";
import pool from "../database/pool.js";
import { getValidQboClient, handleQboRouteError } from "../utils/qboHelpers.js";
import mockAuthMW from "../middlewares/mockAuthMW.js";

dotenv.config();

const apiBaseUrl =
  process.env.QBO_ENVIRONMENT === "production"
    ? OAuthClient.environment.production
    : OAuthClient.environment.sandbox;

const router = express.Router();

// ─── POST /createCustomer ─────────────────────────────────────────────────────
router.post("/createCustomer", mockAuthMW, async (req, res) => {
  let con;
  try {
    con = await pool.getConnection();
    const { oauthClient, Realm_ID } = await getValidQboClient(con, req.user.tenantId);

    const payload = req.body;

    const url = `${apiBaseUrl}v3/company/${Realm_ID}/customer`;
    const apiResponse = await oauthClient.makeApiCall({
      url,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data =
      typeof apiResponse.json === "string"
        ? JSON.parse(apiResponse.json)
        : apiResponse.json;

    return res.status(201).json(data);
  } catch (error) {
    return handleQboRouteError(error, res);
  } finally {
    if (con) con.release();
  }
});

// ─── POST /updateCustomer ─────────────────────────────────────────────────────
router.post("/updateCustomer", mockAuthMW, async (req, res) => {
  let con;
  try {
    con = await pool.getConnection();
    const { oauthClient, Realm_ID } = await getValidQboClient(con, req.user.tenantId);

    // Id and SyncToken are required by QBO for updates
    const payload = req.body;

    const url = `${apiBaseUrl}v3/company/${Realm_ID}/customer`;
    const apiResponse = await oauthClient.makeApiCall({
      url,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data =
      typeof apiResponse.json === "string"
        ? JSON.parse(apiResponse.json)
        : apiResponse.json;

    return res.json(data);
  } catch (error) {
    return handleQboRouteError(error, res);
  } finally {
    if (con) con.release();
  }
});

// ─── GET /getAllCustomers ──────────────────────────────────────────────────────
router.get("/getAllCustomers", mockAuthMW, async (req, res) => {
  let con;
  try {
    con = await pool.getConnection();
    const { oauthClient, Realm_ID } = await getValidQboClient(con, req.user.tenantId);

    const query = encodeURIComponent("select * from Customer");
    const url = `${apiBaseUrl}v3/company/${Realm_ID}/query?query=${query}`;

    const apiResponse = await oauthClient.makeApiCall({ url });

    const data =
      typeof apiResponse.json === "string"
        ? JSON.parse(apiResponse.json)
        : apiResponse.json;

    await fs.writeFile("customers.json", JSON.stringify(data, null, 2), "utf-8");

    return res.json({
      message: "Customers fetched and saved to customers.json successfully.",
      count: data?.QueryResponse?.Customer?.length ?? 0,
    });
  } catch (error) {
    return handleQboRouteError(error, res);
  } finally {
    if (con) con.release();
  }
});

export default router;
