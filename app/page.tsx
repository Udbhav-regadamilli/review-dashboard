'use client';

import { useEffect, useState } from 'react';
import { RefreshCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReviewCard } from '@/components/review-card';
import type { Review } from '@/lib/types';

export default function HomePage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/reviews');
      if (!response.ok) {
        throw new Error(`Failed to load reviews (${response.status})`);
      }
      const data = await response.json();
      setReviews(data.reviews ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch('/api/reviews/refresh');
      if (!response.ok) {
        throw new Error(`Refresh failed (${response.status})`);
      }
      await loadReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-8 shadow-soft backdrop-blur-xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Review Dashboard</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Latest product reviews in one place.
              </h1>
              <p className="mt-4 max-w-2xl text-slate-300 sm:text-lg">
                Cached from the configured review sources and served from Postgres. Hit refresh to pull new reviews from the store sources.
              </p>
            </div>
            <Button onClick={handleRefresh} disabled={refreshing || loading} variant="secondary">
              {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              Refresh reviews
            </Button>
          </div>
        </section>

        {error ? (
          <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100">
            <p className="font-semibold">Error loading reviews</p>
            <p className="mt-1 text-sm text-rose-200">{error}</p>
          </div>
        ) : null}

        <section className="grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-soft">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">Latest 20 reviews</h2>
                  <p className="mt-1 text-sm text-slate-400">Newest first, pulled from your Postgres store.</p>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                  {reviews.length} loaded
                </span>
              </div>
            </div>
            {loading ? (
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-10 text-center text-slate-400 shadow-soft">
                Loading reviews...
              </div>
            ) : reviews.length === 0 ? (
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-10 text-center text-slate-400 shadow-soft">
                No reviews available yet. Press refresh to pull reviews into the database.
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-6 rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 text-slate-300 shadow-soft">
            <div>
              <h3 className="text-lg font-semibold text-white">How this works</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                The dashboard reads reviews from a Postgres database via a REST API. The refresh action pulls from configured source URLs and stores only new reviews.
              </p>
            </div>
            <div className="grid gap-4 rounded-3xl bg-slate-950/80 p-4">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Database</p>
                <p className="mt-2 text-sm text-slate-300">Postgres stores reviews with unique source/external IDs to avoid duplicates.</p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Fetcher</p>
                <p className="mt-2 text-sm text-slate-300">A backend script scrapes review pages and writes structured records to the database.</p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-slate-500">API</p>
                <p className="mt-2 text-sm text-slate-300">The page fetches from `/api/reviews` and renders the 20 newest reviews.</p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
