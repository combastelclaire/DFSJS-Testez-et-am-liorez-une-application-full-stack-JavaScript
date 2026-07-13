import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoutes } from '../test/test-utils';
import SessionDetail from './SessionDetail';
import api from '../services/api';
import type { Session } from '../types';

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

function seedUser(userId: number, admin: boolean) {
  const identity = admin
    ? { email: 'yoga@studio.com', firstName: 'Admin', lastName: 'Yoga' }
    : { email: 'user@test.com', firstName: 'John', lastName: 'Doe' };
  localStorage.setItem('token', 'jwt-token');
  localStorage.setItem('user', JSON.stringify({ id: userId, ...identity, admin, token: 'jwt-token' }));
}

const session: Session = {
  id: 10,
  name: 'Yoga du matin',
  date: '2026-08-01T00:00:00.000Z',
  description: 'Une séance douce pour bien démarrer.',
  teacher: { id: 1, firstName: 'Margot', lastName: 'Delahaye' },
  users: [2, 3],
};

function renderSessionDetail() {
  return renderRoutes(
    [
      { path: '/sessions/:id', element: <SessionDetail /> },
      { path: '/sessions', element: <div>Page Sessions</div> },
    ],
    ['/sessions/10']
  );
}

describe('SessionDetail page', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('affiche les informations de la session chargée depuis l\'API', async () => {
    seedUser(99, false);
    mockedGet.mockResolvedValueOnce({ data: session });

    renderSessionDetail();

    expect(await screen.findByRole('heading', { name: 'Yoga du matin' })).toBeInTheDocument();
    expect(screen.getByText(/Margot Delahaye/)).toBeInTheDocument();
    expect(screen.getByText('Participants:').closest('p')?.textContent).toContain('2');
    expect(screen.getByText('Une séance douce pour bien démarrer.')).toBeInTheDocument();
  });

  it("inscrit l\'utilisateur à la session quand il ne participe pas encore", async () => {
    const user = userEvent.setup();

    seedUser(99, false);

    mockedGet.mockResolvedValueOnce({ data: session }).mockResolvedValueOnce({ data: { ...session, users: [2, 3, 99] } });
    mockedPost.mockResolvedValueOnce({});

    renderSessionDetail();
    await screen.findByRole('heading', { name: 'Yoga du matin' });

    await user.click(screen.getByRole('button', { name: 'Join Session' }));

    expect(mockedPost).toHaveBeenCalledWith(
      '/session/10/participate/99',
      {},
      { headers: { Authorization: 'Bearer jwt-token' } }
    );

    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));
  });

  it('désinscrit l\'utilisateur de la session quand il participe déjà', async () => {
    const user = userEvent.setup();

    seedUser(2, false);

    mockedGet.mockResolvedValueOnce({ data: session }).mockResolvedValueOnce({ data: { ...session, users: [3] } });
    mockedDelete.mockResolvedValueOnce({});

    renderSessionDetail();
    await screen.findByRole('heading', { name: 'Yoga du matin' });

    await user.click(screen.getByRole('button', { name: 'Leave Session' }));

    expect(mockedDelete).toHaveBeenCalledWith('/session/10/participate/2', {
      headers: { Authorization: 'Bearer jwt-token' },
    });

    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));
  });

  it('affiche Edit et Delete à un administrateur, et supprime après confirmation', async () => {
    const user = userEvent.setup();

    seedUser(1, true);

    mockedGet.mockResolvedValueOnce({ data: session });
    mockedDelete.mockResolvedValueOnce({});

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderSessionDetail();

    await screen.findByRole('heading', { name: 'Yoga du matin' });

    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(mockedDelete).toHaveBeenCalledWith('/session/10', {
      headers: { Authorization: 'Bearer jwt-token' },
    });

    await waitFor(() => expect(screen.getByText('Page Sessions')).toBeInTheDocument());
  });

  it("n'appelle pas l'API de suppressionsi l'administrateur annule la confirmation de suppression", async () => {
    const user = userEvent.setup();

    seedUser(1, true);

    mockedGet.mockResolvedValueOnce({ data: session });
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderSessionDetail();

    await screen.findByRole('heading', { name: 'Yoga du matin' });

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it('affiche un message d\'erreur si le chargement de la session échoue', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    seedUser(99, false);
    
    mockedGet.mockRejectedValueOnce(new Error('network down'));

    renderSessionDetail();

    expect(await screen.findByText('Failed to load session details')).toBeInTheDocument();
  });
});
