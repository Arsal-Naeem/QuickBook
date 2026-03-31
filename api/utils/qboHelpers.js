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
    const refreshResponse = await oauthClient.refresh();
    activeToken = {
      ...parsedDbToken,
      ...refreshResponse.getToken(),
      realmId: Realm_ID,
    };

    await upsertToken(con, activeToken, Realm_ID, Tenant_ID);
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
