/**
 * NotificationsList Component
 *
 * Container component that renders all notifications grouped by time periods
 * Uses groupNotificationsByTime utility to organize notifications
 *
 * @example
 * ```tsx
 * <NotificationsList
 *   notifications={notifications}
 *   onClick={(notif) => handleClick(notif)}
 *   onDelete={(id, e) => handleDelete(id, e)}
 * />
 * ```
 */

import React from 'react';
import { NotificationGroup } from './NotificationGroup';
import { groupNotificationsByTime } from '../../pages/NotificationsPage.utils';
import type { Notification } from '@social-media-app/shared';
import type { VoidCallback } from '../../pages/NotificationsPage.types';

/**
 * NotificationsList Props
 * Using VoidCallback generic types for type-safe callbacks
 */
export interface NotificationsListProps {
  readonly notifications: ReadonlyArray<Notification>;
  readonly onClick: VoidCallback<[Notification]>;
  readonly onDelete: VoidCallback<[string, React.MouseEvent]>;
}

/**
 * NotificationsList Component
 *
 * Main container that:
 * - Groups notifications by time period using groupNotificationsByTime utility
 * - Renders NotificationGroup components for each time period
 * - Only renders groups that have notifications
 * - Passes event handlers down to child components
 *
 * Props are type-safe using NotificationsListProps interface
 */
export const NotificationsList: React.FC<NotificationsListProps> = ({
  notifications,
  onClick,
  onDelete
}) => {
  // Group notifications by time periods
  const groups = groupNotificationsByTime(notifications);

  return (
    <div className="notifications-page__list">
      {/* Render each group if it has notifications */}
      <NotificationGroup
        title="Today"
        notifications={groups.today}
        onClick={onClick}
        onDelete={onDelete}
      />

      <NotificationGroup
        title="Yesterday"
        notifications={groups.yesterday}
        onClick={onClick}
        onDelete={onDelete}
      />

      <NotificationGroup
        title="This Week"
        notifications={groups.thisWeek}
        onClick={onClick}
        onDelete={onDelete}
      />

      <NotificationGroup
        title="This Month"
        notifications={groups.thisMonth}
        onClick={onClick}
        onDelete={onDelete}
      />

      <NotificationGroup
        title="Earlier"
        notifications={groups.earlier}
        onClick={onClick}
        onDelete={onDelete}
      />
    </div>
  );
};
