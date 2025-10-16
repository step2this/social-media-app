/**
 * Auction GraphQL Integration Tests
 *
 * End-to-end tests that execute real GraphQL operations for the auction system.
 * Tests complete auction lifecycle by executing actual queries/mutations with mocked DAL services.
 *
 * Test Focus:
 * - Full GraphQL execution pipeline for auction operations
 * - Complete auction lifecycle (create → activate → bid → query)
 * - Nested field resolution (Auction → seller, Bid → bidder)
 * - DataLoader batching verification (critical for N+1 prevention)
 * - Cursor-based pagination for auction listings
 * - Authentication flow through context
 *
 * NOT Tested (already covered):
 * - PostgreSQL operations (AuctionService DAL tests)
 * - Individual resolver logic (resolver unit tests)
 * - Business logic validation (service layer tests)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApolloServer } from '@apollo/server';
import { createApolloServer } from '../../src/server.js';
import { ProfileService } from '@social-media-app/dal';
import { AuctionService } from '@social-media-app/auction-dal';
import { createLoaders } from '../../src/dataloaders/index.js';
import type { GraphQLContext } from '../../src/context.js';
import type { Auction, Bid, PublicProfile } from '@social-media-app/shared';

describe('GraphQL Integration - Auction Flow', () => {
  let server: ApolloServer<GraphQLContext>;
  let mockContext: GraphQLContext;
  let unauthContext: GraphQLContext;
  let mockProfileService: ProfileService;
  let mockAuctionService: AuctionService;

  beforeEach(async () => {
    server = createApolloServer();
    await server.start();

    // Create mock service instances
    mockProfileService = new ProfileService({} as any, 'test-table', 'test-bucket', 'test-domain', {} as any);
    mockAuctionService = new AuctionService({} as any);

    // Create authenticated context
    mockContext = {
      userId: 'test-user-123',
      dynamoClient: {} as any,
      tableName: 'test-table',
      services: {
        profileService: mockProfileService,
        auctionService: mockAuctionService,
      } as any,
      loaders: createLoaders({
        profileService: mockProfileService,
        postService: {} as any,
        likeService: {} as any,
        auctionService: mockAuctionService,
      }, 'test-user-123'),
    };

    // Create unauthenticated context
    unauthContext = {
      userId: null,
      dynamoClient: {} as any,
      tableName: 'test-table',
      services: {
        profileService: mockProfileService,
        auctionService: mockAuctionService,
      } as any,
      loaders: createLoaders({
        profileService: mockProfileService,
        postService: {} as any,
        likeService: {} as any,
        auctionService: mockAuctionService,
      }, null),
    };

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await server.stop();
    vi.restoreAllMocks();
  });

  describe('Test 1: Create Auction', () => {
    it('should create auction and return uploadUrl', async () => {
      const mockAuction: Auction = {
        id: 'auction-123',
        userId: 'test-user-123',
        title: 'Vintage Camera',
        description: 'Classic film camera in excellent condition',
        imageUrl: 'https://example.com/auction-123.jpg',
        startPrice: 100.00,
        currentPrice: 100.00,
        startTime: '2024-01-01T00:00:00.000Z',
        endTime: '2024-01-15T00:00:00.000Z',
        status: 'PENDING',
        bidCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockPresignedResponse = {
        uploadUrl: 'https://s3.example.com/upload-auction-123',
        publicUrl: 'https://example.com/auction-123.jpg',
        expiresIn: 3600,
      };

      // Mock service methods
      vi.spyOn(ProfileService.prototype, 'generatePresignedUrl').mockResolvedValue(mockPresignedResponse);
      vi.spyOn(AuctionService.prototype, 'createAuction').mockResolvedValue(mockAuction);

      // Execute GraphQL mutation
      const result = await server.executeOperation({
        query: `
          mutation CreateAuction($input: CreateAuctionInput!) {
            createAuction(input: $input) {
              auction {
                id
                title
                status
                startPrice
                currentPrice
              }
              uploadUrl
            }
          }
        `,
        variables: {
          input: {
            title: 'Vintage Camera',
            description: 'Classic film camera in excellent condition',
            fileType: 'image/jpeg',
            startPrice: 100.00,
            startTime: '2024-01-01T00:00:00.000Z',
            endTime: '2024-01-15T00:00:00.000Z',
          },
        },
      }, { contextValue: mockContext });

      // Verify response
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        expect(result.body.singleResult.data?.createAuction.auction.id).toBe('auction-123');
        expect(result.body.singleResult.data?.createAuction.auction.title).toBe('Vintage Camera');
        expect(result.body.singleResult.data?.createAuction.auction.status).toBe('PENDING');
        expect(result.body.singleResult.data?.createAuction.uploadUrl).toContain('s3');
      }
    });
  });

  describe('Test 2: Activate Auction', () => {
    it('should activate auction and change status to active', async () => {
      const mockAuction: Auction = {
        id: 'auction-123',
        userId: 'test-user-123',
        title: 'Vintage Camera',
        description: 'Classic film camera',
        imageUrl: 'https://example.com/auction-123.jpg',
        startPrice: 100.00,
        currentPrice: 100.00,
        startTime: '2024-01-01T00:00:00.000Z',
        endTime: '2024-01-15T00:00:00.000Z',
        status: 'ACTIVE',
        bidCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // Mock service method
      vi.spyOn(AuctionService.prototype, 'activateAuction').mockResolvedValue(mockAuction);

      // Execute GraphQL mutation
      const result = await server.executeOperation({
        query: `
          mutation ActivateAuction($id: ID!) {
            activateAuction(id: $id) {
              id
              status
              title
            }
          }
        `,
        variables: { id: 'auction-123' },
      }, { contextValue: mockContext });

      // Verify response
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        expect(result.body.singleResult.data?.activateAuction.id).toBe('auction-123');
        expect(result.body.singleResult.data?.activateAuction.status).toBe('ACTIVE');
      }
    });
  });

  describe('Test 3: Place Bid', () => {
    it('should place bid and return updated auction', async () => {
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
        status: 'ACTIVE',
        bidCount: 1,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      // Mock service method
      vi.spyOn(AuctionService.prototype, 'placeBid').mockResolvedValue({
        bid: mockBid,
        auction: mockAuction,
      });

      // Execute GraphQL mutation
      const result = await server.executeOperation({
        query: `
          mutation PlaceBid($input: PlaceBidInput!) {
            placeBid(input: $input) {
              bid {
                id
                amount
                auctionId
              }
              auction {
                id
                currentPrice
                bidCount
              }
            }
          }
        `,
        variables: {
          input: {
            auctionId: 'auction-123',
            amount: 110.00,
          },
        },
      }, { contextValue: mockContext });

      // Verify response
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        expect(result.body.singleResult.data?.placeBid.bid.id).toBe('bid-123');
        expect(result.body.singleResult.data?.placeBid.bid.amount).toBe(110.00);
        expect(result.body.singleResult.data?.placeBid.auction.currentPrice).toBe(110.00);
        expect(result.body.singleResult.data?.placeBid.auction.bidCount).toBe(1);
      }
    });
  });

  describe('Test 4: Query Auction with Seller', () => {
    it('should return auction with seller profile via DataLoader', async () => {
      const mockAuction: Auction = {
        id: 'auction-123',
        userId: 'seller-456',
        title: 'Vintage Camera',
        description: 'Classic film camera',
        imageUrl: 'https://example.com/auction-123.jpg',
        startPrice: 100.00,
        currentPrice: 110.00,
        startTime: '2024-01-01T00:00:00.000Z',
        endTime: '2024-01-15T00:00:00.000Z',
        status: 'ACTIVE',
        bidCount: 1,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      const mockSeller: PublicProfile = {
        id: 'seller-456',
        handle: 'johndoe',
        displayName: 'John Doe',
        bio: 'Vintage collector',
        profileImageUrl: 'https://example.com/seller.jpg',
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      // Mock service methods
      vi.spyOn(AuctionService.prototype, 'getAuction').mockResolvedValue(mockAuction);
      vi.spyOn(ProfileService.prototype, 'getProfilesByIds').mockResolvedValue(
        new Map([['seller-456', mockSeller]])
      );

      // Execute GraphQL query
      const result = await server.executeOperation({
        query: `
          query GetAuction($id: ID!) {
            auction(id: $id) {
              id
              title
              currentPrice
              bidCount
              seller {
                id
                handle
                displayName
                bio
              }
            }
          }
        `,
        variables: { id: 'auction-123' },
      }, { contextValue: unauthContext });

      // Verify response
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        expect(result.body.singleResult.data?.auction.id).toBe('auction-123');
        expect(result.body.singleResult.data?.auction.title).toBe('Vintage Camera');
        expect(result.body.singleResult.data?.auction.seller.id).toBe('seller-456');
        expect(result.body.singleResult.data?.auction.seller.handle).toBe('johndoe');
        expect(result.body.singleResult.data?.auction.seller.displayName).toBe('John Doe');
      }
    });
  });

  describe('Test 5: List Auctions', () => {
    it('should return paginated list of auctions', async () => {
      const mockAuctions: Auction[] = [
        {
          id: 'auction-1',
          userId: 'seller-1',
          title: 'Vintage Camera',
          startPrice: 100.00,
          currentPrice: 100.00,
          startTime: '2024-01-01T00:00:00.000Z',
          endTime: '2024-01-15T00:00:00.000Z',
          status: 'ACTIVE',
          bidCount: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'auction-2',
          userId: 'seller-2',
          title: 'Antique Watch',
          startPrice: 200.00,
          currentPrice: 200.00,
          startTime: '2024-01-02T00:00:00.000Z',
          endTime: '2024-01-16T00:00:00.000Z',
          status: 'ACTIVE',
          bidCount: 0,
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
        {
          id: 'auction-3',
          userId: 'seller-3',
          title: 'Rare Coin',
          startPrice: 50.00,
          currentPrice: 50.00,
          startTime: '2024-01-03T00:00:00.000Z',
          endTime: '2024-01-17T00:00:00.000Z',
          status: 'ACTIVE',
          bidCount: 0,
          createdAt: '2024-01-03T00:00:00.000Z',
          updatedAt: '2024-01-03T00:00:00.000Z',
        },
      ];

      // Mock service method
      vi.spyOn(AuctionService.prototype, 'listAuctions').mockResolvedValue({
        auctions: mockAuctions,
        hasMore: true,
      });

      // Execute GraphQL query
      const result = await server.executeOperation({
        query: `
          query ListAuctions($limit: Int) {
            auctions(limit: $limit) {
              edges {
                node {
                  id
                  title
                  currentPrice
                  status
                }
              }
              pageInfo {
                hasNextPage
                hasPreviousPage
              }
            }
          }
        `,
        variables: { limit: 10 },
      }, { contextValue: unauthContext });

      // Verify response
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        expect(result.body.singleResult.data?.auctions.edges).toHaveLength(3);
        expect(result.body.singleResult.data?.auctions.edges[0].node.id).toBe('auction-1');
        expect(result.body.singleResult.data?.auctions.edges[1].node.id).toBe('auction-2');
        expect(result.body.singleResult.data?.auctions.edges[2].node.id).toBe('auction-3');
        expect(result.body.singleResult.data?.auctions.pageInfo.hasNextPage).toBe(true);
      }
    });
  });

  describe('Test 6: DataLoader Batching', () => {
    it('should batch multiple seller profile fetches into single call', async () => {
      const mockAuctions: Auction[] = [
        {
          id: 'auction-1',
          userId: 'seller-1',
          title: 'Vintage Camera',
          startPrice: 100.00,
          currentPrice: 100.00,
          startTime: '2024-01-01T00:00:00.000Z',
          endTime: '2024-01-15T00:00:00.000Z',
          status: 'ACTIVE',
          bidCount: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'auction-2',
          userId: 'seller-2',
          title: 'Antique Watch',
          startPrice: 200.00,
          currentPrice: 200.00,
          startTime: '2024-01-02T00:00:00.000Z',
          endTime: '2024-01-16T00:00:00.000Z',
          status: 'ACTIVE',
          bidCount: 0,
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
        {
          id: 'auction-3',
          userId: 'seller-3',
          title: 'Rare Coin',
          startPrice: 50.00,
          currentPrice: 50.00,
          startTime: '2024-01-03T00:00:00.000Z',
          endTime: '2024-01-17T00:00:00.000Z',
          status: 'ACTIVE',
          bidCount: 0,
          createdAt: '2024-01-03T00:00:00.000Z',
          updatedAt: '2024-01-03T00:00:00.000Z',
        },
      ];

      const mockProfiles: Map<string, PublicProfile> = new Map([
        ['seller-1', {
          id: 'seller-1',
          handle: 'alice',
          displayName: 'Alice Smith',
          bio: 'Camera enthusiast',
          profileImageUrl: null,
          followersCount: 50,
          followingCount: 30,
          postsCount: 10,
          createdAt: '2024-01-01T00:00:00.000Z',
        }],
        ['seller-2', {
          id: 'seller-2',
          handle: 'bob',
          displayName: 'Bob Jones',
          bio: 'Watch collector',
          profileImageUrl: null,
          followersCount: 75,
          followingCount: 40,
          postsCount: 15,
          createdAt: '2024-01-01T00:00:00.000Z',
        }],
        ['seller-3', {
          id: 'seller-3',
          handle: 'charlie',
          displayName: 'Charlie Brown',
          bio: 'Coin expert',
          profileImageUrl: null,
          followersCount: 100,
          followingCount: 50,
          postsCount: 20,
          createdAt: '2024-01-01T00:00:00.000Z',
        }],
      ]);

      // Mock service methods
      vi.spyOn(AuctionService.prototype, 'listAuctions').mockResolvedValue({
        auctions: mockAuctions,
        hasMore: false,
      });

      // Mock batch profile fetch - THIS IS THE KEY TEST!
      // This should be called ONCE with all 3 seller IDs, not 3 times individually
      const getProfilesByIdsSpy = vi.spyOn(ProfileService.prototype, 'getProfilesByIds')
        .mockResolvedValue(mockProfiles);

      // Execute GraphQL query that requests seller field for all auctions
      const result = await server.executeOperation({
        query: `
          query ListAuctionsWithSellers($limit: Int) {
            auctions(limit: $limit) {
              edges {
                node {
                  id
                  title
                  seller {
                    id
                    handle
                    displayName
                  }
                }
              }
            }
          }
        `,
        variables: { limit: 10 },
      }, { contextValue: unauthContext });

      // Verify response
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        expect(result.body.singleResult.data?.auctions.edges).toHaveLength(3);

        // Verify all sellers are resolved
        expect(result.body.singleResult.data?.auctions.edges[0].node.seller.handle).toBe('alice');
        expect(result.body.singleResult.data?.auctions.edges[1].node.seller.handle).toBe('bob');
        expect(result.body.singleResult.data?.auctions.edges[2].node.seller.handle).toBe('charlie');
      }

      // CRITICAL ASSERTION: DataLoader should batch all 3 profile fetches into ONE call
      expect(getProfilesByIdsSpy).toHaveBeenCalledTimes(1);
      expect(getProfilesByIdsSpy).toHaveBeenCalledWith(['seller-1', 'seller-2', 'seller-3']);
    });
  });

  describe('Complete Auction Lifecycle', () => {
    it('should complete full auction workflow: create → activate → bid → query with seller', async () => {
      const auctionId = 'auction-lifecycle-123';
      const sellerId = 'test-user-123';
      const bidderId = 'bidder-456';

      // Step 1: Create auction
      const pendingAuction: Auction = {
        id: auctionId,
        userId: sellerId,
        title: 'Complete Lifecycle Test',
        description: 'Testing full auction flow',
        imageUrl: 'https://example.com/lifecycle.jpg',
        startPrice: 100.00,
        currentPrice: 100.00,
        startTime: '2024-01-01T00:00:00.000Z',
        endTime: '2024-01-15T00:00:00.000Z',
        status: 'PENDING',
        bidCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.spyOn(ProfileService.prototype, 'generatePresignedUrl').mockResolvedValue({
        uploadUrl: 'https://s3.example.com/upload',
        publicUrl: 'https://example.com/lifecycle.jpg',
        expiresIn: 3600,
      });
      vi.spyOn(AuctionService.prototype, 'createAuction').mockResolvedValue(pendingAuction);

      const createResult = await server.executeOperation({
        query: `
          mutation CreateAuction($input: CreateAuctionInput!) {
            createAuction(input: $input) {
              auction { id, status }
              uploadUrl
            }
          }
        `,
        variables: {
          input: {
            title: 'Complete Lifecycle Test',
            description: 'Testing full auction flow',
            fileType: 'image/jpeg',
            startPrice: 100.00,
            startTime: '2024-01-01T00:00:00.000Z',
            endTime: '2024-01-15T00:00:00.000Z',
          },
        },
      }, { contextValue: mockContext });

      expect(createResult.body.kind).toBe('single');
      if (createResult.body.kind === 'single') {
        expect(createResult.body.singleResult.data?.createAuction.auction.status).toBe('PENDING');
      }

      // Step 2: Activate auction
      const activeAuction: Auction = { ...pendingAuction, status: 'ACTIVE' };
      vi.spyOn(AuctionService.prototype, 'activateAuction').mockResolvedValue(activeAuction);

      const activateResult = await server.executeOperation({
        query: `
          mutation ActivateAuction($id: ID!) {
            activateAuction(id: $id) { id, status }
          }
        `,
        variables: { id: auctionId },
      }, { contextValue: mockContext });

      expect(activateResult.body.kind).toBe('single');
      if (activateResult.body.kind === 'single') {
        expect(activateResult.body.singleResult.data?.activateAuction.status).toBe('ACTIVE');
      }

      // Step 3: Place bid
      const bidderContext: GraphQLContext = {
        ...mockContext,
        userId: bidderId,
        loaders: createLoaders({
          profileService: mockProfileService,
          postService: {} as any,
          likeService: {} as any,
          auctionService: mockAuctionService,
        }, bidderId),
      };

      const auctionWithBid: Auction = {
        ...activeAuction,
        currentPrice: 120.00,
        bidCount: 1,
      };

      vi.spyOn(AuctionService.prototype, 'placeBid').mockResolvedValue({
        bid: {
          id: 'bid-123',
          auctionId,
          userId: bidderId,
          amount: 120.00,
          createdAt: '2024-01-02T00:00:00.000Z',
        },
        auction: auctionWithBid,
      });

      const bidResult = await server.executeOperation({
        query: `
          mutation PlaceBid($input: PlaceBidInput!) {
            placeBid(input: $input) {
              bid { amount }
              auction { currentPrice, bidCount }
            }
          }
        `,
        variables: {
          input: { auctionId, amount: 120.00 },
        },
      }, { contextValue: bidderContext });

      expect(bidResult.body.kind).toBe('single');
      if (bidResult.body.kind === 'single') {
        expect(bidResult.body.singleResult.data?.placeBid.auction.currentPrice).toBe(120.00);
        expect(bidResult.body.singleResult.data?.placeBid.auction.bidCount).toBe(1);
      }

      // Step 4: Query auction with seller
      vi.spyOn(AuctionService.prototype, 'getAuction').mockResolvedValue(auctionWithBid);
      vi.spyOn(ProfileService.prototype, 'getProfilesByIds').mockResolvedValue(
        new Map([[sellerId, {
          id: sellerId,
          handle: 'seller',
          displayName: 'Seller User',
          bio: null,
          profileImageUrl: null,
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
        }]])
      );

      const queryResult = await server.executeOperation({
        query: `
          query GetAuction($id: ID!) {
            auction(id: $id) {
              id
              title
              currentPrice
              bidCount
              status
              seller { handle }
            }
          }
        `,
        variables: { id: auctionId },
      }, { contextValue: unauthContext });

      expect(queryResult.body.kind).toBe('single');
      if (queryResult.body.kind === 'single') {
        expect(queryResult.body.singleResult.errors).toBeUndefined();
        expect(queryResult.body.singleResult.data?.auction.currentPrice).toBe(120.00);
        expect(queryResult.body.singleResult.data?.auction.bidCount).toBe(1);
        expect(queryResult.body.singleResult.data?.auction.seller.handle).toBe('seller');
      }
    });
  });
});
