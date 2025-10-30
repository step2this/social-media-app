/**
 * NotificationsPage Component
 *
 * Refactored to use atomic components and advanced TypeScript patterns
 * Following the composition pattern with type-safe component architecture
 *
 * Phase 7: Complete refactoring using all created components
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useServices } from '../services/ServiceProvider';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '@social-media-app/shared';

// Import all new components
import { NotificationsHeader } from '../components/notifications/NotificationsHeader';
import { NotificationsList } from '../components/notifications/NotificationsList';
import { NotificationsLoading } from '../components/notifications/NotificationsLoading';
import { NotificationsError } from '../components/notifications/NotificationsError';
import { NotificationsEmpty } from '../components/notifications/NotificationsEmpty';
import { LoadMoreButton } from '../components/notifications/LoadMoreButton';

// Import CSS
import './NotificationsPage.css';

/**
 * NotificationsPage Component
 *
 * Main page component that:
 * - Fetches notifications from the service
 * - Manages loading, error, and empty states using discriminated unions
 * - Delegates rendering to specialized components
 * - Handles user interactions (click, delete, mark as read)
 * - Uses advanced TypeScript types for type safety
 */
export const NotificationsPage: React.FC = () => {
  const { notificationDataService } = useServices();
  const navigate = useNavigate();

  // State management
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  /**
   * Load notifications on mount
   * Uses useCallback to prevent unnecessary re-renders
   */
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await notificationDataService.getNotifications({ limit: 100 });

      if (result.status === 'success') {
        setNotifications(result.data);
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

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  /**
   * Handle notification click
   * Mark as read if unread, then navigate to target
   */
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (notification.status === 'unread') {
      try {
        await notificationDataService.markAsRead(notification.id);
        // Optimistic update
        setNotifications(prev => prev.map(n =>
          n.id === notification.id ? { ...n, status: 'read' as const } : n
        ));
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    }

    // Navigate to target if available
    if (notification.target?.url) {
      navigate(notification.target.url);
    }
  };

  /**
   * Handle mark all as read
   * Updates all unread notifications to read status
   */
  const handleMarkAllRead = async () => {
    try {
      await notificationDataService.markAllAsRead();
      // Optimistic update - mark all as read
      setNotifications(prev => prev.map(n => ({ ...n, status: 'read' as const })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      setError('Failed to mark all as read. Please try again.');
    }
  };

  /**
   * Handle delete notification
   * Removes notification from list
   */
  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigation

    try {
      await notificationDataService.deleteNotification(notificationId);
      // Optimistic update - remove from list
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Failed to delete notification:', err);
      // Don't set loading to false here, keep showing the notification in UI on error
      // Just log the error
    }
  };

  /**
   * Handle load more
   * Fetches additional notifications for pagination
   */
  const handleLoadMore = async () => {
    try {
      setLoading(true);
      const result = await notificationDataService.getNotifications({ limit: 100 });

      if (result.status === 'success') {
        setNotifications(prev => [...prev, ...result.data]);
        setHasMore(result.data.length >= 100);
      }
    } catch (err) {
      console.error('Failed to load more:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if there are any unread notifications
   * Used to conditionally show "Mark all as read" button
   */
  const hasUnreadNotifications = notifications.some(n => n.status === 'unread');

  // ============================================================================
  // RENDER - Using discriminated union pattern for state management
  // ============================================================================

  // Loading state
  if (loading && notifications.length === 0) {
    return (
      <div className="notifications-page">
        <div className="notifications-page__container">
          <NotificationsLoading />
        </div>
      </div>
    );
  }

  // Error state (with retry)
  if (error && notifications.length === 0) {
    return (
      <div className="notifications-page">
        <div className="notifications-page__container">
          <NotificationsError
            message={error}
            onRetry={loadNotifications}
          />
        </div>
      </div>
    );
  }

  // Empty state
  if (notifications.length === 0) {
    return (
      <div className="notifications-page">
        <div className="notifications-page__container">
          <NotificationsHeader
            hasUnreadNotifications={false}
            onMarkAllAsRead={handleMarkAllRead}
          />
          <NotificationsEmpty />
        </div>
      </div>
    );
  }

  // Success state - Main notifications list
  return (
    <div className="notifications-page">
      <div className="notifications-page__container">
        {/* Header with conditional "Mark all as read" button */}
        <NotificationsHeader
          hasUnreadNotifications={hasUnreadNotifications}
          onMarkAllAsRead={handleMarkAllRead}
          disabled={loading}
        />

        {/* Grouped notifications list */}
        <NotificationsList
          notifications={notifications}
          onClick={handleNotificationClick}
          onDelete={handleDeleteNotification}
        />

        {/* Load more button (pagination) */}
        {hasMore && (
          <LoadMoreButton
            onClick={handleLoadMore}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};
