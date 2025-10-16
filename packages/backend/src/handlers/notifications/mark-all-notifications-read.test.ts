/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './mark-all-notifications-read.js';
import { createMockAPIGatewayEvent } from '@social-media-app/shared/test-utils';
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
  parseRequestBody: vi.fn((body: string | undefined) => {
    if (!body) return {};
    try {
      return JSON.parse(body);
    } catch {
      throw new Error('Invalid JSON in request body');
    }
  }),
  handleNotificationError: vi.fn((error: any, context: string) => {
    console.error(`Error ${context}:`, error);
    if (error.message === 'Invalid JSON in request body') {
      return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
    }
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  })
}));

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

describe('mark-all-notifications-read handler', () => {
  describe('successful operation', () => {
    it('should mark all notifications as read with no filters', async () => {
      const mockResponse = {
        updatedCount: 5
      };

      mockNotificationService.markAllAsRead.mockResolvedValue(mockResponse);

      const event = createMockAPIGatewayEvent({
        body: {},
        headers: { authorization: mockJWT }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.updatedCount).toBe(5);

      expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith({
        userId: testUserId
      });
    });

    it('should mark all notifications as read with type filter', async () => {
      const mockResponse = {
        updatedCount: 3
      };

      mockNotificationService.markAllAsRead.mockResolvedValue(mockResponse);

      const event = createMockAPIGatewayEvent({
        body: { type: 'like' },
        headers: { authorization: mockJWT }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.updatedCount).toBe(3);

      expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith({
        userId: testUserId,
        type: 'like'
      });
    });

    it('should mark all notifications as read with beforeDate filter', async () => {
      const mockResponse = {
        updatedCount: 10
      };

      mockNotificationService.markAllAsRead.mockResolvedValue(mockResponse);

      const event = createMockAPIGatewayEvent({
        body: { beforeDate: '2024-01-01T00:00:00Z' },
        headers: { authorization: mockJWT }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.updatedCount).toBe(10);

      expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith({
        userId: testUserId,
        beforeDate: '2024-01-01T00:00:00Z'
      });
    });

    it('should mark all notifications as read with both type and beforeDate filters', async () => {
      const mockResponse = {
        updatedCount: 2
      };

      mockNotificationService.markAllAsRead.mockResolvedValue(mockResponse);

      const event = createMockAPIGatewayEvent({
        body: {
          type: 'comment',
          beforeDate: '2024-01-01T00:00:00Z'
        },
        headers: { authorization: mockJWT }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.updatedCount).toBe(2);

      expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith({
        userId: testUserId,
        type: 'comment',
        beforeDate: '2024-01-01T00:00:00Z'
      });
    });

    it('should return 0 when no notifications to mark', async () => {
      const mockResponse = {
        updatedCount: 0
      };

      mockNotificationService.markAllAsRead.mockResolvedValue(mockResponse);

      const event = createMockAPIGatewayEvent({
        body: {},
        headers: { authorization: mockJWT }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.updatedCount).toBe(0);
    });

    it('should handle empty request body', async () => {
      const mockResponse = {
        updatedCount: 5
      };

      mockNotificationService.markAllAsRead.mockResolvedValue(mockResponse);

      const event = createMockAPIGatewayEvent({
        body: {},
        headers: { authorization: mockJWT }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.updatedCount).toBe(5);
    });

    it('should mark all follow notifications as read', async () => {
      const mockResponse = {
        updatedCount: 7
      };

      mockNotificationService.markAllAsRead.mockResolvedValue(mockResponse);

      const event = createMockAPIGatewayEvent({
        body: { type: 'follow' },
        headers: { authorization: mockJWT }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith({
        userId: testUserId,
        type: 'follow'
      });
    });

    it('should mark all mention notifications as read', async () => {
      const mockResponse = {
        updatedCount: 4
      };

      mockNotificationService.markAllAsRead.mockResolvedValue(mockResponse);

      const event = createMockAPIGatewayEvent({
        body: { type: 'mention' },
        headers: { authorization: mockJWT }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith({
        userId: testUserId,
        type: 'mention'
      });
    });
  });

  describe('validation', () => {
    it('should return 400 for invalid type value', async () => {
      const event = createMockAPIGatewayEvent({
        body: { type: 'invalid-type' },
        headers: { authorization: mockJWT }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBeTruthy();
    });

    it('should return 400 for invalid date format', async () => {
      const event = createMockAPIGatewayEvent({
        body: { beforeDate: 'not-a-date' },
        headers: { authorization: mockJWT }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBeTruthy();
    });

    it('should return 400 for malformed ISO date', async () => {
      const event = createMockAPIGatewayEvent({
        body: { beforeDate: '2024-13-01T00:00:00Z' },
        headers: { authorization: mockJWT }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBeTruthy();
    });

    it('should return 400 for invalid JSON in request body', async () => {
      const event = createMockAPIGatewayEvent({
        rawBody: 'invalid json',
        headers: { authorization: mockJWT }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Invalid JSON in request body');
    });
  });

  describe('authentication', () => {
    it('should return 401 when no auth header provided', async () => {
      const event = createMockAPIGatewayEvent({
        body: {}
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 401 when auth header does not start with Bearer', async () => {
      const event = createMockAPIGatewayEvent({
        body: {},
        headers: { authorization: 'InvalidToken' }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 401 for invalid token', async () => {
      const { authenticateRequest } = await import('../../utils/index.js');
      vi.mocked(authenticateRequest).mockResolvedValueOnce({ success: false, statusCode: 401, message: 'Unauthorized' });

      const event = createMockAPIGatewayEvent({
        body: {},
        headers: { authorization: mockJWT }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should return 401 when token missing userId', async () => {
      const { authenticateRequest } = await import('../../utils/index.js');
      vi.mocked(authenticateRequest).mockResolvedValueOnce({ success: false, statusCode: 401, message: 'Invalid token' });

      const event = createMockAPIGatewayEvent({
        body: {},
        headers: { authorization: mockJWT }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Invalid token');
    });
  });

  describe('error handling', () => {
    it('should return 500 when NotificationService throws error', async () => {
      mockNotificationService.markAllAsRead.mockRejectedValue(
        new Error('DynamoDB connection failed')
      );

      const event = createMockAPIGatewayEvent({
        body: {},
        headers: { authorization: mockJWT }
      });
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
    it('should return response matching MarkAllNotificationsReadResponse schema', async () => {
      const mockResponse = {
        updatedCount: 15
      };

      mockNotificationService.markAllAsRead.mockResolvedValue(mockResponse);

      const event = createMockAPIGatewayEvent({
        body: {},
        headers: { authorization: mockJWT }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);

      // Validate response structure
      expect(body).toHaveProperty('updatedCount');
      expect(typeof body.updatedCount).toBe('number');
      expect(body.updatedCount).toBeGreaterThanOrEqual(0);
    });
  });
});
