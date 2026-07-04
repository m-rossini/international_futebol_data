import { Suspense } from 'react';
import { SeasonDetailClient } from './season-detail-client';

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
