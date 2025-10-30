/**
 * useNotificationsPage Composite Hook Tests
 *
 * TDD approach: Write tests first
 * Tests the composite hook that combines useNotifications and useNotificationActions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useNotificationsPage } from './useNotificationsPage';
import { createMockNotifications } from '../services/__tests__/fixtures/notificationFixtures';
import type { INotificationDataService } from '../services/interfaces/INotificationDataService';

// Mock notification data service
const createMockNotificationDataService = (): INotificationDataService => ({
  getNotifications: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  deleteNotification: vi.fn(),
  getUnreadCount: vi.fn(),
});

describe('useNotificationsPage', () => {
  let mockService: INotificationDataService;
  let mockNavigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockService = createMockNotificationDataService();
    mockNavigate = vi.fn();
  });

  describe('Hook Composition', () => {
    it('should combine useNotifications and useNotificationActions', async () => {
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        status: 'success',
        data: []
      });

      const { result } = renderHook(() =>
        useNotificationsPage(mockService, mockNavigate)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have fields from useNotifications
      expect(result.current.notifications).toBeDefined();
      expect(result.current.loading).toBeDefined();
      expect(result.current.error).toBeDefined();
      expect(result.current.hasMore).toBeDefined();
      expect(result.current.hasUnreadNotifications).toBeDefined();
      expect(result.current.retry).toBeDefined();
      expect(result.current.loadMore).toBeDefined();
      expect(result.current.setNotifications).toBeDefined();

      // Should have fields from useNotificationActions
      expect(result.current.handleClick).toBeDefined();
      expect(result.current.markAsRead).toBeDefined();
      expect(result.current.markAllAsRead).toBeDefined();
      expect(result.current.deleteNotification).toBeDefined();
    });

    it('should properly wire up dependencies between hooks', async () => {
      const notification = createMockNotifications(1, { status: 'unread' })[0];
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        status: 'success',
        data: [notification]
      });
      vi.mocked(mockService.markAsRead).mockResolvedValue({
        status: 'success',
        data: { success: true, markedCount: 1 }
      });

      const { result } = renderHook(() =>
        useNotificationsPage(mockService, mockNavigate)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.notifications).toHaveLength(1);

      // Click should mark as read AND navigate
      await act(async () => {
        await result.current.handleClick(notification);
      });

      expect(mockService.markAsRead).toHaveBeenCalledWith(notification.id);
      expect(mockNavigate).toHaveBeenCalledWith(notification.target?.url);
    });
  });

  describe('TypeScript Inference', () => {
    it('should have proper type inference for all fields', async () => {
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        status: 'success',
        data: []
      });

      const { result } = renderHook(() =>
        useNotificationsPage(mockService, mockNavigate)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Type inference test - TypeScript should infer correct types
      const notifications: readonly import('@social-media-app/shared').Notification[] = result.current.notifications;
      const loading: boolean = result.current.loading;
      const error: string | null = result.current.error;
      const hasMore: boolean = result.current.hasMore;
      const hasUnreadNotifications: boolean = result.current.hasUnreadNotifications;
      const retry: () => void = result.current.retry;
      const loadMore: () => Promise<void> = result.current.loadMore;
      const handleClick: (n: import('@social-media-app/shared').Notification) => Promise<void> = result.current.handleClick;
      const markAsRead: (id: string) => Promise<void> = result.current.markAsRead;
      const markAllAsRead: () => Promise<void> = result.current.markAllAsRead;
      const deleteNotification: (id: string, e: React.MouseEvent) => Promise<void> = result.current.deleteNotification;

      // Use the variables to avoid unused variable errors
      expect(notifications).toBeDefined();
      expect(typeof loading).toBe('boolean');
      expect(error === null || typeof error === 'string').toBe(true);
      expect(typeof hasMore).toBe('boolean');
      expect(typeof hasUnreadNotifications).toBe('boolean');
      expect(typeof retry).toBe('function');
      expect(typeof loadMore).toBe('function');
      expect(typeof handleClick).toBe('function');
      expect(typeof markAsRead).toBe('function');
      expect(typeof markAllAsRead).toBe('function');
      expect(typeof deleteNotification).toBe('function');
    });
  });

  describe('Complete User Flow Integration', () => {
    it('should handle complete user flow: load, click, mark all, delete', async () => {
      const notifications = createMockNotifications(3, { status: 'unread' });
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        status: 'success',
        data: notifications
      });
      vi.mocked(mockService.markAsRead).mockResolvedValue({
        status: 'success',
        data: { success: true, markedCount: 1 }
      });
      vi.mocked(mockService.markAllAsRead).mockResolvedValue({
        status: 'success',
        data: { success: true, markedCount: 3 }
      });
      vi.mocked(mockService.deleteNotification).mockResolvedValue({
        status: 'success',
        data: { success: true }
      });

      const { result } = renderHook(() =>
        useNotificationsPage(mockService, mockNavigate)
      );

      // 1. Load notifications
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(result.current.notifications).toHaveLength(3);
      expect(result.current.hasUnreadNotifications).toBe(true);

      // 2. Click notification
      await act(async () => {
        await result.current.handleClick(notifications[0]);
      });
      expect(mockService.markAsRead).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalled();

      // 3. Mark all as read
      await act(async () => {
        await result.current.markAllAsRead();
      });
      expect(mockService.markAllAsRead).toHaveBeenCalled();
      // All notifications should now be marked as read
      expect(result.current.notifications.every(n => n.status === 'read')).toBe(true);
      expect(result.current.hasUnreadNotifications).toBe(false);

      // 4. Delete notification
      const mockEvent = { stopPropagation: vi.fn() } as any;
      await act(async () => {
        await result.current.deleteNotification(notifications[0].id, mockEvent);
      });
      expect(mockService.deleteNotification).toHaveBeenCalledWith(notifications[0].id);
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(result.current.notifications).toHaveLength(2);
    });

    it('should handle error states across both hooks', async () => {
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        status: 'error',
        error: new Error('Network error') as any
      });

      const { result } = renderHook(() =>
        useNotificationsPage(mockService, mockNavigate)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load notifications. Please try again.');
      expect(result.current.notifications).toEqual([]);

      // Retry should work
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        status: 'success',
        data: createMockNotifications(2)
      });

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.notifications).toHaveLength(2);
    });

    it('should handle pagination with loadMore', async () => {
      const initialNotifications = createMockNotifications(100);
      const moreNotifications = createMockNotifications(50);

      vi.mocked(mockService.getNotifications)
        .mockResolvedValueOnce({
          status: 'success',
          data: initialNotifications
        })
        .mockResolvedValueOnce({
          status: 'success',
          data: moreNotifications
        });

      const { result } = renderHook(() =>
        useNotificationsPage(mockService, mockNavigate)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.notifications).toHaveLength(100);
      expect(result.current.hasMore).toBe(true);

      await act(async () => {
        await result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.notifications).toHaveLength(150);
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('Action Handler Integration', () => {
    it('should handle mark as read and update state', async () => {
      const notification = createMockNotifications(1, { status: 'unread' })[0];
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        status: 'success',
        data: [notification]
      });
      vi.mocked(mockService.markAsRead).mockResolvedValue({
        status: 'success',
        data: { success: true, markedCount: 1 }
      });

      const { result } = renderHook(() =>
        useNotificationsPage(mockService, mockNavigate)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasUnreadNotifications).toBe(true);

      await act(async () => {
        await result.current.markAsRead(notification.id);
      });

      expect(mockService.markAsRead).toHaveBeenCalledWith(notification.id);
      expect(result.current.notifications[0].status).toBe('read');
      expect(result.current.hasUnreadNotifications).toBe(false);
    });

    it('should handle delete notification and update state', async () => {
      const notifications = createMockNotifications(3);
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        status: 'success',
        data: notifications
      });
      vi.mocked(mockService.deleteNotification).mockResolvedValue({
        status: 'success',
        data: { success: true }
      });

      const { result } = renderHook(() =>
        useNotificationsPage(mockService, mockNavigate)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.notifications).toHaveLength(3);

      const mockEvent = { stopPropagation: vi.fn() } as any;
      await act(async () => {
        await result.current.deleteNotification(notifications[0].id, mockEvent);
      });

      expect(mockService.deleteNotification).toHaveBeenCalledWith(notifications[0].id);
      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.notifications.find(n => n.id === notifications[0].id)).toBeUndefined();
    });

    it('should handle navigation on notification click', async () => {
      const notification = createMockNotifications(1, {
        status: 'unread',
        target: { type: 'post', url: '/posts/123', id: '123' }
      })[0];

      vi.mocked(mockService.getNotifications).mockResolvedValue({
        status: 'success',
        data: [notification]
      });
      vi.mocked(mockService.markAsRead).mockResolvedValue({
        status: 'success',
        data: { success: true, markedCount: 1 }
      });

      const { result } = renderHook(() =>
        useNotificationsPage(mockService, mockNavigate)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.handleClick(notification);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/posts/123');
    });
  });

  describe('State Synchronization', () => {
    it('should keep notifications in sync between hooks', async () => {
      const notifications = createMockNotifications(5, { status: 'unread' });
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        status: 'success',
        data: notifications
      });
      vi.mocked(mockService.markAllAsRead).mockResolvedValue({
        status: 'success',
        data: { success: true, markedCount: 5 }
      });

      const { result } = renderHook(() =>
        useNotificationsPage(mockService, mockNavigate)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasUnreadNotifications).toBe(true);

      // Mark all as read should update the notifications state
      await act(async () => {
        await result.current.markAllAsRead();
      });

      // hasUnreadNotifications should automatically update based on notifications state
      expect(result.current.hasUnreadNotifications).toBe(false);
      expect(result.current.notifications.every(n => n.status === 'read')).toBe(true);
    });

    it('should expose setNotifications for external state updates', async () => {
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        status: 'success',
        data: []
      });

      const { result } = renderHook(() =>
        useNotificationsPage(mockService, mockNavigate)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // External state update via setNotifications
      const newNotifications = createMockNotifications(3);
      act(() => {
        result.current.setNotifications(newNotifications);
      });

      expect(result.current.notifications).toEqual(newNotifications);
    });
  });
});
