# The Review Dash

A small internal dashboard that stores and displays the latest product reviews from web sources.

## Local setup

1. Copy environment example:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create the database schema:
   ```bash
   npm run migrate
   ```
4. Run the app:
   ```bash
   npm run dev
   ```

### Embedded Postgres local dev (no Docker or native Postgres needed)

If you do not have PostgreSQL installed on your system, use the embedded local database flow:

```bash
npm run dev:local
```

This command starts a temporary embedded Postgres instance, creates `review_db`, runs migrations, and launches the Next.js app with `DATABASE_URL` set automatically. The app will work without any external database service.

### Supabase free tier support

If you want to use Supabase instead of local Postgres, set `DATABASE_URL` to your Supabase connection string in `.env`. If your Supabase URL requires SSL, append `?sslmode=require`.

Example:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>?sslmode=require
REVIEW_SOURCES=https://amzn.in/d/07vKnqI2,https://amzn.in/d/01qnlA6F,https://amzn.in/d/03eooMZA
PORT=3000
```

Then run:

```bash
npm run migrate
npm run dev
```

If you are submitting the project without a native Postgres install, `npm run dev:local` is the recommended proof-of-concept path.

> Use `npm run dev:local` for local proof-of-concept testing when PostgreSQL is not installed.

## Access

- Open `http://localhost:3000`
- The dashboard loads reviews from the local REST API at `/api/reviews`
- Use the Refresh button to pull new reviews from configured sources

## Notes

- The app stores reviews in Postgres and deduplicates reviews by source + external ID.
- The scraper supports Amazon review pages and falls back to generic review markup patterns.
- The dashboard shows the latest 20 reviews, newest first.
