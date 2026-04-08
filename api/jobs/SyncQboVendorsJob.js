import { Job } from "sidequest";
import pool from "../database/pool.js";
import { getValidQboClient } from "../utils/qboHelpers.js";
import OAuthClient from "intuit-oauth";

const apiBaseUrl =
  process.env.QBO_ENVIRONMENT === "production"
    ? OAuthClient.environment.production
    : OAuthClient.environment.sandbox;

const UPSERT_SYNCED_QUERY = `
  INSERT INTO qb_defaults (Name, QB_ID, QB_Name)
  VALUES (?, ?, ?)
  ON DUPLICATE KEY UPDATE QB_ID = VALUES(QB_ID), QB_Name = VALUES(QB_Name)
`;

function buildAddress(addr) {
  if (!addr) return "";
  return [addr.Line1, addr.City, addr.CountrySubDivisionCode]
    .filter(Boolean)
    .join(", ");
}

function mapVendorToSyncEntity(vendor) {
  return {
    name: vendor.DisplayName ?? "",
    email: vendor.PrimaryEmailAddr?.Address ?? "",
    phone: vendor.PrimaryPhone?.FreeFormNumber ?? "",
    address: buildAddress(vendor.BillAddr),
    note: "",
    qbId: vendor.Id ?? null,
  };
}

async function fetchAllQboVendors(oauthClient, Realm_ID) {
  const all = [];
  let startPos = 1;
  const pageSize = 1000;

  while (true) {
    const query = encodeURIComponent(
      `SELECT * FROM Vendor STARTPOSITION ${startPos} MAXRESULTS ${pageSize}`
    );
    const url = `${apiBaseUrl}v3/company/${Realm_ID}/query?query=${query}`;
    const apiResponse = await oauthClient.makeApiCall({ url });
    const data =
      typeof apiResponse.json === "string"
        ? JSON.parse(apiResponse.json)
        : apiResponse.json;

    if (data.Fault) {
      throw new Error(`QBO API Error: ${JSON.stringify(data.Fault)}`);
    }

    const page = data?.QueryResponse?.Vendor ?? [];
    all.push(...page);

    if (page.length < pageSize) {
      break;
    }

    startPos += pageSize;
  }

  return all;
}

async function bulkSyncEntities(con, entities, tenantId, branchId) {
  try {
    await con.query("CALL BulkSyncEntities(?, ?, ?, ?)", [
      JSON.stringify(entities),
      "Vendor",
      tenantId,
      branchId,
    ]);
  } catch (error) {
    if (error?.code !== "ER_SP_WRONG_NO_OF_ARGS" && error?.errno !== 1318) {
      throw error;
    }

    await con.query("CALL BulkSyncEntities(?, ?, ?)", [
      JSON.stringify(entities),
      "Vendor",
      tenantId,
    ]);
  }
}

export class SyncQboVendorsJob extends Job {
  async run(payload = {}) {
    const { tenantId, branchId: payloadBranchId } = payload;
    const branchId = payloadBranchId ?? 1;

    if (!tenantId) {
      throw new Error("SyncQboVendorsJob: missing tenantId in payload");
    }

    let con;
    try {
      con = await pool.getConnection();
      const { oauthClient, Realm_ID } = await getValidQboClient(con, tenantId);
      const vendors = await fetchAllQboVendors(oauthClient, Realm_ID);
      const vendorEntities = vendors.map(mapVendorToSyncEntity);

      console.log(
        `SyncQboVendorsJob: fetched ${vendors.length} vendors for tenant ${tenantId}`,
      );

      await bulkSyncEntities(con, vendorEntities, tenantId, branchId);

      await con.query(UPSERT_SYNCED_QUERY, ["vendors_synced", "1", "Synced"]);

      console.log(`SyncQboVendorsJob: completed for tenant ${tenantId}`);

      return { ok: true, count: vendors.length };
    } catch (error) {
      console.error(`SyncQboVendorsJob failed for tenant ${tenantId}:`, error);
      throw error;
    } finally {
      if (con) {
        con.release();
      }
    }
  }
}
