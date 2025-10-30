/**
 * NotificationsHeader Component
 * 
 * Composite component that renders the page header with "Mark all as read" functionality
 * Uses advanced TypeScript types for props validation
 * 
 * @example
 * ```tsx
 * <NotificationsHeader
 *   hasUnreadNotifications={true}
 *   onMarkAllAsRead={() => handleMarkAllAsRead()}
 *   disabled={loading}
 * />
 * ```
 */

import React from 'react';
import type { VoidCallback } from '../../pages/NotificationsPage.types';

/**
 * NotificationsHeader Props
 * Using VoidCallback generic type for type-safe callbacks
 */
export interface NotificationsHeaderProps {
  readonly hasUnreadNotifications: boolean;
  readonly onMarkAllAsRead: VoidCallback;
  readonly disabled?: boolean;
}

/**
 * NotificationsHeader Component
 * 
 * Renders the notifications page header with:
 * - Page title ("Notifications")
 * - Conditional "Mark all as read" button (only shown when unread notifications exist)
 * - Disabled state support for loading scenarios
 * 
 * Props are type-safe using NotificationsHeaderProps interface
 */
export const NotificationsHeader: React.FC<NotificationsHeaderProps> = ({
  hasUnreadNotifications,
  onMarkAllAsRead,
  disabled = false
}) => {
  return (
    <div className="notifications-page__header">
      {/* Page title */}
      <h1 className="notifications-page__title">Notifications</h1>

      {/* Mark all as read button - only show if there are unread notifications */}
      {hasUnreadNotifications && (
        <button
          onClick={onMarkAllAsRead}
          disabled={disabled}
          className="notifications-page__mark-read-btn"
        >
          Mark all as read
        </button>
      )}
    </div>
  );
};
