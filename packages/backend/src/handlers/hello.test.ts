import { describe, it, expect } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler } from './hello';

describe('Hello Lambda Handler', () => {
  const createMockEvent = (body?: any): APIGatewayProxyEventV2 => ({
    version: '2.0',
    routeKey: 'POST /hello',
    rawPath: '/hello',
    rawQueryString: '',
    headers: {
      'content-type': 'application/json'
    },
    requestContext: {
      accountId: '123456789',
      apiId: 'test-api',
      domainName: 'test.execute-api.us-east-1.amazonaws.com',
      domainPrefix: 'test',
      http: {
        method: 'POST',
        path: '/hello',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test'
      },
      requestId: 'test-request-id',
      routeKey: 'POST /hello',
      stage: '$default',
      time: '01/Jan/2024:00:00:00 +0000',
      timeEpoch: 1704067200000
    },
    body: body ? JSON.stringify(body) : undefined,
    isBase64Encoded: false
  });

  it('should return hello response with provided name', async () => {
    const event = createMockEvent({ name: 'John' });

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(response.headers?.['Content-Type']).toBe('application/json');

    const body = JSON.parse(response.body || '{}');
    expect(body.message).toBe('Hello John!');
    expect(body.name).toBe('John');
    expect(body.serverTime).toBeDefined();
  });

  it('should use default name when not provided', async () => {
    const event = createMockEvent({});

    const response = await handler(event);

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body || '{}');
    expect(body.message).toBe('Hello World!');
    expect(body.name).toBe('World');
  });

  it('should handle empty body', async () => {
    const event = createMockEvent();

    const response = await handler(event);

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body || '{}');
    expect(body.message).toBe('Hello World!');
  });

  it('should return 400 for invalid request', async () => {
    const event = createMockEvent({ name: 'a'.repeat(101) });

    const response = await handler(event);

    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body || '{}');
    expect(body.error).toBe('Validation failed');
    expect(body.details).toBeDefined();
  });

  it('should handle malformed JSON', async () => {
    const event = createMockEvent();
    event.body = '{ invalid json }';

    const response = await handler(event);

    expect(response.statusCode).toBe(500);

    const body = JSON.parse(response.body || '{}');
    expect(body.error).toBe('Internal server error');
  });
});