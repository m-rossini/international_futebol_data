'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';

interface Release {
  version: string;
  tag: string;
  name: string;
  published_at: string;
  author: string;
  body: string;
  html_url: string;
}

interface Props {
  version: Promise<string>;
}

function parseReleaseNotes(body: string) {
  const sections: { title: string; items: string[] }[] = [];
  let currentSection: { title: string; items: string[] } | null = null;

  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('### ')) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: trimmed.slice(4), items: [] };
    } else if (trimmed.startsWith('- ') && currentSection) {
      currentSection.items.push(trimmed.slice(2));
    }
  }
  if (currentSection) sections.push(currentSection);

  return sections;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function ReleaseDetailClient({ version }: Props) {
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const v = await version;
        const res = await fetch(`/api/proxy/releases/${v}`);
        if (!res.ok) {
          if (!cancelled) setError('Release not found');
          return;
        }
        const data = await res.json();
        if (!cancelled) setRelease(data);
      } catch {
        if (!cancelled) setError('Failed to load release');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [version]);

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Release</h1>
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  if (error || !release) {
    return (
      <div className="p-4 md:p-8">
        <Link
          href="/flag-report"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={14} />
          Back to House Keeping
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Release {release?.tag || `v${version}`}
        </h1>
        <div className="border border-gray-200 rounded-lg bg-white p-6">
          <p className="text-gray-500">{error || 'Release not found'}</p>
          <p className="text-sm text-gray-400 mt-2">
            This release may not have been created yet. Releases are automatically created when
            versions are bumped.
          </p>
        </div>
      </div>
    );
  }

  const sections = parseReleaseNotes(release.body);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Link
        href="/flag-report"
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
      >
        <ArrowLeft size={14} />
        Back to House Keeping
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-800">{release.name || release.tag}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Released {formatDate(release.published_at)} by {release.author}
        </p>
      </div>

      {sections.length > 0 ? (
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title} className="border border-gray-200 rounded-lg bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">{section.title}</h2>
              <ul className="space-y-2">
                {section.items.map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-gray-300 mt-0.5">-</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Changes</h2>
          <div className="text-sm text-gray-600 whitespace-pre-wrap">{release.body}</div>
        </div>
      )}

      {release.html_url && (
        <a
          href={release.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          View on GitHub
          <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
}
