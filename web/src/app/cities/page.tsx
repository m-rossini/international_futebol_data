import { Suspense } from 'react';
import { Metadata } from 'next';
import { CitiesClient } from './cities-client';

export const metadata: Metadata = {
  title: 'Cities',
  description:
    'Browse cities where international football matches have been played, with match counts.',
  openGraph: {
    title: 'Cities — International Football Stats',
    description:
      'Browse cities where international football matches have been played, with match counts.',
  },
};

export default function CitiesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Cities</h1>
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      }
    >
      <CitiesClient />
    </Suspense>
  );
}
