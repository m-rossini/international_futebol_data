import { Metadata } from 'next';
import { ConfederationsClient } from './confederations-client';
import type { ConfederationListItem } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Confederations',
  description:
    'Browse the six FIFA confederations (UEFA, CONMEBOL, CONCACAF, CAF, AFC, OFC) and their member national teams.',
  openGraph: {
    title: 'Confederations — International Football Stats',
    description: 'Browse the six FIFA confederations and their member national teams.',
  },
};

async function fetchConfederations(): Promise<ConfederationListItem[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7531'}/confederations`,
    {
      headers: { Accept: 'application/json' },
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default async function ConfederationsPage() {
  const confederations = await fetchConfederations();
  return <ConfederationsClient confederations={confederations} />;
}
