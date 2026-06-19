import { Suspense } from "react";
import { DashboardClient } from "./dashboard-client";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="skeleton h-10 w-48 mb-2 rounded" />
      <div className="skeleton h-5 w-72 mb-4 rounded" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-4 w-20 mb-2 rounded" />
            <div className="skeleton h-10 w-24 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5"><div className="skeleton h-[240px] rounded" /></div>
        <div className="card p-5"><div className="skeleton h-[240px] rounded" /></div>
      </div>
    </div>
  );
}
