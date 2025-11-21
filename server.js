   import express from 'express';
   import cors from 'cors';
   import pkg from 'pg';
   import 'dotenv/config';

   const { Pool } = pkg;
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     ssl: { rejectUnauthorized: false }
   });

   const app = express();
   app.use(cors());
   app.use(express.json());

   app.get('/health', (req, res) => res.json({ ok: true }));

   app.get('/transactions', async (req, res) => {
     const { rows } = await pool.query('SELECT * FROM transactions ORDER BY date');
     res.json(rows);
   });

   app.post('/transactions/import', async (req, res) => {
     const { transactions } = req.body;
     await pool.query('DELETE FROM transactions');
     for (const t of transactions) {
       await pool.query(
         `INSERT INTO transactions (id, date, amount, type, "group", category, description, status, payment_method, client_reference, is_manual_override, is_recurring)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
         [t.id, t.date, t.amount, t.type, t.group, t.category, t.description, t.status, t.paymentMethod, t.clientReference, t.isManualOverride, t.isRecurring]
       );
     }
     res.json({ ok: true });
   });

   const port = process.env.PORT || 4000;
   app.listen(port, () => console.log(`API listening on ${port}`));