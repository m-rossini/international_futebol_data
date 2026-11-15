import { Metadata } from 'next';
import { CountryCitiesClient } from './country-cities-client';
import type { CityListItem, CountryDetail } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Country cities',
};

async function fetchCountryCities(name: string): Promise<{
  country: string;
  cities: CityListItem[];
  error: string | null;
}> {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7531';
  const [dRes, cRes] = await Promise.all([
    fetch(`${base}/country/${encodeURIComponent(name)}`, {
      headers: { Accept: 'application/json' },
    }),
    fetch(`${base}/country/${encodeURIComponent(name)}/cities?limit=200`, {
      headers: { Accept: 'application/json' },
    }),
  ]);

  if (!dRes.ok) {
    throw new Error(`HTTP ${dRes.status}`);
  }

  const detail: CountryDetail = await dRes.json();

  // Unknown country → API returns {error: true, ...} with HTTP 200
  if ((detail as CountryDetail & { error?: boolean }).error) {
    return {
      country: name,
      cities: [],
      error: ((detail as CountryDetail & { message?: string }).message ??
        'Unknown country') as string,
    };
  }

  const cities: CityListItem[] = cRes.ok ? await cRes.json() : [];

  return { country: detail.country, cities, error: null };
}

export default async function CountryCitiesPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  const { country, cities, error } = await fetchCountryCities(decodedName);

  return <CountryCitiesClient country={country} cities={cities} error={error} />;
}
