import { Metadata } from "next";
import { EloRankingClient } from "./elo-ranking-client";

export const metadata: Metadata = {
  title: "ELO Rankings — International Football Stats",
  description: "World football ELO ratings calculated from historical match results since 1872.",
};

export default function EloRankingPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">ELO World Rankings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Calculated from historical match results using the standard ELO formula.
        </p>
      </div>
      <EloRankingClient />
    </div>
  );
}
