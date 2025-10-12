/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './get-notifications.js';
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
const createMockEvent = (queryParams?: Record<string, string>, authHeader?: string): APIGatewayProxyEventV2 => ({
  version: '2.0',
  routeKey: 'GET /notifications',
  rawPath: '/notifications',
  rawQueryString: queryParams ? new URLSearchParams(queryParams).toString() : '',
  headers: {
    'content-type': 'application/json',
    ...(authHeader && { authorization: authHeader })
  },
  requestContext: {
    requestId: 'test-request-id',
    http: {
      method: 'GET',
      path: '/notifications',
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
    routeKey: 'GET /notifications',
    domainPrefix: 'api'
  },
  queryStringParameters: queryParams || null,
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

describe('get-notifications handler', () => {
  describe('successful retrieval', () => {
    it('should get notifications successfully with default params', async () => {
      const mockResponse = {
        notifications: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            userId: testUserId,
            type: 'like' as const,
            status: 'unread' as const,
            title: 'New like',
            message: 'Someone liked your post',
            priority: 'normal' as const,
            deliveryChannels: ['in-app'],
            soundEnabled: true,
            vibrationEnabled: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      };

      mockNotificationService.getNotifications.mockResolvedValue(mockResponse);

      const event = createMockEvent(undefined, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.notifications).toHaveLength(1);
      expect(body.totalCount).toBe(1);
      expect(body.unreadCount).toBe(1);
      expect(body.hasMore).toBe(false);

      expect(mockNotificationService.getNotifications).toHaveBeenCalledWith({
        userId: testUserId,
        limit: 20
      });
    });

    it('should get notifications with custom limit', async () => {
      const mockResponse = {
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
        hasMore: false
      };

      mockNotificationService.getNotifications.mockResolvedValue(mockResponse);

      const event = createMockEvent({ limit: '50' }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockNotificationService.getNotifications).toHaveBeenCalledWith({
        userId: testUserId,
        limit: 50
      });
    });

    it('should get notifications with cursor for pagination', async () => {
      const cursor = 'eyJQSyI6IlVTRVIjLCJTSyI6Ik5PVElGSUNBVElPTiJ9';
      const mockResponse = {
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
        hasMore: true,
        nextCursor: cursor
      };

      mockNotificationService.getNotifications.mockResolvedValue(mockResponse);

      const event = createMockEvent({ cursor }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.nextCursor).toBe(cursor);

      expect(mockNotificationService.getNotifications).toHaveBeenCalledWith({
        userId: testUserId,
        limit: 20,
        cursor
      });
    });

    it('should filter by unread status', async () => {
      const mockResponse = {
        notifications: [],
        totalCount: 0,
        unreadCount: 5,
        hasMore: false
      };

      mockNotificationService.getNotifications.mockResolvedValue(mockResponse);

      const event = createMockEvent({ filter: 'unread' }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockNotificationService.getNotifications).toHaveBeenCalledWith({
        userId: testUserId,
        status: 'unread',
        limit: 20
      });
    });

    it('should filter by all status (default)', async () => {
      const mockResponse = {
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
        hasMore: false
      };

      mockNotificationService.getNotifications.mockResolvedValue(mockResponse);

      const event = createMockEvent({ filter: 'all' }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockNotificationService.getNotifications).toHaveBeenCalledWith({
        userId: testUserId,
        limit: 20
        // No status filter when 'all' is specified
      });
    });

    it('should return empty result set', async () => {
      const mockResponse = {
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
        hasMore: false
      };

      mockNotificationService.getNotifications.mockResolvedValue(mockResponse);

      const event = createMockEvent(undefined, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.notifications).toEqual([]);
      expect(body.totalCount).toBe(0);
    });

    it('should handle user with no notifications', async () => {
      const mockResponse = {
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
        hasMore: false
      };

      mockNotificationService.getNotifications.mockResolvedValue(mockResponse);

      const event = createMockEvent(undefined, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.notifications).toEqual([]);
    });

    it('should validate limit is within range (1-100) - minimum', async () => {
      const mockResponse = {
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
        hasMore: false
      };

      mockNotificationService.getNotifications.mockResolvedValue(mockResponse);

      const event = createMockEvent({ limit: '1' }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockNotificationService.getNotifications).toHaveBeenCalledWith({
        userId: testUserId,
        limit: 1
      });
    });

    it('should validate limit is within range (1-100) - maximum', async () => {
      const mockResponse = {
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
        hasMore: false
      };

      mockNotificationService.getNotifications.mockResolvedValue(mockResponse);

      const event = createMockEvent({ limit: '100' }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockNotificationService.getNotifications).toHaveBeenCalledWith({
        userId: testUserId,
        limit: 100
      });
    });
  });

  describe('validation', () => {
    it('should return 400 for limit of 0', async () => {
      const event = createMockEvent({ limit: '0' }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBeTruthy();
    });

    it('should return 400 for limit of 101 (exceeds maximum)', async () => {
      const event = createMockEvent({ limit: '101' }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBeTruthy();
    });

    it('should return 400 for negative limit', async () => {
      const event = createMockEvent({ limit: '-1' }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBeTruthy();
    });

    it('should return 400 for non-number limit', async () => {
      const event = createMockEvent({ limit: 'invalid' }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBeTruthy();
    });

    it('should return 400 for invalid filter value', async () => {
      const event = createMockEvent({ filter: 'invalid-filter' }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBeTruthy();
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
      const event = createMockEvent(undefined, 'InvalidToken');
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 401 for invalid token', async () => {
      const { authenticateRequest } = await import('../../utils/index.js');
      vi.mocked(authenticateRequest).mockResolvedValueOnce({ success: false, statusCode: 401, message: 'Unauthorized' });

      const event = createMockEvent(undefined, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should return 401 for expired token', async () => {
      const { authenticateRequest } = await import('../../utils/index.js');
      vi.mocked(authenticateRequest).mockResolvedValueOnce({ success: false, statusCode: 401, message: 'Unauthorized' });

      const event = createMockEvent(undefined, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should return 401 when token missing userId', async () => {
      const { authenticateRequest } = await import('../../utils/index.js');
      vi.mocked(authenticateRequest).mockResolvedValueOnce({ success: false, statusCode: 401, message: 'Invalid token' });

      const event = createMockEvent(undefined, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Invalid token');
    });
  });

  describe('error handling', () => {
    it('should return 500 when NotificationService throws error', async () => {
      mockNotificationService.getNotifications.mockRejectedValue(
        new Error('DynamoDB connection failed')
      );

      const event = createMockEvent(undefined, mockJWT);
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
    it('should return response matching NotificationsListResponse schema', async () => {
      const mockResponse = {
        notifications: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            userId: testUserId,
            type: 'comment' as const,
            status: 'read' as const,
            title: 'New comment',
            message: 'Someone commented on your post',
            priority: 'high' as const,
            deliveryChannels: ['in-app', 'push'],
            soundEnabled: false,
            vibrationEnabled: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        totalCount: 1,
        unreadCount: 3,
        hasMore: true,
        nextCursor: 'cursor123'
      };

      mockNotificationService.getNotifications.mockResolvedValue(mockResponse);

      const event = createMockEvent(undefined, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);

      // Validate response structure
      expect(body).toHaveProperty('notifications');
      expect(body).toHaveProperty('totalCount');
      expect(body).toHaveProperty('unreadCount');
      expect(body).toHaveProperty('hasMore');
      expect(body).toHaveProperty('nextCursor');

      expect(Array.isArray(body.notifications)).toBe(true);
      expect(typeof body.totalCount).toBe('number');
      expect(typeof body.unreadCount).toBe('number');
      expect(typeof body.hasMore).toBe('boolean');
    });
  });
});
