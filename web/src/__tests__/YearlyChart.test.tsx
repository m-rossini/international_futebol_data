import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { YearlyChart } from '@/components/shared/chart/YearlyChart';

const data = [
  { year: 2020, wins: 3, losses: 1, draws: 1, matches_played: 5 },
  { year: 2021, wins: 7, losses: 3, draws: 2, matches_played: 12 },
  { year: 2022, wins: 4, losses: 2, draws: 2, matches_played: 8 },
];

// All tests pass explicit width to bypass ResponsiveContainer (which requires
// real DOM layout that jsdom cannot provide).
const W = 460;

describe('YearlyChart', () => {
  it('renders an svg with the chart aria label', () => {
    render(<YearlyChart data={data} width={W} />);
    expect(screen.getByRole('img', { name: 'Wins / Draws / Losses per year' })).toBeInTheDocument();
  }, 10000);

  it('shows year labels on the x-axis', () => {
    render(<YearlyChart data={data} width={W} />);
    // Recharts may render year labels in multiple places (measurement span + ticks),
    // so we use getAllByText to verify each year appears at least once.
    expect(screen.getAllByText('2020').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2021').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2022').length).toBeGreaterThan(0);
  }, 10000);

  it('renders stacked bars and a line for total matches', () => {
    const { container } = render(<YearlyChart data={data} width={W} />);
    // Recharts renders bar charts as <rect> and lines as <path> inside SVG
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    // Line element for Total Matches
    const paths = svg!.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
  }, 10000);

  it('renders the legend with Wins, Draws, Losses, and Total Matches', () => {
    render(<YearlyChart data={data} width={W} />);
    expect(screen.getByText('Wins')).toBeInTheDocument();
    expect(screen.getByText('Draws')).toBeInTheDocument();
    expect(screen.getByText('Losses')).toBeInTheDocument();
    expect(screen.getByText('Total Matches')).toBeInTheDocument();
  }, 10000);

  it('shows empty state when no data', () => {
    render(<YearlyChart data={[]} />);
    expect(screen.getByText('No yearly data available')).toBeInTheDocument();
  });

  it('sorts bars by year ascending regardless of input order', () => {
    const unsorted = [
      { year: 2022, wins: 1, losses: 0, draws: 0, matches_played: 1 },
      { year: 2020, wins: 1, losses: 0, draws: 0, matches_played: 1 },
      { year: 2021, wins: 1, losses: 0, draws: 0, matches_played: 1 },
    ];
    render(<YearlyChart data={unsorted} width={W} />);
    const texts = screen.getAllByText(/^20\d{2}$/);
    const years = texts.map((el) => Number(el.textContent));
    expect(years).toEqual([2020, 2021, 2022]);
  });
});
