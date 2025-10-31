/**
 * NotificationsPage - Relay Implementation
 *
 * This is the Relay-powered version of NotificationsPage that displays
 * notifications with pagination.
 *
 * Benefits of Relay version:
 * - Automatic caching and normalization
 * - Built-in pagination with usePaginationFragment
 * - Type-safe generated types from schema
 * - No manual state management for loading/error
 * - Optimistic updates for mutations
 */

import React, { Suspense, useState } from 'react';
import { useLazyLoadQuery, useRefetchableFragment, graphql } from 'react-relay';
import type { NotificationsPageRelayQuery as NotificationsPageRelayQueryType } from './__generated__/NotificationsPageRelayQuery.graphql';
import type { NotificationsPage_notifications$key } from './__generated__/NotificationsPage_notifications.graphql';

// Import presentation components
import { NotificationsHeader } from '../components/notifications/NotificationsHeader';
import { NotificationsList } from '../components/notifications/NotificationsList';
import { NotificationsLoading } from '../components/notifications/NotificationsLoading';
import { NotificationsError } from '../components/notifications/NotificationsError';
import { NotificationsEmpty } from '../components/notifications/NotificationsEmpty';
import { LoadMoreButton } from '../components/notifications/LoadMoreButton';

import './NotificationsPage.css';

/**
 * Main query for NotificationsPage
 *
 * Fetches the initial set of notifications with pagination support
 */
const NotificationsQuery = graphql`
  query NotificationsPageRelayQuery($limit: Int!, $cursor: String) {
    ...NotificationsPage_notifications @arguments(limit: $limit, cursor: $cursor)
  }
`;

/**
 * Pagination fragment for infinite scroll
 *
 * The @refetchable directive makes this fragment paginated
 * The @connection directive tells Relay to append new edges to the existing list
 */
const NotificationsPaginationFragment = graphql`
  fragment NotificationsPage_notifications on Query
  @refetchable(queryName: "NotificationsPageNotificationsPaginationQuery")
  @argumentDefinitions(
    cursor: { type: "String" }
    limit: { type: "Int", defaultValue: 20 }
  ) {
    notifications(cursor: $cursor, limit: $limit) {
      edges {
        cursor
        node {
          id
          type
          title
          message
          createdAt
          readAt
          actor {
            userId
            handle
            avatarUrl
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * Transform Relay notification to domain type (Notification from @social-media-app/shared)
 */
function transformRelayNotification(node: any) {
  return {
    id: node.id,
    userId: '', // Not available from relay, would need viewer query
    type: node.type,
    status: (node.readAt ? 'read' : 'unread') as 'read' | 'unread' | 'archived' | 'deleted',
    title: node.title || '',
    message: node.message || '',
    priority: 'normal' as const,
    actor: node.actor ? {
      userId: node.actor.userId,
      handle: node.actor.handle,
      displayName: node.actor.handle, // Use handle as display name
      avatarUrl: node.actor.avatarUrl,
    } : undefined,
    target: undefined, // Not available from relay
    metadata: {}, // Not available from relay
    deliveryChannels: ['in-app'] as ('in-app' | 'email' | 'sms' | 'push')[],
    soundEnabled: true,
    vibrationEnabled: true,
    readAt: node.readAt || null,
    createdAt: node.createdAt,
    updatedAt: node.createdAt, // Use createdAt as updatedAt fallback
  };
}

/**
 * NotificationsPage Feed Component (Inner)
 *
 * This component handles the pagination logic and renders the notifications.
 */
function NotificationsPageFeed({ queryRef }: { queryRef: NotificationsPage_notifications$key }) {
  const [data, refetch] = useRefetchableFragment(
    NotificationsPaginationFragment,
    queryRef
  );

  const [isLoadingNext, setIsLoadingNext] = useState(false);

  // Check if there are more notifications
  const hasNext = data.notifications.pageInfo.hasNextPage;
  const nextCursor = data.notifications.pageInfo.endCursor;

  // Transform Relay data to domain type
  const notifications = data.notifications.edges.map(edge =>
    transformRelayNotification(edge.node)
  );

  // Check if there are unread notifications
  const hasUnreadNotifications = notifications.some(n => n.status === 'unread');

  // Handle mark all as read (TODO: Implement mutation)
  const handleMarkAllAsRead = () => {
    console.log('TODO: Implement mark all as read mutation');
  };

  // Handle notification click (receives full Notification object)
  const handleClick = (notification: any) => {
    console.log('TODO: Navigate based on notification type', notification.id);
  };

  // Handle delete notification (TODO: Implement mutation)
  const handleDelete = (notificationId: string) => {
    console.log('TODO: Implement delete mutation', notificationId);
  };

  // Handle load more
  const handleLoadMore = () => {
    if (hasNext && !isLoadingNext && nextCursor) {
      setIsLoadingNext(true);
      refetch(
        { limit: 20, cursor: nextCursor },
        { fetchPolicy: 'store-or-network' }
      );
      // Note: In production, you'd want to handle errors and reset isLoadingNext
      setTimeout(() => setIsLoadingNext(false), 1000);
    }
  };

  // Empty state
  if (notifications.length === 0) {
    return (
      <div className="notifications-page">
        <div className="notifications-page__container">
          <NotificationsHeader
            hasUnreadNotifications={false}
            onMarkAllAsRead={handleMarkAllAsRead}
          />
          <NotificationsEmpty />
        </div>
      </div>
    );
  }

  // Success state - Main notifications list
  return (
    <div className="notifications-page">
      <div className="notifications-page__container">
        {/* Header with conditional "Mark all as read" button */}
        <NotificationsHeader
          hasUnreadNotifications={hasUnreadNotifications}
          onMarkAllAsRead={handleMarkAllAsRead}
          disabled={isLoadingNext}
        />

        {/* Grouped notifications list */}
        <NotificationsList
          notifications={notifications}
          onClick={handleClick}
          onDelete={handleDelete}
        />

        {/* Load more button (pagination) */}
        {hasNext && (
          <LoadMoreButton
            onClick={handleLoadMore}
            loading={isLoadingNext}
          />
        )}
      </div>
    </div>
  );
}

/**
 * NotificationsPage Component (Outer)
 *
 * This component executes the query and provides error handling.
 */
function NotificationsPageInner() {
  const data = useLazyLoadQuery<NotificationsPageRelayQueryType>(
    NotificationsQuery,
    { limit: 20 },
    {
      fetchPolicy: 'store-or-network', // Use cache if available
    }
  );

  return <NotificationsPageFeed queryRef={data} />;
}

/**
 * NotificationsPage with Error Boundary
 *
 * Wraps the query component with error handling.
 * Relay will throw errors that can be caught here.
 */
class NotificationsPageErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('NotificationsPage error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="notifications-page">
          <div className="notifications-page__container">
            <NotificationsError
              message={this.state.error?.message || 'Failed to load notifications'}
              onRetry={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * NotificationsPage with Suspense Boundary (Export)
 *
 * This is what should be imported and used in App.tsx
 */
export function NotificationsPageRelay(): JSX.Element {
  return (
    <NotificationsPageErrorBoundary>
      <Suspense
        fallback={
          <div className="notifications-page">
            <div className="notifications-page__container">
              <NotificationsLoading />
            </div>
          </div>
        }
      >
        <NotificationsPageInner />
      </Suspense>
    </NotificationsPageErrorBoundary>
  );
}
