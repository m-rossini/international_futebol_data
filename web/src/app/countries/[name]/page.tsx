import { Suspense } from "react";
import { CountryDetailClient } from "./country-detail-client";

type tParams = Promise<{ name: string }>;

export default async function CountryDetailPage({ params }: { params: tParams }) {
  const { name } = await params;
  return (
    <Suspense fallback={<CountryDetailSkeleton />}>
      <CountryDetailClient name={decodeURIComponent(name)} />
    </Suspense>
  );
}

function CountryDetailSkeleton() {
  return (
    <div>
      <div className="skeleton h-8 w-48 mb-2 rounded" />
      <div className="skeleton h-5 w-32 mb-6 rounded" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
