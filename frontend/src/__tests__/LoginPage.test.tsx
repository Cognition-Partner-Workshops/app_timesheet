import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
    isAuthenticated: false,
  }),
}));

import LoginPage from '../pages/LoginPage';

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  it('renders the login form', () => {
    renderWithRouter();
    expect(screen.getByText('Time Tracker')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /email address/i })).toBeInTheDocument();
    expect(screen.getByText('Enter your email to log in')).toBeInTheDocument();
  });

  it('renders the info alert about no password', () => {
    renderWithRouter();
    expect(screen.getByText('This app intentionally does not have a password field.')).toBeInTheDocument();
  });

  it('renders the login button', () => {
    renderWithRouter();
    expect(screen.getByRole('button', { name: 'Log In' })).toBeInTheDocument();
  });

  it('disables login button when email is empty', () => {
    renderWithRouter();
    expect(screen.getByRole('button', { name: 'Log In' })).toBeDisabled();
  });
});
