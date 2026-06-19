import { Suspense } from "react";
import { TournamentsClient } from "./tournaments-client";

export default function TournamentsPage() {
  return (
    <Suspense fallback={<TournamentsSkeleton />}>
      <TournamentsClient />
    </Suspense>
  );
}

function TournamentsSkeleton() {
  return (
    <div>
      <div className="skeleton h-10 w-48 mb-2 rounded" />
      <div className="skeleton h-5 w-64 mb-4 rounded" />
      <div className="skeleton h-[52px] mb-6 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-5 w-32 mb-3 rounded" />
            <div className="skeleton h-4 w-24 mb-2 rounded" />
            <div className="skeleton h-4 w-20 mb-2 rounded" />
            <div className="skeleton h-4 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
