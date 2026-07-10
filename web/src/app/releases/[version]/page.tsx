import { Metadata } from 'next';
import { ReleaseDetailClient } from './release-detail-client';

export const metadata: Metadata = {
  title: 'Release',
  description: 'Release details and changelog.',
};

export default async function ReleasePage({ params }: { params: Promise<{ version: string }> }) {
  const { version } = await params;
  return <ReleaseDetailClient version={version} />;
}
