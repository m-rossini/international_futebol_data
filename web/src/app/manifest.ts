import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'International Football Stats',
    short_name: 'Football Stats',
    description:
      'Explore 150+ years of international football: 300+ teams, 200+ tournaments, ELO rankings, head-to-head stats, and match results from 1872 to present.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#2d7a3a',
    icons: [
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
