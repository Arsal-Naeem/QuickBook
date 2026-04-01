import express from "express";
import dotenv from "dotenv";
import quickBooksRouter from "./routes/quickbooksRoutes.js";
import itemRouter from "./routes/itemRoutes.js";
import customerRouter from "./routes/customerRoutes.js";
import vendorRouter from "./routes/vendorRoutes.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 8000;

app.use(express.json());

app.use("/qbo", quickBooksRouter);
app.use("/qbo/items", itemRouter);
app.use("/qbo/customers", customerRouter);
app.use("/qbo/vendors", vendorRouter);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});