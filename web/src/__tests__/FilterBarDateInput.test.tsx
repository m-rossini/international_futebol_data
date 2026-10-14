import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';

// Controlled so each test can set the URL state it starts from.
let currentParams = new URLSearchParams();
// A real router.replace updates the URL, and the component reads its state back
// from useSearchParams() -- so the mock has to actually apply the navigation,
// otherwise the tests assert against a component that never sees its own write.
const replace = vi.fn((url: string) => {
  currentParams = new URLSearchParams(url.split('?')[1] ?? '');
});

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

  // A component, not an element: rerendering the same element identity makes
  // React bail out, and the tests rely on re-rendering to observe URL changes.
  const DatesOnly = () => (
    <FilterBar fields={{ teams: false, tournaments: false, countries: false, dates: true }} />
  );
  const renderDates = () => render(<DatesOnly />);

  const dateInputs = (container: HTMLElement) =>
    Array.from(container.querySelectorAll<HTMLInputElement>('input[type="date"]'));

  describe('typing a date', () => {
    it('can be changed after a date has already been set', () => {
      // Reported: once the first date range was typed, the field stopped
      // working -- the display changed but no new query ran, and reloading
      // still used the old value. Changing a date means clearing it first, and
      // a cleared native date input reports "" -- which must not restore the
      // previous value over the top of what the user is typing.
      currentParams = new URLSearchParams('date_from=1994-10-15');
      const { container } = renderDates();
      const from = dateInputs(container)[0];
      expect(from.value).toBe('1994-10-15');

      // Clear the field: the widget is left alone, so the user can type again.
      fireEvent.change(from, { target: { value: '' } });
      expect(from.value).toBe('');

      // Now type a replacement date.
      fireEvent.change(from, { target: { value: '2020-06-01' } });
      expect(replace).toHaveBeenCalledWith('/teams?date_from=2020-06-01');
    });

    it('leaves the displayed value alone when the value is incomplete', () => {
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
    it('follows the URL when a filter is cleared elsewhere', () => {
      // e.g. a "clear filters" action on the page. The URL is the source of
      // truth: when date_from disappears the input must remount empty, which
      // is what lets the field be reused after being cleared from outside.
      currentParams = new URLSearchParams('date_from=1994-10-15');
      const { container, rerender } = renderDates();
      expect(dateInputs(container)[0].value).toBe('1994-10-15');

      // The router cue: the URL no longer carries the date, and the component
      // re-renders because of it.
      currentParams = new URLSearchParams();
      rerender(<DatesOnly />);

      expect(dateInputs(container)[0].value).toBe('');
    });
    it('offers an explicit way to clear, and it removes both date params', () => {
      const { container, rerender } = renderDates();
      const from = dateInputs(container)[0];

      fireEvent.change(from, { target: { value: '1994-10-15' } });
      rerender(<DatesOnly />);
      fireEvent.change(dateInputs(container)[1], { target: { value: '2024-12-31' } });
      rerender(<DatesOnly />);

      const clear = screen.getByRole('button', { name: /clear dates/i });
      fireEvent.click(clear);
      rerender(<DatesOnly />);

      // The final navigation carries neither date filter.
      const lastUrl = replace.mock.calls[replace.mock.calls.length - 1][0];
      expect(new URLSearchParams(lastUrl.split('?')[1] ?? '').toString()).toBe('');
      expect(dateInputs(container)[0].value).toBe('');
      expect(dateInputs(container)[1].value).toBe('');
      expect(screen.queryByRole('button', { name: /clear dates/i })).toBeNull();
    });
  });
});
