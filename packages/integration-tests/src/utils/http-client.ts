/**
 * HTTP Client for Integration Tests
 * Provides a clean interface for making API calls to the backend
 */

import { z } from 'zod';

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
}

/**
 * HTTP response wrapper
 */
export interface HttpResponse<T = any> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

/**
 * HTTP client error
 */
export class HttpClientError extends Error {
  constructor(
    public status: number,
    public data: any,
    message?: string
  ) {
    super(message || `HTTP ${status} Error`);
    this.name = 'HttpClientError';
  }
}

/**
 * HTTP Client for making API requests
 */
export class HttpClient {
  private config: Required<HttpClientConfig>;

  constructor(config: HttpClientConfig) {
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ''), // Remove trailing slash
      defaultHeaders: config.defaultHeaders || {},
      timeout: config.timeout || 10000
    };
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    method: string,
    path: string,
    options: {
      body?: any;
      headers?: Record<string, string>;
      timeout?: number;
    } = {}
  ): Promise<HttpResponse<T>> {
    const url = `${this.config.baseUrl}${path}`;

    const headers = {
      'Content-Type': 'application/json',
      ...this.config.defaultHeaders,
      ...options.headers
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.config.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let data: any;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw new HttpClientError(response.status, data, `HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        status: response.status,
        data,
        headers: responseHeaders
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof HttpClientError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${options.timeout || this.config.timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(path: string, options?: { headers?: Record<string, string>; timeout?: number }): Promise<HttpResponse<T>> {
    return this.request<T>('GET', path, options);
  }

  /**
   * POST request
   */
  async post<T>(
    path: string,
    body?: any,
    options?: { headers?: Record<string, string>; timeout?: number }
  ): Promise<HttpResponse<T>> {
    return this.request<T>('POST', path, { ...options, body });
  }

  /**
   * PUT request
   */
  async put<T>(
    path: string,
    body?: any,
    options?: { headers?: Record<string, string>; timeout?: number }
  ): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', path, { ...options, body });
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string, options?: { headers?: Record<string, string>; timeout?: number }): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', path, options);
  }

  /**
   * Set authorization header for subsequent requests
   */
  setAuthToken(token: string): void {
    this.config.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear authorization header
   */
  clearAuthToken(): void {
    delete this.config.defaultHeaders['Authorization'];
  }

  /**
   * Create a new client with additional headers
   */
  withHeaders(headers: Record<string, string>): HttpClient {
    return new HttpClient({
      ...this.config,
      defaultHeaders: {
        ...this.config.defaultHeaders,
        ...headers
      }
    });
  }
}

/**
 * Factory function to create HTTP client for LocalStack development
 */
export function createLocalStackHttpClient(): HttpClient {
  return new HttpClient({
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
    timeout: 15000
  });
}

/**
 * Helper to parse and validate HTTP response data
 */
export async function parseResponse<T>(
  response: HttpResponse,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    return schema.parse(response.data);
  } catch (error) {
    throw new Error(`Response validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}