import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { renderRoutes } from '../test/test-utils';
import Profile from './Profile';
import api from '../services/api';
import type { User } from '../types';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);
const mockedDelete = vi.mocked(api.delete);

function seedUser(admin: boolean) {
  const identity = admin
    ? { email: 'yoga@studio.com', firstName: 'Admin', lastName: 'Yoga' }
    : { email: 'user@test.com', firstName: 'John', lastName: 'Doe' };
  localStorage.setItem('token', 'jwt-token');
  localStorage.setItem('user', JSON.stringify({ id: 1, ...identity, admin, token: 'jwt-token' }));
}

function userInfo(admin: boolean): User {
  const identity = admin
    ? { email: 'yoga@studio.com', firstName: 'Admin', lastName: 'Yoga' }
    : { email: 'user@test.com', firstName: 'John', lastName: 'Doe' };
  return {
    id: 1,
    ...identity,
    admin,
    createdAt: '2026-01-15T00:00:00.000Z',
  };
}

function renderProfile() {
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>
  );
}

describe('Profile page', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("affiche les informations de l'utilisateur chargé depuis l'API", async () => {
    seedUser(false);
    mockedGet.mockResolvedValueOnce({ data: userInfo(false) });

    renderProfile();

    expect(await screen.findByText('John')).toBeInTheDocument();
    expect(screen.getByText('Doe')).toBeInTheDocument();
    expect(screen.getByText('user@test.com')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
  });

  it('affiche le badge Administrator pour un admin, sans bouton de promotion', async () => {
    seedUser(true);
    mockedGet.mockResolvedValueOnce({ data: { ...userInfo(true), createdAt: undefined } });

    renderProfile();

    expect(await screen.findByText('Administrator')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Promote to Admin/ })).not.toBeInTheDocument();
  });

  it("promeut l'utilisateur en administrateur au clic sur le bouton", async () => {
    const user = userEvent.setup();

    seedUser(false);
    mockedGet.mockResolvedValueOnce({ data: userInfo(false) });
    mockedPost.mockResolvedValueOnce({ data: userInfo(true) });

    renderProfile();

    await screen.findByText('User');

    await user.click(screen.getByRole('button', { name: /Promote to Admin/ }));

    expect(mockedPost).toHaveBeenCalledWith(
      '/user/promote-admin',
      {},
      { headers: { Authorization: 'Bearer jwt-token' } }
    );

    expect(await screen.findByText('Administrator')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('user')!).admin).toBe(true);
  });

  it('affiche un message d\' erreur générique si le chargement échoue', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    seedUser(false);
    mockedGet.mockRejectedValueOnce(new Error('network down'));

    renderProfile();

    expect(await screen.findByText('Failed to load user information')).toBeInTheDocument();
  });

  it('affiche le message du serveur si le chargement échoue avec une erreur axios', async () => {
    seedUser(false);
    mockedGet.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: 'Utilisateur introuvable' } },
    });

    renderProfile();

    expect(await screen.findByText('Utilisateur introuvable')).toBeInTheDocument();
  });

  it("reste en chargement et n\'appelle pas l\'API si aucun utilisateur n'est connecté", () => {
    renderProfile();

    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("n'appelle pas l'API de suppression si l'utilisateur annule la suppression du compte", async () => {
    const user = userEvent.setup();

    seedUser(false);
    mockedGet.mockResolvedValueOnce({ data: userInfo(false) });

    vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderProfile();

    await screen.findByText('John');

    await user.click(screen.getByRole('button', { name: 'Delete Account' }));

    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it('affiche une erreur si la promotion en administrateur échoue', async () => {
    const user = userEvent.setup();

    vi.spyOn(console, 'error').mockImplementation(() => {});

    seedUser(false);
    mockedGet.mockResolvedValueOnce({ data: userInfo(false) });
    mockedPost.mockRejectedValueOnce(new Error('network down'));

    renderProfile();

    await screen.findByText('User');

    await user.click(screen.getByRole('button', { name: /Promote to Admin/ }));

    expect(await screen.findByText('Failed to promote to admin')).toBeInTheDocument();
  });

  it('supprime le compte après confirmation et redirige vers /login', async () => {
    const user = userEvent.setup();

    seedUser(false);
    mockedGet.mockResolvedValueOnce({ data: userInfo(false) });
    mockedDelete.mockResolvedValueOnce({});

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderRoutes(
      [
        { path: '/profile', element: <Profile /> },
        { path: '/login', element: <div>Page Login</div> },
      ],
      ['/profile']
    );

    await screen.findByText('John');

    await user.click(screen.getByRole('button', { name: 'Delete Account' }));

    expect(mockedDelete).toHaveBeenCalledWith('/user/1', {
      headers: { Authorization: 'Bearer jwt-token' },
    });
    
    await waitFor(() => expect(screen.getByText('Page Login')).toBeInTheDocument());
    expect(localStorage.getItem('token')).toBeNull();
  });
});
