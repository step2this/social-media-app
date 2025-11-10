import CircuitBreaker from 'opossum';

/**
 * Circuit Breaker Configuration
 */
export interface CircuitBreakerConfig {
  /**
   * Timeout in milliseconds
   * @default 3000
   */
  timeout?: number;

  /**
   * Error threshold percentage (0-100)
   * When this percentage of requests fail, circuit opens
   * @default 50
   */
  errorThresholdPercentage?: number;

  /**
   * Reset timeout in milliseconds
   * How long to wait before attempting to close circuit
   * @default 30000
   */
  resetTimeout?: number;

  /**
   * Rolling count timeout in milliseconds
   * Time window for error counting
   * @default 10000
   */
  rollingCountTimeout?: number;

  /**
   * Number of requests to sample in rolling window
   * @default 10
   */
  rollingCountBuckets?: number;

  /**
   * Name for this circuit breaker (for metrics)
   * @default 'default'
   */
  name?: string;

  /**
   * Enable metrics tracking
   * @default true
   */
  enableMetrics?: boolean;
}

/**
 * Circuit Breaker State
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit Breaker Metrics
 */
export interface CircuitBreakerMetrics {
  name: string;
  state: CircuitState;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  circuitOpenCount: number;
  totalRequests: number;
  failureRate: number;
  averageResponseTime: number;
}

/**
 * Circuit Breaker Service
 *
 * Provides circuit breaker functionality using Opossum to prevent
 * cascade failures when downstream services are failing.
 *
 * **Circuit States:**
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Circuit tripped, requests fail fast without calling function
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 *
 * **When to use:**
 * - External API calls
 * - Database operations
 * - Any operation that might hang or fail repeatedly
 */
export class CircuitBreakerService {
  private readonly config: Required<CircuitBreakerConfig>;
  private metrics: Omit<CircuitBreakerMetrics, 'state' | 'failureRate'>;
  private responseTimes: number[] = [];

  constructor(config: CircuitBreakerConfig = {}) {
    this.config = {
      timeout: 3000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
      name: 'default',
      enableMetrics: true,
      ...config,
    };

    this.metrics = {
      name: this.config.name,
      successCount: 0,
      failureCount: 0,
      timeoutCount: 0,
      circuitOpenCount: 0,
      totalRequests: 0,
      averageResponseTime: 0,
    };
  }

  /**
   * Wrap an async function with circuit breaker protection
   *
   * @example
   * ```typescript
   * const breaker = new CircuitBreakerService({ name: 'database' });
   *
   * const protectedFn = breaker.protect(async (userId: string) => {
   *   return await db.getUser(userId);
   * });
   *
   * try {
   *   const user = await protectedFn('user123');
   * } catch (err) {
   *   // Circuit open or function failed
   * }
   * ```
   */
  protect<TArgs extends any[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>
  ): (...args: TArgs) => Promise<TResult> {
    const breaker = new CircuitBreaker(fn, {
      timeout: this.config.timeout,
      errorThresholdPercentage: this.config.errorThresholdPercentage,
      resetTimeout: this.config.resetTimeout,
      rollingCountTimeout: this.config.rollingCountTimeout,
      rollingCountBuckets: this.config.rollingCountBuckets,
      name: this.config.name,
    });

    // Attach event listeners for metrics
    if (this.config.enableMetrics) {
      this.attachEventListeners(breaker);
    }

    // Return the fire method bound to the breaker
    return (...args: TArgs) => breaker.fire(...args);
  }

  /**
   * Attach event listeners to track metrics and log state changes
   */
  private attachEventListeners(breaker: CircuitBreaker): void {
    breaker.on('success', (_result: unknown, latency: number) => {
      this.metrics.successCount++;
      this.metrics.totalRequests++;
      this.trackResponseTime(latency);
      console.log(
        `[CircuitBreaker:${this.config.name}] Success (${latency}ms)`
      );
    });

    breaker.on('failure', (error: Error) => {
      this.metrics.failureCount++;
      this.metrics.totalRequests++;
      console.error(
        `[CircuitBreaker:${this.config.name}] Failure:`,
        error.message
      );
    });

    breaker.on('timeout', () => {
      this.metrics.timeoutCount++;
      this.metrics.totalRequests++;
      console.warn(
        `[CircuitBreaker:${this.config.name}] Timeout after ${this.config.timeout}ms`
      );
    });

    breaker.on('open', () => {
      this.metrics.circuitOpenCount++;
      console.error(
        `[CircuitBreaker:${this.config.name}] ⚠️  Circuit OPENED - failing fast for ${this.config.resetTimeout}ms`
      );
    });

    breaker.on('halfOpen', () => {
      console.log(
        `[CircuitBreaker:${this.config.name}] ⚡ Circuit HALF-OPEN - testing recovery`
      );
    });

    breaker.on('close', () => {
      console.log(
        `[CircuitBreaker:${this.config.name}] ✅ Circuit CLOSED - normal operation restored`
      );
    });

    breaker.on('reject', () => {
      this.metrics.totalRequests++;
      console.warn(
        `[CircuitBreaker:${this.config.name}] Request rejected (circuit open)`
      );
    });

    breaker.on('fallback', (result: unknown) => {
      console.log(
        `[CircuitBreaker:${this.config.name}] Fallback executed:`,
        result
      );
    });
  }

  /**
   * Track response time for averaging
   */
  private trackResponseTime(latency: number): void {
    this.responseTimes.push(latency);

    // Keep only last 100 response times
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }

    // Calculate average
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageResponseTime =
      this.responseTimes.length > 0 ? sum / this.responseTimes.length : 0;
  }

  /**
   * Get current circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const totalRequests = this.metrics.totalRequests || 1; // Avoid division by zero
    const failureRate =
      this.metrics.failureCount / totalRequests;

    // Determine state based on metrics
    const state =
      this.metrics.circuitOpenCount > 0 &&
      this.metrics.failureCount > this.metrics.successCount
        ? CircuitState.OPEN
        : CircuitState.CLOSED;

    return {
      ...this.metrics,
      state,
      failureRate,
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      name: this.config.name,
      successCount: 0,
      failureCount: 0,
      timeoutCount: 0,
      circuitOpenCount: 0,
      totalRequests: 0,
      averageResponseTime: 0,
    };
    this.responseTimes = [];
  }
}

/**
 * Create CircuitBreakerService from environment variables
 */
export function createCircuitBreakerServiceFromEnv(
  name: string
): CircuitBreakerService {
  return new CircuitBreakerService({
    name,
    timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '3000', 10),
    errorThresholdPercentage: parseInt(
      process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD || '50',
      10
    ),
    resetTimeout: parseInt(
      process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000',
      10
    ),
    enableMetrics: true,
  });
}
