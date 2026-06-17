import { query } from "@/lib/db";
import { Review } from "@/lib/types";
import { createHash } from "crypto";
import * as cheerio from "cheerio";

export interface FetchedReview {
  source: string;
  external_id: string;
  author: string | null;
  rating: number | null;
  title: string | null;
  body: string | null;
  review_date: string | null;
}

export async function getLatestReviews() {
  const sql =
    "SELECT id, source, external_id, author, rating, title, body, review_date, fetched_at FROM reviews ORDER BY COALESCE(review_date, fetched_at) DESC, fetched_at DESC, id DESC LIMIT 20";
  const result = await query<Review>(sql);
  console.debug(
    `getLatestReviews: fetched ${result.rowCount} rows; ordering by COALESCE(review_date, fetched_at) DESC, fetched_at DESC, id DESC`,
  );
  return result.rows;
}

export function normalizeSource(url: string) {
  try {
    const parsed = new URL(url.trim());
    const source = parsed.hostname + parsed.pathname;
    return source.replace(/\//g, "");
  } catch {
    return url;
  }
}

function buildAmazonReviewUrl(originalUrl: string): string {
  try {
    const parsed = new URL(originalUrl);
    if (!parsed.hostname.includes("amazon.")) {
      return originalUrl;
    }

    const path = parsed.pathname;
    const asinMatch = path.match(
      /(?:\/dp\/|\/gp\/product\/|\/gp\/aw\/d(?:\/product)?\/)([A-Z0-9]{10})/,
    );
    const directAsinMatch = path.match(/\/([A-Z0-9]{10})(?:[/?]|$)/);
    const asin = asinMatch?.[1] || directAsinMatch?.[1];

    if (
      path.includes("/product-reviews/") ||
      path.includes("/gp/customer-reviews/")
    ) {
      parsed.searchParams.set("sortBy", "recent");
      parsed.searchParams.set("formatType", "all_reviews");
      parsed.searchParams.set("pageNumber", "1");
      return parsed.toString();
    }

    if (asin) {
      parsed.pathname = `/product-reviews/${asin}`;
      parsed.search = "";
      parsed.searchParams.set("sortBy", "recent");
      parsed.searchParams.set("formatType", "all_reviews");
      parsed.searchParams.set("pageNumber", "1");
      return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}?${parsed.searchParams.toString()}`;
    }

    return originalUrl;
  } catch {
    return originalUrl;
  }
}

export async function fetchSourceReviews(sourceUrl: string) {
  let url = sourceUrl.trim();
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };

  const initialResponse = await fetch(url, { headers, redirect: "follow" });
  if (!initialResponse.ok) {
    throw new Error(`Failed to fetch ${url}: ${initialResponse.status}`);
  }

  const fetchedUrl = initialResponse.url || url;
  const reviewUrl = buildAmazonReviewUrl(fetchedUrl);
  console.debug(`fetchSourceReviews: source=${sourceUrl} resolved=${reviewUrl}`);

  const response =
    reviewUrl === fetchedUrl
      ? initialResponse
      : await fetch(reviewUrl, { headers, redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${reviewUrl}: ${response.status}`);
  }

  const text = await response.text();
  const $ = cheerio.load(text);
  const source = normalizeSource(response.url || url);
  const reviews: FetchedReview[] = [];

  const amazonReviews = $('div[data-hook="review"]').toArray();
  if (amazonReviews.length) {
    for (const el of amazonReviews) {
      const root = $(el);
      const externalId =
        root.attr("id") ||
        createHash("sha256").update(root.text()).digest("hex");
      const author = root.find(".a-profile-name").first().text().trim() || null;
      const ratingText =
        root.find('i[data-hook="review-star-rating"] span').text().trim() ||
        root.find('span.a-icon-alt').text().trim() ||
        root.find(".review-rating span").text().trim();
      const ratingMatch = ratingText.match(/([0-5](?:\.[0-9])?)/);
      const rating = ratingMatch ? Number(ratingMatch[1]) : null;
      const title =
        root.find('h5[data-hook="reviewTitle"]').text().trim() ||
        root.find('[data-hook="reviewTitle"]').text().trim() ||
        root.find('a[data-hook="review-title"] span').text().trim() ||
        root.find(".review-title-content span").text().trim() ||
        null;
      const body =
        root.find('[data-hook="reviewRichContentContainer"]').text().trim() ||
        root.find('[data-hook="reviewText"]').text().trim() ||
        root.find('span[data-hook="review-body"] span').text().trim() ||
        root.find(".review-text-content span").text().trim() ||
        null;
      const dateRaw =
        root.find('span[data-hook="review-date"]').text().trim() || null;
      const date = dateRaw ? parseAmazonDate(dateRaw) : null;
      if (!externalId) continue;
      reviews.push({
        source,
        external_id: externalId,
        author,
        rating,
        title,
        body,
        review_date: date,
      });
    }
    return reviews;
  }

  // If we didn't find reviews, try rendering the page with Puppeteer via an external script
  // This avoids bundler resolution issues (we call the script in a child process).
  if ((response.url || url).includes('amazon.')) {
    try {
      console.debug('fetchSourceReviews: no server-side reviews found, invoking puppeteer scraper script');
      const { spawnSync } = require('child_process');
      const path = require('path');
      const fs = require('fs');
      // locate the scraper script by walking up directories from __dirname and process.cwd()
      function findScript(startDir: string) {
        let dir = startDir;
        const root = path.parse(dir).root;
        while (dir && dir !== root) {
          const candidate = path.join(dir, 'scripts', 'scrape-puppeteer.js');
          if (fs.existsSync(candidate)) return candidate;
          dir = path.dirname(dir);
        }
        return null;
      }

      const script =
        findScript(__dirname) || findScript(process.cwd()) ||
        path.join(process.cwd(), 'scripts', 'scrape-puppeteer.js');
      console.debug('fetchSourceReviews: scraper script path', script, 'exists?', fs.existsSync(script));
      const proc = spawnSync(process.execPath, [script, reviewUrl], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
      console.debug('fetchSourceReviews: spawn result status', proc.status, 'error', !!proc.error);
      if (proc.stdout) console.debug('fetchSourceReviews: stdout length', String(proc.stdout).length, 'snippet', String(proc.stdout).slice(0,200));
      if (proc.stderr) console.debug('fetchSourceReviews: stderr length', String(proc.stderr).length, 'snippet', String(proc.stderr).slice(0,200));
      if (proc.error) throw proc.error;
      if (proc.status !== 0) {
        console.error('fetchSourceReviews: puppeteer script failed', proc.stderr || proc.stdout);
      } else {
        const rendered = proc.stdout || '';
        try {
          const outDir = path.join(process.cwd(), 'tmp');
          if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
          fs.writeFileSync(path.join(outDir, 'rendered.html'), rendered, 'utf8');
          console.debug('fetchSourceReviews: wrote rendered HTML to', path.join(outDir, 'rendered.html'));
        } catch (e) {
          const failureMessage = e instanceof Error ? e.message : String(e);
          console.debug('fetchSourceReviews: failed to write rendered HTML', failureMessage);
        }
        const countMatches = (rendered.match(/data-hook="review"/g) || []).length;
        console.debug('fetchSourceReviews: rendered contains data-hook="review" count', countMatches);
        const $$ = cheerio.load(rendered);
        const renderedReviews = $$('div[data-hook="review"]').toArray();
        for (const el of renderedReviews) {
          const root = $$(el);
          const externalId =
            root.attr('id') || createHash('sha256').update(root.text()).digest('hex');
          const author = root.find('.a-profile-name').first().text().trim() || null;
          const ratingText =
            root.find('i[data-hook="review-star-rating"] span').text().trim() ||
            root.find('span.a-icon-alt').text().trim() ||
            root.find('.review-rating span').text().trim();
          const ratingMatch = ratingText.match(/([0-5](?:\.[0-9])?)/);
          const rating = ratingMatch ? Number(ratingMatch[1]) : null;
          const title =
            root.find('h5[data-hook="reviewTitle"]').text().trim() ||
            root.find('[data-hook="reviewTitle"]').text().trim() ||
            root.find('a[data-hook="review-title"] span').text().trim() ||
            root.find('.review-title-content span').text().trim() ||
            null;
          const body =
            root.find('[data-hook="reviewRichContentContainer"]').text().trim() ||
            root.find('[data-hook="reviewText"]').text().trim() ||
            root.find('span[data-hook="review-body"] span').text().trim() ||
            root.find('.review-text-content span').text().trim() ||
            null;
          const dateRaw = root.find('span[data-hook="review-date"]').text().trim() || null;
          const date = dateRaw ? parseAmazonDate(dateRaw) : null;
          if (!externalId) continue;
          reviews.push({
            source,
            external_id: externalId,
            author,
            rating,
            title,
            body,
            review_date: date,
          });
        }

        if (reviews.length) {
          console.debug(`fetchSourceReviews: puppeteer script extracted ${reviews.length} reviews`);
          return reviews;
        }
      }
    } catch (err) {
      console.error('fetchSourceReviews: puppeteer script failed:', err);
    }
  }

  const genericReviews = $("article, .review, .customer-review").toArray();
  for (const el of genericReviews.slice(0, 30)) {
    const root = $(el);
    const title =
      root
        .find("h3, h2, .review-title, [data-hook='reviewTitle'], h5[data-hook='reviewTitle']")
        .first()
        .text()
        .trim() || null;
    const body =
      root
        .find("[data-hook='reviewRichContentContainer'], [data-hook='reviewText'], p, .review-body, .review-text")
        .first()
        .text()
        .trim() || null;
    const author =
      root
        .find(".author, .review-author, .a-profile-name")
        .first()
        .text()
        .trim() || null;
    const ratingText = root
      .find(".rating, .stars, .review-rating, [data-hook='review-star-rating'], span.a-icon-alt")
      .first()
      .text()
      .trim();
    const ratingMatch = ratingText.match(/([0-5](?:\.[0-9])?)/);
    const rating = ratingMatch ? Number(ratingMatch[1]) : null;
    const dateRaw =
      root
        .find("time, .review-date, .date, [data-hook='review-date']")
        .first()
        .text()
        .trim() || null;
    const date = dateRaw ? new Date(dateRaw).toISOString() : null;
    const externalId =
      root.attr("id") ||
      createHash("sha256").update(`${title}-${author}-${date}`).digest("hex");
    if (!externalId || (!title && !body)) continue;
    reviews.push({
      source,
      external_id: externalId,
      author,
      rating,
      title,
      body,
      review_date: date,
    });
  }

  return reviews;
}

function parseAmazonDate(value: string) {
  const normalized = value.replace(/^Reviewed in .* on /i, "").trim();
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function saveReviews(reviews: FetchedReview[]) {
  if (!reviews.length) return 0;

  const insertText = `INSERT INTO reviews (source, external_id, author, rating, title, body, review_date)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (source, external_id) DO NOTHING`;

  let inserted = 0;

  for (const review of reviews) {
    console.debug('saveReviews: inserting review', {
      source: review.source,
      external_id: review.external_id,
      title: review.title,
      author: review.author,
      review_date: review.review_date,
    });
    const params = [
      review.source,
      review.external_id,
      review.author,
      review.rating,
      review.title,
      review.body,
      review.review_date,
    ];
    const result = await query(insertText, params);
    if (result.rowCount > 0) {
      inserted += 1;
    }
  }

  return inserted;
}
