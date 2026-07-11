import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { PageViewTracker } from '@/components/shared/PageViewTracker';
import { WebVitalsTracker } from '@/components/shared/WebVitalsTracker';

const SITE_URL = 'https://futebol.orbisplace.co.uk';

export const metadata: Metadata = {
  title: {
    default: 'International Football Stats — Teams, Tournaments, ELO Ratings',
    template: '%s — International Football Stats',
  },
  description:
    'Explore 150+ years of international football: 300+ teams, 200+ tournaments, ELO rankings, head-to-head stats, and match results from 1872 to present.',
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'International Football Stats',
    title: 'International Football Stats — Teams, Tournaments, ELO Ratings',
    description:
      'Explore 150+ years of international football: 300+ teams, 200+ tournaments, ELO rankings, head-to-head stats, and match results from 1872 to present.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'International Football Stats',
    description:
      'Explore 150+ years of international football: 300+ teams, 200+ tournaments, ELO rankings, head-to-head stats, and match results from 1872 to present.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'International Football Stats',
      url: SITE_URL,
      description:
        'Explore 150+ years of international football: 300+ teams, 200+ tournaments, ELO rankings, head-to-head stats, and match results from 1872 to present.',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/teams?search={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'International Football Match Results',
      description:
        'Historical international football match results from 1872 to present, covering 300+ teams and 200+ tournaments with scores, venues, and tournament context.',
      url: SITE_URL,
      license: `${SITE_URL}/about`,
      creator: {
        '@type': 'Organization',
        name: 'International Football Stats',
        url: SITE_URL,
      },
      distribution: {
        '@type': 'DataDownload',
        encodingFormat: 'application/json',
        contentUrl: `${SITE_URL}/api/proxy/`,
      },
      temporalCoverage: '1872/..',
      spatialCoverage: 'World',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: SITE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Teams',
          item: `${SITE_URL}/teams`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Tournaments',
          item: `${SITE_URL}/tournaments`,
        },
      ],
    },
  ];

  return (
    <html lang="en">
      <head>
        {jsonLd.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      </head>
      <body className="flex min-h-screen bg-gray-50">
        <Suspense>
          <PageViewTracker />
        </Suspense>
        <WebVitalsTracker />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
