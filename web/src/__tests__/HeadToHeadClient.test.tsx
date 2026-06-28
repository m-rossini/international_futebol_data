import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HeadToHeadClient } from '@/app/head-to-head/head-to-head-client';

const mockFilters = {
  teams: ['Brazil', 'Argentina', 'Germany'],
  tournaments: ['World Cup'],
  countries: ['Brazil'],
};

const mockH2H = {
  team1: 'Brazil',
  team2: 'Argentina',
  matches: 10,
  Brazil_wins: 5,
  Argentina_wins: 2,
  draws: 3,
  Brazil_goals: 15,
  Argentina_goals: 10,
  matches_list: [
    {
      date: '2023-11-21',
      home_team: 'Brazil',
      away_team: 'Argentina',
      home_score: 1,
      away_score: 0,
      tournament: 'World Cup Qualifier',
      city: 'Rio de Janeiro',
      country: 'Brazil',
      neutral: false,
    },
    {
      date: '2021-07-10',
      home_team: 'Argentina',
      away_team: 'Brazil',
      home_score: 1,
      away_score: 0,
      tournament: 'Copa America',
      city: 'Buenos Aires',
      country: 'Argentina',
      neutral: false,
    },
  ],
};

let mockSearchParams = new URLSearchParams('');
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
  usePathname: () => '/head-to-head',
}));

function mockFetch({ h2h = mockH2H, h2hOk = true }: { h2h?: object; h2hOk?: boolean } = {}) {
  globalThis.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/filters')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockFilters),
      });
    }
    if (url.includes('/head_to_head')) {
      if (!h2hOk) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: true, message: 'Unknown team' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(h2h),
      });
    }
    return Promise.reject(new Error('Unknown URL'));
  });
}

describe('HeadToHeadClient', () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams('');
    mockReplace.mockClear();
    mockFetch();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the heading', () => {
    render(<HeadToHeadClient />);
    expect(screen.getByRole('heading', { name: 'Head to Head' })).toBeInTheDocument();
  });

  it('shows team selectors', () => {
    render(<HeadToHeadClient />);
    expect(screen.getByText('Team 1')).toBeInTheDocument();
    expect(screen.getByText('Team 2')).toBeInTheDocument();
  });

  it('shows placeholder when no teams selected', () => {
    render(<HeadToHeadClient />);
    expect(screen.getByText(/Select two teams to compare/)).toBeInTheDocument();
  });

  it('shows swap button disabled when no teams selected', () => {
    render(<HeadToHeadClient />);
    const btn = screen.getByTitle('Swap teams');
    expect(btn).toBeDisabled();
  });

  it("shows 'different teams' message when same team selected", () => {
    mockSearchParams = new URLSearchParams('team1=Brazil&team2=Brazil');
    render(<HeadToHeadClient />);
    expect(screen.getByText(/Select two different teams/)).toBeInTheDocument();
  });

  it('loads and displays head-to-head results from URL params', async () => {
    mockSearchParams = new URLSearchParams('team1=Brazil&team2=Argentina');
    render(<HeadToHeadClient />);

    await waitFor(() => {
      expect(screen.getByText('Brazil Wins')).toBeInTheDocument();
    });
  });

  it('displays summary stat cards with correct values', async () => {
    mockSearchParams = new URLSearchParams('team1=Brazil&team2=Argentina');
    render(<HeadToHeadClient />);

    await waitFor(() => {
      expect(screen.getByText('Matches')).toBeInTheDocument();
    });
    expect(screen.getByText('Draws')).toBeInTheDocument();
    // Verify all expected labels are present
    expect(screen.getByText('Brazil Wins')).toBeInTheDocument();
    expect(screen.getByText('Argentina Wins')).toBeInTheDocument();
    expect(screen.getByText('Brazil Goals')).toBeInTheDocument();
    expect(screen.getByText('Argentina Goals')).toBeInTheDocument();
    expect(screen.getByText('Brazil Win%')).toBeInTheDocument();
    expect(screen.getByText('Argentina Win%')).toBeInTheDocument();
  });

  it('displays match history table', async () => {
    mockSearchParams = new URLSearchParams('team1=Brazil&team2=Argentina');
    render(<HeadToHeadClient />);

    await waitFor(() => {
      expect(screen.getByText('Match History (10 matches)')).toBeInTheDocument();
    });
    expect(screen.getByText('World Cup Qualifier')).toBeInTheDocument();
    expect(screen.getByText('Copa America')).toBeInTheDocument();
    expect(screen.getByText('Rio de Janeiro')).toBeInTheDocument();
    expect(screen.getByText('Buenos Aires')).toBeInTheDocument();
  });

  it('shows error for unknown team', async () => {
    mockSearchParams = new URLSearchParams('team1=Unknown&team2=Argentina');
    mockFetch({ h2h: { error: true, message: "Unknown team: 'Unknown'" }, h2hOk: false });

    render(<HeadToHeadClient />);

    await waitFor(() => {
      expect(screen.getByText(/Unknown team/)).toBeInTheDocument();
    });
  });

  it('shows no matches message when zero matches found', async () => {
    mockSearchParams = new URLSearchParams('team1=Brazil&team2=Germany');
    mockFetch({
      h2h: {
        team1: 'Brazil',
        team2: 'Germany',
        matches: 0,
        Brazil_wins: 0,
        Germany_wins: 0,
        draws: 0,
        Brazil_goals: 0,
        Germany_goals: 0,
        matches_list: [],
      },
    });

    render(<HeadToHeadClient />);

    await waitFor(() => {
      expect(screen.getByText(/No matches found/)).toBeInTheDocument();
    });
  });

  it('swap teams button is enabled when both teams selected', async () => {
    mockSearchParams = new URLSearchParams('team1=Brazil&team2=Argentina');
    render(<HeadToHeadClient />);

    await waitFor(() => {
      expect(screen.getByTitle('Swap teams')).not.toBeDisabled();
    });
  });

  it('handles network error gracefully', async () => {
    mockSearchParams = new URLSearchParams('team1=Brazil&team2=Argentina');
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(<HeadToHeadClient />);

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });
});
