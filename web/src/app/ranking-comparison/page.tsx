import { Metadata } from "next";
import { RankingComparisonClient } from "./ranking-comparison-client";

export const metadata: Metadata = {
  title: "FIFA vs ELO Comparison — Football Stats",
  description: "Compare FIFA World Rankings side by side with ELO ratings calculated from match results.",
};

export default function RankingComparisonPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">FIFA vs ELO Rankings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Compare the official FIFA World Ranking with ELO ratings calculated from historical match results.
        </p>
      </div>
      <RankingComparisonClient />
    </div>
  );
}
