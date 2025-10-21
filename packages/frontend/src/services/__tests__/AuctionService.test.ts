/**
 * Auction Service Behavior Tests (GraphQL Implementation)
 *
 * Testing principles:
 * ✅ Test behavior (service contract), not implementation
 * ✅ Use MockGraphQLClient (DI pattern, NO spies)
 * ✅ Verify service calls GraphQL client correctly
 * ✅ Verify service transforms GraphQL responses correctly
 * ✅ Verify service handles errors correctly
 * ✅ DRY: Use test fixtures to reduce boilerplate
 * ❌ NO testing of GraphQL client internals
 * ❌ NO spying on internal methods
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { AuctionService } from '../implementations/AuctionService.graphql.js';
import { MockGraphQLClient } from '../../graphql/client.mock.js';
import { isSuccess, isError } from '../../graphql/types.js';

// Test fixtures (DRY)
import { createMockAuction, createMockBid, createMockBids } from './fixtures/auctionFixtures.js';
import {
  createListAuctionsResponse,
  createGetAuctionResponse,
  createCreateAuctionResponse,
  createPlaceBidResponse,
  createGetBidsResponse,
  createErrorState,
} from './fixtures/graphqlFixtures.js';

describe('AuctionService Behavior (GraphQL)', () => {
  let client: MockGraphQLClient;
  let service: AuctionService;

  beforeEach(() => {
    // ✅ DI: Inject mock client (NOT spy)
    client = new MockGraphQLClient();
    service = new AuctionService(client);
  });

  describe('listAuctions behavior', () => {
    test('should call GraphQL client with correct query and variables', async () => {
      // Arrange
      const auction = createMockAuction();
      client.setQueryResponse(createListAuctionsResponse([auction], {
        hasNextPage: true,
        endCursor: 'cursor-1',
      }));

      // Act
      await service.listAuctions({ limit: 20, status: 'ACTIVE' });

      // Assert
      expect(client.queryCalls).toHaveLength(1);
      expect(client.queryCalls[0].query).toContain('query ListAuctions');
      expect(client.queryCalls[0].variables).toEqual({
        limit: 20,
        cursor: undefined,
        status: 'ACTIVE',
        userId: undefined,
      });
    });

    test('should transform GraphQL response to service format', async () => {
      // Arrange
      const auction1 = createMockAuction({ id: '1', title: 'Auction 1' });
      const auction2 = createMockAuction({ id: '2', title: 'Auction 2' });

      client.setQueryResponse(createListAuctionsResponse(
        [auction1, auction2],
        { hasNextPage: true, endCursor: 'cursor-2' }
      ));

      // Act
      const result = await service.listAuctions();

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.auctions).toHaveLength(2);
        expect(result.data.auctions[0].title).toBe('Auction 1');
        expect(result.data.auctions[1].title).toBe('Auction 2');
        expect(result.data.nextCursor).toBe('cursor-2');
        expect(result.data.hasMore).toBe(true);
      }
    });

    test('should handle empty results', async () => {
      // Arrange
      client.setQueryResponse(createListAuctionsResponse([]));

      // Act
      const result = await service.listAuctions();

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.auctions).toHaveLength(0);
        expect(result.data.hasMore).toBe(false);
        expect(result.data.nextCursor).toBeNull();
      }
    });

    test('should propagate errors from GraphQL client', async () => {
      // Arrange
      client.setQueryResponse(createErrorState('Server error', 'INTERNAL_SERVER_ERROR'));

      // Act
      const result = await service.listAuctions();

      // Assert
      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.error.message).toBe('Server error');
        expect(result.error.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('getAuction behavior', () => {
    test('should call GraphQL client with auction ID', async () => {
      // Arrange
      const auction = createMockAuction({
        id: 'auction-123',
        title: 'Test Auction',
        currentPrice: 150,
        bidCount: 5,
      });

      client.setQueryResponse(createGetAuctionResponse(auction));

      // Act
      const result = await service.getAuction('auction-123');

      // Assert
      expect(client.queryCalls).toHaveLength(1);
      expect(client.queryCalls[0].query).toContain('query GetAuction');
      expect(client.queryCalls[0].variables).toEqual({ id: 'auction-123' });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.id).toBe('auction-123');
        expect(result.data.title).toBe('Test Auction');
      }
    });

    test('should return error when auction not found', async () => {
      // Arrange: GraphQL returns null
      client.setQueryResponse(createGetAuctionResponse(null));

      // Act
      const result = await service.getAuction('nonexistent');

      // Assert: Service transforms null to error
      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.error.message).toBe('Auction not found');
        expect(result.error.extensions?.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('createAuction behavior', () => {
    test('should call mutation with correct input', async () => {
      // Arrange
      const auction = createMockAuction({
        id: 'new-auction',
        title: 'New Auction',
        status: 'PENDING',
      });

      client.setMutationResponse(createCreateAuctionResponse(auction));

      const input = {
        title: 'New Auction',
        fileType: 'image/jpeg',
        startPrice: 100,
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-08T00:00:00Z',
      };

      const imageFile = new File(['dummy'], 'image.jpg', { type: 'image/jpeg' });

      // Mock fetch for S3 upload
      global.fetch = async (url: string | URL | Request) => {
        if (typeof url === 'string' && url.includes('s3.example.com')) {
          return new Response(null, { status: 200 });
        }
        throw new Error('Unexpected fetch call');
      };

      // Act
      const result = await service.createAuction(input, imageFile);

      // Assert
      expect(client.mutateCalls).toHaveLength(1);
      expect(client.mutateCalls[0].mutation).toContain('mutation CreateAuction');
      expect(client.mutateCalls[0].variables).toEqual({ input });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.auction.id).toBe('new-auction');
        expect(result.data.uploadUrl).toBe('https://s3.example.com/upload');
      }
    });

    test('should upload image to S3 after successful creation', async () => {
      // Arrange
      const auction = createMockAuction({
        id: 'new-auction',
        imageUrl: 'https://example.com/final-image.jpg',
      });

      client.setMutationResponse(createCreateAuctionResponse(
        auction,
        'https://s3.example.com/upload?signature=abc'
      ));

      const input = {
        title: 'New Auction',
        fileType: 'image/jpeg',
        startPrice: 100,
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-08T00:00:00Z',
      };

      const imageFile = new File(['dummy'], 'image.jpg', { type: 'image/jpeg' });

      // Mock fetch for S3 upload
      global.fetch = async (url: string | URL | Request) => {
        if (typeof url === 'string' && url.includes('s3.example.com')) {
          return new Response(null, { status: 200 });
        }
        throw new Error('Unexpected fetch call');
      };

      // Act
      const result = await service.createAuction(input, imageFile);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.auction.id).toBe('new-auction');
      }
    });

    test('should handle S3 upload failure gracefully', async () => {
      // Arrange
      const auction = createMockAuction({ id: 'new-auction' });
      client.setMutationResponse(createCreateAuctionResponse(auction));

      const input = {
        title: 'New Auction',
        fileType: 'image/jpeg',
        startPrice: 100,
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-08T00:00:00Z',
      };

      const imageFile = new File(['dummy'], 'image.jpg', { type: 'image/jpeg' });

      // Mock fetch to fail S3 upload
      global.fetch = async () => {
        return new Response(null, { status: 500 });
      };

      // Act
      const result = await service.createAuction(input, imageFile);

      // Assert
      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.error.message).toContain('upload');
      }
    });
  });

  describe('placeBid behavior', () => {
    test('should call mutation with correct input', async () => {
      // Arrange
      const bid = createMockBid({ amount: 150 });
      const auction = createMockAuction({
        id: 'auction-1',
        currentPrice: 150,
        bidCount: 1,
      });

      client.setMutationResponse(createPlaceBidResponse(bid, auction));

      // Act
      await service.placeBid('auction-1', 150);

      // Assert
      expect(client.mutateCalls).toHaveLength(1);
      expect(client.mutateCalls[0].mutation).toContain('mutation PlaceBid');
      expect(client.mutateCalls[0].variables).toEqual({
        input: { auctionId: 'auction-1', amount: 150 },
      });
    });

    test('should return bid and updated auction', async () => {
      // Arrange
      const bid = createMockBid({ amount: 150 });
      const auction = createMockAuction({
        id: 'auction-1',
        currentPrice: 150,
        bidCount: 6,
      });

      client.setMutationResponse(createPlaceBidResponse(bid, auction));

      // Act
      const result = await service.placeBid('auction-1', 150);

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.bid.amount).toBe(150);
        expect(result.data.auction.currentPrice).toBe(150);
        expect(result.data.auction.bidCount).toBe(6);
      }
    });
  });

  describe('getBidHistory behavior', () => {
    test('should call GraphQL client with correct query', async () => {
      // Arrange
      client.setQueryResponse(createGetBidsResponse([]));

      // Act
      await service.getBidHistory('auction-1', { limit: 50, offset: 0 });

      // Assert
      expect(client.queryCalls).toHaveLength(1);
      expect(client.queryCalls[0].query).toContain('query GetBids');
      expect(client.queryCalls[0].variables).toEqual({
        auctionId: 'auction-1',
        limit: 50,
        offset: 0,
      });
    });

    test('should return bid history with total count', async () => {
      // Arrange
      const bids = createMockBids(2, 'auction-1');
      bids[0].amount = 150;
      bids[1].amount = 175;

      client.setQueryResponse(createGetBidsResponse(bids, 25));

      // Act
      const result = await service.getBidHistory('auction-1');

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.bids).toHaveLength(2);
        expect(result.data.total).toBe(25);
        expect(result.data.bids[0].amount).toBe(150);
        expect(result.data.bids[1].amount).toBe(175);
      }
    });
  });
});
