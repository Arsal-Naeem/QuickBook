import express from "express";
import dotenv from "dotenv";
import quickBooksRouter from "./routes/quickbooksRoutes.js";
import itemRouter from "./routes/itemRoutes.js";
import customerRouter from "./routes/customerRoutes.js";
import vendorRouter from "./routes/vendorRoutes.js";
import defaultsRouter from "./routes/defaultsRoutes.js";
import { startSidequest } from "./sidequest.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 8000;

app.use(express.json());

app.use("/qbo", quickBooksRouter);
app.use("/qbo/items", itemRouter);
app.use("/qbo/customers", customerRouter);
app.use("/qbo/vendors", vendorRouter);
app.use("/qbo/defaults", defaultsRouter);

const bootstrap = async () => {
  await startSidequest();

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
};

bootstrap().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});