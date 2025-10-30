/**
 * NotificationContent Component
 * 
 * Atomic component that displays notification text, preview, and timestamp
 * Uses advanced TypeScript types for props validation
 * 
 * @example
 * ```tsx
 * <NotificationContent
 *   type="like"
 *   message="John liked your post"
 *   createdAt={notification.createdAt}
 *   actor={notification.actor}
 *   preview="Optional preview text"
 * />
 * ```
 */

import React from 'react';
import { getNotificationText, formatTimestamp } from '../../pages/NotificationsPage.utils';
import type { NotificationContentProps } from '../../pages/NotificationsPage.types';

/**
 * NotificationContent Component
 * 
 * Displays the main content of a notification including:
 * - Formatted notification text
 * - Optional preview text
 * - Relative timestamp
 * 
 * Props are type-safe using NotificationContentProps from advanced types
 */
export const NotificationContent: React.FC<NotificationContentProps> = ({
  type,
  message,
  createdAt,
  actor,
  preview
}) => {
  // Create a minimal notification object for getNotificationText
  const notification = {
    type,
    message,
    actor,
    target: undefined
  };

  // Get formatted notification text
  const formattedText = getNotificationText(notification as any);

  // Get formatted timestamp
  const formattedTimestamp = formatTimestamp(createdAt);

  return (
    <div className="notification-item__content">
      {/* Main notification text */}
      <div className="notification-item__text">
        {formattedText}
      </div>

      {/* Optional preview text (for comments, etc.) */}
      {preview && preview.trim() && (
        <div className="notification-item__preview">
          {preview}
        </div>
      )}

      {/* Relative timestamp */}
      <div className="notification-item__time">
        {formattedTimestamp}
      </div>
    </div>
  );
};
