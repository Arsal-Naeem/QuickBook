import OAuthClient from "intuit-oauth";
import "dotenv/config";

export const TOKEN_COLUMNS = `
  Tenant_ID,
  Realm_ID,
  State,
  Latency,
  ID_Token,
  Created_At,
  Expires_In,
  Token_Type,
  Access_Token,
  Refresh_Token,
  X_Refresh_Token_Expires_In
`;

export const UPSERT_TOKEN_QUERY = `
  INSERT INTO qbo_tokens (
    Tenant_ID,
    Realm_ID,
    State,
    Latency,
    ID_Token,
    Created_At,
    Expires_In,
    Token_Type,
    Access_Token,
    Refresh_Token,
    X_Refresh_Token_Expires_In
  )
  VALUES (
    ?, ?, ?, ?, AES_ENCRYPT(?, ?), ?, ?, ?, AES_ENCRYPT(?, ?), AES_ENCRYPT(?, ?), ?
  )
  ON DUPLICATE KEY UPDATE
    Tenant_ID = VALUES(Tenant_ID),
    State = VALUES(State),
    Latency = VALUES(Latency),
    ID_Token = VALUES(ID_Token),
    Created_At = VALUES(Created_At),
    Expires_In = VALUES(Expires_In),
    Token_Type = VALUES(Token_Type),
    Access_Token = VALUES(Access_Token),
    Refresh_Token = VALUES(Refresh_Token),
    X_Refresh_Token_Expires_In = VALUES(X_Refresh_Token_Expires_In)
`;

export function parseNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toTokenRecord(token, Realm_ID, Tenant_ID) {
  return {
    Tenant_ID,
    Realm_ID,
    State: token?.state ?? null,
    Latency: parseNumber(token?.latency),
    ID_Token: token?.id_token ?? null,
    Created_At: parseNumber(token?.createdAt),
    Expires_In: parseNumber(token?.expires_in),
    Token_Type: token?.token_type ?? null,
    Access_Token: token?.access_token ?? null,
    Refresh_Token: token?.refresh_token ?? null,
    X_Refresh_Token_Expires_In: parseNumber(token?.x_refresh_token_expires_in),
  };
}

export function tokenRecordToQueryParams(tokenRecord) {
  const encryptionKey = process.env.QBO_TOKEN_ENCRYPTION_KEY;

  return [
    tokenRecord.Tenant_ID,
    tokenRecord.Realm_ID,
    tokenRecord.State,
    tokenRecord.Latency,
    tokenRecord.ID_Token,
    encryptionKey,
    tokenRecord.Created_At,
    tokenRecord.Expires_In,
    tokenRecord.Token_Type,
    tokenRecord.Access_Token,
    encryptionKey,
    tokenRecord.Refresh_Token,
    encryptionKey,
    tokenRecord.X_Refresh_Token_Expires_In,
  ];
}

export function rowToOAuthToken(row) {
  const decode = (val) =>
    val == null ? undefined : Buffer.isBuffer(val) ? val.toString("utf8") : val;

  return {
    state: row.State ?? undefined,
    latency: parseNumber(row.Latency) ?? undefined,
    realmId: row.Realm_ID,
    id_token: decode(row.ID_Token),
    createdAt: parseNumber(row.Created_At) ?? undefined,
    expires_in: parseNumber(row.Expires_In) ?? undefined,
    token_type: row.Token_Type ?? undefined,
    access_token: decode(row.Access_Token),
    refresh_token: decode(row.Refresh_Token),
    x_refresh_token_expires_in:
      parseNumber(row.X_Refresh_Token_Expires_In) ?? undefined,
  };
}

export async function upsertToken(con, token, Realm_ID, Tenant_ID) {
  const tokenRecord = toTokenRecord(token, Realm_ID, Tenant_ID);

  if (!tokenRecord.Access_Token || !tokenRecord.Refresh_Token) {
    throw new Error(
      "QuickBooks token payload is missing access_token or refresh_token.",
    );
  }

  await con.query(UPSERT_TOKEN_QUERY, tokenRecordToQueryParams(tokenRecord));
}

export const parseQbData = (apiResponse) => {
  let status = apiResponse.status;
  let data =
    typeof apiResponse.json === "string"
      ? JSON.parse(apiResponse.json)
      : apiResponse.json;

  let firstDigit = status.toString()[0];
  if (Number(firstDigit) !== 2) throw data;

  return data;
};

