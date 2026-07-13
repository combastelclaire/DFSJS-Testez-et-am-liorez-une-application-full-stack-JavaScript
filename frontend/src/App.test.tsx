import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import api from './services/api';
import type { Session } from './types';

vi.mock('./services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockedGet = vi.mocked(api.get);

function seedUser(admin: boolean) {
  localStorage.setItem('token', 'jwt-token');
  localStorage.setItem(
    'user',
    JSON.stringify({ id: 1, email: 'user@test.com', firstName: 'John', lastName: 'Doe', admin, token: 'jwt-token' })
  );
}

const sessions: Session[] = [
  {
    id: 10,
    name: 'Yoga du matin',
    date: '2026-08-01T00:00:00.000Z',
    description: 'Une séance douce.',
    teacher: { id: 1, firstName: 'Margot', lastName: 'Delahaye' },
    users: [],
  },
];

describe('App routing', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redirige vers /login quand l'utilisateur n'est pas authentifié", () => {
    window.history.pushState({}, '', '/sessions');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Login to Yoga Studio' })).toBeInTheDocument();
  });

  it('affiche les sessions pour un utilisateur authentifié partant de /', async () => {
    seedUser(false);
    mockedGet.mockResolvedValueOnce({ data: sessions });
    window.history.pushState({}, '', '/');

    render(<App />);

    expect(await screen.findByText('Yoga du matin')).toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledWith('/session', {
      headers: { Authorization: 'Bearer jwt-token' },
      signal: expect.any(AbortSignal),
    });
  });
});
