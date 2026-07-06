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
  const jsonLd = {
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
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
