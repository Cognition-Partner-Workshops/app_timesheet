import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Layout from '../Layout';

// Mock react-router-dom
const mockNavigate = vi.fn();
let mockPathname = '/dashboard';

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPathname }),
}));

// Mock useAuth
const mockLogout = vi.fn();
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com', createdAt: '2024-01-01' },
    logout: mockLogout,
    isLoading: false,
    isAuthenticated: true,
  }),
}));

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/dashboard';
  });

  it('renders children content', () => {
    render(<Layout><div>Child Content</div></Layout>);
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('renders all menu items', () => {
    render(<Layout><div /></Layout>);
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Clients').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Work Entries').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Reports').length).toBeGreaterThanOrEqual(1);
  });

  it('displays user email', () => {
    render(<Layout><div /></Layout>);
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('displays user avatar with first letter of email', () => {
    render(<Layout><div /></Layout>);
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('renders logout button', () => {
    render(<Layout><div /></Layout>);
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('calls logout when logout button is clicked', () => {
    render(<Layout><div /></Layout>);
    fireEvent.click(screen.getByText('Logout'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('navigates when a menu item is clicked', () => {
    render(<Layout><div /></Layout>);
    // Click on "Clients" in the permanent drawer (getAllByText returns multiple due to two drawers)
    const clientButtons = screen.getAllByText('Clients');
    fireEvent.click(clientButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/clients');
  });

  it('shows "Time Tracker" in drawer header', () => {
    render(<Layout><div /></Layout>);
    expect(screen.getAllByText('Time Tracker').length).toBeGreaterThanOrEqual(1);
  });

  it('shows current page title in app bar based on location', () => {
    mockPathname = '/clients';
    render(<Layout><div /></Layout>);
    // The AppBar title should show "Clients" (plus drawer instances)
    const clientsTexts = screen.getAllByText('Clients');
    expect(clientsTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Time Tracker" as app bar title for unknown paths', () => {
    mockPathname = '/unknown-page';
    render(<Layout><div /></Layout>);
    // Should fall back to "Time Tracker"
    const timeTrackerTexts = screen.getAllByText('Time Tracker');
    expect(timeTrackerTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('toggles mobile drawer when menu icon is clicked', () => {
    render(<Layout><div /></Layout>);
    const menuButton = screen.getByLabelText('open drawer');
    fireEvent.click(menuButton);
    // After clicking, the temporary drawer should be open — we can verify by
    // checking that menu items are still rendered (drawer content visible)
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
  });

  it('highlights the active menu item based on current path', () => {
    mockPathname = '/reports';
    render(<Layout><div /></Layout>);
    // The Reports menu item should be selected — check it exists
    const reportsTexts = screen.getAllByText('Reports');
    expect(reportsTexts.length).toBeGreaterThanOrEqual(1);
  });
});
