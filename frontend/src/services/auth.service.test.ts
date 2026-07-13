import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import api from './api';
import { authService } from './auth.service';
import type { AuthResponse, LoginCredentials, RegisterData } from '../types';

vi.mock('./api', () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockedPost = vi.mocked(api.post);

const authResponse: AuthResponse = {
  id: 1,
  email: 'user@test.com',
  firstName: 'John',
  lastName: 'Doe',
  admin: false,
  token: 'jwt-token',
};

const credentials: LoginCredentials = {
  email: 'test@mail.com',
  password: 'password123',
};

const registerData: RegisterData = {
  email: 'test@mail.com',
  password: 'password123',
  firstName: 'Sophie',
  lastName: 'Bonheur',
};

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("login enregistre le token et l'utilisateur quand la réponse contient un token", async () => {
    mockedPost.mockResolvedValueOnce({ data: authResponse });

    const result = await authService.login(credentials);

    expect(mockedPost).toHaveBeenCalledWith('/auth/login', credentials);
    expect(result).toEqual(authResponse);
    expect(localStorage.getItem('token')).toBe('jwt-token');
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual(authResponse);
  });

  it("login ne modifie pas le localStorage si la réponse ne contient pas de token", async () => {
    mockedPost.mockResolvedValueOnce({ data: { ...authResponse, token: '' } });

    await authService.login(credentials);

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it("register enregistre le token et l'utilisateur quand la réponse contient un token", async () => {
    mockedPost.mockResolvedValueOnce({ data: authResponse });

    const result = await authService.register(registerData);

    expect(mockedPost).toHaveBeenCalledWith('/auth/register', registerData);
    expect(result).toEqual(authResponse);
    expect(localStorage.getItem('token')).toBe('jwt-token');
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual(authResponse);
  });

  it("register ne modifie pas le localStorage si la réponse ne contient pas de token", async () => {
    mockedPost.mockResolvedValueOnce({ data: { ...authResponse, token: '' } });

    await authService.register(registerData);

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it("logout supprime le token et l'utilisateur du localStorage", () => {
    localStorage.setItem('token', 'jwt-token');
    localStorage.setItem('user', JSON.stringify(authResponse));

    authService.logout();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it("getCurrentUser retourne l'utilisateur stocké dans le localStorage", () => {
    localStorage.setItem('user', JSON.stringify(authResponse));

    expect(authService.getCurrentUser()).toEqual(authResponse);
  });

  it("getCurrentUser retourne null si aucun utilisateur n'est stocké", () => {
    expect(authService.getCurrentUser()).toBeNull();
  });

  it("updateCurrentUser fusionne les changements avec l'utilisateur stocké", () => {
    localStorage.setItem('user', JSON.stringify(authResponse));

    const updated = authService.updateCurrentUser({ admin: true });

    expect(updated).toEqual({ ...authResponse, admin: true });
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual({ ...authResponse, admin: true });
  });

  it("updateCurrentUser retourne null si aucun utilisateur n'est stocké", () => {
    expect(authService.updateCurrentUser({ admin: true })).toBeNull();
  });

  it('getToken retourne null quand aucun token n’est stocké', () => {
    expect(authService.getToken()).toBeNull();
  });

  it('getToken retourne le token stocké dans le localStorage', () => {
    localStorage.setItem('token', 'jwt-token');

    expect(authService.getToken()).toBe('jwt-token');
  });

  it('isAuthenticated retourne false quand aucun token n’est stocké', () => {
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('isAuthenticated retourne true quand un token est stocké', () => {
    localStorage.setItem('token', 'jwt-token');

    expect(authService.isAuthenticated()).toBe(true);
  });
});
