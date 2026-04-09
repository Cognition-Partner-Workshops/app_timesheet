import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock the auth hook
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
    isAuthenticated: false,
  }),
}));

// Mock the API client
vi.mock('../api/client', () => ({
  default: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    getClients: vi.fn().mockResolvedValue({ clients: [] }),
    getWorkEntries: vi.fn().mockResolvedValue({ workEntries: [] }),
  },
}));

import App from '../App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    // When not authenticated, should show the login page
    expect(document.body).toBeDefined();
  });

  it('shows login page when not authenticated', () => {
    render(<App />);
    expect(screen.getByText('Time Tracker')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /email address/i })).toBeInTheDocument();
  });
});
