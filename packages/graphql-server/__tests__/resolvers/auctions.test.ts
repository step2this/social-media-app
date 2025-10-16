/**
 * Auction Resolver Tests
 *
 * Tests GraphQL Auction resolvers by mocking DAL services (not PostgreSQL).
 *
 * Test Focus (GraphQL concerns only):
 * - Authentication checks (userId required for mutations)
 * - Field resolution (seller, winner profiles via DataLoader)
 * - Query resolvers (auction, auctions, bids)
 * - Mutation resolvers (createAuction, activateAuction, placeBid)
 * - GraphQL error codes (UNAUTHENTICATED, NOT_FOUND)
 * - Response field mapping (DAL types → GraphQL types)
 *
 * NOT Tested Here (AuctionService DAL already covers):
 * - PostgreSQL operations
 * - Business logic validation
 * - Transaction handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GraphQLError } from 'graphql';
import { Query } from '../../src/schema/resolvers/Query.js';
import { Mutation } from '../../src/schema/resolvers/Mutation.js';
import { Auction as AuctionResolver } from '../../src/schema/resolvers/Auction.js';
import { AuctionService } from '@social-media-app/auction-dal';
import { ProfileService } from '@social-media-app/dal';
import { createLoaders } from '../../src/dataloaders/index.js';
import type { GraphQLContext } from '../../src/context.js';
import type { Auction, Bid, PublicProfile } from '@social-media-app/shared';

describe('Auction Resolvers', () => {
  let mockContext: GraphQLContext;
  let mockAuctionService: AuctionService;
  let mockProfileService: ProfileService;

  beforeEach(() => {
    // Create mock service instances
    mockAuctionService = new AuctionService({} as any);
    mockProfileService = new ProfileService({} as any, 'test-table', 'test-bucket', 'test-domain', {} as any);

    // Create minimal mock context
    mockContext = {
      userId: 'test-user-123',
      dynamoClient: {} as any,
      tableName: 'test-table',
      services: {
        auctionService: mockAuctionService,
        profileService: mockProfileService,
      } as any,
      loaders: createLoaders({
        profileService: mockProfileService,
        postService: {} as any,
        likeService: {} as any,
      }, 'test-user-123'),
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Query.auction', () => {
    it('should return auction by id when found', async () => {
      const mockAuction: Auction = {
        id: 'auction-123',
        userId: 'seller-456',
        title: 'Vintage Camera',
        description: 'Classic film camera',
        imageUrl: 'https://example.com/camera.jpg',
        startPrice: 100.00,
        reservePrice: 150.00,
        currentPrice: 100.00,
        startTime: '2024-01-01T00:00:00.000Z',
        endTime: '2024-01-15T00:00:00.000Z',
        status: 'active',
        winnerId: undefined,
        bidCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.spyOn(AuctionService.prototype, 'getAuction').mockResolvedValue(mockAuction);

      const result = await Query.auction(
        {},
        { id: 'auction-123' },
        mockContext,
        {} as any
      );

      expect(result).toEqual(mockAuction);
      expect(result?.id).toBe('auction-123');
    });

    it('should return null when auction not found', async () => {
      vi.spyOn(AuctionService.prototype, 'getAuction').mockResolvedValue(null);

      const result = await Query.auction(
        {},
        { id: 'nonexistent' },
        mockContext,
        {} as any
      );

      expect(result).toBeNull();
    });

    it('should be publicly accessible without authentication', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      const mockAuction: Auction = {
        id: 'auction-123',
        userId: 'seller-456',
        title: 'Vintage Camera',
        description: 'Classic film camera',
        startPrice: 100.00,
        currentPrice: 100.00,
        startTime: '2024-01-01T00:00:00.000Z',
        endTime: '2024-01-15T00:00:00.000Z',
        status: 'active',
        bidCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.spyOn(AuctionService.prototype, 'getAuction').mockResolvedValue(mockAuction);

      const result = await Query.auction(
        {},
        { id: 'auction-123' },
        unauthContext,
        {} as any
      );

      expect(result).toEqual(mockAuction);
    });
  });

  describe('Query.auctions', () => {
    it('should return paginated auction list', async () => {
      const mockAuctions: Auction[] = [
        {
          id: 'auction-1',
          userId: 'seller-1',
          title: 'Item 1',
          startPrice: 50.00,
          currentPrice: 50.00,
          startTime: '2024-01-01T00:00:00.000Z',
          endTime: '2024-01-15T00:00:00.000Z',
          status: 'active',
          bidCount: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'auction-2',
          userId: 'seller-2',
          title: 'Item 2',
          startPrice: 75.00,
          currentPrice: 75.00,
          startTime: '2024-01-02T00:00:00.000Z',
          endTime: '2024-01-16T00:00:00.000Z',
          status: 'active',
          bidCount: 0,
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ];

      vi.spyOn(AuctionService.prototype, 'listAuctions').mockResolvedValue({
        auctions: mockAuctions,
        hasMore: true,
      });

      const result = await Query.auctions(
        {},
        { limit: 20 },
        mockContext,
        {} as any
      );

      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].node).toEqual(mockAuctions[0]);
      expect(result.pageInfo.hasNextPage).toBe(true);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
    });

    it('should support filtering by status', async () => {
      const mockAuctions: Auction[] = [
        {
          id: 'auction-1',
          userId: 'seller-1',
          title: 'Item 1',
          startPrice: 50.00,
          currentPrice: 50.00,
          startTime: '2024-01-01T00:00:00.000Z',
          endTime: '2024-01-15T00:00:00.000Z',
          status: 'active',
          bidCount: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      vi.spyOn(AuctionService.prototype, 'listAuctions').mockResolvedValue({
        auctions: mockAuctions,
        hasMore: false,
      });

      const result = await Query.auctions(
        {},
        { limit: 20, status: 'active' },
        mockContext,
        {} as any
      );

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.status).toBe('active');
    });

    it('should support filtering by userId', async () => {
      const mockAuctions: Auction[] = [
        {
          id: 'auction-1',
          userId: 'seller-123',
          title: 'Item 1',
          startPrice: 50.00,
          currentPrice: 50.00,
          startTime: '2024-01-01T00:00:00.000Z',
          endTime: '2024-01-15T00:00:00.000Z',
          status: 'active',
          bidCount: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      vi.spyOn(AuctionService.prototype, 'listAuctions').mockResolvedValue({
        auctions: mockAuctions,
        hasMore: false,
      });

      const result = await Query.auctions(
        {},
        { limit: 20, userId: 'seller-123' },
        mockContext,
        {} as any
      );

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.userId).toBe('seller-123');
    });
  });

  describe('Query.bids', () => {
    it('should return bid history for auction', async () => {
      const mockBids: Bid[] = [
        {
          id: 'bid-1',
          auctionId: 'auction-123',
          userId: 'bidder-1',
          amount: 110.00,
          createdAt: '2024-01-02T00:00:00.000Z',
        },
        {
          id: 'bid-2',
          auctionId: 'auction-123',
          userId: 'bidder-2',
          amount: 120.00,
          createdAt: '2024-01-03T00:00:00.000Z',
        },
      ];

      vi.spyOn(AuctionService.prototype, 'getBidHistory').mockResolvedValue({
        bids: mockBids,
        total: 2,
      });

      const result = await Query.bids(
        {},
        { auctionId: 'auction-123', limit: 50, offset: 0 },
        mockContext,
        {} as any
      );

      expect(result.bids).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.bids[0].amount).toBe(110.00);
    });

    it('should support pagination with limit and offset', async () => {
      const mockBids: Bid[] = [
        {
          id: 'bid-3',
          auctionId: 'auction-123',
          userId: 'bidder-3',
          amount: 130.00,
          createdAt: '2024-01-04T00:00:00.000Z',
        },
      ];

      vi.spyOn(AuctionService.prototype, 'getBidHistory').mockResolvedValue({
        bids: mockBids,
        total: 10,
      });

      const result = await Query.bids(
        {},
        { auctionId: 'auction-123', limit: 10, offset: 5 },
        mockContext,
        {} as any
      );

      expect(result.bids).toHaveLength(1);
      expect(result.total).toBe(10);
    });
  });

  describe('Mutation.createAuction', () => {
    it('should create auction when authenticated', async () => {
      const mockAuction: Auction = {
        id: 'auction-123',
        userId: 'test-user-123',
        title: 'Vintage Camera',
        description: 'Classic film camera',
        imageUrl: 'https://example.com/camera.jpg',
        startPrice: 100.00,
        currentPrice: 100.00,
        startTime: '2024-01-01T00:00:00.000Z',
        endTime: '2024-01-15T00:00:00.000Z',
        status: 'pending',
        bidCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockPresignedResponse = {
        uploadUrl: 'https://s3.example.com/upload-url',
        publicUrl: 'https://example.com/camera.jpg',
        expiresIn: 3600,
      };

      vi.spyOn(ProfileService.prototype, 'generatePresignedUrl').mockResolvedValue(mockPresignedResponse);
      vi.spyOn(AuctionService.prototype, 'createAuction').mockResolvedValue(mockAuction);

      const result = await Mutation.createAuction(
        {},
        {
          input: {
            title: 'Vintage Camera',
            description: 'Classic film camera',
            fileType: 'image/jpeg',
            startPrice: 100.00,
            startTime: '2024-01-01T00:00:00.000Z',
            endTime: '2024-01-15T00:00:00.000Z',
          },
        },
        mockContext,
        {} as any
      );

      expect(result.auction).toEqual(mockAuction);
      expect(result.uploadUrl).toBeDefined();
      expect(result.uploadUrl).toBe(mockPresignedResponse.uploadUrl);
    });

    it('should throw UNAUTHENTICATED when userId is null', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      await expect(
        Mutation.createAuction(
          {},
          {
            input: {
              title: 'Vintage Camera',
              startPrice: 100.00,
              startTime: '2024-01-01T00:00:00.000Z',
              endTime: '2024-01-15T00:00:00.000Z',
            },
          },
          unauthContext,
          {} as any
        )
      ).rejects.toThrow(GraphQLError);

      try {
        await Mutation.createAuction(
          {},
          {
            input: {
              title: 'Vintage Camera',
              startPrice: 100.00,
              startTime: '2024-01-01T00:00:00.000Z',
              endTime: '2024-01-15T00:00:00.000Z',
            },
          },
          unauthContext,
          {} as any
        );
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });
  });

  describe('Mutation.activateAuction', () => {
    it('should activate auction when authenticated', async () => {
      const mockAuction: Auction = {
        id: 'auction-123',
        userId: 'test-user-123',
        title: 'Vintage Camera',
        startPrice: 100.00,
        currentPrice: 100.00,
        startTime: '2024-01-01T00:00:00.000Z',
        endTime: '2024-01-15T00:00:00.000Z',
        status: 'active',
        bidCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.spyOn(AuctionService.prototype, 'activateAuction').mockResolvedValue(mockAuction);

      const result = await Mutation.activateAuction(
        {},
        { id: 'auction-123' },
        mockContext,
        {} as any
      );

      expect(result).toEqual(mockAuction);
      expect(result.status).toBe('active');
    });

    it('should throw UNAUTHENTICATED when userId is null', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      await expect(
        Mutation.activateAuction({}, { id: 'auction-123' }, unauthContext, {} as any)
      ).rejects.toThrow(GraphQLError);

      try {
        await Mutation.activateAuction({}, { id: 'auction-123' }, unauthContext, {} as any);
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });
  });

  describe('Mutation.placeBid', () => {
    it('should place bid when authenticated', async () => {
      const mockBid: Bid = {
        id: 'bid-123',
        auctionId: 'auction-123',
        userId: 'test-user-123',
        amount: 110.00,
        createdAt: '2024-01-02T00:00:00.000Z',
      };

      const mockAuction: Auction = {
        id: 'auction-123',
        userId: 'seller-456',
        title: 'Vintage Camera',
        startPrice: 100.00,
        currentPrice: 110.00,
        startTime: '2024-01-01T00:00:00.000Z',
        endTime: '2024-01-15T00:00:00.000Z',
        status: 'active',
        bidCount: 1,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      vi.spyOn(AuctionService.prototype, 'placeBid').mockResolvedValue({
        bid: mockBid,
        auction: mockAuction,
      });

      const result = await Mutation.placeBid(
        {},
        {
          input: {
            auctionId: 'auction-123',
            amount: 110.00,
          },
        },
        mockContext,
        {} as any
      );

      expect(result.bid).toEqual(mockBid);
      expect(result.auction).toEqual(mockAuction);
      expect(result.auction.currentPrice).toBe(110.00);
    });

    it('should throw UNAUTHENTICATED when userId is null', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      await expect(
        Mutation.placeBid(
          {},
          {
            input: {
              auctionId: 'auction-123',
              amount: 110.00,
            },
          },
          unauthContext,
          {} as any
        )
      ).rejects.toThrow(GraphQLError);

      try {
        await Mutation.placeBid(
          {},
          {
            input: {
              auctionId: 'auction-123',
              amount: 110.00,
            },
          },
          unauthContext,
          {} as any
        );
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });
  });

  describe('Auction.seller', () => {
    it('should resolve seller profile from userId', async () => {
      const parentAuction: Auction = {
        id: 'auction-123',
        userId: 'seller-456',
        title: 'Vintage Camera',
        startPrice: 100.00,
        currentPrice: 100.00,
        startTime: '2024-01-01T00:00:00.000Z',
        endTime: '2024-01-15T00:00:00.000Z',
        status: 'active',
        bidCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockProfile: PublicProfile = {
        id: 'seller-456',
        handle: 'johndoe',
        displayName: 'John Doe',
        bio: 'Vintage collector',
        profileImageUrl: 'https://example.com/profile.jpg',
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      // Mock the batch method used by DataLoader
      vi.spyOn(ProfileService.prototype, 'getProfilesByIds').mockResolvedValue(
        new Map([['seller-456', mockProfile]])
      );

      const result = await AuctionResolver.seller(
        parentAuction as any,
        {},
        mockContext,
        {} as any
      );

      expect(result).toEqual(mockProfile);
      expect(result.id).toBe('seller-456');
    });

    it('should throw NOT_FOUND when seller profile not found', async () => {
      const parentAuction: Auction = {
        id: 'auction-123',
        userId: 'deleted-user',
        title: 'Vintage Camera',
        startPrice: 100.00,
        currentPrice: 100.00,
        startTime: '2024-01-01T00:00:00.000Z',
        endTime: '2024-01-15T00:00:00.000Z',
        status: 'active',
        bidCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // Mock the batch method used by DataLoader (empty map = not found)
      vi.spyOn(ProfileService.prototype, 'getProfilesByIds').mockResolvedValue(new Map());

      try {
        await AuctionResolver.seller(
          parentAuction as any,
          {},
          mockContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/seller profile not found/i);
          expect(error.extensions.code).toBe('NOT_FOUND');
        }
      }
    });
  });

  describe('Auction.winner', () => {
    it('should resolve winner profile when winnerId exists', async () => {
      const parentAuction: Auction = {
        id: 'auction-123',
        userId: 'seller-456',
        title: 'Vintage Camera',
        startPrice: 100.00,
        currentPrice: 150.00,
        startTime: '2024-01-01T00:00:00.000Z',
        endTime: '2024-01-15T00:00:00.000Z',
        status: 'completed',
        winnerId: 'winner-789',
        bidCount: 5,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-15T00:00:00.000Z',
      };

      const mockProfile: PublicProfile = {
        id: 'winner-789',
        handle: 'janedoe',
        displayName: 'Jane Doe',
        bio: 'Photography enthusiast',
        profileImageUrl: 'https://example.com/winner.jpg',
        followersCount: 200,
        followingCount: 75,
        postsCount: 50,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      // Mock the batch method used by DataLoader
      vi.spyOn(ProfileService.prototype, 'getProfilesByIds').mockResolvedValue(
        new Map([['winner-789', mockProfile]])
      );

      const result = await AuctionResolver.winner(
        parentAuction as any,
        {},
        mockContext,
        {} as any
      );

      expect(result).toEqual(mockProfile);
      expect(result?.id).toBe('winner-789');
    });

    it('should return null when winnerId is undefined', async () => {
      const parentAuction: Auction = {
        id: 'auction-123',
        userId: 'seller-456',
        title: 'Vintage Camera',
        startPrice: 100.00,
        currentPrice: 100.00,
        startTime: '2024-01-01T00:00:00.000Z',
        endTime: '2024-01-15T00:00:00.000Z',
        status: 'active',
        winnerId: undefined,
        bidCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const result = await AuctionResolver.winner(
        parentAuction as any,
        {},
        mockContext,
        {} as any
      );

      expect(result).toBeNull();
    });

    it('should return null when winner profile not found', async () => {
      const parentAuction: Auction = {
        id: 'auction-123',
        userId: 'seller-456',
        title: 'Vintage Camera',
        startPrice: 100.00,
        currentPrice: 150.00,
        startTime: '2024-01-01T00:00:00.000Z',
        endTime: '2024-01-15T00:00:00.000Z',
        status: 'completed',
        winnerId: 'deleted-winner',
        bidCount: 5,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-15T00:00:00.000Z',
      };

      // Mock the batch method used by DataLoader (empty map = not found)
      vi.spyOn(ProfileService.prototype, 'getProfilesByIds').mockResolvedValue(new Map());

      const result = await AuctionResolver.winner(
        parentAuction as any,
        {},
        mockContext,
        {} as any
      );

      expect(result).toBeNull();
    });
  });
});
