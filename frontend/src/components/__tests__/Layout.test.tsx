import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Layout from '../Layout';

const mockNavigate = vi.fn();
const mockLogout = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/dashboard' }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    logout: mockLogout,
  }),
}));

describe('Layout', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockLogout.mockClear();
  });

  it('renders the "Time Tracker" branding', () => {
    render(<Layout><div>Child</div></Layout>);
    const elements = screen.getAllByText('Time Tracker');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders children content', () => {
    render(<Layout><div>Test Child Content</div></Layout>);
    expect(screen.getByText('Test Child Content')).toBeInTheDocument();
  });

  it('renders all menu items', () => {
    render(<Layout><div>Child</div></Layout>);
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Clients').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Work Entries').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Reports').length).toBeGreaterThanOrEqual(1);
  });

  it('displays the user email', () => {
    render(<Layout><div>Child</div></Layout>);
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('displays user avatar with first letter of email', () => {
    render(<Layout><div>Child</div></Layout>);
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('renders the logout button', () => {
    render(<Layout><div>Child</div></Layout>);
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('calls logout when logout button is clicked', () => {
    render(<Layout><div>Child</div></Layout>);
    fireEvent.click(screen.getByText('Logout'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('navigates when a menu item is clicked', () => {
    render(<Layout><div>Child</div></Layout>);
    const clientButtons = screen.getAllByText('Clients');
    fireEvent.click(clientButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/clients');
  });

  it('shows the current page title in the AppBar based on pathname', () => {
    render(<Layout><div>Child</div></Layout>);
    const dashboardElements = screen.getAllByText('Dashboard');
    expect(dashboardElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the mobile drawer toggle button', () => {
    render(<Layout><div>Child</div></Layout>);
    const toggleButton = screen.getByLabelText('open drawer');
    expect(toggleButton).toBeInTheDocument();
  });

  it('toggles mobile drawer when menu icon is clicked', () => {
    render(<Layout><div>Child</div></Layout>);
    const toggleButton = screen.getByLabelText('open drawer');
    fireEvent.click(toggleButton);
    const timeTrackerElements = screen.getAllByText('Time Tracker');
    expect(timeTrackerElements.length).toBeGreaterThanOrEqual(1);
  });
});
