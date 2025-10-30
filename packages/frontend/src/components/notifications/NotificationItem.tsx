/**
 * NotificationItem Component
 * 
 * Composite component that combines all atomic notification components
 * Uses advanced TypeScript types for props validation
 * 
 * @example
 * ```tsx
 * <NotificationItem
 *   notification={notification}
 *   onClick={(notif) => handleClick(notif)}
 *   onDelete={(id, e) => handleDelete(id, e)}
 * />
 * ```
 */

import React from 'react';
import { NotificationAvatar } from './NotificationAvatar';
import { NotificationContent } from './NotificationContent';
import { NotificationThumbnail } from './NotificationThumbnail';
import { NotificationUnreadDot } from './NotificationUnreadDot';
import type { BaseNotificationItemProps } from '../../pages/NotificationsPage.types';

/**
 * NotificationItem Component
 * 
 * Composite component that:
 * - Combines NotificationAvatar, NotificationContent, NotificationThumbnail, and NotificationUnreadDot
 * - Handles click interactions with proper event bubbling control
 * - Applies conditional CSS classes based on read status
 * - Provides accessibility features (ARIA labels, keyboard support)
 * 
 * Props are type-safe using BaseNotificationItemProps from advanced types
 */
export const NotificationItem: React.FC<BaseNotificationItemProps> = ({
  notification,
  onClick,
  onDelete
}) => {
  // Determine if notification is unread
  const isUnread = notification.status === 'unread';

  // Determine if thumbnail should be shown
  const shouldShowThumbnail =
    notification.target?.type === 'post' &&
    notification.metadata?.thumbnailUrl &&
    typeof notification.metadata.thumbnailUrl === 'string';

  // Handle notification click
  const handleClick = () => {
    onClick(notification);
  };

  // Handle delete button click
  const handleDelete = (e: React.MouseEvent) => {
    // Stop propagation to prevent triggering the notification click
    e.stopPropagation();
    onDelete(notification.id, e);
  };

  // Handle keyboard interaction
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(notification);
    }
  };

  return (
    <div
      className={`notification-item ${isUnread ? 'notification-item--unread' : ''}`}
      onClick={handleClick}
      onKeyPress={handleKeyPress}
      role="button"
      tabIndex={0}
    >
      {/* Unread indicator dot */}
      <NotificationUnreadDot isUnread={isUnread} />

      {/* Avatar or icon */}
      <div className="notification-item__avatar">
        <NotificationAvatar
          avatarUrl={notification.actor?.avatarUrl}
          displayName={notification.actor?.displayName}
          handle={notification.actor?.handle}
          notificationType={notification.type}
        />
      </div>

      {/* Content (text, preview, timestamp) */}
      <NotificationContent
        type={notification.type}
        message={notification.message}
        createdAt={notification.createdAt}
        actor={notification.actor}
        preview={notification.target?.preview}
      />

      {/* Thumbnail (if post-related) */}
      {shouldShowThumbnail && (
        <NotificationThumbnail
          thumbnailUrl={notification.metadata!.thumbnailUrl as string}
          altText="Post thumbnail"
        />
      )}

      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="notification-item__delete"
        aria-label="Delete notification"
      >
        ×
      </button>
    </div>
  );
};
