import { Suspense } from 'react';
import { TournamentDetailClient } from './tournament-detail-client';

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;

  return (
    <Suspense
      fallback={
        <div className="p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">{decodeURIComponent(name)}</h1>
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      }
    >
      <TournamentDetailClient tournamentName={decodeURIComponent(name)} />
    </Suspense>
  );
}
