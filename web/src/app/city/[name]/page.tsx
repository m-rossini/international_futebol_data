import { Metadata } from 'next';
import { CityClient } from './city-client';
import type { CityDetail } from '@/lib/types';

export const metadata: Metadata = {
  title: 'City',
};

async function fetchCity(name: string): Promise<{
  detail: CityDetail | null;
  error: string | null;
}> {
  const dRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7531'}/city/${encodeURIComponent(
      name,
    )}`,
    { headers: { Accept: 'application/json' } },
  );

  if (!dRes.ok) {
    throw new Error(`HTTP ${dRes.status}`);
  }

  const detail: CityDetail = await dRes.json();

  if ((detail as CityDetail & { error?: boolean }).error) {
    return {
      detail: null,
      error: ((detail as CityDetail & { message?: string }).message ?? 'Unknown city') as string,
    };
  }

  return { detail, error: null };
}

export default async function CityPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const { detail, error } = await fetchCity(name);

  return <CityClient name={name} detail={detail} error={error} />;
}
