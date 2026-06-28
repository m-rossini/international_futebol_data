import { Suspense } from 'react';
import { HeadToHeadClient } from './head-to-head-client';

export default function HeadToHeadPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-400">Loading...</div>}>
      <HeadToHeadClient />
    </Suspense>
  );
}
