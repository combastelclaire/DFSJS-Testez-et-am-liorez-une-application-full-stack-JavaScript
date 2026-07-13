import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoutes } from '../test/test-utils';
import Login from './Login';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockedPost = vi.mocked(api.post);

function renderLogin() {
  return renderRoutes(
    [
      { path: '/login', element: <Login /> },
      { path: '/sessions', element: <div>Page Sessions</div> },
    ],
    ['/login']
  );
}

describe('Login page', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('connecte l\'utilisateur avec les identifiants saisis puis redirige vers /sessions', async () => {
    const user = userEvent.setup();

    mockedPost.mockResolvedValueOnce({
      data: { id: 1, email: 'user@test.com', firstName: 'John', lastName: 'Doe', admin: false, token: 'jwt-token' },
    });

    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'user@test.com');
    await user.type(screen.getByLabelText('Password'), 'test!1234');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(mockedPost).toHaveBeenCalledWith('/auth/login', {
      email: 'user@test.com',
      password: 'test!1234',
    });

    await waitFor(() => expect(screen.getByText('Page Sessions')).toBeInTheDocument());
    expect(localStorage.getItem('token')).toBe('jwt-token');
  });

  it('affiche le message du serveur quand la connexion échoue en cas de mauvais identifiants', async () => {
    const user = userEvent.setup();
    
    mockedPost.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: 'Email ou mot de passe invalide' } },
    });

    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'user@test.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Email ou mot de passe invalide')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('affiche un message générique quand la connexion échoue sans réponse serveur', async () => {
    const user = userEvent.setup();

    mockedPost.mockRejectedValueOnce(new Error('network down'));

    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'user@test.com');
    await user.type(screen.getByLabelText('Password'), 'test!1234');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Login failed')).toBeInTheDocument();
  });

  it('bloque la soumission si le mot de passe obligatoire est vide', async () => {
    const user = userEvent.setup();

    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'user@test.com');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(mockedPost).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Password')).toBeInvalid();
  });
});
