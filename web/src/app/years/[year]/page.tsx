import { Suspense } from 'react';
import type { Metadata } from 'next';
import { YearDetailClient } from './year-detail-client';

interface Props {
  params: Promise<{ year: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `Year ${year}`,
    description: `International football statistics for the year ${year}.`,
    openGraph: {
      title: `Year ${year} — International Football Stats`,
      description: `International football statistics for the year ${year}.`,
    },
  };
}

export default async function YearDetailPage({ params }: Props) {
  const { year } = await params;

  return (
    <Suspense
      fallback={
        <div className="p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Year {year}</h1>
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      }
    >
      <YearDetailClient year={Number(year)} />
    </Suspense>
  );
}
