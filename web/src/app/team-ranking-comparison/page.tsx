import { Metadata } from "next";
import { TeamRankingComparisonClient } from "./team-ranking-comparison-client";

export const metadata: Metadata = {
  title: "FIFA vs ELO History — Football Stats",
  description: "Compare a team's FIFA ranking history against its ELO rating history on the same timeline.",
};

export default function TeamRankingComparisonPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">FIFA vs ELO Timeline</h1>
        <p className="text-sm text-gray-500 mt-1">
          Compare a team&apos;s FIFA ranking history against its ELO rating history on the same timeline.
        </p>
      </div>
      <TeamRankingComparisonClient />
    </div>
  );
}
