import { NextResponse } from 'next/server';
import { getLatestReviews } from '@/lib/reviews';

export async function GET() {
  try {
    const reviews = await getLatestReviews();
    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('GET /api/reviews failed:', error);
    const message = error instanceof Error ? error.message : 'Unable to load reviews';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
