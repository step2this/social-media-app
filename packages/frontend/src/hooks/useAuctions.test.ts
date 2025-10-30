/**
 * useAuctions Hook Tests
 *
 * Tests the useAuctions hook using singleton injection pattern.
 * NO vi.mock() - uses setAuctionService() for proper DI testing.
 *
 * Pattern: Inject MockGraphQLClient → AuctionServiceGraphQL → setAuctionService()
 * Best Practices: DRY helpers, type-safe assertions, clear test names
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuctions } from './useAuctions.js';
import { setAuctionService, resetAuctionService } from '../services/auctionService.js';
import { AuctionServiceGraphQL } from '../services/implementations/AuctionService.graphql.js';
import { MockGraphQLClient } from '../graphql/client.mock.js';
import {
  wrapInGraphQLError,
  createListAuctionsResponse,
} from '../services/__tests__/fixtures/graphqlFixtures.js';
import { createMockAuction } from '../services/__tests__/fixtures/auctionFixtures.js';
import type { Auction } from '@social-media-app/shared';

/**
 * Test Helpers - DRY utilities for common test patterns
 */

/** Create an array of mock auctions */
const createMockAuctions = (count: number, overrides = {}) =>
  Array.from({ length: count }, (_, i) =>
    createMockAuction({ id: `auction-${i + 1}`, ...overrides })
  );

/**
 * Main Test Suite
 */
describe('useAuctions', () => {
  let mockClient: MockGraphQLClient;
  let mockService: AuctionServiceGraphQL;

  beforeEach(() => {
    mockClient = new MockGraphQLClient();
    mockService = new AuctionServiceGraphQL(mockClient);
    setAuctionService(mockService);
  });

  afterEach(() => {
    resetAuctionService();
  });

  describe('initialization and data fetching', () => {
    it('should fetch auctions on mount', async () => {
      const auctions = createMockAuctions(3);
      mockClient.setQueryResponse(createListAuctionsResponse(auctions));

      const { result } = renderHook(() => useAuctions());

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.auctions).toEqual([]);

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.auctions).toHaveLength(3);
      expect(result.current.error).toBeNull();
      expect(result.current.hasMore).toBe(false);
    });

    it('should handle empty auction list', async () => {
      mockClient.setQueryResponse(createListAuctionsResponse([]));

      const { result } = renderHook(() => useAuctions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.auctions).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.hasMore).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      mockClient.setQueryResponse(wrapInGraphQLError('Network error', 'NETWORK_ERROR'));

      const { result } = renderHook(() => useAuctions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.auctions).toEqual([]);
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('filtering', () => {
    it('should filter auctions by status', async () => {
      const activeAuctions = createMockAuctions(2, { status: 'active' });
      mockClient.setQueryResponse(createListAuctionsResponse(activeAuctions));

      const { result } = renderHook(() => useAuctions({ status: 'active' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.auctions).toHaveLength(2);
      expect(result.current.auctions.every(a => a.status === 'active')).toBe(true);
    });

    it('should filter auctions by user ID', async () => {
      const userAuctions = createMockAuctions(3, { sellerId: 'user-123' });
      mockClient.setQueryResponse(createListAuctionsResponse(userAuctions));

      const { result } = renderHook(() => useAuctions({ userId: 'user-123' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.auctions).toHaveLength(3);
    });

    it('should combine multiple filters', async () => {
      const filteredAuctions = createMockAuctions(1, {
        status: 'active',
        sellerId: 'user-123'
      });
      mockClient.setQueryResponse(createListAuctionsResponse(filteredAuctions));

      const { result } = renderHook(() =>
        useAuctions({ status: 'active', userId: 'user-123' })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.auctions).toHaveLength(1);
    });
  });

  describe('pagination', () => {
    it('should indicate when more results are available', async () => {
      const auctions = createMockAuctions(10);
      mockClient.setQueryResponse(
        createListAuctionsResponse(auctions, true, 'cursor-10')
      );

      const { result } = renderHook(() => useAuctions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.auctions).toHaveLength(10);
      expect(result.current.hasMore).toBe(true);
    });

    it('should load more auctions when loadMore is called', async () => {
      // First page
      const firstPage = createMockAuctions(10);
      mockClient.setQueryResponse(
        createListAuctionsResponse(firstPage, true, 'cursor-10')
      );

      const { result } = renderHook(() => useAuctions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.auctions).toHaveLength(10);

      // Second page
      const secondPage = createMockAuctions(5).map((a, i) => ({
        ...a,
        id: `auction-${i + 11}`
      }));
      mockClient.setQueryResponse(
        createListAuctionsResponse(secondPage, false)
      );

      // Load more
      await waitFor(async () => {
        await result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.auctions).toHaveLength(15);
      });

      expect(result.current.hasMore).toBe(false);
    });

    it('should not load more if already loading', async () => {
      const auctions = createMockAuctions(10);
      mockClient.setQueryResponse(
        createListAuctionsResponse(auctions, true, 'cursor-10')
      );

      const { result } = renderHook(() => useAuctions());

      // Try to load more while still loading initial data
      const queriesBefore = mockClient.queryCalls.length;

      await result.current.loadMore();

      // Should not make additional query
      expect(mockClient.queryCalls.length).toBe(queriesBefore);
    });

    it('should not load more if no more results', async () => {
      const auctions = createMockAuctions(5);
      mockClient.setQueryResponse(
        createListAuctionsResponse(auctions, false)
      );

      const { result } = renderHook(() => useAuctions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const queriesBefore = mockClient.queryCalls.length;

      await result.current.loadMore();

      // Should not make additional query
      expect(mockClient.queryCalls.length).toBe(queriesBefore);
    });
  });

  describe('refetch', () => {
    it('should refetch auctions from the beginning', async () => {
      // Initial fetch
      const initialAuctions = createMockAuctions(3);
      mockClient.setQueryResponse(createListAuctionsResponse(initialAuctions));

      const { result } = renderHook(() => useAuctions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.auctions).toHaveLength(3);

      // Refetch with updated data
      const updatedAuctions = createMockAuctions(5);
      mockClient.setQueryResponse(createListAuctionsResponse(updatedAuctions));

      await waitFor(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.auctions).toHaveLength(5);
      });
    });

    it('should reset pagination state on refetch', async () => {
      // Initial fetch with pagination
      const firstPage = createMockAuctions(10);
      mockClient.setQueryResponse(
        createListAuctionsResponse(firstPage, true, 'cursor-10')
      );

      const { result } = renderHook(() => useAuctions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMore).toBe(true);

      // Refetch with different results (no pagination)
      const freshAuctions = createMockAuctions(3);
      mockClient.setQueryResponse(createListAuctionsResponse(freshAuctions, false));

      await waitFor(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.auctions).toHaveLength(3);
      });

      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should set error state on API failure', async () => {
      mockClient.setQueryResponse(
        wrapInGraphQLError('Failed to fetch auctions', 'INTERNAL_ERROR')
      );

      const { result } = renderHook(() => useAuctions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch auctions');
      expect(result.current.auctions).toEqual([]);
    });

    it('should clear error on successful refetch', async () => {
      // Initial error
      mockClient.setQueryResponse(
        wrapInGraphQLError('Network error', 'NETWORK_ERROR')
      );

      const { result } = renderHook(() => useAuctions());

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });

      // Successful refetch
      const auctions = createMockAuctions(2);
      mockClient.setQueryResponse(createListAuctionsResponse(auctions));

      await waitFor(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });

      expect(result.current.auctions).toHaveLength(2);
    });
  });
});
