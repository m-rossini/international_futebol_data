import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';

// Controlled so each test can set the URL state it starts from.
let currentParams = new URLSearchParams();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => currentParams,
  useRouter: () => ({ replace }),
  usePathname: () => '/teams',
}));

import { FilterBar } from '@/components/shared/FilterBar';

describe('FilterBar date inputs', () => {
  beforeEach(() => {
    currentParams = new URLSearchParams();
    replace.mockClear();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ teams: [], tournaments: [], countries: [] }),
    });
  });

  const renderDates = () =>
    render(
      <FilterBar fields={{ teams: false, tournaments: false, countries: false, dates: true }} />,
    );

  const dateInputs = (container: HTMLElement) =>
    Array.from(container.querySelectorAll<HTMLInputElement>('input[type="date"]'));

  describe('typing a date', () => {
    it('leaves the widget alone when the value is incomplete', () => {
      // A native <input type="date"> reports "" from onChange until the value
      // parses as a whole date. Forwarding that "" to the URL used to trigger
      // a navigation, and re-rendering an input straight off useSearchParams()
      // wrote "" back into it, wiping the partially typed segments to the
      // dd-mm-yyyy placeholder. While typing, the widget must be left alone.
      const { container } = renderDates();
      const from = dateInputs(container)[0];

      fireEvent.change(from, { target: { value: '1994-10-15' } });
      expect(replace).toHaveBeenCalledTimes(1);

      // Start the year over: an incomplete value must not push anything.
      fireEvent.change(from, { target: { value: '' } });

      expect(replace).toHaveBeenCalledTimes(1);
      expect(from.value).toBe('1994-10-15');
    });

    it('writes a complete date through to the URL', () => {
      const { container } = renderDates();
      const from = dateInputs(container)[0];

      fireEvent.change(from, { target: { value: '1994-10-15' } });

      expect(replace).toHaveBeenCalledWith('/teams?date_from=1994-10-15');
      expect(from.value).toBe('1994-10-15');
    });

    it('keeps the typed value across the re-render caused by the navigation', () => {
      const { container, rerender } = renderDates();
      const from = dateInputs(container)[0];

      fireEvent.change(from, { target: { value: '1994-10-15' } });
      // The router has now committed the param.
      currentParams = new URLSearchParams('date_from=1994-10-15');
      rerender(
        <FilterBar fields={{ teams: false, tournaments: false, countries: false, dates: true }} />,
      );

      expect(from.value).toBe('1994-10-15');
    });

    it('restores the placeholder when the filter is cleared externally', () => {
      currentParams = new URLSearchParams('date_from=1994-10-15');
      const { container, rerender } = renderDates();
      expect(dateInputs(container)[0].value).toBe('1994-10-15');

      // e.g. a "clear filters" action on the page.
      currentParams = new URLSearchParams();
      rerender(
        <FilterBar fields={{ teams: false, tournaments: false, countries: false, dates: true }} />,
      );

      expect(dateInputs(container)[0].value).toBe('');
    });

    it('offers an explicit way to clear, and it removes both date params', () => {
      const { container } = renderDates();
      const from = dateInputs(container)[0];
      const to = dateInputs(container)[1];

      fireEvent.change(from, { target: { value: '1994-10-15' } });
      fireEvent.change(to, { target: { value: '2024-12-31' } });
      expect(container.querySelector('button')).not.toBeNull();

      const clear = screen.getByRole('button', { name: /clear dates/i });
      fireEvent.click(clear);

      // The final navigation carries neither date filter.
      const lastUrl = replace.mock.calls[replace.mock.calls.length - 1][0];
      expect(new URLSearchParams(lastUrl.split('?')[1] ?? '').toString()).toBe('');
      expect(from.value).toBe('');
      expect(to.value).toBe('');
      expect(screen.queryByRole('button', { name: /clear dates/i })).toBeNull();
    });
  });
});
