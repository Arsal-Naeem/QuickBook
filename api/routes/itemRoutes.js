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

// ─── POST /createItem ─────────────────────────────────────────────────────────
router.post("/createItem", mockAuthMW, async (req, res) => {
  let con;
  try {
    con = await pool.getConnection();
    const { oauthClient, Realm_ID } = await getValidQboClient(con, req.user.tenantId);

    const payload = req.body;

    const url = `${apiBaseUrl}v3/company/${Realm_ID}/item`;
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

// ─── POST /updateItem ─────────────────────────────────────────────────────────
router.post("/updateItem", mockAuthMW, async (req, res) => {
  let con;
  try {
    con = await pool.getConnection();
    const { oauthClient, Realm_ID } = await getValidQboClient(con, req.user.tenantId);

    // Id and SyncToken are required by QBO for updates
    const payload = req.body;

    const url = `${apiBaseUrl}v3/company/${Realm_ID}/item`;
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

// ─── GET /getAllItems ──────────────────────────────────────────────────────────
router.get("/getAllItems", mockAuthMW, async (req, res) => {
  let con;
  try {
    con = await pool.getConnection();
    const { oauthClient, Realm_ID } = await getValidQboClient(con, req.user.tenantId);

    const query = encodeURIComponent("select * from Item");
    const url = `${apiBaseUrl}v3/company/${Realm_ID}/query?query=${query}`;

    const apiResponse = await oauthClient.makeApiCall({ url });

    const data =
      typeof apiResponse.json === "string"
        ? JSON.parse(apiResponse.json)
        : apiResponse.json;

    await fs.writeFile("items.json", JSON.stringify(data, null, 2), "utf-8");

    return res.json({
      message: "Items fetched and saved to items.json successfully.",
      count: data?.QueryResponse?.Item?.length ?? 0,
    });
  } catch (error) {
    return handleQboRouteError(error, res);
  } finally {
    if (con) con.release();
  }
});

export default router;
