import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { TeamSquadsSection } from '@/app/teams/[name]/team-squads-section';
import type { MatchItem } from '@/lib/types';

const matches: MatchItem[] = [
  {
    date: '2022-12-18T00:00:00',
    home_team: 'Argentina',
    away_team: 'France',
    home_score: 3,
    away_score: 3,
    tournament: 'FIFA World Cup',
    city: 'Lusail',
    country: 'Qatar',
    neutral: true,
  },
];

const squadItems = [{ match_date: '2022-12-18', home_team: 'Argentina', away_team: 'France' }];

function mockSquadsFetch(data: unknown) {
  globalThis.fetch = vi.fn().mockImplementation((url: string) => {
    if (String(url).includes('/squads?teams=Argentina')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
  });
}

describe('TeamSquadsSection', () => {
  beforeEach(() => {
    mockSquadsFetch(squadItems);
  });

  it('renders squad matches with scores and detail links', async () => {
    const { container } = render(<TeamSquadsSection teamName="Argentina" matches={matches} />);
    await waitFor(() => {
      expect(container.querySelector('#squads')).not.toBeNull();
    });
    expect(container.textContent).toContain('Argentina 3–3 France');
    const link = container.querySelector('a[href="/squads/2022-12-18/Argentina/France"]');
    expect(link).not.toBeNull();
  });

  it('renders nothing when the team has no squad data', async () => {
    mockSquadsFetch([]);
    const { container } = render(<TeamSquadsSection teamName="Brazil" matches={[]} />);
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });
    await act(async () => {});
    expect(container.querySelector('#squads')).toBeNull();
  });
});
