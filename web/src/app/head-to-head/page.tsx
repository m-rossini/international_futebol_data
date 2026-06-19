import { Suspense } from "react";
import { HeadToHeadClient } from "./head-to-head-client";

export default function HeadToHeadPage() {
  return (
    <Suspense fallback={<HeadToHeadSkeleton />}>
      <HeadToHeadClient />
    </Suspense>
  );
}

function HeadToHeadSkeleton() {
  return (
    <div>
      <div className="skeleton h-10 w-48 mb-2 rounded" />
      <div className="skeleton h-5 w-64 mb-4 rounded" />
      <div className="card p-5">
        <div className="skeleton h-[200px] rounded" />
      </div>
    </div>
  );
}
