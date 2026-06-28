import { Suspense } from 'react';
import { YearMatchesClient } from './year-matches-client';

interface Params {
  name: string;
  year: string;
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
