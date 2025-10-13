/**
 * Unit tests for X-Ray tracer utility
 *
 * @description Verifies that tracing functions work correctly and don't break when disabled
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  tracer,
  addTraceAnnotation,
  addTraceMetadata,
  captureTraceError,
  tracedOperation,
  traceCacheOperation,
  traceKinesisPublish,
  traceDynamoDBOperation
} from './tracer.js';

// Mock the AWS Lambda Powertools Tracer
vi.mock('@aws-lambda-powertools/tracer', () => {
  const mockTracer = {
    isTracingEnabled: vi.fn(() => false),
    putAnnotation: vi.fn(),
    putMetadata: vi.fn(),
    addError: vi.fn(),
    getSegment: vi.fn(() => null),
    captureLambdaHandler: vi.fn((handler) => handler),
    captureAWSv3Client: vi.fn((client) => client)
  };

  return {
    Tracer: vi.fn(() => mockTracer)
  };
});

describe('Tracer Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('tracer instance', () => {
    it('should create a tracer instance', () => {
      expect(tracer).toBeDefined();
      expect(tracer.isTracingEnabled).toBeDefined();
      expect(tracer.captureLambdaHandler).toBeDefined();
      expect(tracer.captureAWSv3Client).toBeDefined();
    });

    it('should be disabled in test environment', () => {
      expect(tracer.isTracingEnabled()).toBe(false);
    });
  });

  describe('addTraceAnnotation', () => {
    it('should not throw when tracing is disabled', () => {
      expect(() => {
        addTraceAnnotation('testKey', 'testValue');
      }).not.toThrow();
    });

    it('should handle different value types', () => {
      expect(() => {
        addTraceAnnotation('stringKey', 'value');
        addTraceAnnotation('numberKey', 123);
        addTraceAnnotation('booleanKey', true);
      }).not.toThrow();
    });
  });

  describe('addTraceMetadata', () => {
    it('should not throw when tracing is disabled', () => {
      expect(() => {
        addTraceMetadata('namespace', 'key', { data: 'value' });
      }).not.toThrow();
    });

    it('should handle complex objects', () => {
      expect(() => {
        addTraceMetadata('request', 'body', {
          nested: {
            deeply: {
              value: 'test'
            }
          },
          array: [1, 2, 3]
        });
      }).not.toThrow();
    });
  });

  describe('captureTraceError', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error');
      expect(() => {
        captureTraceError(error);
      }).not.toThrow();
    });

    it('should handle Error objects with context', () => {
      const error = new Error('Test error');
      const context = { operation: 'test', userId: '123' };
      expect(() => {
        captureTraceError(error, context);
      }).not.toThrow();
    });

    it('should handle non-Error objects', () => {
      expect(() => {
        captureTraceError('String error');
        captureTraceError(404);
        captureTraceError({ message: 'Object error' });
      }).not.toThrow();
    });
  });

  describe('tracedOperation', () => {
    it('should execute the function and return result when tracing is disabled', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');

      const result = await tracedOperation('TestOperation', mockFn);

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle async functions that throw errors', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Async error'));

      await expect(
        tracedOperation('TestOperation', mockFn)
      ).rejects.toThrow('Async error');

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle sync functions wrapped in async', async () => {
      const mockFn = vi.fn().mockImplementation(async () => {
        return 42;
      });

      const result = await tracedOperation('TestOperation', mockFn);

      expect(result).toBe(42);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('traceCacheOperation', () => {
    it('should handle get operations', () => {
      expect(() => {
        traceCacheOperation('get', 'cache:key', true);
        traceCacheOperation('get', 'cache:key', false);
      }).not.toThrow();
    });

    it('should handle set operations', () => {
      expect(() => {
        traceCacheOperation('set', 'cache:key');
      }).not.toThrow();
    });

    it('should handle delete operations', () => {
      expect(() => {
        traceCacheOperation('delete', 'cache:key');
      }).not.toThrow();
    });
  });

  describe('traceKinesisPublish', () => {
    it('should not throw when tracing is disabled', () => {
      expect(() => {
        traceKinesisPublish('POST_CREATED', 'event-123', 'user-456');
      }).not.toThrow();
    });
  });

  describe('traceDynamoDBOperation', () => {
    it('should handle operations without details', () => {
      expect(() => {
        traceDynamoDBOperation('GetItem', 'social-media-table');
      }).not.toThrow();
    });

    it('should handle operations with details', () => {
      expect(() => {
        traceDynamoDBOperation('Query', 'social-media-table', {
          pk: 'USER#123',
          sk: 'POST#',
          limit: 20,
          filters: ['isPublic = true']
        });
      }).not.toThrow();
    });
  });

  describe('Integration with Lambda handlers', () => {
    it('should wrap Lambda handler without breaking it', async () => {
      const mockEvent = { body: '{"test": true}' };
      const mockHandler = vi.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({ success: true })
      });

      const wrappedHandler = tracer.captureLambdaHandler(mockHandler);
      const result = await wrappedHandler(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(mockHandler).toHaveBeenCalledWith(mockEvent);
    });

    it('should wrap AWS SDK clients without breaking them', () => {
      const mockClient = {
        send: vi.fn().mockResolvedValue({ Items: [] })
      };

      const wrappedClient = tracer.captureAWSv3Client(mockClient);

      expect(wrappedClient).toBe(mockClient);
      expect(wrappedClient.send).toBeDefined();
    });
  });

  describe('Performance considerations', () => {
    it('should execute operations quickly when disabled', async () => {
      const startTime = performance.now();

      // Run multiple tracing operations
      for (let i = 0; i < 100; i++) {
        addTraceAnnotation(`key${i}`, `value${i}`);
        addTraceMetadata('namespace', `key${i}`, { index: i });
      }

      const duration = performance.now() - startTime;

      // Should complete in under 10ms when disabled
      expect(duration).toBeLessThan(10);
    });

    it('should not create memory leaks', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create many trace operations
      for (let i = 0; i < 1000; i++) {
        addTraceAnnotation(`key${i}`, `value${i}`);
        addTraceMetadata('namespace', `key${i}`, {
          largeData: new Array(100).fill(`data${i}`)
        });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (< 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});