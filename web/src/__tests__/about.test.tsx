import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AboutPage from '@/app/about/page';

describe('AboutPage credits', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  });

  it('credits the core dataset and links its licence', () => {
    render(<AboutPage />);

    expect(screen.getByRole('link', { name: 'international_results' })).toHaveAttribute(
      'href',
      'https://github.com/m-rossini/international_results',
    );
    const cc0Links = screen.getAllByRole('link', { name: 'CC0 1.0' });
    expect(
      cc0Links.some(
        (link) =>
          link.getAttribute('href') === 'https://creativecommons.org/publicdomain/zero/1.0/',
      ),
    ).toBe(true);
  });

  it('credits the Dixon–Coles model', () => {
    render(<AboutPage />);
    expect(screen.getByRole('link', { name: 'Dixon & Coles (1997)' })).toHaveAttribute(
      'href',
      'https://doi.org/10.1111/1467-9884.00068',
    );
  });

  it('marks planned sources as planned', () => {
    render(<AboutPage />);
    expect(screen.getByRole('link', { name: 'Shot Maps Open Data' })).toBeInTheDocument();
    expect(screen.getAllByText('Used now').length).toBe(7);
  });
});
