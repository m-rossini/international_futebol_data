import { Suspense } from "react";
import { TeamsClient } from "./teams-client";

export default function TeamsPage() {
  return (
    <Suspense fallback={
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Teams</h1>
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    }>
      <TeamsClient />
    </Suspense>
  );
}
