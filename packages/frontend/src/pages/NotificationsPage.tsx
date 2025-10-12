import React, { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/notificationService';
import type { Notification } from '@social-media-app/shared';
import { MaterialIcon } from '../components/common/MaterialIcon';
import { useNavigate } from 'react-router-dom';
import './NotificationsPage.css';

/**
 * Group notifications by time periods
 * Returns notifications organized by today, yesterday, this week, this month, and earlier
 */
function groupNotificationsByTime(notifications: Notification[]) {
  const now = new Date();
  const groups: Record<string, Notification[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    earlier: []
  };

  notifications.forEach(notif => {
    const age = now.getTime() - new Date(notif.createdAt).getTime();
    const days = age / (1000 * 60 * 60 * 24);

    if (days < 1) {
      groups.today.push(notif);
    } else if (days < 2) {
      groups.yesterday.push(notif);
    } else if (days < 7) {
      groups.thisWeek.push(notif);
    } else if (days < 30) {
      groups.thisMonth.push(notif);
    } else {
      groups.earlier.push(notif);
    }
  });

  return groups;
}

/**
 * Get human-readable notification text based on notification type
 */
function getNotificationText(notification: Notification): string {
  const actorName = notification.actor?.displayName || notification.actor?.handle || 'Someone';

  switch (notification.type) {
    case 'like':
      return `${actorName} liked your ${notification.target?.type || 'post'}`;
    case 'comment':
      return `${actorName} commented on your post`;
    case 'follow':
      return `${actorName} started following you`;
    case 'mention':
      return `${actorName} mentioned you in a comment`;
    case 'reply':
      return `${actorName} replied to your comment`;
    case 'repost':
      return `${actorName} reposted your post`;
    case 'quote':
      return `${actorName} quoted your post`;
    default:
      return notification.message || notification.title;
  }
}

/**
 * Format timestamp to human-readable format (e.g., "1d", "2h", "5m")
 */
function formatTimestamp(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  if (diffWeeks < 4) return `${diffWeeks}w`;
  return `${Math.floor(diffDays / 30)}mo`;
}

/**
 * Get icon name for notification type
 */
function getNotificationIcon(type: string): string {
  switch (type) {
    case 'like':
      return 'favorite';
    case 'comment':
      return 'chat_bubble';
    case 'follow':
      return 'person_add';
    case 'mention':
      return 'alternate_email';
    case 'reply':
      return 'reply';
    case 'repost':
      return 'repeat';
    case 'quote':
      return 'format_quote';
    case 'system':
      return 'info';
    case 'announcement':
      return 'campaign';
    case 'achievement':
      return 'emoji_events';
    default:
      return 'notifications';
  }
}

/**
 * Get color class for notification type
 */
function getNotificationColor(type: string): string {
  switch (type) {
    case 'like':
      return 'notification-icon--like';
    case 'comment':
      return 'notification-icon--comment';
    case 'follow':
      return 'notification-icon--follow';
    case 'mention':
      return 'notification-icon--mention';
    default:
      return '';
  }
}

/**
 * NotificationsPage Component
 * Instagram-style notifications list page with time grouping and interaction
 */
export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  /**
   * Load notifications on mount
   */
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await notificationService.getNotifications(100);
      setNotifications(response.notifications);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  /**
   * Handle notification click - mark as read and navigate to target
   */
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (notification.status === 'unread') {
      try {
        await notificationService.markAsRead(notification.id);
        // Update local state
        setNotifications(prev => prev.map(n =>
          n.id === notification.id ? { ...n, status: 'read' as const } : n
        ));
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    }

    // Navigate to target if available
    if (notification.target?.url) {
      navigate(notification.target.url);
    }
  };

  /**
   * Mark all notifications as read
   */
  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, status: 'read' as const })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      setError('Failed to mark all as read. Please try again.');
    }
  };

  /**
   * Delete a notification
   */
  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent click from triggering navigation

    try {
      await notificationService.deleteNotification(notificationId);
      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Failed to delete notification:', err);
      setError('Failed to delete notification. Please try again.');
    }
  };

  /**
   * Render grouped notifications
   */
  const renderGroupedNotifications = () => {
    const groups = groupNotificationsByTime(notifications);
    const groupTitles = {
      today: 'Today',
      yesterday: 'Yesterday',
      thisWeek: 'This week',
      thisMonth: 'This month',
      earlier: 'Earlier'
    };

    return Object.entries(groups).map(([key, groupNotifications]) => {
      if (groupNotifications.length === 0) return null;

      return (
        <div key={key} className="notifications-page__group">
          <h2 className="notifications-page__group-title">
            {groupTitles[key as keyof typeof groupTitles]}
          </h2>
          <div className="notifications-page__group-items">
            {groupNotifications.map(notification => (
              <div
                key={notification.id}
                className={`notification-item ${
                  notification.status === 'unread' ? 'notification-item--unread' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                {/* Unread indicator */}
                {notification.status === 'unread' && (
                  <div className="notification-item__unread-dot" />
                )}

                {/* Avatar or icon */}
                <div className="notification-item__avatar">
                  {notification.actor?.avatarUrl ? (
                    <img
                      src={notification.actor.avatarUrl}
                      alt={notification.actor.displayName || notification.actor.handle}
                      className="notification-item__avatar-img"
                    />
                  ) : (
                    <div className={`notification-item__icon ${getNotificationColor(notification.type)}`}>
                      <MaterialIcon name={getNotificationIcon(notification.type)} size="md" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="notification-item__content">
                  <p className="notification-item__text">
                    {getNotificationText(notification)}
                  </p>
                  {notification.target?.preview && (
                    <p className="notification-item__preview">
                      {notification.target.preview}
                    </p>
                  )}
                  <span className="notification-item__timestamp">
                    {formatTimestamp(notification.createdAt)}
                  </span>
                </div>

                {/* Thumbnail (if post-related) */}
                {notification.target?.type === 'post' && notification.metadata?.thumbnailUrl && (
                  <div className="notification-item__thumbnail">
                    <img
                      src={notification.metadata.thumbnailUrl as string}
                      alt="Post thumbnail"
                      className="notification-item__thumbnail-img"
                    />
                  </div>
                )}

                {/* Delete button */}
                <button
                  className="notification-item__delete"
                  onClick={(e) => handleDeleteNotification(notification.id, e)}
                  aria-label="Delete notification"
                >
                  <MaterialIcon name="close" size="sm" />
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="notifications-page">
        <div className="notifications-page__container">
          <div className="notifications-page__loading">
            <div className="spinner"></div>
            <p>Loading notifications...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="notifications-page">
        <div className="notifications-page__container">
          <div className="notifications-page__error">
            <p className="notifications-page__error-message">{error}</p>
            <button onClick={loadNotifications} className="notifications-page__retry-btn">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (notifications.length === 0) {
    return (
      <div className="notifications-page">
        <div className="notifications-page__container">
          <div className="notifications-page__header">
            <h1>Notifications</h1>
          </div>
          <div className="notifications-page__empty">
            <MaterialIcon name="notifications_none" size="xl" />
            <p className="notifications-page__empty-message">
              No notifications yet. When someone likes, comments, or follows you, you'll see it here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main notifications list
  return (
    <div className="notifications-page">
      <div className="notifications-page__container">
        {/* Header with mark all as read button */}
        <div className="notifications-page__header">
          <h1>Notifications</h1>
          {notifications.some(n => n.status === 'unread') && (
            <button
              onClick={handleMarkAllRead}
              className="notifications-page__mark-all-btn"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Grouped notifications */}
        <div className="notifications-page__list">
          {renderGroupedNotifications()}
        </div>
      </div>
    </div>
  );
};
