import { Suspense } from 'react';
import { Metadata } from 'next';
import { PlayersClient } from './players-client';

export const metadata: Metadata = {
  title: 'Players',
  description:
    'Browse every goalscorer in the dataset, with goals, matches, teams and career span.',
  openGraph: {
    title: 'Players — International Football Stats',
    description:
      'Browse every goalscorer in the dataset, with goals, matches, teams and career span.',
  },
};

export default function PlayersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Players</h1>
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      }
    >
      <PlayersClient />
    </Suspense>
  );
}
