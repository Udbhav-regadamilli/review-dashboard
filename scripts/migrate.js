require("dotenv").config();
const { Pool } = require("pg");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required to run migrations.");
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function main() {
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
  await pool.query(sql);
  console.log("Migration complete.");
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(() => pool.end());
