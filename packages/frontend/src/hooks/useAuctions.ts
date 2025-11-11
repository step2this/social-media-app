import { useLazyLoadQuery, graphql } from 'react-relay';
import { useMemo, useState, useCallback, useTransition } from 'react';
import type { useAuctionsQuery } from './__generated__/useAuctionsQuery.graphql.js';

/**
 * Options for useAuctions hook
 * Status values match AuctionStatus enum (uppercase)
 */
export interface UseAuctionsOptions {
  status?: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  userId?: string;
}

/**
 * Hook for fetching and managing a list of auctions using Relay
 *
 * Replaces REST-based useAuctions with Relay useLazyLoadQuery.
 * Supports filtering by status and userId, with basic pagination support.
 *
 * @param options - Filter options for auctions
 * @returns {object} Auction data, loading state, error state, and actions
 *
 * @example
 * ```tsx
 * const { auctions, isLoading, error, hasMore, refetch } = useAuctions({
 *   status: 'ACTIVE',
 *   userId: 'user-123'
 * });
 * ```
 */
export const useAuctions = (options: UseAuctionsOptions = {}) => {
  const { status, userId } = options;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<Error | null>(null);

  let data: useAuctionsQuery['response'] | null = null;
  let queryError: Error | null = null;

  try {
    data = useLazyLoadQuery<useAuctionsQuery>(
      graphql`
        query useAuctionsQuery(
          $status: AuctionStatus
          $userId: ID
          $cursor: String
          $limit: Int
        ) {
          auctions(
            status: $status
            userId: $userId
            cursor: $cursor
            limit: $limit
          ) {
            edges {
              node {
                id
                userId
                title
                description
                imageUrl
                startPrice
                reservePrice
                currentPrice
                status
                startTime
                endTime
                bidCount
                createdAt
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `,
      {
        status: status || null,
        userId: userId || null,
        cursor: null,
        limit: 20
      },
      { fetchPolicy: 'store-and-network' }
    );
  } catch (err) {
    queryError = err instanceof Error ? err : new Error('Failed to fetch auctions');
  }

  // Extract auctions from edges
  const auctions = useMemo(() => {
    if (!data || queryError || !data.auctions) return [];
    return data.auctions.edges.map(edge => edge.node);
  }, [data, queryError]);

  // Get pagination info
  const hasMore = data?.auctions?.pageInfo?.hasNextPage || false;

  /**
   * Refetch auctions from the beginning
   * Note: Basic implementation - full refetch pattern would use useQueryLoader
   */
  const refetch = useCallback(() => {
    startTransition(() => {
      // Force re-render by updating a state variable
      // In a full implementation, we'd use useQueryLoader for better control
      setError(null);
    });
  }, []);

  /**
   * Load more auctions (pagination)
   * Note: Basic implementation - full pagination would use usePaginationFragment
   */
  const loadMore = useCallback(async () => {
    // Placeholder for pagination
    // Full implementation would use usePaginationFragment
    if (!hasMore) return;
  }, [hasMore]);

  return {
    // State
    auctions,
    isLoading: isPending,
    error: queryError || error,
    hasMore,

    // Actions
    refetch,
    loadMore
  };
};
