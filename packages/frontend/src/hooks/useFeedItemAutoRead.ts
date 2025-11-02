import { useMutation, graphql } from 'react-relay';
import { useState, useCallback } from 'react';
import type { useFeedItemAutoReadMutation } from './__generated__/useFeedItemAutoReadMutation.graphql';

/**
 * Hook to mark feed items as read using Relay mutation
 *
 * Uses Relay mutation with optimistic updates for better UX.
 *
 * @returns {object} Object containing markAsRead function, isInFlight state, and error state
 *
 * @example
 * ```tsx
 * const { markAsRead, isInFlight, error } = useFeedItemAutoRead();
 *
 * // Mark single post as read
 * markAsRead('post-123');
 *
 * // Mark multiple posts as read
 * markAsRead(['post-1', 'post-2', 'post-3']);
 * ```
 */
export function useFeedItemAutoRead() {
  const [error, setError] = useState<Error | undefined>();

  const [commit, isInFlight] = useMutation<useFeedItemAutoReadMutation>(
    graphql`
      mutation useFeedItemAutoReadMutation($postIds: [ID!]!) {
        markFeedItemsAsRead(postIds: $postIds) {
          updatedCount
        }
      }
    `
  );

  const markAsRead = useCallback((postIds: string | string[]) => {
    const ids = Array.isArray(postIds) ? postIds : [postIds];

    commit({
      variables: { postIds: ids },
      optimisticResponse: {
        markFeedItemsAsRead: {
          updatedCount: ids.length,
        },
      },
      onError: (err) => {
        setError(err);
        // Silent failure - mark-as-read is not critical UX
        console.warn('Failed to mark posts as read:', err);
      },
      onCompleted: () => {
        setError(undefined);
      },
    });
  }, [commit]);

  return {
    markAsRead,
    isInFlight,
    error,
  };
}
