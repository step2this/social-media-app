import { describe, it, expect, beforeEach } from 'vitest';
import { HttpClient } from './http-client.js';
import { detectEnvironment } from './environment.js';

describe('HTTP Client', () => {
  let httpClient: HttpClient;
  let environment: ReturnType<typeof detectEnvironment>;

  beforeEach(() => {
    environment = detectEnvironment();
    httpClient = new HttpClient(environment.baseUrl);
  });

  it('should create HTTP client with base URL', () => {
    expect(httpClient).toBeDefined();
    expect(httpClient.baseUrl).toBe(environment.baseUrl);
  });

  it('should make GET requests without authentication', async () => {
    // Use external API for testing (similar to connectivity tests)
    const testClient = new HttpClient('https://httpbin.org');

    const response = await testClient.get('/get');

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
  });

  it('should make POST requests with JSON data', async () => {
    const testClient = new HttpClient('https://httpbin.org');
    const testData = { message: 'test', timestamp: Date.now() };

    const response = await testClient.post('/post', testData);

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.json).toEqual(testData);
  });

  it('should include authentication headers when token provided', async () => {
    const testClient = new HttpClient('https://httpbin.org');
    const testToken = 'test-auth-token-123';

    const response = await testClient.get('/headers', { token: testToken });

    expect(response.ok).toBe(true);
    expect(response.data.headers.Authorization).toBe(`Bearer ${testToken}`);
  });

  it('should handle HTTP errors appropriately', async () => {
    const testClient = new HttpClient('https://httpbin.org');

    const response = await testClient.get('/status/404');

    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
    expect(response.error).toBeDefined();
  });

  it('should handle network errors gracefully', async () => {
    const testClient = new HttpClient('https://invalid-domain-that-does-not-exist-12345.com');

    const response = await testClient.get('/test');

    expect(response.ok).toBe(false);
    expect(response.error).toBeDefined();
    expect(response.error).toContain('Network');
  });

  it('should set appropriate request timeouts', async () => {
    const testClient = new HttpClient('https://httpbin.org', { timeout: 100 });

    const response = await testClient.get('/delay/1'); // 1 second delay

    expect(response.ok).toBe(false);
    expect(response.error).toBeDefined();
    expect(response.error).toContain('timeout');
  });

  it('should support custom headers', async () => {
    const testClient = new HttpClient('https://httpbin.org');
    const customHeaders = { 'X-Test-Header': 'test-value' };

    const response = await testClient.get('/headers', { headers: customHeaders });

    expect(response.ok).toBe(true);
    expect(response.data.headers['X-Test-Header']).toBe('test-value');
  });
});