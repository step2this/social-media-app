/**
 * GraphQL Notification Operations
 *
 * Defines all notification-related queries and mutations.
 * Used by NotificationDataService for backend communication.
 */

export const GET_UNREAD_COUNT_QUERY = `
  query GetUnreadNotificationCount {
    unreadCount {
      count
    }
  }
`;

export const GET_NOTIFICATIONS_QUERY = `
  query GetNotifications($limit: Int, $cursor: String, $unreadOnly: Boolean) {
    notifications(limit: $limit, cursor: $cursor, unreadOnly: $unreadOnly) {
      edges {
        node {
          id
          type
          actorId
          actorUsername
          targetId
          message
          read
          createdAt
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const MARK_NOTIFICATIONS_AS_READ_MUTATION = `
  mutation MarkNotificationsAsRead($input: MarkNotificationsAsReadInput!) {
    markNotificationsAsRead(input: $input) {
      success
      markedCount
    }
  }
`;
