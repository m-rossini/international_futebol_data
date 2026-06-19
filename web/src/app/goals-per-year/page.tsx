import { Suspense } from "react";
import { GoalsPerYearClient } from "./goals-per-year-client";

export default function GoalsPerYearPage() {
  return (
    <Suspense fallback={<GoalsPerYearSkeleton />}>
      <GoalsPerYearClient />
    </Suspense>
  );
}

function GoalsPerYearSkeleton() {
  return (
    <div>
      <div className="skeleton h-10 w-48 mb-2 rounded" />
      <div className="skeleton h-5 w-64 mb-4 rounded" />
      <div className="skeleton h-[52px] mb-6 rounded" />
      <div className="card p-5 mb-6"><div className="skeleton h-[300px] rounded" /></div>
      <div className="card p-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 mb-3">
            <div className="skeleton h-4 w-12 rounded" />
            <div className="skeleton h-4 w-16 rounded" />
            <div className="skeleton h-4 w-16 rounded" />
            <div className="skeleton h-4 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
