import { Suspense } from 'react';
import { Metadata } from 'next';
import { TeamsClient } from './teams-client';

export const metadata: Metadata = {
  title: 'Teams',
  description:
    'Browse all national and non-FIFA teams with match history, win rates, goals, and ELO ratings.',
  openGraph: {
    title: 'Teams — International Football Stats',
    description:
      'Browse all national and non-FIFA teams with match history, win rates, goals, and ELO ratings.',
  },
};

export default function TeamsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Teams</h1>
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      }
    >
      <TeamsClient />
    </Suspense>
  );
}
