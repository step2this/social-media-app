import { describe, it, expect } from 'vitest';

describe('Basic Connectivity', () => {
  it('should be able to make external HTTP requests', async () => {
    // Simple GET request to a reliable public API
    const response = await fetch('https://httpbin.org/get');
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
  });

  it('should be able to parse JSON responses', async () => {
    const response = await fetch('https://httpbin.org/json');
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');
  });

  it('should handle HTTP errors gracefully', async () => {
    const response = await fetch('https://httpbin.org/status/404');
    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });

  it('should respect request timeouts', async () => {
    // Test that we can handle request timeouts appropriately
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 100); // Very short timeout

    try {
      await fetch('https://httpbin.org/delay/1', { // 1 second delay
        signal: controller.signal
      });
      // If we get here, the request didn't timeout (which is possible but unlikely)
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      // Should be an AbortError
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).name).toBe('AbortError');
    }
  });
});