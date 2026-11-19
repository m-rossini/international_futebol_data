import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { MatchTable } from '@/components/shared/MatchTable';
import { resetSquadCacheForTests } from '@/lib/squads';
import type { MatchItem } from '@/lib/types';

const matches: MatchItem[] = [
  {
    date: '2022-11-21T00:00:00',
    home_team: 'England',
    away_team: 'Iran',
    home_score: 6,
    away_score: 2,
    tournament: 'FIFA World Cup',
    city: 'Doha',
    country: 'Qatar',
    neutral: true,
  },
];

function hrefs(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
}

describe('MatchTable team links', () => {
  beforeEach(() => {
    resetSquadCacheForTests();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });
  it('links team names to their team pages by default', () => {
    const { container } = render(<MatchTable matches={matches} />);
    const links = hrefs(container);
    expect(links).toContain('/teams/England');
    expect(links).toContain('/teams/Iran');
    expect(links).not.toContain('/country/England');
    expect(links).not.toContain('/country/Iran');
  });

  it('links cities and countries to their pages', () => {
    const { container } = render(<MatchTable matches={matches} />);
    const links = hrefs(container);
    expect(links).toContain('/city/Doha');
    expect(links).toContain('/country/Qatar');
  });

  it('honours a custom teamHref builder', () => {
    const { container } = render(
      <MatchTable
        matches={matches}
        teamHref={(t) => `/teams/${encodeURIComponent(t)}/2022?tournaments=FIFA`}
      />,
    );
    const links = hrefs(container);
    expect(links).toContain('/teams/England/2022?tournaments=FIFA');
    expect(links).toContain('/teams/Iran/2022?tournaments=FIFA');
  });

  it('shows a squad button only for matches with squad data', async () => {
    resetSquadCacheForTests();
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/squads')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { match_date: '2022-11-21', home_team: 'England', away_team: 'Iran' },
            ]),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    const { container } = render(<MatchTable matches={matches} />);
    await waitFor(() => {
      expect(
        container.querySelector('a[aria-label="View squads for England vs Iran"]'),
      ).not.toBeNull();
    });
    const btn = container.querySelector('a[aria-label="View squads for England vs Iran"]');
    expect(btn?.getAttribute('href')).toBe('/squads/2022-11-21/England/Iran');
  });

  it('shows no squad button when no match has squad data', async () => {
    resetSquadCacheForTests();
    let resolveSquads!: (v: unknown[]) => void;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/squads')) {
        return new Promise((res) => {
          resolveSquads = (v) => res({ ok: true, json: () => Promise.resolve(v) });
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    const { container } = render(<MatchTable matches={matches} />);
    resolveSquads([]);
    await act(async () => {});
    expect(container.querySelector('a[aria-label^="View squads"]')).toBeNull();
  });
});
