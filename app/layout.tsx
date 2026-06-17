import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Review Dash',
  description: 'Latest product reviews from web stores stored in Postgres',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
