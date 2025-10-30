/**
 * useNotificationActions Hook Tests
 *
 * TDD approach: Write tests first
 * Tests the custom hook for notification actions (mark as read, delete, etc.)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotificationActions } from './useNotificationActions';
import { createMockNotification } from '../services/__tests__/fixtures/notificationFixtures';
import type { INotificationDataService } from '../services/interfaces/INotificationDataService';
import type { Notification } from '@social-media-app/shared';

// Mock notification data service
const createMockNotificationDataService = (): INotificationDataService => ({
  getNotifications: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  deleteNotification: vi.fn(),
  getUnreadCount: vi.fn(),
});

describe('useNotificationActions', () => {
  let mockService: INotificationDataService;
  let initialNotifications: Notification[];

  beforeEach(() => {
    mockService = createMockNotificationDataService();
    initialNotifications = [
      createMockNotification({ id: '1', status: 'unread' }),
      createMockNotification({ id: '2', status: 'unread' }),
      createMockNotification({ id: '3', status: 'read' }),
    ];
  });

  describe('Mark as Read', () => {
    it('should mark a notification as read', async () => {
      vi.mocked(mockService.markAsRead).mockResolvedValue({ success: true });

      const { result } = renderHook(() =>
        useNotificationActions(mockService, initialNotifications, vi.fn())
      );

      await act(async () => {
        await result.current.markAsRead('1');
      });

      expect(mockService.markAsRead).toHaveBeenCalledWith('1');
    });

    it('should update notification status to read optimistically', async () => {
      vi.mocked(mockService.markAsRead).mockResolvedValue({ success: true });

      const setNotifications = vi.fn();
      const { result } = renderHook(() =>
        useNotificationActions(mockService, initialNotifications, setNotifications)
      );

      await act(async () => {
        await result.current.markAsRead('1');
      });

      expect(setNotifications).toHaveBeenCalled();
      const updater = setNotifications.mock.calls[0][0];
      const updated = updater(initialNotifications);

      expect(updated[0].status).toBe('read');
      expect(updated[1].status).toBe('unread'); // Others unchanged
    });

    it('should handle mark as read errors gracefully', async () => {
      vi.mocked(mockService.markAsRead).mockRejectedValue(
        new Error('Network error')
      );

      const setNotifications = vi.fn();
      const { result } = renderHook(() =>
        useNotificationActions(mockService, initialNotifications, setNotifications)
      );

      await act(async () => {
        await result.current.markAsRead('1');
      });

      // Should still update optimistically even if request fails
      expect(setNotifications).toHaveBeenCalled();
    });
  });

  describe('Mark All as Read', () => {
    it('should mark all notifications as read', async () => {
      vi.mocked(mockService.markAllAsRead).mockResolvedValue({ success: true });

      const { result } = renderHook(() =>
        useNotificationActions(mockService, initialNotifications, vi.fn())
      );

      await act(async () => {
        await result.current.markAllAsRead();
      });

      expect(mockService.markAllAsRead).toHaveBeenCalled();
    });

    it('should update all notifications to read status optimistically', async () => {
      vi.mocked(mockService.markAllAsRead).mockResolvedValue({ success: true });

      const setNotifications = vi.fn();
      const { result } = renderHook(() =>
        useNotificationActions(mockService, initialNotifications, setNotifications)
      );

      await act(async () => {
        await result.current.markAllAsRead();
      });

      expect(setNotifications).toHaveBeenCalled();
      const updater = setNotifications.mock.calls[0][0];
      const updated = updater(initialNotifications);

      expect(updated.every(n => n.status === 'read')).toBe(true);
    });

    it('should handle mark all as read errors', async () => {
      vi.mocked(mockService.markAllAsRead).mockRejectedValue(
        new Error('Failed to mark all')
      );

      const setNotifications = vi.fn();
      const { result } = renderHook(() =>
        useNotificationActions(mockService, initialNotifications, setNotifications)
      );

      await act(async () => {
        await result.current.markAllAsRead();
      });

      // Should still update optimistically
      expect(setNotifications).toHaveBeenCalled();
    });
  });

  describe('Delete Notification', () => {
    it('should delete a notification', async () => {
      vi.mocked(mockService.deleteNotification).mockResolvedValue({ success: true });

      const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent;

      const { result } = renderHook(() =>
        useNotificationActions(mockService, initialNotifications, vi.fn())
      );

      await act(async () => {
        await result.current.deleteNotification('1', mockEvent);
      });

      expect(mockService.deleteNotification).toHaveBeenCalledWith('1');
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should remove notification from list optimistically', async () => {
      vi.mocked(mockService.deleteNotification).mockResolvedValue({ success: true });

      const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent;
      const setNotifications = vi.fn();

      const { result } = renderHook(() =>
        useNotificationActions(mockService, initialNotifications, setNotifications)
      );

      await act(async () => {
        await result.current.deleteNotification('1', mockEvent);
      });

      expect(setNotifications).toHaveBeenCalled();
      const updater = setNotifications.mock.calls[0][0];
      const updated = updater(initialNotifications);

      expect(updated).toHaveLength(2);
      expect(updated.find(n => n.id === '1')).toBeUndefined();
    });

    it('should stop event propagation', async () => {
      vi.mocked(mockService.deleteNotification).mockResolvedValue({ success: true });

      const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent;

      const { result } = renderHook(() =>
        useNotificationActions(mockService, initialNotifications, vi.fn())
      );

      await act(async () => {
        await result.current.deleteNotification('1', mockEvent);
      });

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should handle delete errors gracefully', async () => {
      vi.mocked(mockService.deleteNotification).mockRejectedValue(
        new Error('Delete failed')
      );

      const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent;
      const setNotifications = vi.fn();

      const { result } = renderHook(() =>
        useNotificationActions(mockService, initialNotifications, setNotifications)
      );

      await act(async () => {
        await result.current.deleteNotification('1', mockEvent);
      });

      // Should still update optimistically
      expect(setNotifications).toHaveBeenCalled();
    });
  });

  describe('Handle Click', () => {
    it('should mark unread notification as read when clicked', async () => {
      vi.mocked(mockService.markAsRead).mockResolvedValue({ success: true });

      const notification = createMockNotification({
        id: '1',
        status: 'unread',
        target: { type: 'post', id: 'post-1', url: '/posts/post-1' }
      });

      const onNavigate = vi.fn();
      const { result } = renderHook(() =>
        useNotificationActions(mockService, [notification], vi.fn(), onNavigate)
      );

      await act(async () => {
        await result.current.handleClick(notification);
      });

      expect(mockService.markAsRead).toHaveBeenCalledWith('1');
      expect(onNavigate).toHaveBeenCalledWith('/posts/post-1');
    });

    it('should not mark read notification as read again', async () => {
      const notification = createMockNotification({
        id: '1',
        status: 'read',
        target: { type: 'post', id: 'post-1', url: '/posts/post-1' }
      });

      const onNavigate = vi.fn();
      const { result } = renderHook(() =>
        useNotificationActions(mockService, [notification], vi.fn(), onNavigate)
      );

      await act(async () => {
        await result.current.handleClick(notification);
      });

      expect(mockService.markAsRead).not.toHaveBeenCalled();
      expect(onNavigate).toHaveBeenCalledWith('/posts/post-1');
    });

    it('should navigate to target URL when notification is clicked', async () => {
      const notification = createMockNotification({
        id: '1',
        target: { type: 'post', id: 'post-1', url: '/posts/post-1' }
      });

      const onNavigate = vi.fn();
      const { result } = renderHook(() =>
        useNotificationActions(mockService, [notification], vi.fn(), onNavigate)
      );

      await act(async () => {
        await result.current.handleClick(notification);
      });

      expect(onNavigate).toHaveBeenCalledWith('/posts/post-1');
    });

    it('should not navigate when notification has no target', async () => {
      const notification = createMockNotification({
        id: '1',
        target: undefined
      });

      const onNavigate = vi.fn();
      const { result } = renderHook(() =>
        useNotificationActions(mockService, [notification], vi.fn(), onNavigate)
      );

      await act(async () => {
        await result.current.handleClick(notification);
      });

      expect(onNavigate).not.toHaveBeenCalled();
    });
  });
});
