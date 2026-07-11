import type { MetadataRoute } from 'next';

const BASE_URL = 'https://futebol.orbisplace.co.uk';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7531';

async function fetchFilters(): Promise<{ teams: string[]; tournaments: string[] }> {
  try {
    const res = await fetch(`${API_URL}/filters`, { next: { revalidate: 3600 } });
    if (!res.ok) return { teams: [], tournaments: [] };
    return res.json();
  } catch {
    return { teams: [], tournaments: [] };
  }
}

async function fetchYears(): Promise<number[]> {
  try {
    const res = await fetch(`${API_URL}/years`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((y: { year: number }) => y.year);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [filters, years] = await Promise.all([fetchFilters(), fetchYears()]);
  const { teams, tournaments } = filters;

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    {
      url: `${BASE_URL}/teams`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/tournaments`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/head-to-head`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/elo-ranking`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/decade-leaders`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/flag-report`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/askme`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
  ];

  const teamPages: MetadataRoute.Sitemap = teams.map((team) => ({
    url: `${BASE_URL}/teams/${encodeURIComponent(team)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const teamYearPages: MetadataRoute.Sitemap = teams.flatMap((team) =>
    years.map((year) => ({
      url: `${BASE_URL}/teams/${encodeURIComponent(team)}/${year}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  );

  const tournamentPages: MetadataRoute.Sitemap = tournaments.map((tournament) => ({
    url: `${BASE_URL}/tournaments/${encodeURIComponent(tournament)}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...teamPages, ...teamYearPages, ...tournamentPages];
}
