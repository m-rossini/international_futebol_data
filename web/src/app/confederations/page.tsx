import { Suspense } from 'react';
import { Metadata } from 'next';
import { ConfederationsClient } from './confederations-client';

export const metadata: Metadata = {
  title: 'Confederations',
  description:
    'Browse the six FIFA confederations (UEFA, CONMEBOL, CONCACAF, CAF, AFC, OFC) and their member national teams.',
  openGraph: {
    title: 'Confederations — International Football Stats',
    description: 'Browse the six FIFA confederations and their member national teams.',
  },
};

export default function ConfederationsPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-gray-400">Loading...</p>}>
      <ConfederationsClient />
    </Suspense>
  );
}
