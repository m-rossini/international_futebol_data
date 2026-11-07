import { Metadata } from 'next';
import { SquadClient } from './squad-client';
import type { SquadDetailResponse } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Squads',
};

async function fetchSquad(
  matchDate: string,
  homeTeam: string,
  awayTeam: string,
): Promise<{
  detail: SquadDetailResponse | null;
  error: string | null;
}> {
  const dRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7531'}/squads/${encodeURIComponent(
      matchDate,
    )}/${encodeURIComponent(homeTeam)}/${encodeURIComponent(awayTeam)}`,
    { headers: { Accept: 'application/json' } },
  );

  if (!dRes.ok) {
    throw new Error(`HTTP ${dRes.status}`);
  }

  const detail: SquadDetailResponse = await dRes.json();

  if ((detail as SquadDetailResponse & { error?: boolean }).error) {
    return {
      detail: null,
      error: ((detail as SquadDetailResponse & { message?: string }).message ??
        'Unknown squad') as string,
    };
  }

  return { detail, error: null };
}

export default async function SquadPage({
  params,
}: {
  params: Promise<{
    matchDate: string;
    homeTeam: string;
    awayTeam: string;
  }>;
}) {
  const { matchDate, homeTeam, awayTeam } = await params;
  const { detail, error } = await fetchSquad(matchDate, homeTeam, awayTeam);

  return (
    <SquadClient
      matchDate={matchDate}
      homeTeam={homeTeam}
      awayTeam={awayTeam}
      detail={detail}
      error={error}
    />
  );
}
