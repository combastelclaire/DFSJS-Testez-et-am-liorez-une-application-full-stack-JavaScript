import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoutes } from '../test/test-utils';
import SessionForm from './SessionForm';
import api from '../services/api';
import type { Session, Teacher } from '../types';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);
const mockedPut = vi.mocked(api.put);

function seedUser(admin: boolean) {
  const identity = admin
    ? { email: 'yoga@studio.com', firstName: 'Admin', lastName: 'Yoga' }
    : { email: 'user@test.com', firstName: 'John', lastName: 'Doe' };
  localStorage.setItem('token', 'jwt-token');
  localStorage.setItem('user', JSON.stringify({ id: 1, ...identity, admin, token: 'jwt-token' }));
}

const teachers: Teacher[] = [{ id: 1, firstName: 'Margot', lastName: 'Delahaye' }];

const existingSession: Session = {
  id: 10,
  name: 'Yoga du matin',
  date: '2026-08-01T00:00:00.000Z',
  description: 'Une séance douce.',
  teacher: { id: 1, firstName: 'Margot', lastName: 'Delahaye' },
  users: [],
};

function renderCreateForm() {
  return renderRoutes(
    [
      { path: '/sessions/create', element: <SessionForm /> },
      { path: '/sessions', element: <div>Page Sessions</div> },
    ],
    ['/sessions/create']
  );
}

function renderEditForm() {
  return renderRoutes(
    [
      { path: '/sessions/edit/:id', element: <SessionForm /> },
      { path: '/sessions', element: <div>Page Sessions</div> },
    ],
    ['/sessions/edit/10']
  );
}

describe('SessionForm page', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redirige un utilisateur non-admin vers /sessions', async () => {
    seedUser(false);
    mockedGet.mockResolvedValueOnce({ data: teachers });

    renderCreateForm();

    await waitFor(() => expect(screen.getByText('Page Sessions')).toBeInTheDocument());
  });

  it('crée une session avec les données saisies par l\'administrateur', async () => {
    const user = userEvent.setup();
    
    seedUser(true);
    mockedGet.mockResolvedValueOnce({ data: teachers });
    mockedPost.mockResolvedValueOnce({});

    renderCreateForm();

    await screen.findByRole('option', { name: 'Margot Delahaye' });

    await user.type(screen.getByLabelText('Session Name'), 'Yoga du soir');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-09-01' } });
    await user.selectOptions(screen.getByLabelText('Teacher'), '1');
    await user.type(screen.getByLabelText('Description'), 'Une séance relaxante.');

    await user.click(screen.getByRole('button', { name: 'Create Session' }));

    expect(mockedPost).toHaveBeenCalledWith(
      '/session',
      {
        name: 'Yoga du soir',
        date: '2026-09-01',
        teacherId: 1,
        description: 'Une séance relaxante.',
      },
      { headers: { Authorization: 'Bearer jwt-token' } }
    );

    await waitFor(() => expect(screen.getByText('Page Sessions')).toBeInTheDocument());
  });

  it("affiche le message du serveur quand la création échoue avec une réponse API", async () => {
    const user = userEvent.setup();

    seedUser(true);
    mockedGet.mockResolvedValueOnce({ data: teachers });
    mockedPost.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: 'Un créneau existe déjà à cette date' } },
    });

    renderCreateForm();

    await screen.findByRole('option', { name: 'Margot Delahaye' });

    await user.type(screen.getByLabelText('Session Name'), 'Yoga du soir');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-09-01' } });
    await user.selectOptions(screen.getByLabelText('Teacher'), '1');
    await user.type(screen.getByLabelText('Description'), 'Une séance relaxante.');
    await user.click(screen.getByRole('button', { name: 'Create Session' }));

    expect(await screen.findByText('Un créneau existe déjà à cette date')).toBeInTheDocument();
  });

  it("affiche un message générique si la création échoue sans réponse API", async () => {
    const user = userEvent.setup();

    seedUser(true);
    mockedGet.mockResolvedValueOnce({ data: teachers });
    mockedPost.mockRejectedValueOnce(new Error('network down'));

    renderCreateForm();
    await screen.findByRole('option', { name: 'Margot Delahaye' });

    await user.type(screen.getByLabelText('Session Name'), 'Yoga du soir');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-09-01' } });
    await user.selectOptions(screen.getByLabelText('Teacher'), '1');
    await user.type(screen.getByLabelText('Description'), 'Une séance relaxante.');
    await user.click(screen.getByRole('button', { name: 'Create Session' }));

    expect(await screen.findByText('Failed to save session')).toBeInTheDocument();
  });

  it('bloque la création si un champ obligatoire est vide', async () => {
    const user = userEvent.setup();

    seedUser(true);
    mockedGet.mockResolvedValueOnce({ data: teachers });

    renderCreateForm();
    await screen.findByRole('option', { name: 'Margot Delahaye' });

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-09-01' } });
    await user.selectOptions(screen.getByLabelText('Teacher'), '1');
    await user.type(screen.getByLabelText('Description'), 'Une séance relaxante.');
    await user.click(screen.getByRole('button', { name: 'Create Session' }));

    expect(mockedPost).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Session Name')).toBeInvalid();
  });

  it('préremplit le formulaire en mode édition et modifie la session', async () => {
    const user = userEvent.setup();

    seedUser(true);
    mockedGet.mockResolvedValueOnce({ data: teachers }).mockResolvedValueOnce({ data: existingSession });
    mockedPut.mockResolvedValueOnce({});

    renderEditForm();

    expect(await screen.findByDisplayValue('Yoga du matin')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Une séance douce.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Session Name'));
    await user.type(screen.getByLabelText('Session Name'), 'Yoga du matin (modifié)');
    await user.click(screen.getByRole('button', { name: 'Update Session' }));

    expect(mockedPut).toHaveBeenCalledWith(
      '/session/10',
      expect.objectContaining({ name: 'Yoga du matin (modifié)' }),
      { headers: { Authorization: 'Bearer jwt-token' } }
    );
    await waitFor(() => expect(screen.getByText('Page Sessions')).toBeInTheDocument());
  });

  it('redirige vers les sessions quand l’utilisateur clique sur Cancel', async () => {
    const user = userEvent.setup();
  
    seedUser(true);
    mockedGet.mockResolvedValueOnce({ data: teachers });
  
    renderCreateForm();
  
    await screen.findByRole('option', { name: 'Margot Delahaye' });
  
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
  
    expect(screen.getByText('Page Sessions')).toBeInTheDocument();
  });
});
