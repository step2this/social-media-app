/**
 * useNotificationActions Custom Hook
 *
 * Custom hook for notification actions (mark as read, delete, click handling)
 * Encapsulates notification interaction logic with optimistic updates
 *
 * @example
 * ```tsx
 * const { markAsRead, markAllAsRead, deleteNotification, handleClick } =
 *   useNotificationActions(notificationDataService, notifications, setNotifications, navigate);
 * ```
 */

import { useCallback } from 'react';
import type { Notification } from '@social-media-app/shared';
// import type { INotificationDataService } from '../services/interfaces/INotificationDataService.js';
type INotificationDataService = any; // TODO: Create this interface

/**
 * useNotificationActions Hook Return Type
 *
 * Provides action handlers for notification interactions
 */
export interface UseNotificationActionsReturn {
  readonly markAsRead: (notificationId: string) => Promise<void>;
  readonly markAllAsRead: () => Promise<void>;
  readonly deleteNotification: (notificationId: string, event: React.MouseEvent) => Promise<void>;
  readonly handleClick: (notification: Notification) => Promise<void>;
}

/**
 * useNotificationActions Hook
 *
 * Manages notification actions and interactions
 *
 * Features:
 * - Mark single notification as read with optimistic update
 * - Mark all notifications as read with optimistic update
 * - Delete notification with optimistic update
 * - Handle click with mark as read + navigation
 * - Type-safe with advanced TypeScript patterns
 *
 * @param notificationDataService - Service for notification operations
 * @param notifications - Current notifications array
 * @param setNotifications - State setter for notifications
 * @param onNavigate - Optional callback for navigation
 * @returns Action handlers for notification interactions
 */
export const useNotificationActions = (
  notificationDataService: INotificationDataService,
  notifications: readonly Notification[],
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>,
  onNavigate?: (url: string) => void
): UseNotificationActionsReturn => {
  /**
   * Mark a single notification as read
   * Uses optimistic update for better UX
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, status: 'read' as const } : n
      ));

      await notificationDataService.markAsRead(notificationId);
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, [notificationDataService, setNotifications]);

  /**
   * Mark all notifications as read
   * Uses optimistic update for better UX
   */
  const markAllAsRead = useCallback(async () => {
    try {
      // Optimistic update - mark all as read
      setNotifications(prev => prev.map(n => ({ ...n, status: 'read' as const })));

      await notificationDataService.markAllAsRead();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }, [notificationDataService, setNotifications]);

  /**
   * Delete a notification
   * Uses optimistic update with rollback on error
   */
  const deleteNotification = useCallback(async (notificationId: string, event: React.MouseEvent) => {
    // Stop propagation to prevent triggering notification click
    event.stopPropagation();

    // Save the notification for rollback
    const notificationToDelete = notifications.find(n => n.id === notificationId);

    try {
      // Optimistic update - remove from list
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      await notificationDataService.deleteNotification(notificationId);
    } catch (err) {
      console.error('Failed to delete notification:', err);

      // Rollback on error - add the notification back if we have it
      if (notificationToDelete) {
        setNotifications(prev => [...prev, notificationToDelete]);
      }
    }
  }, [notificationDataService, setNotifications, notifications]);

  /**
   * Handle notification click
   * Marks unread notifications as read and navigates to target URL
   */
  const handleClick = useCallback(async (notification: Notification) => {
    // Mark as read if unread
    if (notification.status === 'unread') {
      await markAsRead(notification.id);
    }

    // Navigate to target if available
    if (notification.target?.url && onNavigate) {
      onNavigate(notification.target.url);
    }
  }, [markAsRead, onNavigate]);

  return {
    markAsRead,
    markAllAsRead,
    deleteNotification,
    handleClick,
  };
};
