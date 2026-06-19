import { Suspense } from "react";
import { BiggestWinsClient } from "./biggest-wins-client";

export default function BiggestWinsPage() {
  return (
    <Suspense fallback={<BiggestWinsSkeleton />}>
      <BiggestWinsClient />
    </Suspense>
  );
}

function BiggestWinsSkeleton() {
  return (
    <div>
      <div className="skeleton h-10 w-40 mb-2 rounded" />
      <div className="skeleton h-5 w-64 mb-4 rounded" />
      <div className="skeleton h-[52px] mb-6 rounded" />
      <div className="card p-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 mb-3">
            <div className="skeleton h-4 w-6 rounded" />
            <div className="skeleton h-5 w-28 rounded" />
            <div className="skeleton h-5 w-32 rounded" />
            <div className="skeleton h-5 w-20 rounded ml-auto" />
            <div className="skeleton h-4 w-12 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
