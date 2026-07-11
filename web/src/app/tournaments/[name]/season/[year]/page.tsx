import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SeasonDetailClient } from './season-detail-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string; year: string }>;
}): Promise<Metadata> {
  const { name, year } = await params;
  const tournamentName = decodeURIComponent(name);
  return {
    title: `${tournamentName} — Season ${year}`,
    description: `Season ${year} results, standings, and stats for ${tournamentName}.`,
    openGraph: {
      title: `${tournamentName} — Season ${year} — International Football Stats`,
      description: `Season ${year} results, standings, and stats for ${tournamentName}.`,
    },
  };
}

export default async function SeasonDetailPage({
  params,
}: {
  params: Promise<{ name: string; year: string }>;
}) {
  const { name, year } = await params;
  const yearNum = parseInt(year, 10);

  return (
    <Suspense
      fallback={
        <div className="p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            {decodeURIComponent(name)} {year}
          </h1>
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      }
    >
      <SeasonDetailClient tournamentName={decodeURIComponent(name)} year={yearNum} />
    </Suspense>
  );
}
