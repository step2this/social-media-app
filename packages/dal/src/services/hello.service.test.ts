import { describe, it, expect } from 'vitest';
import { createHelloService } from './hello.service';

describe('HelloService', () => {
  const mockTimeProvider = () => '2024-01-01T00:00:00.000Z';

  describe('generateHelloResponse', () => {
    it('should generate response with provided name', () => {
      const service = createHelloService({ timeProvider: mockTimeProvider });
      const request = { name: 'John' };

      const response = service.generateHelloResponse(request);

      expect(response.message).toBe('Hello John!');
      expect(response.name).toBe('John');
      expect(response.serverTime).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should use provided timestamp when available', () => {
      const service = createHelloService({ timeProvider: mockTimeProvider });
      const providedTimestamp = '2023-12-01T00:00:00.000Z';
      const request = { name: 'Jane', timestamp: providedTimestamp };

      const response = service.generateHelloResponse(request);

      expect(response.timestamp).toBe(providedTimestamp);
      expect(response.serverTime).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should use time provider for timestamp when not provided', () => {
      const service = createHelloService({ timeProvider: mockTimeProvider });
      const request = { name: 'Bob' };

      const response = service.generateHelloResponse(request);

      expect(response.timestamp).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should work with default name', () => {
      const service = createHelloService({ timeProvider: mockTimeProvider });
      const request = { name: 'World' };

      const response = service.generateHelloResponse(request);

      expect(response.message).toBe('Hello World!');
    });
  });
});