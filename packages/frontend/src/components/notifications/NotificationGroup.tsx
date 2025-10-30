/**
 * NotificationGroup Component
 *
 * Composite component that renders a section of notifications with a title
 * Groups notifications by time period (Today, Yesterday, etc.)
 *
 * @example
 * ```tsx
 * <NotificationGroup
 *   title="Today"
 *   notifications={todayNotifications}
 *   onClick={(notif) => handleClick(notif)}
 *   onDelete={(id, e) => handleDelete(id, e)}
 * />
 * ```
 */

import React from 'react';
import { NotificationItem } from './NotificationItem';
import type { Notification } from '@social-media-app/shared';
import type { VoidCallback } from '../../pages/NotificationsPage.types';

/**
 * NotificationGroup Props
 * Using Pick utility type and generic callback types
 */
export interface NotificationGroupProps {
  readonly title: string;
  readonly notifications: ReadonlyArray<Notification>;
  readonly onClick: VoidCallback<[Notification]>;
  readonly onDelete: VoidCallback<[string, React.MouseEvent]>;
}

/**
 * NotificationGroup Component
 *
 * Renders a group of notifications with:
 * - Section title (e.g., "Today", "Yesterday")
 * - List of NotificationItem components
 * - Conditional rendering (hidden if no notifications)
 *
 * Props are type-safe using NotificationGroupProps interface
 */
export const NotificationGroup: React.FC<NotificationGroupProps> = ({
  title,
  notifications,
  onClick,
  onDelete
}) => {
  // Don't render if no notifications in this group
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notifications-group">
      {/* Group title */}
      <h3 className="notifications-group__title">{title}</h3>

      {/* Notification items */}
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClick={onClick}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
