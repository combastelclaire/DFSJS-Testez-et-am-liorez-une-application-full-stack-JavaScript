import { describe, it, expect } from 'vitest';
import api from './api';

describe('api', () => {
  it("configure Axios avec l'URL de base /api", () => {
    expect(api.defaults.baseURL).toBe('/api');
  });

  it('configure Axios avec le header Content-Type JSON par défaut', () => {
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
  });
});
