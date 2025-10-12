/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './get-unread-count.js';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

// Mock dependencies
vi.mock('../../utils/index.js', () => ({
  errorResponse: (status: number, message: string, errors?: any) => ({
    statusCode: status,
    body: JSON.stringify(errors ? { error: message, errors } : { error: message })
  }),
  successResponse: (status: number, data: any) => ({ statusCode: status, body: JSON.stringify(data) }),
  authenticateRequest: vi.fn(async (event: any) => {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return { success: false, statusCode: 401, message: 'Unauthorized' };
    }
    return { success: true, userId: 'test-user-id', payload: { userId: 'test-user-id', email: 'test@example.com', iat: 123, exp: 456 } };
  }),
  initializeNotificationService: vi.fn(() => mockNotificationService),
  handleNotificationError: vi.fn((error: any, context: string) => {
    console.error(`Error ${context}:`, error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  })
}));

// Test helper to create mock event
const createMockEvent = (authHeader?: string): APIGatewayProxyEventV2 => ({
  version: '2.0',
  routeKey: 'GET /notifications/unread-count',
  rawPath: '/notifications/unread-count',
  rawQueryString: '',
  headers: {
    'content-type': 'application/json',
    ...(authHeader && { authorization: authHeader })
  },
  requestContext: {
    requestId: 'test-request-id',
    http: {
      method: 'GET',
      path: '/notifications/unread-count',
      protocol: 'HTTP/1.1',
      sourceIp: '127.0.0.1',
      userAgent: 'test-agent'
    },
    stage: 'test',
    time: '2024-01-01T00:00:00.000Z',
    timeEpoch: 1704067200000,
    domainName: 'api.example.com',
    accountId: '123456789012',
    apiId: 'api123',
    routeKey: 'GET /notifications/unread-count',
    domainPrefix: 'api'
  },
  isBase64Encoded: false
});

const createAuthHeaders = (userId: string) => `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIke userId}In0.test`;

const testUserId = 'test-user-id';
const mockJWT = createAuthHeaders(testUserId);

// Mock DynamoDB client
let mockDynamoClient: any;

// Mock NotificationService
let mockNotificationService: any;

beforeEach(() => {
  mockDynamoClient = {
    send: vi.fn()
  };

  mockNotificationService = {
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    getUnreadCount: vi.fn(),
    deleteNotification: vi.fn()
  };

  vi.clearAllMocks();
});

describe('get-unread-count handler', () => {
  describe('successful retrieval', () => {
    it('should get unread count successfully', async () => {
      const mockCount = 5;
      mockNotificationService.getUnreadCount.mockResolvedValue(mockCount);

      const event = createMockEvent(mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.count).toBe(5);

      expect(mockNotificationService.getUnreadCount).toHaveBeenCalledWith(testUserId);
    });

    it('should return 0 when no unread notifications', async () => {
      const mockCount = 0;
      mockNotificationService.getUnreadCount.mockResolvedValue(mockCount);

      const event = createMockEvent(mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.count).toBe(0);
    });

    it('should return correct count for large number of unread', async () => {
      const mockCount = 150;
      mockNotificationService.getUnreadCount.mockResolvedValue(mockCount);

      const event = createMockEvent(mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.count).toBe(150);
    });

    it('should return count of 1 for single unread notification', async () => {
      const mockCount = 1;
      mockNotificationService.getUnreadCount.mockResolvedValue(mockCount);

      const event = createMockEvent(mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.count).toBe(1);
    });

    it('should call getUnreadCount with correct userId', async () => {
      const mockCount = 10;
      mockNotificationService.getUnreadCount.mockResolvedValue(mockCount);

      const event = createMockEvent(mockJWT);
      await handler(event);

      expect(mockNotificationService.getUnreadCount).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.getUnreadCount).toHaveBeenCalledWith(testUserId);
    });
  });

  describe('authentication', () => {
    it('should return 401 when no auth header provided', async () => {
      const event = createMockEvent();
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 401 when auth header does not start with Bearer', async () => {
      const event = createMockEvent('InvalidToken');
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 401 for invalid token', async () => {
      const { authenticateRequest } = await import('../../utils/index.js');
      vi.mocked(authenticateRequest).mockResolvedValueOnce({ success: false, statusCode: 401, message: 'Unauthorized' });

      const event = createMockEvent(mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should return 401 for expired token', async () => {
      const { authenticateRequest } = await import('../../utils/index.js');
      vi.mocked(authenticateRequest).mockResolvedValueOnce({ success: false, statusCode: 401, message: 'Unauthorized' });

      const event = createMockEvent(mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should return 401 when token missing userId', async () => {
      const { authenticateRequest } = await import('../../utils/index.js');
      vi.mocked(authenticateRequest).mockResolvedValueOnce({ success: false, statusCode: 401, message: 'Invalid token' });

      const event = createMockEvent(mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Invalid token');
    });
  });

  describe('error handling', () => {
    it('should return 500 when NotificationService throws error', async () => {
      mockNotificationService.getUnreadCount.mockRejectedValue(
        new Error('DynamoDB connection failed')
      );

      const event = createMockEvent(mockJWT);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Internal server error');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('response validation', () => {
    it('should return response matching GetUnreadCountResponse schema', async () => {
      const mockCount = 42;
      mockNotificationService.getUnreadCount.mockResolvedValue(mockCount);

      const event = createMockEvent(mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);

      // Validate response structure
      expect(body).toHaveProperty('count');
      expect(typeof body.count).toBe('number');
      expect(body.count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(body.count)).toBe(true);
    });

    it('should return valid response structure with zero count', async () => {
      const mockCount = 0;
      mockNotificationService.getUnreadCount.mockResolvedValue(mockCount);

      const event = createMockEvent(mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);

      expect(body).toEqual({ count: 0 });
    });
  });
});
