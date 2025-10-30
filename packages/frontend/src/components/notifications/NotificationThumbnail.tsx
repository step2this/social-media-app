/**
 * NotificationThumbnail Component
 *
 * Atomic component that displays a thumbnail image for post-related notifications
 * Uses advanced TypeScript types for props validation
 *
 * @example
 * ```tsx
 * <NotificationThumbnail
 *   thumbnailUrl="https://example.com/thumbnail.jpg"
 *   altText="Post preview"
 * />
 * ```
 */

import React from 'react';
import type { NotificationThumbnailProps } from '../../pages/NotificationsPage.types';

/**
 * NotificationThumbnail Component
 *
 * Displays a small preview thumbnail for notifications related to posts
 * Typically shown for like, comment, or other post-related activities
 *
 * Props are type-safe using NotificationThumbnailProps from advanced types
 */
export const NotificationThumbnail: React.FC<NotificationThumbnailProps> = ({
  thumbnailUrl,
  altText = 'Post thumbnail'
}) => {
  return (
    <div className="notification-item__thumbnail">
      <img
        src={thumbnailUrl}
        alt={altText}
        className="notification-item__thumbnail-img"
      />
    </div>
  );
};
