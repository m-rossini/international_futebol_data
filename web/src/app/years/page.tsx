import { Suspense } from 'react';
import { Metadata } from 'next';
import { YearsClient } from './years-list-client';

export const metadata: Metadata = {
  title: 'Years',
  description:
    'Browse per-year international football statistics: matches, goals, countries, and cities.',
  openGraph: {
    title: 'Years — International Football Stats',
    description:
      'Browse per-year international football statistics: matches, goals, countries, and cities.',
  },
};

export default function YearsPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-gray-400">Loading...</p>}>
      <YearsClient />
    </Suspense>
  );
}
