import { Pool, type QueryResultRow } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined. Set it in .env or environment variables.');
}

const pool = new Pool({ connectionString });

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<{ rows: T[]; rowCount: number }> {
  const client = await pool.connect();
  try {
    const result = await client.query<T>(text, params);
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  } finally {
    client.release();
  }
}

export async function runMigration() {
  const sql = `CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    rating INTEGER,
    title TEXT,
    body TEXT,
    review_date TIMESTAMP WITH TIME ZONE,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(source, external_id)
  );`;

  await query(sql);
}
