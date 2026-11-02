import { Suspense } from 'react';
import { Metadata } from 'next';
import { ConfederationClient } from './confederation-client';

export const metadata: Metadata = {
  title: 'Confederation',
};

export default async function ConfederationPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return (
    <Suspense fallback={<p className="p-8 text-sm text-gray-400">Loading...</p>}>
      <ConfederationClient name={name} />
    </Suspense>
  );
}
