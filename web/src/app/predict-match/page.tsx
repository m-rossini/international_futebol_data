import PredictMatchClient from "./predict-match-client";

export const metadata = {
  title: "Match Predictions | International Football Stats",
  description: "Predict match outcomes using ELO ratings",
};

export default function PredictMatchPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Match Predictions</h1>
        <p className="text-sm text-gray-500 mt-1">
          Predict win/draw/loss probabilities using ELO ratings calculated from historical match results.
        </p>
      </div>
      <PredictMatchClient />
    </div>
  );
}
