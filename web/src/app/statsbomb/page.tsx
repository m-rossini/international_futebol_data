import { Suspense } from 'react';
import { Metadata } from 'next';
import { StatsBombClient } from './statsbomb-client';

export const metadata: Metadata = {
  title: 'StatsBomb',
  description: 'Shot maps and expected goals (xG) from StatsBomb Open Data event files.',
  openGraph: {
    title: 'StatsBomb — International Football Stats',
    description: 'Shot maps and expected goals (xG) from StatsBomb Open Data event files.',
  },
};

export default function StatsBombPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">StatsBomb</h1>
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      }
    >
      <StatsBombClient />
    </Suspense>
  );
}
