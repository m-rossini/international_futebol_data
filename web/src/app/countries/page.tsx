import { Suspense } from 'react';
import { Metadata } from 'next';
import { CountriesClient } from './countries-client';

export const metadata: Metadata = {
  title: 'Countries',
  description:
    'Browse countries where international football matches have been played, with match counts and host history.',
  openGraph: {
    title: 'Countries — International Football Stats',
    description:
      'Browse countries where international football matches have been played, with match counts and host history.',
  },
};

export default function CountriesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Countries</h1>
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      }
    >
      <CountriesClient />
    </Suspense>
  );
}
