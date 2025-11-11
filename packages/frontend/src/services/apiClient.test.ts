import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './apiClient.js';

// ============================================================================
// Test Setup and Helpers
// ============================================================================

const EXPECTED_API_BASE_URL = 'http://localhost:3001';

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
  ),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
});

const mockLocalStorage = (hasToken = true) => {
  Object.defineProperty(window, 'localStorage', {
    value: createMockStorage(hasToken),
    configurable: true
  });
};

const mockFetchSuccess = (data: unknown) => {
  (global.fetch as any).mockResolvedValueOnce({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: vi.fn().mockResolvedValueOnce(data)
  });
};

const mockFetchError = (status: number, errorData: unknown) => {
  (global.fetch as any).mockResolvedValueOnce({
    ok: false,
    status,
    statusText: 'Error',
    json: vi.fn().mockResolvedValueOnce(errorData)
  });
};

// ============================================================================
// API Client Integration Tests
// ============================================================================

describe('API Client - Integration Tests', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    mockLocalStorage(true);
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

    it('should have health check method available', () => {
      expect(typeof apiClient.healthCheck).toBe('function');
    });
  });

  describe('Token Authentication Integration', () => {
    describe('GET requests', () => {
      it('should automatically include auth token by default', async () => {
        mockFetchSuccess({ data: 'test' });

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

      it('should not include auth token when includeAuth is false', async () => {
        mockFetchSuccess({ data: 'test' });

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

      it('should handle requests without token when none is available', async () => {
        mockLocalStorage(false);
        mockFetchSuccess({ data: 'test' });

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

    describe('POST requests', () => {
      it('should automatically include auth token by default', async () => {
        mockFetchSuccess({ success: true });

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

      it('should handle POST requests without data', async () => {
        mockFetchSuccess({ success: true });

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

    describe('PUT requests', () => {
      it('should include auth token and serialize body', async () => {
        mockFetchSuccess({ updated: true });

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
    });

    describe('PATCH requests', () => {
      it('should include auth token and serialize body', async () => {
        mockFetchSuccess({ patched: true });

        await apiClient.patch('/test-endpoint', { field: 'updated' });

        expect(global.fetch).toHaveBeenCalledWith(
          `${EXPECTED_API_BASE_URL}/test-endpoint`,
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ field: 'updated' }),
            headers: expect.objectContaining({
              'Authorization': 'Bearer test-access-token'
            })
          })
        );
      });
    });

    describe('DELETE requests', () => {
      it('should include auth token', async () => {
        mockFetchSuccess({ deleted: true });

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

      it('should include body when provided', async () => {
        mockFetchSuccess({ deleted: true });

        await apiClient.delete('/test-endpoint', { id: 123 });

        expect(global.fetch).toHaveBeenCalledWith(
          `${EXPECTED_API_BASE_URL}/test-endpoint`,
          expect.objectContaining({
            method: 'DELETE',
            body: JSON.stringify({ id: 123 })
          })
        );
      });
    });
  });

  describe('Response Handling', () => {
    it('should parse and return successful JSON responses', async () => {
      const responseData = { success: true, data: 'test' };
      mockFetchSuccess(responseData);

      const result = await apiClient.get('/test');

      expect(result).toEqual(responseData);
    });

    it('should throw error for failed requests', async () => {
      // Use 400 error which doesn't trigger retries (unlike 500)
      mockFetchError(400, { error: 'Bad request' });

      await expect(apiClient.get('/test')).rejects.toThrow();
    });
  });

  describe('Request URL Construction', () => {
    it('should construct correct URL with base URL and endpoint', async () => {
      mockFetchSuccess({ data: 'test' });

      await apiClient.get('/api/users');

      expect(global.fetch).toHaveBeenCalledWith(
        `${EXPECTED_API_BASE_URL}/api/users`,
        expect.any(Object)
      );
    });
  });

  describe('Headers Management', () => {
    it('should include Content-Type header', async () => {
      mockFetchSuccess({ success: true });

      await apiClient.post('/test', { data: 'test' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });
  });
});
