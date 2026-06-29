import { Suspense } from 'react';
import { TournamentsClient } from './tournaments-client';

export const metadata = {
  title: 'Tournaments — International Football Stats',
};

export default function TournamentsPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-gray-400">Loading...</p>}>
      <TournamentsClient />
    </Suspense>
  );
}
