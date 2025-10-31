/**
 * GraphQL Notification Operations
 *
 * Defines all notification-related queries and mutations.
 * Used by NotificationDataService for backend communication.
 */

export const GET_UNREAD_COUNT_QUERY = `
  query GetUnreadNotificationCount {
    unreadNotificationsCount
  }
`;

export const GET_NOTIFICATIONS_QUERY = `
  query GetNotifications($limit: Int, $cursor: String) {
    notifications(limit: $limit, cursor: $cursor) {
      edges {
        node {
          id
          userId
          type
          title
          message
          status
          createdAt
          readAt
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
