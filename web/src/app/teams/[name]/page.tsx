import { Suspense } from 'react';
import type { Metadata } from 'next';
import { TeamDetailClient } from './team-detail-client';

interface Props {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const teamName = decodeURIComponent(name);
  return {
    title: teamName,
    description: `Full match history, stats, and ELO rating for ${teamName}.`,
    openGraph: {
      title: `${teamName} — International Football Stats`,
      description: `Full match history, stats, and ELO rating for ${teamName}.`,
    },
  };
}

export default async function TeamDetailPage({ params }: Props) {
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
      <TeamDetailClient teamName={decodeURIComponent(name)} />
    </Suspense>
  );
}
