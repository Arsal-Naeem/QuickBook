import express from "express";
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

// ─── HELPER: Search QBO Entities ──────────────────────────────────────────────
async function searchQboEntity(req, res, entityName, searchField) {
  let con;
  try {
    con = await pool.getConnection();
    const { oauthClient, Realm_ID } = await getValidQboClient(
      con,
      req.user.tenantId,
    );

    const searchTerm = String(req.query.q || "").replace(/'/g, "''");

    const query = encodeURIComponent(
      `select * from ${entityName} where ${searchField} LIKE '%${searchTerm}%' maxresults 50`,
    );
    const url = `${apiBaseUrl}v3/company/${Realm_ID}/query?query=${query}`;

    const apiResponse = await oauthClient.makeApiCall({ url });
    const data =
      typeof apiResponse.json === "string"
        ? JSON.parse(apiResponse.json)
        : apiResponse.json;

    const results = data?.QueryResponse?.[entityName] || [];

    const mappedResults = results.map((item) => ({
      ...item,
      id: item.Id,
      displayName: item.DisplayName || item.Name,
      companyName: item.CompanyName || item.FullyQualifiedName,
    }));

    return res.json(mappedResults);
  } catch (error) {
    return handleQboRouteError(error, res);
  } finally {
    if (con) con.release();
  }
}

// ─── POST /updateQbId ─────────────────────────────────────────────────────────
router.post("/updateQbId", mockAuthMW, async (req, res) => {
  let con;
  try {
    const { internal_id, quickbooks_id, type } = req.body;

    if (!internal_id || !quickbooks_id || !type) {
      return res.status(400).json({
        error:
          "Missing required fields. Need internal_id, quickbooks_id, and type.",
      });
    }

    con = await pool.getConnection();

    if (type === "Customer" || type === "Vendor") {
      await con.execute(
        "UPDATE entities SET QB_ID = ? WHERE ID = ? AND Type = ?",
        [quickbooks_id, internal_id, type],
      );
    } else if (type === "MenuItem" || type === "Item") {
      await con.execute("UPDATE skus SET QB_ID = ? WHERE ID = ?", [
        quickbooks_id,
        internal_id,
      ]);
    }

    return res.status(200).json({
      success: true,
      message: `Successfully updated QBO ID for ${type}.`,
    });
  } catch (error) {
    console.error("Mapping Error:", error);
    return res.status(500).json({ error: "Failed to map ID." });
  } finally {
    if (con) con.release();
  }
});

// ─── GET SEARCH ROUTES ────────────────────────────────────────────────────────
router.get("/searchVendors", mockAuthMW, (req, res) =>
  searchQboEntity(req, res, "Vendor", "DisplayName"),
);
router.get("/searchCustomers", mockAuthMW, (req, res) =>
  searchQboEntity(req, res, "Customer", "DisplayName"),
);
router.get("/searchItems", mockAuthMW, (req, res) =>
  searchQboEntity(req, res, "Item", "Name"),
);

export default router;
