import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const hostname = process.env.DB_HOST || "localhost";
const username = process.env.DB_USERNAME || "root";
const password = process.env.DB_PASSWORD || process.env.LOCAL_DB_PASSWORD || "";
const database = process.env.DB_DATABASE || "quickbook";
const port = Number(process.env.DB_PORT) || 3306;
const connectionLimit = Number(process.env.CONNECTION_LIMIT) || 10;
const connectTimeout = Number(process.env.DB_CONNECT_TIMEOUT) || 10000;

const pool = mysql.createPool({
  host: hostname,
  user: username,
  password,
  database,
  port,
  connectionLimit,
  connectTimeout,
  dateStrings: true,
});

let connectionTracker = 0;

pool.on("connection", () => {
  connectionTracker += 1;
  console.log("Connection Acquired:", connectionTracker);
});

pool.on("release", () => {
  connectionTracker -= 1;
  console.log("Connection Released:", connectionTracker);
});

export default pool;
