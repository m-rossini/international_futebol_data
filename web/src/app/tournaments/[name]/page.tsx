import { Suspense } from 'react';
import type { Metadata } from 'next';
import { TournamentDetailClient } from './tournament-detail-client';

interface Props {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const tournamentName = decodeURIComponent(name);
  return {
    title: tournamentName,
    description: `Seasons, results, and statistics for ${tournamentName}.`,
    openGraph: {
      title: `${tournamentName} — International Football Stats`,
      description: `Seasons, results, and statistics for ${tournamentName}.`,
    },
  };
}

export default async function TournamentDetailPage({ params }: Props) {
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
