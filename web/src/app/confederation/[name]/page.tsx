import { Metadata } from 'next';
import { ConfederationClient } from './confederation-client';
import type { ConfederationDetail, MatchItem } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Confederation',
};

async function fetchConfederation(name: string): Promise<{
  detail: ConfederationDetail | null;
  matches: MatchItem[];
  error: string | null;
}> {
  const [dRes, mRes] = await Promise.all([
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7531'}/confederation/${encodeURIComponent(name)}`,
      {
        headers: { Accept: 'application/json' },
      },
    ),
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7531'}/confederation/${encodeURIComponent(name)}/matches`,
      {
        headers: { Accept: 'application/json' },
      },
    ),
  ]);

  if (!dRes.ok || !mRes.ok) {
    throw new Error(`HTTP ${dRes.status}/${mRes.status}`);
  }

  const detail: ConfederationDetail = await dRes.json();
  const mData = await mRes.json();

  // Unknown confederation → API returns {error: true, ...} with HTTP 200
  if ((detail as ConfederationDetail & { error?: boolean }).error) {
    return {
      detail: null,
      matches: [],
      error: ((detail as ConfederationDetail & { message?: string }).message ??
        'Unknown confederation') as string,
    };
  }

  return {
    detail,
    matches: mData.matches || [],
    error: null,
  };
}

export default async function ConfederationPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const { detail, matches, error } = await fetchConfederation(name);

  return <ConfederationClient name={name} detail={detail} matches={matches} error={error} />;
}
