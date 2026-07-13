import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Sessions from './Sessions';
import api from '../services/api';
import type { Session } from '../types';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedGet = vi.mocked(api.get);
const mockedDelete = vi.mocked(api.delete);

function seedUser(admin: boolean) {
  const identity = admin
    ? { id: 1, email: 'yoga@studio.com', firstName: 'Admin', lastName: 'Yoga' }
    : { id: 2, email: 'user@test.com', firstName: 'John', lastName: 'Doe' };
  localStorage.setItem('token', 'jwt-token');
  localStorage.setItem('user', JSON.stringify({ ...identity, admin, token: 'jwt-token' }));
}

const sessions: Session[] = [
  {
    id: 10,
    name: 'Yoga du matin',
    date: '2026-08-01T00:00:00.000Z',
    description: 'Une séance douce pour bien démarrer.',
    teacher: { id: 1, firstName: 'Margot', lastName: 'Delahaye' },
    users: [2, 3],
  },
];

function renderSessions() {
  return render(
    <MemoryRouter>
      <Sessions />
    </MemoryRouter>
  );
}

describe('Sessions page', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('affiche le sessions et les actions admin Create/Delete quand le user est un administrateur', async () => {
    seedUser(true);

    mockedGet.mockResolvedValueOnce({ data: sessions });

    renderSessions();

    expect(await screen.findByText('Yoga du matin')).toBeInTheDocument();
    expect(screen.getByText('Teacher: Margot Delahaye')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create Session' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it("masque les boutons Create/Delete pour un utilisateur non admin", async () => {
    seedUser(false);
    mockedGet.mockResolvedValueOnce({ data: sessions });

    renderSessions();

    expect(await screen.findByText('Yoga du matin')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create Session' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Details' })).toBeInTheDocument();
  });

  it("affiche un message quand aucune session n'est disponible", async () => {
    seedUser(false);

    mockedGet.mockResolvedValueOnce({ data: [] });

    renderSessions();

    expect(await screen.findByText('No sessions available')).toBeInTheDocument();
  });

  it('affiche un message d\' erreur si le chargement des sessions échoue', async () => {
    seedUser(false);

    mockedGet.mockRejectedValueOnce(new Error('network down'));

    renderSessions();

    expect(await screen.findByText('Failed to load sessions')).toBeInTheDocument();
  });

  it('supprime une session après confirmation de la suppression par l\'administrateur', async () => {
    const user = userEvent.setup();

    seedUser(true);

    mockedGet.mockResolvedValueOnce({ data: sessions }).mockResolvedValueOnce({ data: [] });
    
    mockedDelete.mockResolvedValueOnce({});
    
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderSessions();

    await screen.findByText('Yoga du matin');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(mockedDelete).toHaveBeenCalledWith('/session/10', {
      headers: { Authorization: 'Bearer jwt-token' },
    });

    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));
  });

  it("ne supprime pas la session quand l\'administrateur annule la confirmation", async () => {
    const user = userEvent.setup();

    seedUser(true);

    mockedGet.mockResolvedValueOnce({ data: sessions });

    vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderSessions();

    await screen.findByText('Yoga du matin');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(mockedDelete).not.toHaveBeenCalled();
  });
});
