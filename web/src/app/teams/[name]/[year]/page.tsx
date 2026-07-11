import { Suspense } from 'react';
import type { Metadata } from 'next';
import { YearMatchesClient } from './year-matches-client';

interface Params {
  name: string;
  year: string;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { name, year } = await params;
  const teamName = decodeURIComponent(name);
  return {
    title: `${teamName} — ${year}`,
    description: `Match results and stats for ${teamName} in ${year}.`,
    openGraph: {
      title: `${teamName} — ${year} — International Football Stats`,
      description: `Match results and stats for ${teamName} in ${year}.`,
    },
  };
}

export default async function YearMatchesPage({ params }: { params: Promise<Params> }) {
  const { name, year } = await params;
  const teamName = decodeURIComponent(name);
  const yearNum = Number(year);

  return (
    <Suspense fallback={<p className="p-8 text-sm text-gray-400">Loading...</p>}>
      <YearMatchesClient teamName={teamName} year={yearNum} />
    </Suspense>
  );
}
