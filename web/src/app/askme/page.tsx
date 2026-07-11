import { Suspense } from 'react';
import { Metadata } from 'next';
import { AskMeClient } from './askme-client';

export const metadata: Metadata = {
  title: 'Ask Me',
  description: 'Ask natural language questions about 150+ years of international football data.',
  openGraph: {
    title: 'Ask Me — International Football Stats',
    description: 'Ask natural language questions about 150+ years of international football data.',
  },
};

export default function AskMePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Ask Me</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ask anything about 150+ years of international football data.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-gray-400">Loading...</p>}>
        <AskMeClient />
      </Suspense>
    </div>
  );
}
