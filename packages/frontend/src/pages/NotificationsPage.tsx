/**
 * NotificationsPage Component
 *
 * Pure presentation component that delegates all logic to hooks
 * Uses useNotificationsPage composite hook for complete functionality
 *
 * Advanced TypeScript patterns:
 * - Type inference from hook return
 * - Discriminated unions for state rendering
 * - Single Responsibility Principle (presentation only)
 * - Hook composition pattern
 *
 * Phase 11: Refactored to use custom hooks
 */

import React from 'react';
import { useServices } from '../services/ServiceProvider';
import { useNavigate } from 'react-router-dom';

// Import composite hook
import { useNotificationsPage } from '../hooks/useNotificationsPage';

// Import all presentation components
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
 * Pure presentation component that:
 * - Delegates all business logic to useNotificationsPage hook
 * - Renders UI based on hook state using discriminated unions
 * - Provides clean separation of concerns
 * - Maintains type safety with TypeScript inference
 */
export const NotificationsPage: React.FC = () => {
  const { notificationDataService } = useServices();
  const navigate = useNavigate();

  // Single hook call provides all functionality
  // TypeScript infers all types automatically from hook return
  const {
    notifications,
    loading,
    error,
    hasMore,
    hasUnreadNotifications,
    retry,
    loadMore,
    handleClick,
    markAllAsRead,
    deleteNotification
  } = useNotificationsPage(notificationDataService, navigate);

  // ============================================================================
  // RENDER - Using discriminated union pattern for state management
  // ============================================================================

  // Loading state - Initial load
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
            onRetry={retry}
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
            onMarkAllAsRead={markAllAsRead}
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
          onMarkAllAsRead={markAllAsRead}
          disabled={loading}
        />

        {/* Grouped notifications list */}
        <NotificationsList
          notifications={notifications}
          onClick={handleClick}
          onDelete={deleteNotification}
        />

        {/* Load more button (pagination) */}
        {hasMore && (
          <LoadMoreButton
            onClick={loadMore}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};
