import { Suspense } from "react";
import { CountriesClient } from "./countries-client";

export default function CountriesPage() {
  return (
    <Suspense fallback={<CountriesSkeleton />}>
      <CountriesClient />
    </Suspense>
  );
}

function CountriesSkeleton() {
  return (
    <div>
      <div className="skeleton h-10 w-40 mb-2 rounded" />
      <div className="skeleton h-5 w-64 mb-4 rounded" />
      <div className="skeleton h-[52px] mb-6 rounded" />
      <div className="card p-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 mb-3">
            <div className="skeleton h-4 w-6 rounded" />
            <div className="skeleton h-5 w-5 rounded-sm" />
            <div className="skeleton h-5 w-32 rounded" />
            <div className="skeleton h-4 w-16 rounded ml-auto" />
            <div className="skeleton h-4 w-16 rounded" />
            <div className="skeleton h-4 w-24 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
