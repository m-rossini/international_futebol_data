import { Suspense } from 'react';
import { Metadata } from 'next';
import { ShotMapsClient } from './shot-maps-client';

export const metadata: Metadata = {
  title: 'Shot Maps',
  description: 'Shot maps and expected goals (xG) from Shot Maps Open Data event files.',
  openGraph: {
    title: 'Shot Maps — International Football Stats',
    description: 'Shot maps and expected goals (xG) from Shot Maps Open Data event files.',
  },
};

export default function ShotMapsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Shot Maps</h1>
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      }
    >
      <ShotMapsClient />
    </Suspense>
  );
}
