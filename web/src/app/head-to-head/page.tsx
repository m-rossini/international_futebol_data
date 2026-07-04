import { Suspense } from 'react';
import { Metadata } from 'next';
import { HeadToHeadClient } from './head-to-head-client';

export const metadata: Metadata = {
  title: 'Head to Head',
  description:
    'Compare any two national teams head-to-head: wins, draws, goals, and full match history.',
  openGraph: {
    title: 'Head to Head — International Football Stats',
    description:
      'Compare any two national teams head-to-head: wins, draws, goals, and full match history.',
  },
};

export default function HeadToHeadPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-400">Loading...</div>}>
      <HeadToHeadClient />
    </Suspense>
  );
}
