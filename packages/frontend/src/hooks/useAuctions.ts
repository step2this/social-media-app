import { useState, useCallback, useEffect } from 'react';
import { auctionService } from '../services/auctionService.js';
import type { Auction } from '../graphql/operations/auctions.js';

/**
 * Options for useAuctions hook
 * Status values match AuctionStatus enum (uppercase)
 */
export interface UseAuctionsOptions {
  status?: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  userId?: string;
}

/**
 * Hook for fetching and managing a list of auctions
 * Supports pagination and filtering
 * Uses readonly arrays to prevent accidental mutations
 */
export const useAuctions = (options: UseAuctionsOptions = {}) => {
  // Destructure options for useCallback dependencies
  const { status, userId } = options;
  
  const [auctions, setAuctions] = useState<readonly Auction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);

  /**
   * Fetch auctions from API
   */
  const fetchAuctions = useCallback(
    async (cursor?: string, append = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await auctionService.listAuctions({
          status,
          userId,
          cursor
        });

        if (response.status === 'success') {
          // Direct assignment - readonly arrays work with React state
          if (append) {
            setAuctions(prev => [...prev, ...response.data.auctions]);
          } else {
            setAuctions(response.data.auctions);
          }

          setNextCursor(response.data.nextCursor ?? undefined);
          setHasMore(response.data.hasMore);
          setError(null);
        } else if (response.status === 'error') {
          setError(response.error.message);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch auctions';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [status, userId]
  );

  /**
   * Load more auctions (pagination)
   */
  const loadMore = useCallback(async () => {
    // Don't load if already loading or no more results
    if (isLoading || !hasMore) {
      return;
    }

    await fetchAuctions(nextCursor, true);
  }, [isLoading, hasMore, nextCursor, fetchAuctions]);

  /**
   * Refetch auctions from the beginning
   */
  const refetch = useCallback(async () => {
    await fetchAuctions(undefined, false);
  }, [fetchAuctions]);

  /**
   * Fetch auctions on mount
   */
  useEffect(() => {
    fetchAuctions();
  }, [fetchAuctions]);

  return {
    // State
    auctions,
    isLoading,
    error,
    hasMore,

    // Actions
    refetch,
    loadMore
  };
};
