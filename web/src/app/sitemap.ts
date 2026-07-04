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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { teams, tournaments } = await fetchFilters();

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

  const tournamentPages: MetadataRoute.Sitemap = tournaments.map((tournament) => ({
    url: `${BASE_URL}/tournaments/${encodeURIComponent(tournament)}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...teamPages, ...tournamentPages];
}
