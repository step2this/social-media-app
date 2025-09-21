import type { HelloRequest, HelloResponse } from '@social-media-app/shared';

/**
 * Service for handling hello operations
 */
export const createHelloService = (dependencies: {
  timeProvider: () => string;
}) => ({
  /**
   * Generate a hello response
   */
  generateHelloResponse: (request: Readonly<HelloRequest>): HelloResponse => {
    const timestamp = request.timestamp ?? dependencies.timeProvider();
    const serverTime = dependencies.timeProvider();

    return {
      message: `Hello ${request.name}!`,
      name: request.name,
      timestamp,
      serverTime
    };
  }
});

/**
 * Default hello service instance
 */
export const helloService = createHelloService({
  timeProvider: () => new Date().toISOString()
});