/**
 * HTTP Client for Smoke Tests
 * Provides standardized HTTP requests for testing deployed APIs
 */

export interface HttpClientOptions {
  timeout?: number;
}

export interface RequestOptions {
  token?: string;
  headers?: Record<string, string>;
}

export interface HttpResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * HTTP client for making requests to deployed APIs
 * Handles authentication, error handling, and response parsing
 */
export class HttpClient {
  public readonly baseUrl: string;
  private readonly timeout: number;

  constructor(baseUrl: string, options: HttpClientOptions = {}) {
    this.baseUrl = baseUrl;
    this.timeout = options.timeout || 10000; // 10 second default
  }

  /**
   * Make a GET request
   */
  async get<T = any>(path: string, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request('GET', path, undefined, options);
  }

  /**
   * Make a POST request with JSON data
   */
  async post<T = any>(path: string, data?: any, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request('POST', path, data, options);
  }

  /**
   * Make a PUT request with JSON data
   */
  async put<T = any>(path: string, data?: any, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request('PUT', path, data, options);
  }

  /**
   * Make a DELETE request
   */
  async delete<T = any>(path: string, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request('DELETE', path, undefined, options);
  }

  /**
   * Core request method
   */
  private async request<T = any>(
    method: string,
    path: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<HttpResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers
      };

      // Add authentication if token provided
      if (options.token) {
        headers.Authorization = `Bearer ${options.token}`;
      }

      // Make request
      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        fetchOptions.body = JSON.stringify(data);
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      // Parse response
      let responseData: T | undefined;
      try {
        const text = await response.text();
        if (text) {
          responseData = JSON.parse(text);
        }
      } catch {
        // Non-JSON response, that's ok
      }

      if (response.ok) {
        return {
          ok: true,
          status: response.status,
          data: responseData
        };
      } else {
        return {
          ok: false,
          status: response.status,
          data: responseData,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            ok: false,
            status: 0,
            error: 'Request timeout'
          };
        } else if (error.message.includes('fetch')) {
          return {
            ok: false,
            status: 0,
            error: `Network error: ${error.message}`
          };
        } else {
          return {
            ok: false,
            status: 0,
            error: error.message
          };
        }
      }

      return {
        ok: false,
        status: 0,
        error: 'Unknown error occurred'
      };
    }
  }
}