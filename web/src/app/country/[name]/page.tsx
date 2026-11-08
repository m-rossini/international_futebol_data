import { Metadata } from 'next';
import { CountryClient } from './country-client';
import type { CountryDetail } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Country',
};

async function fetchCountry(name: string): Promise<{
  detail: CountryDetail | null;
  cities: { city: string; matches: number }[];
  error: string | null;
}> {
  const [dRes, cRes] = await Promise.all([
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7531'}/country/${encodeURIComponent(
        name,
      )}`,
      { headers: { Accept: 'application/json' } },
    ),
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7531'}/country/${encodeURIComponent(
        name,
      )}/cities?limit=12`,
      { headers: { Accept: 'application/json' } },
    ),
  ]);

  if (!dRes.ok) {
    throw new Error(`HTTP ${dRes.status}`);
  }

  const detail: CountryDetail = await dRes.json();

  // Unknown country → API returns {error: true, ...} with HTTP 200
  if ((detail as CountryDetail & { error?: boolean }).error) {
    return {
      detail: null,
      cities: [],
      error: ((detail as CountryDetail & { message?: string }).message ??
        'Unknown country') as string,
    };
  }

  const cities: { city: string; matches: number }[] = cRes.ok ? await cRes.json() : [];

  return { detail, cities, error: null };
}

export default async function CountryPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  const { detail, cities, error } = await fetchCountry(decodedName);

  return <CountryClient name={decodedName} detail={detail} cities={cities} error={error} />;
}
