/**
 * useNotifications Custom Hook
 *
 * Custom hook for fetching and managing notifications
 * Encapsulates notification loading logic with proper state management
 *
 * @example
 * ```tsx
 * const { notifications, loading, error, retry, loadMore, hasMore, hasUnreadNotifications } =
 *   useNotifications(notificationDataService);
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import type { Notification } from '@social-media-app/shared';
// import type { INotificationDataService } from '../services/interfaces/INotificationDataService';
type INotificationDataService = any; // TODO: Create this interface

/**
 * useNotifications Hook Return Type
 *
 * Provides notifications data, loading state, error handling, and utility functions
 */
export interface UseNotificationsReturn {
  readonly notifications: readonly Notification[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly hasMore: boolean;
  readonly hasUnreadNotifications: boolean;
  readonly retry: () => void;
  readonly loadMore: () => Promise<void>;
  readonly setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

/**
 * useNotifications Hook
 *
 * Manages notification fetching, pagination, and state
 *
 * Features:
 * - Automatic loading on mount
 * - Error handling with retry capability
 * - Pagination with loadMore function
 * - Unread notifications tracking
 * - Type-safe with advanced TypeScript patterns
 *
 * @param notificationDataService - Service for fetching notifications
 * @returns Notifications data, loading state, and utility functions
 */
export const useNotifications = (
  notificationDataService: INotificationDataService
): UseNotificationsReturn => {
  // State management
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  /**
   * Load notifications from service
   * Uses useCallback to prevent unnecessary re-renders
   */
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await notificationDataService.getNotifications({ limit: 100 });

      if (result.status === 'success') {
        setNotifications(result.data);
        // If we got fewer than 10 results, there are probably no more
        setHasMore(result.data.length >= 10);
      } else {
        setError('Failed to load notifications. Please try again.');
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [notificationDataService]);

  /**
   * Load more notifications for pagination
   * Appends new notifications to existing list
   */
  const loadMore = useCallback(async () => {
    try {
      setLoading(true);

      const result = await notificationDataService.getNotifications({ limit: 100 });

      if (result.status === 'success') {
        setNotifications(prev => [...prev, ...result.data]);
        // If we got fewer than 100 results, there are no more
        setHasMore(result.data.length >= 100);
      }
    } catch (err) {
      console.error('Failed to load more:', err);
    } finally {
      setLoading(false);
    }
  }, [notificationDataService]);

  /**
   * Retry loading notifications after an error
   * Resets state and attempts to load again
   */
  const retry = useCallback(() => {
    loadNotifications();
  }, [loadNotifications]);

  /**
   * Check if there are any unread notifications
   * Used to conditionally show "Mark all as read" button
   */
  const hasUnreadNotifications = notifications.some(n => n.status === 'unread');

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return {
    notifications,
    loading,
    error,
    hasMore,
    hasUnreadNotifications,
    retry,
    loadMore,
    setNotifications,
  };
};
