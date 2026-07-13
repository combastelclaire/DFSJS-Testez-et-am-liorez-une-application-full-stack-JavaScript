import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoutes } from '../test/test-utils';
import Register from './Register';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockedPost = vi.mocked(api.post);

function renderRegister() {
  return renderRoutes(
    [
      { path: '/register', element: <Register /> },
      { path: '/sessions', element: <div>Page Sessions</div> },
    ],
    ['/register']
  );
}

async function remplirFormulaireValide(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('First Name'), 'Sophie');
  await user.type(screen.getByLabelText('Last Name'), 'Bonheur');
  await user.type(screen.getByLabelText('Email'), 'sophie.bonheur@test.com');
  await user.type(screen.getByLabelText('Password'), 'test!1234');
}

describe('Register page', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('crée le compte utilisateur avec les données saisies puis redirige vers /sessions', async () => {
    const user = userEvent.setup();

    mockedPost.mockResolvedValueOnce({
      data: { id: 2, email: 'sophie.bonheur@test.com', firstName: 'Sophie', lastName: 'Bonheur', admin: false, token: 'jwt-token' },
    });

    renderRegister();

    await remplirFormulaireValide(user);
    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(mockedPost).toHaveBeenCalledWith('/auth/register', {
      firstName: 'Sophie',
      lastName: 'Bonheur',
      email: 'sophie.bonheur@test.com',
      password: 'test!1234',
    });

    await waitFor(() => expect(screen.getByText('Page Sessions')).toBeInTheDocument());
    expect(localStorage.getItem('token')).toBe('jwt-token');
  });

  it("affiche le message serveur quand l\'inscription échoue avec un email déjà utilisé", async () => {
    const user = userEvent.setup();

    mockedPost.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: 'Email déjà utilisé' } },
    });

    renderRegister();

    await remplirFormulaireValide(user);
    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByText('Email déjà utilisé')).toBeInTheDocument();
  });

  it("affiche un message générique quand l\'inscription échoue sans réponse serveur", async () => {
    const user = userEvent.setup();
    mockedPost.mockRejectedValueOnce(new Error('network down'));

    renderRegister();

    await remplirFormulaireValide(user);
    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByText('Registration failed')).toBeInTheDocument();
  });

  it('bloque la soumission si un champ obligatoire est vide', async () => {
    const user = userEvent.setup();

    renderRegister();
    
    await user.type(screen.getByLabelText('First Name'), 'Sophie');
    await user.type(screen.getByLabelText('Last Name'), 'Bonheur');
    await user.type(screen.getByLabelText('Email'), 'sophie.bonheur@test.com');
    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(mockedPost).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Password')).toBeInvalid();
  });
});
