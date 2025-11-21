import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import 'dotenv/config';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const app = express();
app.use(cors());
app.use(express.json());

// Root route (so Render won't show "Cannot GET /")
app.get('/', (req, res) => {
  res.json({ message: 'LegalFlow API is running' });
});

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// Fetch all transactions
app.get('/transactions', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM transactions ORDER BY date');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Replace all transactions with imported list
app.post('/transactions/import', async (req, res) => {
  const { transactions } = req.body;

  if (!Array.isArray(transactions)) {
    return res.status(400).json({ error: 'transactions must be an array' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM transactions');

    for (const t of transactions) {
      await client.query(
        `INSERT INTO transactions (
          id,
          date,
          amount,
          type,
          "group",
          category,
          description,
          status,
          payment_method,
          client_reference,
          is_manual_override,
          is_recurring
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          t.id,
          t.date,
          t.amount,
          t.type,
          t.group,
          t.category,
          t.description,
          t.status,
          t.paymentMethod,
          t.clientReference,
          t.isManualOverride,
          t.isRecurring,
        ]
      );
    }

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing transactions:', error);
    res.status(500).json({ error: 'Failed to import transactions' });
  } finally {
    client.release();
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on ${port}`));