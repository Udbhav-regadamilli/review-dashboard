import { NextResponse } from 'next/server';
import { fetchSourceReviews, saveReviews } from '@/lib/reviews';

const sources = process.env.REVIEW_SOURCES?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];

export async function GET() {
  if (!sources.length) {
    return NextResponse.json(
      { error: 'No review sources configured. Set REVIEW_SOURCES in environment.' },
      { status: 400 }
    );
  }

  const results: Array<{ source: string; fetched: number; error?: string }> = [];

  for (const source of sources) {
    try {
      const reviews = await fetchSourceReviews(source);
      const count = await saveReviews(reviews);
      results.push({ source, fetched: count });
    } catch (error) {
      console.error(`GET /api/reviews/refresh failed for ${source}:`, error);
      results.push({ source, fetched: 0, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return NextResponse.json({ results });
}
