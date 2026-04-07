import dotenv from "dotenv";
import { Sidequest } from "sidequest";

dotenv.config();

let started = false;

const parseBooleanEnv = (value, defaultValue = false) => {
  if (value === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const buildMysqlConnectionString = () => {
  if (process.env.SIDEQUEST_MYSQL_URL) {
    return process.env.SIDEQUEST_MYSQL_URL;
  }

  const host = process.env.DB_HOST || "localhost";
  const user =
    process.env.DB_USERNAME ||
    (process.env.NODE_ENV === "production" ? undefined : "root");
  const password =
    process.env.DB_PASSWORD ||
    (process.env.NODE_ENV === "production"
      ? undefined
      : process.env.LOCAL_DB_PASSWORD || "");
  const database = process.env.DB_DATABASE || "quickbook";
  const port = process.env.DB_PORT || "3306";

  const auth =
    user !== undefined
      ? `${encodeURIComponent(user)}:${encodeURIComponent(password || "")}@`
      : "";

  return `mysql://${auth}${host}:${port}/${database}`;
};

export const startSidequest = async () => {
  if (started) return;

  const defaultQueueName = process.env.SIDEQUEST_DEFAULT_QUEUE_NAME || "default";

  await Sidequest.start({
    backend: {
      driver: "@sidequest/mysql-backend",
      config: buildMysqlConnectionString(),
    },
    queues: [
      {
        name: defaultQueueName,
        concurrency: Number(process.env.SIDEQUEST_DEFAULT_QUEUE_CONCURRENCY || 2),
        priority: Number(process.env.SIDEQUEST_DEFAULT_QUEUE_PRIORITY || 50),
        state: "active",
      },
    ],
    jobDefaults: {
      queue: defaultQueueName,
      maxAttempts: Number(process.env.SIDEQUEST_JOB_MAX_ATTEMPTS || 3),
      timeout: Number(process.env.SIDEQUEST_JOB_TIMEOUT_MS || 120000),
    },
    manualJobResolution: true,
    jobsFilePath: "./sidequest.jobs.js",
    logger: {
      level: process.env.SIDEQUEST_LOG_LEVEL || "info",
      json: parseBooleanEnv(process.env.SIDEQUEST_LOG_JSON, false),
    },
    dashboard: {
      enabled: parseBooleanEnv(process.env.SIDEQUEST_DASHBOARD_ENABLED, false),
      port: Number(process.env.SIDEQUEST_DASHBOARD_PORT || 8678),
      auth:
        process.env.SIDEQUEST_DASHBOARD_USER &&
        process.env.SIDEQUEST_DASHBOARD_PASSWORD
          ? {
              user: process.env.SIDEQUEST_DASHBOARD_USER,
              password: process.env.SIDEQUEST_DASHBOARD_PASSWORD,
            }
          : undefined,
    },
    gracefulShutdown: true,
  });

  started = true;
  console.log("Sidequest started successfully.");
};
