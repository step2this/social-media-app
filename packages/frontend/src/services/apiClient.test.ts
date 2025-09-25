import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './apiClient';

// Expected API base URL for tests - should match the apiClient's default
const EXPECTED_API_BASE_URL = 'http://localhost:3001';

describe('apiClient HTTP Methods with Token Authentication', () => {
  const createMockStorage = (hasToken = true) => ({
    getItem: vi.fn().mockReturnValue(
      hasToken
        ? JSON.stringify({
            state: {
              tokens: {
                accessToken: 'test-access-token',
                refreshToken: 'test-refresh-token'
              }
            }
          })
        : null
    )
  });

  const mockLocalStorage = (hasToken = true) => {
    Object.defineProperty(window, 'localStorage', {
      value: createMockStorage(hasToken),
      configurable: true
    });
  };

  beforeEach(() => {
    // Mock fetch globally
    global.fetch = vi.fn();
  });

  describe('HTTP Methods Availability', () => {
    it('should have all generic HTTP methods available', () => {
      expect(typeof apiClient.get).toBe('function');
      expect(typeof apiClient.post).toBe('function');
      expect(typeof apiClient.put).toBe('function');
      expect(typeof apiClient.patch).toBe('function');
      expect(typeof apiClient.delete).toBe('function');
    });

    it('should have auth methods available', () => {
      expect(typeof apiClient.auth.register).toBe('function');
      expect(typeof apiClient.auth.login).toBe('function');
      expect(typeof apiClient.auth.logout).toBe('function');
      expect(typeof apiClient.auth.refreshToken).toBe('function');
      expect(typeof apiClient.auth.getProfile).toBe('function');
      expect(typeof apiClient.auth.updateProfile).toBe('function');
    });
  });

  describe('Token Injection', () => {
    it('should automatically include auth token in GET requests by default', async () => {
      mockLocalStorage(true);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' })
      });

      await apiClient.get('/test-endpoint');

      expect(global.fetch).toHaveBeenCalledWith(
        `${EXPECTED_API_BASE_URL}/test-endpoint`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token'
          })
        })
      );
    });

    it('should automatically include auth token in POST requests by default', async () => {
      mockLocalStorage(true);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await apiClient.post('/test-endpoint', { data: 'test' });

      expect(global.fetch).toHaveBeenCalledWith(
        `${EXPECTED_API_BASE_URL}/test-endpoint`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ data: 'test' }),
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token'
          })
        })
      );
    });

    it('should not include auth token when includeAuth is false', async () => {
      mockLocalStorage(true);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' })
      });

      await apiClient.get('/public-endpoint', false);

      expect(global.fetch).toHaveBeenCalledWith(
        `${EXPECTED_API_BASE_URL}/public-endpoint`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String)
          })
        })
      );
    });

    it('should work with PUT requests', async () => {
      mockLocalStorage(true);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ updated: true })
      });

      await apiClient.put('/test-endpoint', { field: 'value' });

      expect(global.fetch).toHaveBeenCalledWith(
        `${EXPECTED_API_BASE_URL}/test-endpoint`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ field: 'value' }),
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token'
          })
        })
      );
    });

    it('should work with DELETE requests', async () => {
      mockLocalStorage(true);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deleted: true })
      });

      await apiClient.delete('/test-endpoint');

      expect(global.fetch).toHaveBeenCalledWith(
        `${EXPECTED_API_BASE_URL}/test-endpoint`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token'
          })
        })
      );
    });

    it('should handle requests without token when none is available', async () => {
      mockLocalStorage(false);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' })
      });

      await apiClient.get('/test-endpoint');

      expect(global.fetch).toHaveBeenCalledWith(
        `${EXPECTED_API_BASE_URL}/test-endpoint`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String)
          })
        })
      );
    });
  });

  describe('HTTP Methods', () => {
    it('should support all HTTP methods', () => {
      expect(typeof apiClient.get).toBe('function');
      expect(typeof apiClient.post).toBe('function');
      expect(typeof apiClient.put).toBe('function');
      expect(typeof apiClient.patch).toBe('function');
      expect(typeof apiClient.delete).toBe('function');
    });

    it('should handle POST requests without data', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await apiClient.post('/test-endpoint');

      expect(global.fetch).toHaveBeenCalledWith(
        `${EXPECTED_API_BASE_URL}/test-endpoint`,
        expect.objectContaining({
          method: 'POST',
          body: undefined
        })
      );
    });
  });
});