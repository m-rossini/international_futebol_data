import { Suspense } from 'react';
import { Metadata } from 'next';
import { FlagReportClient } from './house-keeping-client';

export const metadata: Metadata = {
  title: 'House Keeping',
  description: 'Flag coverage report and MCP server configuration for AI agents.',
  openGraph: {
    title: 'House Keeping — International Football Stats',
    description: 'Flag coverage report and MCP server configuration for AI agents.',
  },
};

export default function FlagReportPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-gray-400">Loading...</p>}>
      <FlagReportClient />
    </Suspense>
  );
}
