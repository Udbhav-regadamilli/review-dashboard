export interface Review {
  id: number;
  source: string;
  external_id: string;
  author: string | null;
  rating: number | null;
  title: string | null;
  body: string | null;
  review_date: string | null;
  fetched_at: string;
}