export async function getValidQboClient(con, Tenant_ID) {
  const oauthClient = new OAuthClient({
    clientId: process.env.QBO_CLIENT_ID,
    clientSecret: process.env.QBO_CLIENT_SECRET,
    environment: process.env.QBO_ENVIRONMENT,
    redirectUri: process.env.QBO_REDIRECT_URI,
  });

  const encryptionKey = process.env.QBO_TOKEN_ENCRYPTION_KEY;

  const [tokenRows] = await con.query(
    `SELECT
      Tenant_ID,
      Realm_ID,
      State,
      Latency,
      AES_DECRYPT(ID_Token, ?) AS ID_Token,
      Created_At,
      Expires_In,
      Token_Type,
      AES_DECRYPT(Access_Token, ?) AS Access_Token,
      AES_DECRYPT(Refresh_Token, ?) AS Refresh_Token,
      X_Refresh_Token_Expires_In
    FROM qbo_tokens
    WHERE Tenant_ID = ?
    ORDER BY Updated_At DESC
    LIMIT 1`,
    [encryptionKey, encryptionKey, encryptionKey, Tenant_ID],
  );

  if (!tokenRows.length) {
    throw new Error("No stored token found. Authenticate first via /authUri.");
  }

  const Realm_ID = tokenRows[0].Realm_ID;
  const parsedDbToken = rowToOAuthToken(tokenRows[0]);

  oauthClient.setToken(parsedDbToken);

  let activeToken = parsedDbToken;

  if (!oauthClient.isAccessTokenValid()) {
    try {
      const refreshResponse = await oauthClient.refresh();

      activeToken = {
        ...parsedDbToken,
        ...refreshResponse.getToken(),
        realmId: Realm_ID,
      };

      await upsertToken(con, activeToken, Realm_ID, Tenant_ID);

      oauthClient.setToken(activeToken);
    } catch (err) {
      let data = err.authResponse?.response?.data || {};

      console.log("QBO Refresh Error Data:", data);

      if (
        data.error === "invalid_grant" &&
        data.error_description === "Incorrect or invalid refresh token"
      ) {
        console.log(
          "REFRESH ERROR: Token is dead and requires user re-authentication.",
        );
      }

      const error = new Error("Unable to refresh QuickBooks token.");
      error.code = "QB_REFRESH";
      error.statusCode = 500;
      throw error;
    }
  }

  oauthClient.setToken(activeToken);

  return { oauthClient, Realm_ID };
}

export function handleQboRouteError(error, res) {
  if (
    error.message === "No stored token found. Authenticate first via /authUri."
  ) {
    return res.status(401).json({ requiresAuth: true });
  }

  console.error("QBO route error:", error);
  return res.status(500).json({
    error: "Unable to complete QuickBooks request.",
    details: error.originalMessage || error.message || "Unknown error",
  });
}

export async function pushProductToQB({
  con,
  tenantId,
  name,
  sku,
  description,
  price = 0,
  type = "Inventory", // Accepted values: 'Inventory', 'Service', 'NonInventory'
  qtyOnHand = 0,
  qbItemId,
}) {
  const { oauthClient, Realm_ID } = await getValidQboClient(con, tenantId);

  const apiBaseUrl =
    process.env.QBO_ENVIRONMENT === "production"
      ? OAuthClient.environment.production
      : OAuthClient.environment.sandbox;

  const baseUrl = `${apiBaseUrl}v3/company/${Realm_ID}`;

  let body = {
    Name: name,
    Type: type,
    Sku: sku,
    Description: description,
    UnitPrice: price,
    IncomeAccountRef: { value: "79", name: "Sales of Product Income" }, // Dummy reference: replace with actual account from your QBO chart of accounts
  };

  if (type === "Inventory") {
    body.ExpenseAccountRef = { value: "80", name: "Cost of Goods Sold" };
    body.AssetAccountRef = { value: "81", name: "Inventory Asset" };
    body.TrackQtyOnHand = true;
    body.QtyOnHand = qtyOnHand;
    body.InvStartDate = new Date().toISOString().split("T")[0];
  }

  // If editing an existing item, fetch it first to get the latest SyncToken
  if (qbItemId) {
    body.Id = String(qbItemId);

    try {
      let getResponse = await oauthClient.makeApiCall({
        url: `${baseUrl}/item/${qbItemId}`,
      });
      let currentData = parseQbData(getResponse);

      body.SyncToken = currentData.Item.SyncToken;
    } catch (err) {
      console.error(
        "Error fetching existing product from QBO:",
        err?.Fault?.Error || err,
      );
      throw new Error("Unable to fetch existing QBO Item for SyncToken.");
    }
  }

  // Make the POST request to create or update the item
  let apiResponse = await oauthClient.makeApiCall({
    url: `${baseUrl}/item`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data = parseQbData(apiResponse);

  return { qbId: data.Item.Id, syncToken: data.Item.SyncToken };
}
