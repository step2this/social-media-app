/**
 * NotificationsEmpty Component
 *
 * State component that displays an empty state message
 * Shows when user has no notifications
 *
 * @example
 * ```tsx
 * {notifications.length === 0 && <NotificationsEmpty />}
 * ```
 */

import React from 'react';

/**
 * NotificationsEmpty Props
 */
export interface NotificationsEmptyProps {
  readonly message?: string;
}

/**
 * NotificationsEmpty Component
 *
 * Displays an empty state with:
 * - Icon representation
 * - Empty message (with sensible default)
 * - Friendly subtext
 *
 * Props are type-safe using NotificationsEmptyProps interface
 */
export const NotificationsEmpty: React.FC<NotificationsEmptyProps> = ({
  message = 'No notifications'
}) => {
  // Use default message if empty string provided
  const displayMessage = message.trim() || 'No notifications';

  return (
    <div className="notifications-page__empty">
      <div className="notifications-page__empty-icon">🔔</div>
      <h3>{displayMessage}</h3>
      <p>You're all caught up!</p>
    </div>
  );
};
