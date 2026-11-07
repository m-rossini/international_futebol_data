import { Metadata } from 'next';
import { PlayerClient } from './player-client';
import type { PlayerDetailResponse } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Player',
};

async function fetchPlayer(name: string): Promise<{
  detail: PlayerDetailResponse | null;
  error: string | null;
}> {
  const dRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7531'}/player/${encodeURIComponent(
      name,
    )}`,
    { headers: { Accept: 'application/json' } },
  );

  if (!dRes.ok) {
    throw new Error(`HTTP ${dRes.status}`);
  }

  const detail: PlayerDetailResponse = await dRes.json();

  if ((detail as PlayerDetailResponse & { error?: boolean }).error) {
    return {
      detail: null,
      error: ((detail as PlayerDetailResponse & { message?: string }).message ??
        'Unknown player') as string,
    };
  }

  return { detail, error: null };
}

export default async function PlayerPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const { detail, error } = await fetchPlayer(name);

  return <PlayerClient name={name} detail={detail} error={error} />;
}
