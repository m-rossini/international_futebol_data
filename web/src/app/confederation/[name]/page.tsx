import { Suspense } from 'react';
import { Metadata } from 'next';
import { ConfederationClient } from './confederation-client';

export const metadata: Metadata = {
  title: 'Confederation',
};

export default function ConfederationPage({ params }: { params: { name: string } }) {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-gray-400">Loading...</p>}>
      <ConfederationClient name={params.name} />
    </Suspense>
  );
}
