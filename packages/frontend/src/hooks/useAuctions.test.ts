import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuctions } from './useAuctions.js';
import { auctionService } from '../services/auctionService.js';
import { createMockAuction } from '../test-utils/mock-factories.js';
import type { ListAuctionsResponse } from '@social-media-app/shared';

// Mock the auctionService
vi.mock('../services/auctionService.js', () => ({
  auctionService: {
    listAuctions: vi.fn()
  }
}));

describe('useAuctions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const mockResponse: ListAuctionsResponse = {
        auctions: [],
        nextCursor: undefined,
        hasMore: false
      };
      vi.mocked(auctionService.listAuctions).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuctions());

      expect(result.current.auctions).toEqual([]);
      expect(result.current.isLoading).toBe(true); // Loading on mount
      expect(result.current.error).toBe(null);
      expect(result.current.hasMore).toBe(false);
    });

    it('should fetch auctions on mount', async () => {
      const mockAuctions = [
        createMockAuction({ id: 'auction-1' }),
        createMockAuction({ id: 'auction-2' })
      ];
      const mockResponse: ListAuctionsResponse = {
        auctions: mockAuctions,
        nextCursor: undefined,
        hasMore: false
      };
      vi.mocked(auctionService.listAuctions).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuctions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(auctionService.listAuctions).toHaveBeenCalledWith({});
      expect(result.current.auctions).toEqual(mockAuctions);
      expect(result.current.error).toBe(null);
    });
  });

  describe('Filtering', () => {
    it('should fetch auctions with status filter', async () => {
      const mockResponse: ListAuctionsResponse = {
        auctions: [],
        nextCursor: undefined,
        hasMore: false
      };
      vi.mocked(auctionService.listAuctions).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuctions({ status: 'active' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(auctionService.listAuctions).toHaveBeenCalledWith({ status: 'active' });
    });

    it('should fetch auctions with userId filter', async () => {
      const mockResponse: ListAuctionsResponse = {
        auctions: [],
        nextCursor: undefined,
        hasMore: false
      };
      vi.mocked(auctionService.listAuctions).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuctions({ userId: 'user-123' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(auctionService.listAuctions).toHaveBeenCalledWith({ userId: 'user-123' });
    });
  });

  describe('Pagination', () => {
    it('should support loading more auctions', async () => {
      const firstBatch = [createMockAuction({ id: 'auction-1' })];
      const secondBatch = [createMockAuction({ id: 'auction-2' })];

      const firstResponse: ListAuctionsResponse = {
        auctions: firstBatch,
        nextCursor: 'cursor-1',
        hasMore: true
      };
      const secondResponse: ListAuctionsResponse = {
        auctions: secondBatch,
        nextCursor: undefined,
        hasMore: false
      };

      vi.mocked(auctionService.listAuctions)
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse);

      const { result } = renderHook(() => useAuctions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.auctions).toEqual(firstBatch);
      expect(result.current.hasMore).toBe(true);

      // Load more
      await result.current.loadMore();

      await waitFor(() => {
        expect(result.current.auctions).toEqual([...firstBatch, ...secondBatch]);
      });

      expect(result.current.hasMore).toBe(false);
      expect(auctionService.listAuctions).toHaveBeenCalledTimes(2);
      expect(auctionService.listAuctions).toHaveBeenLastCalledWith({ cursor: 'cursor-1' });
    });

    it('should not load more when hasMore is false', async () => {
      const mockResponse: ListAuctionsResponse = {
        auctions: [createMockAuction()],
        nextCursor: undefined,
        hasMore: false
      };
      vi.mocked(auctionService.listAuctions).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuctions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Try to load more
      await result.current.loadMore();

      // Should not make additional API call
      expect(auctionService.listAuctions).toHaveBeenCalledTimes(1);
    });

    it('should not load more when already loading', async () => {
      const mockResponse: ListAuctionsResponse = {
        auctions: [createMockAuction()],
        nextCursor: 'cursor-1',
        hasMore: true
      };
      vi.mocked(auctionService.listAuctions).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockResponse), 100))
      );

      const { result } = renderHook(() => useAuctions());

      // Try to load more while initial load is in progress
      await result.current.loadMore();

      // Should only have one call (the initial mount call)
      expect(auctionService.listAuctions).toHaveBeenCalledTimes(1);
    });
  });

  describe('Refetch', () => {
    it('should refetch auctions', async () => {
      const firstResponse: ListAuctionsResponse = {
        auctions: [createMockAuction({ id: 'auction-1' })],
        nextCursor: undefined,
        hasMore: false
      };
      const secondResponse: ListAuctionsResponse = {
        auctions: [createMockAuction({ id: 'auction-2' })],
        nextCursor: undefined,
        hasMore: false
      };

      vi.mocked(auctionService.listAuctions)
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse);

      const { result } = renderHook(() => useAuctions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.auctions).toEqual(firstResponse.auctions);

      // Refetch
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.auctions).toEqual(secondResponse.auctions);
      });

      expect(auctionService.listAuctions).toHaveBeenCalledTimes(2);
    });

    it('should reset cursor on refetch', async () => {
      const firstResponse: ListAuctionsResponse = {
        auctions: [createMockAuction({ id: 'auction-1' })],
        nextCursor: 'cursor-1',
        hasMore: true
      };
      const secondResponse: ListAuctionsResponse = {
        auctions: [createMockAuction({ id: 'auction-2' })],
        nextCursor: undefined,
        hasMore: false
      };

      vi.mocked(auctionService.listAuctions)
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse);

      const { result } = renderHook(() => useAuctions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Refetch should reset cursor
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(auctionService.listAuctions).toHaveBeenLastCalledWith({});
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors', async () => {
      const errorMessage = 'Failed to fetch auctions';
      vi.mocked(auctionService.listAuctions).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAuctions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.auctions).toEqual([]);
    });

    it('should handle loadMore errors', async () => {
      const firstResponse: ListAuctionsResponse = {
        auctions: [createMockAuction()],
        nextCursor: 'cursor-1',
        hasMore: true
      };

      vi.mocked(auctionService.listAuctions)
        .mockResolvedValueOnce(firstResponse)
        .mockRejectedValueOnce(new Error('Load more failed'));

      const { result } = renderHook(() => useAuctions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Try to load more
      await result.current.loadMore();

      await waitFor(() => {
        expect(result.current.error).toBe('Load more failed');
      });

      // Should preserve existing auctions
      expect(result.current.auctions).toEqual(firstResponse.auctions);
    });

    it('should clear error on successful refetch', async () => {
      const mockResponse: ListAuctionsResponse = {
        auctions: [createMockAuction()],
        nextCursor: undefined,
        hasMore: false
      };

      vi.mocked(auctionService.listAuctions)
        .mockRejectedValueOnce(new Error('Initial error'))
        .mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAuctions());

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      // Refetch should clear error
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      expect(result.current.auctions).toEqual(mockResponse.auctions);
    });
  });

  describe('Loading State', () => {
    it('should show loading state during fetch', async () => {
      const mockResponse: ListAuctionsResponse = {
        auctions: [],
        nextCursor: undefined,
        hasMore: false
      };
      vi.mocked(auctionService.listAuctions).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockResponse), 50))
      );

      const { result } = renderHook(() => useAuctions());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should show loading state during loadMore', async () => {
      const firstResponse: ListAuctionsResponse = {
        auctions: [createMockAuction({ id: 'auction-1' })],
        nextCursor: 'cursor-1',
        hasMore: true
      };
      const secondResponse: ListAuctionsResponse = {
        auctions: [createMockAuction({ id: 'auction-2' })],
        nextCursor: undefined,
        hasMore: false
      };

      vi.mocked(auctionService.listAuctions)
        .mockResolvedValueOnce(firstResponse)
        .mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve(secondResponse), 50))
        );

      const { result } = renderHook(() => useAuctions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Load more
      result.current.loadMore();

      // Should show loading state
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Should complete loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
