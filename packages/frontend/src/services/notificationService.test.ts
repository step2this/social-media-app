import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationService } from './notificationService';
import { apiClient } from './apiClient';

vi.mock('./apiClient');

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('should get notifications with default pagination', async () => {
      const mockResponse = {
        items: [
          {
            id: 'notif-1',
            userId: 'user-123',
            type: 'like',
            actorId: 'user-456',
            actorHandle: 'john_doe',
            actorDisplayName: 'John Doe',
            targetType: 'post',
            targetId: 'post-123',
            isRead: false,
            createdAt: '2025-01-15T10:00:00Z'
          }
        ],
        cursor: 'next-cursor-123'
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await notificationService.getNotifications();

      expect(apiClient.get).toHaveBeenCalledWith('/notifications?limit=20');
      expect(result).toEqual(mockResponse);
    });

    it('should get notifications with custom limit and cursor', async () => {
      const mockResponse = {
        items: [],
        cursor: undefined
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await notificationService.getNotifications(10, 'cursor-abc');

      expect(apiClient.get).toHaveBeenCalledWith('/notifications?limit=10&cursor=cursor-abc');
      expect(result).toEqual(mockResponse);
    });

    it('should get notifications with unread filter', async () => {
      const mockResponse = {
        items: [
          {
            id: 'notif-2',
            userId: 'user-123',
            type: 'comment',
            actorId: 'user-789',
            actorHandle: 'jane_smith',
            actorDisplayName: 'Jane Smith',
            targetType: 'post',
            targetId: 'post-456',
            isRead: false,
            createdAt: '2025-01-15T11:00:00Z'
          }
        ],
        cursor: undefined
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await notificationService.getNotifications(20, undefined, 'unread');

      expect(apiClient.get).toHaveBeenCalledWith('/notifications?limit=20&filter=unread');
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error'));

      await expect(notificationService.getNotifications()).rejects.toThrow('Network error');
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread count successfully', async () => {
      const mockResponse = {
        count: 5
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await notificationService.getUnreadCount();

      expect(apiClient.get).toHaveBeenCalledWith('/notifications/unread-count');
      expect(result).toEqual(mockResponse);
    });

    it('should handle zero unread notifications', async () => {
      const mockResponse = {
        count: 0
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await notificationService.getUnreadCount();

      expect(result.count).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error'));

      await expect(notificationService.getUnreadCount()).rejects.toThrow('Network error');
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      const mockResponse = {
        success: true,
        notification: {
          id: 'notif-1',
          userId: 'user-123',
          type: 'like',
          actorId: 'user-456',
          actorHandle: 'john_doe',
          actorDisplayName: 'John Doe',
          targetType: 'post',
          targetId: 'post-123',
          isRead: true,
          createdAt: '2025-01-15T10:00:00Z',
          readAt: '2025-01-15T12:00:00Z'
        }
      };

      vi.mocked(apiClient.put).mockResolvedValueOnce(mockResponse);

      const result = await notificationService.markAsRead('notif-1');

      expect(apiClient.put).toHaveBeenCalledWith('/notifications/notif-1/read');
      expect(result).toEqual(mockResponse);
      expect(result.notification.isRead).toBe(true);
    });

    it('should throw error for empty notificationId', async () => {
      await expect(notificationService.markAsRead('')).rejects.toThrow(
        'notificationId is required and cannot be empty'
      );

      expect(apiClient.put).not.toHaveBeenCalled();
    });

    it('should throw error for whitespace-only notificationId', async () => {
      await expect(notificationService.markAsRead('   ')).rejects.toThrow(
        'notificationId is required and cannot be empty'
      );

      expect(apiClient.put).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(apiClient.put).mockRejectedValueOnce(new Error('Network error'));

      await expect(notificationService.markAsRead('notif-1')).rejects.toThrow('Network error');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read successfully', async () => {
      const mockResponse = {
        success: true,
        count: 5
      };

      vi.mocked(apiClient.put).mockResolvedValueOnce(mockResponse);

      const result = await notificationService.markAllAsRead();

      expect(apiClient.put).toHaveBeenCalledWith('/notifications/mark-all-read');
      expect(result).toEqual(mockResponse);
      expect(result.count).toBe(5);
    });

    it('should handle zero notifications marked as read', async () => {
      const mockResponse = {
        success: true,
        count: 0
      };

      vi.mocked(apiClient.put).mockResolvedValueOnce(mockResponse);

      const result = await notificationService.markAllAsRead();

      expect(result.count).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(apiClient.put).mockRejectedValueOnce(new Error('Network error'));

      await expect(notificationService.markAllAsRead()).rejects.toThrow('Network error');
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      const mockResponse = {
        success: true
      };

      vi.mocked(apiClient.delete).mockResolvedValueOnce(mockResponse);

      const result = await notificationService.deleteNotification('notif-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/notifications/notif-1');
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
    });

    it('should throw error for empty notificationId', async () => {
      await expect(notificationService.deleteNotification('')).rejects.toThrow(
        'notificationId is required and cannot be empty'
      );

      expect(apiClient.delete).not.toHaveBeenCalled();
    });

    it('should throw error for whitespace-only notificationId', async () => {
      await expect(notificationService.deleteNotification('   ')).rejects.toThrow(
        'notificationId is required and cannot be empty'
      );

      expect(apiClient.delete).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(apiClient.delete).mockRejectedValueOnce(new Error('Network error'));

      await expect(notificationService.deleteNotification('notif-1')).rejects.toThrow('Network error');
    });
  });
});
