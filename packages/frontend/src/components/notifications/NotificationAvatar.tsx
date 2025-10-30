/**
 * NotificationAvatar Component
 * 
 * Atomic component that displays either an avatar image or icon for notifications
 * Uses advanced TypeScript types for props validation
 * 
 * @example
 * ```tsx
 * // With avatar image
 * <NotificationAvatar
 *   avatarUrl="https://example.com/avatar.jpg"
 *   displayName="John Doe"
 *   handle="johndoe"
 *   notificationType="like"
 * />
 * 
 * // With icon (no avatar)
 * <NotificationAvatar
 *   notificationType="follow"
 *   handle="johndoe"
 * />
 * ```
 */

import React from 'react';
import { MaterialIcon } from '../common/MaterialIcon';
import { getNotificationIcon, getNotificationColor } from '../../pages/NotificationsPage.utils';
import type { NotificationAvatarProps } from '../../pages/NotificationsPage.types';

/**
 * NotificationAvatar Component
 * 
 * Displays avatar image if available, otherwise shows a type-appropriate icon
 * Uses Material Design icons with BEM-style CSS class names
 * 
 * Props are type-safe using NotificationAvatarProps from advanced types
 */
export const NotificationAvatar: React.FC<NotificationAvatarProps> = ({
  avatarUrl,
  displayName,
  handle,
  notificationType
}) => {
  // If avatar URL is provided, render image
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName || handle || 'User'}
        className="notification-item__avatar-img"
      />
    );
  }

  // Otherwise, render icon based on notification type
  return (
    <div className={`notification-item__icon ${getNotificationColor(notificationType)}`}>
      <MaterialIcon name={getNotificationIcon(notificationType)} size="md" />
    </div>
  );
};
