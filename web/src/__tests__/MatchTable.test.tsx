import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MatchTable } from '@/components/shared/MatchTable';
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
});
