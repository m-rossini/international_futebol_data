import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from '@/app/page';
import { Sidebar } from '@/components/layout/Sidebar';
import { NAV_LINKS } from '@/lib/nav';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/',
}));

function navHrefs(container: HTMLElement): string[] {
  return [...container.querySelectorAll<HTMLAnchorElement>('a[href^="/"]')]
    .map((a) => a.getAttribute('href') ?? '')
    .filter((href) => NAV_LINKS.some((item) => item.href === href));
}

describe('navigation config', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ teams: [], tournaments: [], countries: [], cities: [] }),
    });
    localStorage.clear();
  });

  it('has unique, well-formed entries', () => {
    const hrefs = NAV_LINKS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const item of NAV_LINKS) {
      expect(item.href.startsWith('/')).toBe(true);
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.description.length).toBeGreaterThan(0);
    }
  });

  it('sidebar renders exactly the nav config links, home exposes all of them', () => {
    const { container: home } = render(<HomePage />);
    const { container: sidebar } = render(<Sidebar isOpen onClose={vi.fn()} />);

    const expectedHrefs = NAV_LINKS.map((item) => item.href).sort();

    // Sidebar is the canonical single source of truth.
    expect(navHrefs(sidebar).sort()).toEqual(expectedHrefs);

    // Home cards expose every nav link (they may also link elsewhere, e.g. the
    // abuse-notice banner links to /about, so home is a superset, not exact).
    const homeSet = new Set(navHrefs(home));
    for (const href of expectedHrefs) {
      expect(homeSet.has(href)).toBe(true);
    }
  });

  it('shows every nav label as a home card', () => {
    render(<HomePage />);
    for (const item of NAV_LINKS) {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    }
  });
});
