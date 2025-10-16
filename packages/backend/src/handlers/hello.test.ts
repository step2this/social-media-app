import { describe, it, expect } from 'vitest';
import { createMockAPIGatewayEvent } from '@social-media-app/shared/test-utils';
import { handler } from './hello';

describe('Hello Lambda Handler', () => {

  it('should return hello response with provided name', async () => {
    const event = createMockAPIGatewayEvent({
      body: { name: 'John' },
      method: 'POST',
      path: '/hello',
      routeKey: 'POST /hello'
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(response.headers?.['Content-Type']).toBe('application/json');

    const body = JSON.parse(response.body || '{}');
    expect(body.message).toBe('Hello John!');
    expect(body.name).toBe('John');
    expect(body.serverTime).toBeDefined();
  });

  it('should use default name when not provided', async () => {
    const event = createMockAPIGatewayEvent({
      body: {},
      method: 'POST',
      path: '/hello',
      routeKey: 'POST /hello'
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body || '{}');
    expect(body.message).toBe('Hello World!');
    expect(body.name).toBe('World');
  });

  it('should handle empty body', async () => {
    const event = createMockAPIGatewayEvent({
      method: 'POST',
      path: '/hello',
      routeKey: 'POST /hello'
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body || '{}');
    expect(body.message).toBe('Hello World!');
  });

  it('should return 400 for invalid request', async () => {
    const event = createMockAPIGatewayEvent({
      body: { name: 'a'.repeat(101) },
      method: 'POST',
      path: '/hello',
      routeKey: 'POST /hello'
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body || '{}');
    expect(body.error).toBe('Validation failed');
    expect(body.details).toBeDefined();
  });

  it('should handle malformed JSON', async () => {
    const event = createMockAPIGatewayEvent({
      body: '{ invalid json }',
      method: 'POST',
      path: '/hello',
      routeKey: 'POST /hello'
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body || '{}');
    expect(body.error).toBe('Validation failed');
  });
});