import { useState, useEffect, useCallback } from 'react';
import { auctionService } from '../services/auctionService.js';
import type { Auction } from '@social-media-app/shared';

/**
 * Options for useAuctions hook
 */
export interface UseAuctionsOptions {
  status?: 'pending' | 'active' | 'completed' | 'cancelled';
  userId?: string;
}

/**
 * Hook for fetching and managing a list of auctions
 * Supports pagination and filtering
 */
export const useAuctions = (options: UseAuctionsOptions = {}) => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
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
          ...options,
          cursor
        });

        if (append) {
          setAuctions(prev => [...prev, ...response.auctions]);
        } else {
          setAuctions(response.auctions);
        }

        setNextCursor(response.nextCursor);
        setHasMore(response.hasMore);
        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch auctions';
        setError(errorMessage);
        setIsLoading(false);
      }
    },
    [options.status, options.userId]
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
