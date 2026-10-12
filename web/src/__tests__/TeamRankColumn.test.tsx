import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { DataTable } from '@/components/shared/DataTable';
import { TEAMS_COLUMNS } from '@/lib/team-columns';
import type { TeamItem } from '@/lib/types';

function mk(team: string, matches: number): TeamItem {
  return {
    team,
    matches_played: matches,
    goals_for: 20,
    goals_against: 8,
    gf_ga_ratio: 2.5,
    avg_gf: 2,
    avg_ga: 0.8,
    wins: 6,
    losses: 2,
    draws: 2,
    points: 20,
    win_rate: 60,
    loss_rate: 20,
    unique_countries: 1,
    elo_rating: 1600,
    elo_ranking: 10,
  };
}

const rows: TeamItem[] = [mk('Flamengo', 10), mk('Palmeiras', 30), mk('Corinthians', 20)];

function cells(): string[][] {
  return Array.from(document.querySelectorAll('tbody tr')).map((tr) =>
    Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim() ?? ''),
  );
}

describe('teams table rank column', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('is the first column and numbers rows 1, 2, 3', () => {
    render(<DataTable columns={TEAMS_COLUMNS} data={rows} keyField="team" />);

    const headers = Array.from(document.querySelectorAll('thead th')).map(
      (th) => th.textContent?.trim() ?? '',
    );
    expect(headers[0]).toMatch(/#/);
    expect(cells().map((row) => row[0])).toEqual(['1', '2', '3']);
  });

  it('renumbers so it reflects the active sort order', () => {
    render(
      <DataTable
        columns={TEAMS_COLUMNS}
        data={rows}
        keyField="team"
        sortKey="matches_played"
        sortDir="asc"
      />,
    );
    expect(cells()[0][1]).toContain('Flamengo'); // 10 matches sorts first

    document.body.innerHTML = '';
    render(
      <DataTable
        columns={TEAMS_COLUMNS}
        data={rows}
        keyField="team"
        sortKey="matches_played"
        sortDir="desc"
      />,
    );
    expect(cells()[0][1]).toContain('Palmeiras'); // 30 matches sorts first
  });
});
