import { SeasonDetailClient } from "./season-detail-client";

export default async function SeasonPage({
  params,
}: {
  params: Promise<{ name: string; year: string }>;
}) {
  const { name, year } = await params;
  return (
    <SeasonDetailClient tournamentName={decodeURIComponent(name)} year={parseInt(year, 10)} />
  );
}
