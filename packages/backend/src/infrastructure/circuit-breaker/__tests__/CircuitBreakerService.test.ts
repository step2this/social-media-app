import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CircuitBreakerService,
  CircuitState,
} from '../CircuitBreakerService.js';

/**
 * CircuitBreakerService Unit Tests
 *
 * Tests circuit breaker functionality, state transitions, and metrics.
 */
describe('CircuitBreakerService', () => {
  let breaker: CircuitBreakerService;

  beforeEach(() => {
    breaker = new CircuitBreakerService({
      name: 'test-breaker',
      timeout: 100,
      errorThresholdPercentage: 50,
      resetTimeout: 200,
      enableMetrics: true,
    });
  });

  describe('Basic Protection', () => {
    it('should successfully execute protected function', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const protectedFn = breaker.protect(mockFn);

      const result = await protectedFn('arg1');

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledWith('arg1');
    });

    it('should handle multiple arguments', async () => {
      const mockFn = vi
        .fn()
        .mockImplementation((a: string, b: number) => Promise.resolve(a + b));
      const protectedFn = breaker.protect(mockFn);

      const result = await protectedFn('test', 123);

      expect(result).toBe('test123');
      expect(mockFn).toHaveBeenCalledWith('test', 123);
    });

    it('should propagate errors from protected function', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Test error'));
      const protectedFn = breaker.protect(mockFn);

      await expect(protectedFn()).rejects.toThrow('Test error');
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout slow functions', async () => {
      const slowFn = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve('late'), 300);
          })
      );

      const protectedFn = breaker.protect(slowFn);

      await expect(protectedFn()).rejects.toThrow();

      const metrics = breaker.getMetrics();
      expect(metrics.timeoutCount).toBeGreaterThan(0);
    }, 10000);

    it('should not timeout fast functions', async () => {
      const fastFn = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve('fast'), 10);
          })
      );

      const protectedFn = breaker.protect(fastFn);

      const result = await protectedFn();

      expect(result).toBe('fast');
      const metrics = breaker.getMetrics();
      expect(metrics.timeoutCount).toBe(0);
    });
  });

  describe('Metrics Tracking', () => {
    it('should track successful requests', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const protectedFn = breaker.protect(mockFn);

      await protectedFn();
      await protectedFn();
      await protectedFn();

      const metrics = breaker.getMetrics();
      expect(metrics.successCount).toBe(3);
      expect(metrics.failureCount).toBe(0);
      expect(metrics.totalRequests).toBe(3);
    });

    it('should track failed requests', async () => {
      // Use high threshold to prevent circuit opening during test
      const testBreaker = new CircuitBreakerService({
        name: 'failure-test',
        timeout: 100,
        errorThresholdPercentage: 90, // High threshold
        resetTimeout: 200,
      });

      const mockFn = vi.fn().mockRejectedValue(new Error('Fail'));
      const protectedFn = testBreaker.protect(mockFn);

      await protectedFn().catch(() => {});
      await protectedFn().catch(() => {});

      const metrics = testBreaker.getMetrics();
      expect(metrics.failureCount).toBeGreaterThanOrEqual(1);
      expect(metrics.totalRequests).toBeGreaterThanOrEqual(2);
    });

    it('should calculate failure rate correctly', async () => {
      const mockFn = vi
        .fn()
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('Fail'))
        .mockRejectedValueOnce(new Error('Fail'));

      const protectedFn = breaker.protect(mockFn);

      await protectedFn(); // Success
      await protectedFn().catch(() => {}); // Fail
      await protectedFn().catch(() => {}); // Fail

      const metrics = breaker.getMetrics();
      expect(metrics.successCount).toBe(1);
      expect(metrics.failureCount).toBe(2);
      expect(metrics.failureRate).toBeCloseTo(2 / 3, 2);
    });

    it('should track average response time', async () => {
      const mockFn = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve('done'), 10);
          })
      );

      const protectedFn = breaker.protect(mockFn);

      await protectedFn();
      await protectedFn();

      const metrics = breaker.getMetrics();
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('Circuit State Management', () => {
    it('should start in CLOSED state', () => {
      const metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.CLOSED);
    });

    it('should open circuit after error threshold', async () => {
      // Create breaker with low threshold for testing
      const testBreaker = new CircuitBreakerService({
        name: 'threshold-test',
        timeout: 100,
        errorThresholdPercentage: 50, // 50% failure rate
        resetTimeout: 1000,
        rollingCountBuckets: 5,
      });

      const failingFn = vi.fn().mockRejectedValue(new Error('Fail'));
      const protectedFn = testBreaker.protect(failingFn);

      // Generate enough failures to open circuit
      for (let i = 0; i < 10; i++) {
        await protectedFn().catch(() => {});
      }

      const metrics = testBreaker.getMetrics();
      expect(metrics.circuitOpenCount).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const defaultBreaker = new CircuitBreakerService();
      const metrics = defaultBreaker.getMetrics();

      expect(metrics.name).toBe('default');
    });

    it('should use custom configuration', () => {
      const customBreaker = new CircuitBreakerService({
        name: 'custom',
        timeout: 5000,
        errorThresholdPercentage: 75,
      });

      const metrics = customBreaker.getMetrics();
      expect(metrics.name).toBe('custom');
    });
  });

  describe('Metrics Reset', () => {
    it('should reset metrics', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const protectedFn = breaker.protect(mockFn);

      await protectedFn();
      await protectedFn();

      let metrics = breaker.getMetrics();
      expect(metrics.successCount).toBe(2);

      breaker.resetMetrics();

      metrics = breaker.getMetrics();
      expect(metrics.successCount).toBe(0);
      expect(metrics.failureCount).toBe(0);
      expect(metrics.totalRequests).toBe(0);
    });
  });

  describe('Type Safety', () => {
    it('should preserve return type', async () => {
      interface User {
        id: string;
        name: string;
      }

      const getUserFn = vi
        .fn()
        .mockResolvedValue({ id: '123', name: 'Test User' });
      const protectedGetUser = breaker.protect(getUserFn);

      const user: User = await protectedGetUser();

      expect(user.id).toBe('123');
      expect(user.name).toBe('Test User');
    });

    it('should preserve parameter types', async () => {
      const addFn = vi
        .fn()
        .mockImplementation((a: number, b: number) =>
          Promise.resolve(a + b)
        );
      const protectedAdd = breaker.protect(addFn);

      const result = await protectedAdd(5, 3);

      expect(result).toBe(8);
    });
  });

  describe('Error Messages', () => {
    it('should include circuit breaker name in logs', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const namedBreaker = new CircuitBreakerService({
        name: 'database-calls',
        enableMetrics: true,
      });

      const mockFn = vi.fn().mockResolvedValue('success');
      const protectedFn = namedBreaker.protect(mockFn);

      await protectedFn();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CircuitBreaker:database-calls]')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Environment Configuration', () => {
    it('should create breaker from environment variables', async () => {
      // Mock environment variables
      const originalTimeout = process.env.CIRCUIT_BREAKER_TIMEOUT;
      const originalThreshold = process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD;
      const originalReset = process.env.CIRCUIT_BREAKER_RESET_TIMEOUT;

      process.env.CIRCUIT_BREAKER_TIMEOUT = '5000';
      process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD = '60';
      process.env.CIRCUIT_BREAKER_RESET_TIMEOUT = '60000';

      const { createCircuitBreakerServiceFromEnv } = await import('../CircuitBreakerService.js');
      const envBreaker = createCircuitBreakerServiceFromEnv('env-test');

      const metrics = envBreaker.getMetrics();
      expect(metrics.name).toBe('env-test');

      // Restore original environment
      if (originalTimeout) process.env.CIRCUIT_BREAKER_TIMEOUT = originalTimeout;
      else delete process.env.CIRCUIT_BREAKER_TIMEOUT;

      if (originalThreshold)
        process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD = originalThreshold;
      else delete process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD;

      if (originalReset)
        process.env.CIRCUIT_BREAKER_RESET_TIMEOUT = originalReset;
      else delete process.env.CIRCUIT_BREAKER_RESET_TIMEOUT;
    });
  });
});
