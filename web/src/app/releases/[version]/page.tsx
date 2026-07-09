import { Metadata } from 'next';
import { ReleaseDetailClient } from './release-detail-client';

export const metadata: Metadata = {
  title: 'Release',
  description: 'Release details and changelog.',
};

export default function ReleasePage({ params }: { params: Promise<{ version: string }> }) {
  return <ReleaseDetailClient version={params.version} />;
}
