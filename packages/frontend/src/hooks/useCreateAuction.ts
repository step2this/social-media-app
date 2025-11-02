import { useMutation, graphql } from 'react-relay';
import { useState, useCallback } from 'react';
import type { useCreateAuctionMutation } from './__generated__/useCreateAuctionMutation.graphql';

/**
 * Input for creating an auction
 */
export interface CreateAuctionInput {
  title: string;
  description: string;
  startPrice: number;
  reservePrice: number;
  startTime: string;
  endTime: string;
  fileType: string;
}

/**
 * Result of creating an auction
 */
export interface CreateAuctionResult {
  auction: {
    id: string;
    userId: string;
    title: string;
    description: string;
    imageUrl: string;
    startPrice: number;
    reservePrice: number;
    currentPrice: number;
    status: string;
    startTime: string;
    endTime: string;
    bidCount: number;
    createdAt: string;
  };
  uploadUrl: string;
}

/**
 * Hook to create an auction using Relay mutation
 *
 * Provides a reusable mutation for creating auctions with image upload URLs.
 * Follows the same pattern as useCreatePost (returns Promise with upload URL).
 *
 * @returns {object} Object containing createAuction function, isInFlight state, and error state
 *
 * @example
 * ```tsx
 * const { createAuction, isInFlight, error } = useCreateAuction();
 *
 * const handleCreate = async () => {
 *   const result = await createAuction({
 *     title: 'Rare Painting',
 *     description: 'Beautiful artwork',
 *     startPrice: 1000,
 *     reservePrice: 2000,
 *     startTime: new Date().toISOString(),
 *     endTime: new Date(Date.now() + 86400000 * 7).toISOString(),
 *     fileType: 'image/jpeg'
 *   });
 *
 *   if (result) {
 *     await uploadToS3(result.uploadUrl, file);
 *     navigate(`/auction/${result.auction.id}`);
 *   }
 * };
 * ```
 */
export function useCreateAuction() {
  const [error, setError] = useState<Error | null>(null);

  const [commit, isInFlight] = useMutation<useCreateAuctionMutation>(
    graphql`
      mutation useCreateAuctionMutation($input: CreateAuctionInput!) {
        createAuction(input: $input) {
          auction {
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
          uploadUrl
        }
      }
    `
  );

  /**
   * Create a new auction
   *
   * @param input - Auction creation input
   * @returns Promise that resolves with auction data and upload URL, or null on error
   */
  const createAuction = useCallback((input: CreateAuctionInput): Promise<CreateAuctionResult | null> => {
    setError(null);

    return new Promise((resolve) => {
      commit({
        variables: { input },
        onCompleted: (response) => {
          if (response.createAuction) {
            resolve(response.createAuction as CreateAuctionResult);
          } else {
            const err = new Error('Failed to create auction');
            setError(err);
            resolve(null);
          }
        },
        onError: (err) => {
          setError(err);
          resolve(null);
        }
      });
    });
  }, [commit]);

  return {
    createAuction,
    isInFlight,
    error
  };
}
