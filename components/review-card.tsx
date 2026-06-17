import { Star } from "lucide-react";
import type { Review } from "@/lib/types";

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="rounded-3xl border border-slate-800/80 bg-slate-950/90 p-6 shadow-soft">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            {review.source}
          </p>
          <h3 className="text-xl font-semibold text-white">
            {review.title || "No title provided"}
          </h3>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-slate-900 px-3 py-2 text-slate-200">
          <Star className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-semibold">{review.rating ?? "—"}</span>
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-300">
        {review.body || "No review text available."}
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-800/80 pt-4 text-sm text-slate-500">
        <span>{review.author || "Anonymous"}</span>
        <span>•</span>
        <span>
          {review.review_date ? formatDate(review.review_date) : "Unknown date"}
        </span>
      </div>
    </article>
  );
}
