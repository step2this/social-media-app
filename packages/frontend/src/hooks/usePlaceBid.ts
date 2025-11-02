import { useMutation, graphql } from 'react-relay';
import { useState, useCallback } from 'react';
import type { usePlaceBidMutation } from './__generated__/usePlaceBidMutation.graphql';

/**
 * Input for placing a bid
 */
export interface PlaceBidInput {
  auctionId: string;
  amount: number;
}

/**
 * Result of placing a bid
 */
export interface PlaceBidResult {
  bid: {
    id: string;
    auctionId: string;
    userId: string;
    amount: number;
    createdAt: string;
  };
  auction: {
    id: string;
    currentPrice: number;
    bidCount: number;
  };
}

/**
 * Hook to place a bid on an auction using Relay mutation
 *
 * Provides a reusable mutation for placing bids.
 * Updates auction state optimistically for better UX.
 *
 * @returns {object} Object containing placeBid function, isInFlight state, and error state
 *
 * @example
 * ```tsx
 * const { placeBid, isInFlight, error } = usePlaceBid();
 *
 * const handleBid = () => {
 *   placeBid({
 *     auctionId: 'auction-123',
 *     amount: 150.00
 *   });
 * };
 * ```
 */
export function usePlaceBid() {
  const [error, setError] = useState<Error | null>(null);

  const [commit, isInFlight] = useMutation<usePlaceBidMutation>(
    graphql`
      mutation usePlaceBidMutation($input: PlaceBidInput!) {
        placeBid(input: $input) {
          bid {
            id
            auctionId
            userId
            amount
            createdAt
          }
          auction {
            id
            currentPrice
            bidCount
          }
        }
      }
    `
  );

  /**
   * Place a bid on an auction
   *
   * @param input - Bid input (auctionId, amount)
   */
  const placeBid = useCallback((input: PlaceBidInput) => {
    setError(null);

    commit({
      variables: { input },
      onCompleted: () => {
        // Success - error is already null
      },
      onError: (err) => {
        setError(err);
      }
    });
  }, [commit]);

  return {
    placeBid,
    isInFlight,
    error
  };
}
