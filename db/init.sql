CREATE TABLE IF NOT EXISTS reviews (
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
);
