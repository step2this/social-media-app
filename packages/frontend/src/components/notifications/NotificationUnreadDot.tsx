/**
 * NotificationUnreadDot Component
 * 
 * Atomic component that displays a small dot indicator for unread notifications
 * Uses advanced TypeScript types for props validation
 * 
 * @example
 * ```tsx
 * <NotificationUnreadDot
 *   isUnread={true}
 *   ariaLabel="New notification"
 * />
 * ```
 */

import React from 'react';
import type { NotificationUnreadDotProps } from '../../pages/NotificationsPage.types';

/**
 * NotificationUnreadDot Component
 * 
 * Displays a visual indicator (dot) for unread notifications
 * Includes proper ARIA attributes for accessibility
 * 
 * Props are type-safe using NotificationUnreadDotProps from advanced types
 */
export const NotificationUnreadDot: React.FC<NotificationUnreadDotProps> = ({
  isUnread,
  ariaLabel = 'Unread notification'
}) => {
  // Don't render anything if notification is read
  if (!isUnread) {
    return null;
  }

  return (
    <div
      className="notification-item__unread-dot"
      role="status"
      aria-label={ariaLabel}
    />
  );
};
