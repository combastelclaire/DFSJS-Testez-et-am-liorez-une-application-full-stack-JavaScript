import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';
import { authService } from '../services/auth.service';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('../services/auth.service', () => ({
  authService: {
    getCurrentUser: vi.fn(),
    isAuthenticated: vi.fn(),
    logout: vi.fn(),
  },
}));

const mockedAuthService = vi.mocked(authService, true);

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});


function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );
}

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("affiche les liens Login/Register si le user n'est pas connecté", () => {
    mockedAuthService.isAuthenticated.mockReturnValue(false);
    mockedAuthService.getCurrentUser.mockReturnValue(null);

    renderNavbar();

    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sessions' })).not.toBeInTheDocument();
  });

  it("affiche les liens Sessions/Profile et le bouton Logout pour un utilisateur connecté", () => {
    mockedAuthService.isAuthenticated.mockReturnValue(true);
    mockedAuthService.getCurrentUser.mockReturnValue({
      id: 1,
      email: 'user@test.com',
      firstName: 'John',
      lastName: 'Doe',
      admin: false,
      token: 'jwt-token',
    });

    renderNavbar();

    expect(screen.getByRole('link', { name: 'Sessions' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create Session' })).not.toBeInTheDocument();
  });

  it('affiche le lien Create Session pour un administrateur', () => {
    mockedAuthService.isAuthenticated.mockReturnValue(true);
    mockedAuthService.getCurrentUser.mockReturnValue({
      id: 1,
      email: 'yoga@studio.com',
      firstName: 'Admin',
      lastName: 'Yoga',
      admin: true,
      token: 'jwt-token',
    });

    renderNavbar();

    expect(screen.getByRole('link', { name: 'Create Session' })).toBeInTheDocument();
  });

  it('déconnecte l\'utilisateur puis redirige vers /login au clic sur Logout', async () => {
    const user = userEvent.setup();

    mockedAuthService.isAuthenticated.mockReturnValue(true);
    mockedAuthService.getCurrentUser.mockReturnValue({
      id: 1,
      email: 'user@test.com',
      firstName: 'John',
      lastName: 'Doe',
      admin: false,
      token: 'jwt-token',
    });

    renderNavbar();

    await user.click(screen.getByRole('button', { name: 'Logout' }));

    expect(mockedAuthService.logout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
