import { Suspense } from "react";
import { TopScorersClient } from "./top-scorers-client";

export default function TopScorersPage() {
  return (
    <Suspense fallback={<TopScorersSkeleton />}>
      <TopScorersClient />
    </Suspense>
  );
}

function TopScorersSkeleton() {
  return (
    <div>
      <div className="skeleton h-10 w-40 mb-2 rounded" />
      <div className="skeleton h-5 w-64 mb-4 rounded" />
      <div className="card p-5">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 mb-3">
            <div className="skeleton h-4 w-6 rounded" />
            <div className="skeleton h-5 w-40 rounded" />
            <div className="skeleton h-6 flex-1 rounded" />
            <div className="skeleton h-4 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
