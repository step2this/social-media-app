/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './get-unread-count.js';
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
  handleNotificationError: vi.fn((error: any, context: string) => {
    console.error(`Error ${context}:`, error);
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

describe('get-unread-count handler', () => {
  describe('successful retrieval', () => {
    it('should get unread count successfully', async () => {
      const mockCount = 5;
      mockNotificationService.getUnreadCount.mockResolvedValue(mockCount);

      const event = createMockAPIGatewayEvent({
        headers: { authorization: mockJWT }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.count).toBe(5);

      expect(mockNotificationService.getUnreadCount).toHaveBeenCalledWith(testUserId);
    });

    it('should return 0 when no unread notifications', async () => {
      const mockCount = 0;
      mockNotificationService.getUnreadCount.mockResolvedValue(mockCount);

      const event = createMockAPIGatewayEvent({
        headers: { authorization: mockJWT }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.count).toBe(0);
    });

    it('should return correct count for large number of unread', async () => {
      const mockCount = 150;
      mockNotificationService.getUnreadCount.mockResolvedValue(mockCount);

      const event = createMockAPIGatewayEvent({
        headers: { authorization: mockJWT }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.count).toBe(150);
    });

    it('should return count of 1 for single unread notification', async () => {
      const mockCount = 1;
      mockNotificationService.getUnreadCount.mockResolvedValue(mockCount);

      const event = createMockAPIGatewayEvent({
        headers: { authorization: mockJWT }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.count).toBe(1);
    });

    it('should call getUnreadCount with correct userId', async () => {
      const mockCount = 10;
      mockNotificationService.getUnreadCount.mockResolvedValue(mockCount);

      const event = createMockAPIGatewayEvent({
        headers: { authorization: mockJWT }
      });
      await handler(event);

      expect(mockNotificationService.getUnreadCount).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.getUnreadCount).toHaveBeenCalledWith(testUserId);
    });
  });

  describe('authentication', () => {
    it('should return 401 when no auth header provided', async () => {
      const event = createMockAPIGatewayEvent({});
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 401 when auth header does not start with Bearer', async () => {
      const event = createMockAPIGatewayEvent({
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
        headers: { authorization: mockJWT }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should return 401 for expired token', async () => {
      const { authenticateRequest } = await import('../../utils/index.js');
      vi.mocked(authenticateRequest).mockResolvedValueOnce({ success: false, statusCode: 401, message: 'Unauthorized' });

      const event = createMockAPIGatewayEvent({
        headers: { authorization: mockJWT }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should return 401 when token missing userId', async () => {
      const { authenticateRequest } = await import('../../utils/index.js');
      vi.mocked(authenticateRequest).mockResolvedValueOnce({ success: false, statusCode: 401, message: 'Invalid token' });

      const event = createMockAPIGatewayEvent({
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
      mockNotificationService.getUnreadCount.mockRejectedValue(
        new Error('DynamoDB connection failed')
      );

      const event = createMockAPIGatewayEvent({
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
    it('should return response matching GetUnreadCountResponse schema', async () => {
      const mockCount = 42;
      mockNotificationService.getUnreadCount.mockResolvedValue(mockCount);

      const event = createMockAPIGatewayEvent({
        headers: { authorization: mockJWT }
      });
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

      const event = createMockAPIGatewayEvent({
        headers: { authorization: mockJWT }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);

      expect(body).toEqual({ count: 0 });
    });
  });
});
