import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '@/components/layout/Sidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('Sidebar', () => {
  const defaultProps = { isOpen: true, onClose: vi.fn() };

  it('renders the Teams link', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Teams')).toBeInTheDocument();
  });

  it('renders the brand name', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Football Stats')).toBeInTheDocument();
  });
});
