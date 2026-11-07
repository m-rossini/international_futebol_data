import { Suspense } from 'react';
import { Metadata } from 'next';
import { SquadsClient } from './squads-client';

export const metadata: Metadata = {
  title: 'Squads',
  description: 'Browse matches that have squad lineup data, with XI and bench for each team.',
  openGraph: {
    title: 'Squads — International Football Stats',
    description: 'Browse matches that have squad lineup data, with XI and bench for each team.',
  },
};

export default function SquadsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Squads</h1>
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      }
    >
      <SquadsClient />
    </Suspense>
  );
}
