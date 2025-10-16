import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auctionService } from './auctionService.js';
import { apiClient } from './apiClient.js';
import { createMockAuction, createMockBid } from '../test-utils/mock-factories.js';
import type {
  Auction,
  Bid,
  ListAuctionsResponse,
  AuctionResponse,
  CreateAuctionResponse,
  PlaceBidResponse,
  GetBidHistoryResponse
} from '@social-media-app/shared';

// Mock the apiClient
vi.mock('./apiClient.js', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock fetch for S3 uploads
global.fetch = vi.fn();

describe('auctionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listAuctions', () => {
    it('should fetch list of auctions with default parameters', async () => {
      const mockAuctions = [
        createMockAuction({ id: 'auction-1' }),
        createMockAuction({ id: 'auction-2' })
      ];
      const mockResponse: ListAuctionsResponse = {
        auctions: mockAuctions,
        nextCursor: undefined,
        hasMore: false
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await auctionService.listAuctions();

      expect(apiClient.get).toHaveBeenCalledWith('/auctions?limit=20');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch auctions with custom limit and cursor', async () => {
      const mockResponse: ListAuctionsResponse = {
        auctions: [],
        nextCursor: 'next-cursor',
        hasMore: true
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      await auctionService.listAuctions({ limit: 10, cursor: 'abc123' });

      expect(apiClient.get).toHaveBeenCalledWith('/auctions?limit=10&cursor=abc123');
    });

    it('should filter auctions by status', async () => {
      const mockResponse: ListAuctionsResponse = {
        auctions: [],
        nextCursor: undefined,
        hasMore: false
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      await auctionService.listAuctions({ status: 'active' });

      expect(apiClient.get).toHaveBeenCalledWith('/auctions?limit=20&status=active');
    });

    it('should filter auctions by userId', async () => {
      const mockResponse: ListAuctionsResponse = {
        auctions: [],
        nextCursor: undefined,
        hasMore: false
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      await auctionService.listAuctions({ userId: 'user-123' });

      expect(apiClient.get).toHaveBeenCalledWith('/auctions?limit=20&userId=user-123');
    });

    it('should handle API errors', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'));

      await expect(auctionService.listAuctions()).rejects.toThrow('Network error');
    });
  });

  describe('getAuction', () => {
    it('should fetch single auction by ID', async () => {
      const mockAuction = createMockAuction({ id: 'auction-123' });
      const mockResponse: AuctionResponse = {
        auction: mockAuction
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await auctionService.getAuction('auction-123');

      expect(apiClient.get).toHaveBeenCalledWith('/auctions/auction-123');
      expect(result).toEqual(mockAuction);
    });

    it('should handle 404 errors for non-existent auctions', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Auction not found'));

      await expect(auctionService.getAuction('invalid-id')).rejects.toThrow('Auction not found');
    });
  });

  describe('createAuction', () => {
    const mockAuctionData = {
      title: 'Test Auction',
      description: 'Test description',
      startPrice: 10.00,
      reservePrice: 50.00,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 86400000).toISOString()
    };

    it('should create auction with image upload', async () => {
      const mockAuction = createMockAuction(mockAuctionData);
      const mockResponse: CreateAuctionResponse = {
        auction: mockAuction,
        uploadUrl: 'https://s3.amazonaws.com/upload-url'
      };
      const mockImageFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200
      } as Response);

      const result = await auctionService.createAuction(
        { ...mockAuctionData, fileType: 'image/jpeg' },
        mockImageFile
      );

      expect(apiClient.post).toHaveBeenCalledWith('/auctions', {
        ...mockAuctionData,
        fileType: 'image/jpeg'
      });
      expect(global.fetch).toHaveBeenCalledWith('https://s3.amazonaws.com/upload-url', {
        method: 'PUT',
        body: mockImageFile,
        headers: {
          'Content-Type': 'image/jpeg'
        }
      });
      expect(result).toEqual(mockAuction);
    });

    it('should validate image file type', async () => {
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });

      await expect(
        auctionService.createAuction(mockAuctionData, invalidFile)
      ).rejects.toThrow('Unsupported file type');
    });

    it('should handle API errors during creation', async () => {
      const mockImageFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Validation failed'));

      await expect(
        auctionService.createAuction(
          { ...mockAuctionData, fileType: 'image/jpeg' },
          mockImageFile
        )
      ).rejects.toThrow('Validation failed');
    });

    it('should handle S3 upload errors', async () => {
      const mockAuction = createMockAuction(mockAuctionData);
      const mockResponse: CreateAuctionResponse = {
        auction: mockAuction,
        uploadUrl: 'https://s3.amazonaws.com/upload-url'
      };
      const mockImageFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);
      vi.mocked(global.fetch).mockRejectedValue(new Error('S3 upload failed'));

      await expect(
        auctionService.createAuction(
          { ...mockAuctionData, fileType: 'image/jpeg' },
          mockImageFile
        )
      ).rejects.toThrow('S3 upload failed');
    });
  });

  describe('placeBid', () => {
    it('should place bid on auction', async () => {
      const mockBid = createMockBid({ amount: 25.00 });
      const mockAuction = createMockAuction({ currentPrice: 25.00 });
      const mockResponse: PlaceBidResponse = {
        bid: mockBid,
        auction: mockAuction
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await auctionService.placeBid('auction-123', 25.00);

      expect(apiClient.post).toHaveBeenCalledWith('/auctions/auction-123/bids', {
        auctionId: 'auction-123',
        amount: 25.00
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle "bid too low" errors', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Bid must be higher than current price'));

      await expect(
        auctionService.placeBid('auction-123', 5.00)
      ).rejects.toThrow('Bid must be higher than current price');
    });

    it('should handle "auction ended" errors', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Auction has ended'));

      await expect(
        auctionService.placeBid('auction-123', 25.00)
      ).rejects.toThrow('Auction has ended');
    });

    it('should handle authentication errors', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Unauthorized'));

      await expect(
        auctionService.placeBid('auction-123', 25.00)
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('getBidHistory', () => {
    it('should fetch bid history for auction', async () => {
      const mockBids = [
        createMockBid({ id: 'bid-1', amount: 25.00 }),
        createMockBid({ id: 'bid-2', amount: 20.00 }),
        createMockBid({ id: 'bid-3', amount: 15.00 })
      ];
      const mockResponse: GetBidHistoryResponse = {
        bids: mockBids,
        total: 3
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await auctionService.getBidHistory('auction-123');

      expect(apiClient.get).toHaveBeenCalledWith('/auctions/auction-123/bids?limit=50&offset=0');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch bid history with custom pagination', async () => {
      const mockResponse: GetBidHistoryResponse = {
        bids: [],
        total: 0
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      await auctionService.getBidHistory('auction-123', { limit: 10, offset: 20 });

      expect(apiClient.get).toHaveBeenCalledWith('/auctions/auction-123/bids?limit=10&offset=20');
    });

    it('should handle errors when fetching bid history', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Failed to fetch bids'));

      await expect(
        auctionService.getBidHistory('auction-123')
      ).rejects.toThrow('Failed to fetch bids');
    });
  });
});
