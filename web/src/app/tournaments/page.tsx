import { Suspense } from 'react';
import { Metadata } from 'next';
import { TournamentsClient } from './tournaments-client';

export const metadata: Metadata = {
  title: 'Tournaments',
  description:
    'Browse 200+ international tournaments including World Cup, Euros, Copa América, African Cup of Nations, and more.',
  openGraph: {
    title: 'Tournaments — International Football Stats',
    description:
      'Browse 200+ international tournaments including World Cup, Euros, Copa América, African Cup of Nations, and more.',
  },
};

export default function TournamentsPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-gray-400">Loading...</p>}>
      <TournamentsClient />
    </Suspense>
  );
}
