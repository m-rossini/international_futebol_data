import { Suspense } from "react";
import { TournamentDetailClient } from "./tournament-detail-client";

type tParams = Promise<{ name: string }>;

export default async function TournamentDetailPage({ params }: { params: tParams }) {
  const { name } = await params;
  return (
    <Suspense fallback={<TournamentDetailSkeleton />}>
      <TournamentDetailClient name={decodeURIComponent(name)} />
    </Suspense>
  );
}

function TournamentDetailSkeleton() {
  return (
    <div>
      <div className="skeleton h-8 w-48 mb-2 rounded" />
      <div className="skeleton h-5 w-32 mb-6 rounded" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-4 w-20 mb-2 rounded" />
            <div className="skeleton h-10 w-24 rounded" />
          </div>
        ))}
      </div>
      <div className="card p-5 mb-6"><div className="skeleton h-[240px] rounded" /></div>
    </div>
  );
}
