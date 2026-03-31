import express from 'express';
import dotenv from 'dotenv';
import quickBooksRouter from './routes/quickbooksRoutes.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 8000;

app.use('/', quickBooksRouter);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Go to http://localhost:${port}/authUri to start the login flow`);
  console.log(`After authentication, call http://localhost:${port}/getCompanyInfo/<Realm_ID>`);
});