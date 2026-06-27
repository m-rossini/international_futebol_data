import { Suspense } from "react";
import { FlagReportClient } from "./flag-report-client";

export const metadata = {
  title: "Flag Report — International Football Stats",
};

export default function FlagReportPage() {
  return (
    <Suspense
      fallback={<p className="p-8 text-sm text-gray-400">Loading...</p>}
    >
      <FlagReportClient />
    </Suspense>
  );
}
