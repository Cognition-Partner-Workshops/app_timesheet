import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    login: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
    isAuthenticated: true,
  }),
}));

import Layout from '../components/Layout';

function renderWithRouter(children: React.ReactNode = <div>Test Content</div>) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Layout>{children}</Layout>
    </MemoryRouter>
  );
}

describe('Layout', () => {
  it('renders the sidebar with navigation items', () => {
    renderWithRouter();
    expect(screen.getAllByText('Time Tracker').length).toBeGreaterThan(0);
    // Use getAllByText since items appear in both temporary and permanent drawers
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Clients').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Work Entries').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Reports').length).toBeGreaterThan(0);
  });

  it('renders the user email in the app bar', () => {
    renderWithRouter();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('renders the logout button', () => {
    renderWithRouter();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('renders children content', () => {
    renderWithRouter(<div>My Page Content</div>);
    expect(screen.getByText('My Page Content')).toBeInTheDocument();
  });
});
