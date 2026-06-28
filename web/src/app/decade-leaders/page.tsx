import { DecadeLeadersClient } from "./decade-leaders-client";

export const metadata = {
  title: "Decade Leaders - ELO Ratings",
  description: "See which teams dominated each decade based on ELO ratings",
};

export default function DecadeLeadersPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <DecadeLeadersClient />
    </div>
  );
}
