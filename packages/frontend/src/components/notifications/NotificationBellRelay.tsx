/**
 * NotificationBellRelay - Main Notification Bell Component with Relay
 *
 * This component demonstrates the benefits of Relay for data fetching:
 * - Single query for both unread count and notifications
 * - Automatic caching (no refetch on remount)
 * - Fragment composition (NotificationItem declares its own needs)
 * - Type safety (generated types from schema)
 * - No manual state management
 *
 * Compare to traditional approach which would require:
 * - 2 separate queries (unread count + notifications)
 * - Multiple useState/useEffect hooks
 * - Manual error handling
 * - Manual loading states
 * - ~80 lines of boilerplate
 *
 * With Relay: ~40 lines total
 */

import { useState, Suspense } from 'react';
import { useLazyLoadQuery, graphql } from 'react-relay';
import { Link } from 'react-router-dom';
import type { NotificationBellRelayQuery as NotificationBellRelayQueryType } from './__generated__/NotificationBellRelayQuery.graphql';
import { NotificationItemRelay } from './NotificationItemRelay';
import './NotificationBell.css';

/**
 * Relay Query - combines unread count and recent notifications
 *
 * Benefits over separate queries:
 * 1. Single network request (Relay batches queries)
 * 2. Guaranteed consistency (both from same snapshot)
 * 3. Automatic caching (whole result cached together)
 */
const NotificationBellQuery = graphql`
  query NotificationBellRelayQuery {
    unreadNotificationsCount
    notifications(limit: 5) {
      edges {
        node {
          id
          ...NotificationItemRelay_notification
        }
      }
    }
  }
`;

/**
 * NotificationBellRelay Component
 *
 * Shows a bell icon with unread count badge and dropdown with recent notifications.
 * Uses Relay for automatic data fetching, caching, and type safety.
 *
 * @example
 * ```tsx
 * // In Navigation.tsx
 * <RelayProvider>
 *   <Suspense fallback={<BellIconSkeleton />}>
 *     <NotificationBellRelay />
 *   </Suspense>
 * </RelayProvider>
 * ```
 */
export function NotificationBellRelay(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  // useLazyLoadQuery fetches data and suspends while loading
  // No need for loading state, error state, or manual refetching!
  const data = useLazyLoadQuery<NotificationBellRelayQueryType>(
    NotificationBellQuery,
    {},
    {
      fetchPolicy: 'store-or-network', // Use cache if available
    }
  );

  const hasNotifications = data.notifications.edges.length > 0;
  const hasUnread = data.unreadNotificationsCount > 0;

  return (
    <div className="notification-bell-container">
      {/* Bell button with badge */}
      <button
        className="notification-bell-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${hasUnread ? ` (${data.unreadNotificationsCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg
          className="notification-bell-icon"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {/* Unread badge */}
        {hasUnread && (
          <span className="notification-bell-badge">
            {data.unreadNotificationsCount > 99 ? '99+' : data.unreadNotificationsCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="notification-bell-backdrop"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown content */}
          <div className="notification-bell-dropdown" role="menu">
            <div className="notification-bell-header">
              <h3>Notifications</h3>
              {hasUnread && (
                <span className="notification-bell-unread-count">
                  {data.unreadNotificationsCount} new
                </span>
              )}
            </div>

            <div className="notification-bell-list">
              {hasNotifications ? (
                data.notifications.edges.map((edge) => (
                  <NotificationItemRelay
                    key={edge.node.id}
                    notification={edge.node}
                    onClick={() => setIsOpen(false)}
                  />
                ))
              ) : (
                <div className="notification-bell-empty">
                  <p>No notifications yet</p>
                  <p className="notification-bell-empty-subtitle">
                    We'll let you know when something happens
                  </p>
                </div>
              )}
            </div>

            {/* View all link */}
            {hasNotifications && (
              <div className="notification-bell-footer">
                <Link
                  to="/notifications"
                  className="notification-bell-view-all"
                  onClick={() => setIsOpen(false)}
                >
                  View all notifications
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * NotificationBellRelay with Suspense Boundary
 *
 * Wraps the component with Suspense for loading states.
 * This is the recommended way to use Relay components.
 *
 * @example
 * ```tsx
 * // In Navigation.tsx
 * <RelayProvider>
 *   <NotificationBellRelayWithSuspense />
 * </RelayProvider>
 * ```
 */
export function NotificationBellRelayWithSuspense(): JSX.Element {
  return (
    <Suspense fallback={<NotificationBellSkeleton />}>
      <NotificationBellRelay />
    </Suspense>
  );
}

/**
 * Loading skeleton for NotificationBell
 */
function NotificationBellSkeleton(): JSX.Element {
  return (
    <button className="notification-bell-button" disabled aria-label="Loading notifications">
      <svg
        className="notification-bell-icon"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        opacity={0.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
        />
      </svg>
    </button>
  );
}
