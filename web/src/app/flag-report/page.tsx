import { Suspense } from 'react';
import { Metadata } from 'next';
import { FlagReportClient } from './flag-report-client';

export const metadata: Metadata = {
  title: 'Flag Report',
  description:
    'See which teams are associated with which countries and flags in international football.',
  openGraph: {
    title: 'Flag Report — International Football Stats',
    description:
      'See which teams are associated with which countries and flags in international football.',
  },
};

export default function FlagReportPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-gray-400">Loading...</p>}>
      <FlagReportClient />
    </Suspense>
  );
}
