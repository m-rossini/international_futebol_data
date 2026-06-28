import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '@/components/layout/Sidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('Sidebar', () => {
  it('renders the Teams link', () => {
    render(<Sidebar />);
    expect(screen.getByText('Teams')).toBeInTheDocument();
  });

  it('renders the brand name', () => {
    render(<Sidebar />);
    expect(screen.getByText('Football Stats')).toBeInTheDocument();
  });
});
