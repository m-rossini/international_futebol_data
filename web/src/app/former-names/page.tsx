import { Suspense } from 'react';
import { Metadata } from 'next';
import { FormerNamesClient } from './former-names-client';

export const metadata: Metadata = {
  title: 'Former Names',
  description: 'Trace defunct nations and former team names with date ranges.',
  openGraph: {
    title: 'Former Names — International Football Stats',
    description: 'Trace defunct nations and former team names with date ranges.',
  },
};

export default function FormerNamesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Former Names</h1>
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      }
    >
      <FormerNamesClient />
    </Suspense>
  );
}
