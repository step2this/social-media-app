/**
 * NotificationItemRelay - Relay Fragment Component
 *
 * This component demonstrates Relay's fragment pattern.
 * It declares its data requirements using a GraphQL fragment,
 * ensuring it only receives exactly the data it needs.
 *
 * Benefits:
 * - Colocation: data requirements live with the component
 * - Type safety: generated types from fragment
 * - Composability: parent queries include this fragment
 * - No overfetching: only requests needed fields
 */

import { useFragment, graphql } from 'react-relay';
import type { NotificationItemRelay_notification$key } from './__generated__/NotificationItemRelay_notification.graphql';
import './NotificationItem.css';

/**
 * Fragment defining data requirements for NotificationItem
 *
 * This fragment will be included in parent queries using:
 * ...NotificationItemRelay_notification
 */
const NotificationItemFragment = graphql`
  fragment NotificationItemRelay_notification on Notification {
    id
    type
    title
    message
    status
    createdAt
    actor {
      userId
      handle
      displayName
      avatarUrl
    }
    target {
      type
      id
      url
      preview
    }
  }
`;

/**
 * Props for NotificationItemRelay
 *
 * The notification prop is a fragment reference (opaque type)
 * that Relay uses to ensure type safety.
 */
export interface NotificationItemRelayProps {
  readonly notification: NotificationItemRelay_notification$key;
  readonly onClick?: () => void;
}

/**
 * NotificationItemRelay Component
 *
 * Displays a single notification in the dropdown.
 * Uses useFragment to read data from the fragment reference.
 *
 * @example
 * ```tsx
 * // In parent component:
 * <NotificationItemRelay
 *   notification={edge.node}
 *   onClick={() => markAsRead(edge.node.id)}
 * />
 * ```
 */
export function NotificationItemRelay({
  notification: notificationRef,
  onClick,
}: NotificationItemRelayProps): JSX.Element {
  // useFragment reads data from the fragment reference
  // and provides it with full type safety
  const notification = useFragment(NotificationItemFragment, notificationRef);

  // Determine if notification is unread
  const isUnread = notification.status === 'UNREAD';

  // Format timestamp
  const timeAgo = formatTimeAgo(notification.createdAt);

  // Get notification icon based on type
  const icon = getNotificationIcon(notification.type);

  return (
    <div
      className={`notification-item ${isUnread ? 'unread' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Unread indicator */}
      {isUnread && <div className="notification-unread-dot" />}

      {/* Actor avatar */}
      {notification.actor && (
        <div className="notification-avatar">
          {notification.actor.avatarUrl ? (
            <img
              src={notification.actor.avatarUrl}
              alt={notification.actor.displayName || notification.actor.handle}
              className="avatar-image"
            />
          ) : (
            <div className="avatar-placeholder">
              {(notification.actor.displayName || notification.actor.handle)[0].toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Notification content */}
      <div className="notification-content">
        <div className="notification-header">
          <span className="notification-icon">{icon}</span>
          <span className="notification-title">{notification.title}</span>
        </div>

        <p className="notification-message">{notification.message}</p>

        {notification.target?.preview && (
          <p className="notification-preview">{notification.target.preview}</p>
        )}

        <span className="notification-time">{timeAgo}</span>
      </div>
    </div>
  );
}

/**
 * Get notification icon emoji based on type
 */
function getNotificationIcon(type: string): string {
  switch (type) {
    case 'LIKE':
      return '❤️';
    case 'COMMENT':
      return '💬';
    case 'FOLLOW':
      return '👤';
    case 'MENTION':
      return '@';
    case 'SYSTEM':
      return '📢';
    default:
      return '🔔';
  }
}

/**
 * Format timestamp to relative time
 */
function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return time.toLocaleDateString();
}

// Export alias for backward compatibility
export { NotificationItemRelay as NotificationItem };
