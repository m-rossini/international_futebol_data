import { FifaRankingClient } from "./fifa-ranking-client";

export const metadata = {
  title: "FIFA World Rankings — Football Stats",
  description: "Current FIFA World Rankings and historical ranking data for all countries.",
};

export default function FifaRankingPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">FIFA World Rankings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Historical FIFA/Coca-Cola World Ranking data since 1993.
        </p>
      </div>
      <FifaRankingClient />
    </main>
  );
}
