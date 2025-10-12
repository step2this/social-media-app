/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './delete-notification.js';
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
  validateUUID: vi.fn((id: string | undefined) => {
    if (!id) {
      return { success: false, statusCode: 400, message: 'Invalid request data', errors: [{ path: ['id'], message: 'id is required' }] };
    }
    // Check if ID looks like a valid UUID pattern
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(id)) {
      return { success: false, statusCode: 400, message: 'Invalid request data', errors: [{ path: ['id'], message: 'Invalid UUID format' }] };
    }
    return { success: true, data: id };
  }),
  handleNotificationError: vi.fn((error: any, context: string) => {
    console.error(`Error ${context}:`, error);
    if (error.message?.includes('Unauthorized')) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
    }
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  })
}));

// Test helper to create mock event
const createMockEvent = (
  pathParameters?: Record<string, string>,
  authHeader?: string
): APIGatewayProxyEventV2 => ({
  version: '2.0',
  routeKey: 'DELETE /notifications/{id}',
  rawPath: `/notifications/${pathParameters?.id || 'test-id'}`,
  rawQueryString: '',
  headers: {
    'content-type': 'application/json',
    ...(authHeader && { authorization: authHeader })
  },
  pathParameters,
  requestContext: {
    requestId: 'test-request-id',
    http: {
      method: 'DELETE',
      path: `/notifications/${pathParameters?.id || 'test-id'}`,
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
    routeKey: 'DELETE /notifications/{id}',
    domainPrefix: 'api'
  },
  isBase64Encoded: false
});

const createAuthHeaders = (userId: string) => `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIke userId}In0.test`;

const testUserId = 'test-user-id';
const testNotificationId = '123e4567-e89b-12d3-a456-426614174001';
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

describe('delete-notification handler', () => {
  describe('successful deletion', () => {
    it('should delete notification successfully', async () => {
      const mockResponse = {
        success: true,
        deletedCount: 1
      };

      mockNotificationService.deleteNotification.mockResolvedValue(mockResponse);

      const event = createMockEvent({ id: testNotificationId }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);

      expect(mockNotificationService.deleteNotification).toHaveBeenCalledWith({
        userId: testUserId,
        notificationId: testNotificationId
      });
    });

    it('should get notificationId from path parameters', async () => {
      const mockResponse = {
        success: true,
        deletedCount: 1
      };

      mockNotificationService.deleteNotification.mockResolvedValue(mockResponse);

      const event = createMockEvent({ id: testNotificationId }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockNotificationService.deleteNotification).toHaveBeenCalledWith({
        userId: testUserId,
        notificationId: testNotificationId
      });
    });

    it('should succeed when notification does not exist (idempotent)', async () => {
      const mockResponse = {
        success: true,
        deletedCount: 0
      };

      mockNotificationService.deleteNotification.mockResolvedValue(mockResponse);

      const event = createMockEvent({ id: testNotificationId }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
    });

    it('should delete notification with different UUID format', async () => {
      const alternateNotificationId = '987e6543-e21b-34d5-a678-542315678900';
      const mockResponse = {
        success: true,
        deletedCount: 1
      };

      mockNotificationService.deleteNotification.mockResolvedValue(mockResponse);

      const event = createMockEvent({ id: alternateNotificationId }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockNotificationService.deleteNotification).toHaveBeenCalledWith({
        userId: testUserId,
        notificationId: alternateNotificationId
      });
    });
  });

  describe('validation', () => {
    it('should validate notificationId is UUID format', async () => {
      const event = createMockEvent({ id: 'not-a-uuid' }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBeTruthy();
    });

    it('should return 400 for invalid notificationId format', async () => {
      const event = createMockEvent({ id: '12345' }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBeTruthy();
    });

    it('should return 400 for missing notificationId', async () => {
      const event = createMockEvent({}, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBeTruthy();
    });

    it('should return 400 for empty notificationId', async () => {
      const event = createMockEvent({ id: '' }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBeTruthy();
    });
  });

  describe('authentication', () => {
    it('should return 401 when no auth header provided', async () => {
      const event = createMockEvent({ id: testNotificationId });
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 401 when auth header does not start with Bearer', async () => {
      const event = createMockEvent({ id: testNotificationId }, 'InvalidToken');
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 401 for invalid token', async () => {
      const { authenticateRequest } = await import('../../utils/index.js');
      vi.mocked(authenticateRequest).mockResolvedValueOnce({ success: false, statusCode: 401, message: 'Unauthorized' });

      const event = createMockEvent({ id: testNotificationId }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should return 401 when token missing userId', async () => {
      const { authenticateRequest } = await import('../../utils/index.js');
      vi.mocked(authenticateRequest).mockResolvedValueOnce({ success: false, statusCode: 401, message: 'Invalid token' });

      const event = createMockEvent({ id: testNotificationId }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Invalid token');
    });
  });

  describe('authorization', () => {
    it('should return 403 when user tries to delete another users notification', async () => {
      mockNotificationService.deleteNotification.mockRejectedValue(
        new Error('Unauthorized: You can only modify your own notifications')
      );

      const event = createMockEvent({ id: testNotificationId }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Forbidden');
    });
  });

  describe('error handling', () => {
    it('should return 500 when NotificationService throws error', async () => {
      mockNotificationService.deleteNotification.mockRejectedValue(
        new Error('DynamoDB connection failed')
      );

      const event = createMockEvent({ id: testNotificationId }, mockJWT);
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
    it('should return response matching DeleteNotificationResponse schema', async () => {
      const mockResponse = {
        success: true,
        deletedCount: 1
      };

      mockNotificationService.deleteNotification.mockResolvedValue(mockResponse);

      const event = createMockEvent({ id: testNotificationId }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);

      // Validate response structure
      expect(body).toHaveProperty('success');
      expect(typeof body.success).toBe('boolean');
      expect(body.success).toBe(true);
    });

    it('should return valid response with deletedCount', async () => {
      const mockResponse = {
        success: true,
        deletedCount: 1
      };

      mockNotificationService.deleteNotification.mockResolvedValue(mockResponse);

      const event = createMockEvent({ id: testNotificationId }, mockJWT);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);

      expect(body).toHaveProperty('deletedCount');
      expect(typeof body.deletedCount).toBe('number');
      expect(body.deletedCount).toBeGreaterThanOrEqual(0);
    });
  });
});
