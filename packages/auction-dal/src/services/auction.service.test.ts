/**
 * AuctionService Unit Tests
 *
 * TDD Tests for ACID transaction handling, concurrent bid processing,
 * and PostgreSQL integration.
 *
 * Run with: pnpm --filter @social-media-app/auction-dal test
 *
 * @module auction-dal/services
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { AuctionService } from './auction.service.js';
import type {
  CreateAuctionRequest,
  PlaceBidRequest,
} from '@social-media-app/shared';

describe('AuctionService', () => {
  let pool: Pool;
  let service: AuctionService;
  const testUserId = 'USER#test-user-123';
  const bidder1Id = 'USER#bidder-1';
  const bidder2Id = 'USER#bidder-2';

  beforeAll(async () => {
    // Connect to test database (using dev database for now)
    pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'auctions_dev',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
    });

    service = new AuctionService(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean tables before each test
    await pool.query('TRUNCATE auctions, bids CASCADE');
  });

  describe('createAuction', () => {
    it('should create auction with valid data', async () => {
      const request: CreateAuctionRequest = {
        title: 'Vintage Camera',
        description: 'Rare 1960s camera',
        startPrice: 100.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      };

      const auction = await service.createAuction(testUserId, request);

      expect(auction.id).toBeDefined();
      expect(auction.userId).toBe(testUserId);
      expect(auction.title).toBe('Vintage Camera');
      expect(auction.description).toBe('Rare 1960s camera');
      expect(auction.startPrice).toBe(100.0);
      expect(auction.currentPrice).toBe(100.0);
      expect(auction.status).toBe('pending');
      expect(auction.bidCount).toBe(0);
    });

    it('should create auction without description', async () => {
      const request: CreateAuctionRequest = {
        title: 'Simple Auction',
        startPrice: 50.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      };

      const auction = await service.createAuction(testUserId, request);

      expect(auction.title).toBe('Simple Auction');
      expect(auction.description).toBeUndefined();
    });

    it('should create auction with reserve price', async () => {
      const request: CreateAuctionRequest = {
        title: 'Reserved Auction',
        startPrice: 100.0,
        reservePrice: 500.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      };

      const auction = await service.createAuction(testUserId, request);

      expect(auction.reservePrice).toBe(500.0);
    });

    it('should reject auction with end time before start time', async () => {
      const request: CreateAuctionRequest = {
        title: 'Invalid Auction',
        startPrice: 100.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() - 1000).toISOString(),
      };

      await expect(service.createAuction(testUserId, request)).rejects.toThrow(
        'End time must be after start time'
      );
    });
  });

  describe('activateAuction', () => {
    it('should change auction status to active', async () => {
      const auction = await service.createAuction(testUserId, {
        title: 'Test Auction',
        startPrice: 100.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

      const activated = await service.activateAuction(auction.id);

      expect(activated.status).toBe('active');
    });

    it('should reject activating non-existent auction', async () => {
      await expect(
        service.activateAuction('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('Auction not found');
    });
  });

  describe('placeBid - ACID Transaction Tests', () => {
    it('should place bid when higher than current price', async () => {
      const auction = await service.createAuction(testUserId, {
        title: 'Test Auction',
        startPrice: 100.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

      await service.activateAuction(auction.id);

      const request: PlaceBidRequest = {
        auctionId: auction.id,
        amount: 150.0,
      };

      const result = await service.placeBid(bidder1Id, request);

      expect(result.bid.amount).toBe(150.0);
      expect(result.bid.userId).toBe(bidder1Id);
      expect(result.auction.currentPrice).toBe(150.0);
      expect(result.auction.bidCount).toBe(1);
    });

    it('should reject bid lower than or equal to current price', async () => {
      const auction = await service.createAuction(testUserId, {
        title: 'Test Auction',
        startPrice: 100.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

      await service.activateAuction(auction.id);

      await service.placeBid(bidder1Id, {
        auctionId: auction.id,
        amount: 150.0,
      });

      // Try to bid lower
      await expect(
        service.placeBid(bidder2Id, {
          auctionId: auction.id,
          amount: 140.0,
        })
      ).rejects.toThrow('Bid amount must be higher than current price');

      // Try to bid equal
      await expect(
        service.placeBid(bidder2Id, {
          auctionId: auction.id,
          amount: 150.0,
        })
      ).rejects.toThrow('Bid amount must be higher than current price');
    });

    it('should reject bids on non-active auctions', async () => {
      const auction = await service.createAuction(testUserId, {
        title: 'Pending Auction',
        startPrice: 100.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

      await expect(
        service.placeBid(bidder1Id, {
          auctionId: auction.id,
          amount: 150.0,
        })
      ).rejects.toThrow('Auction not found or not active');
    });

    it('should handle concurrent bids correctly (race condition test)', async () => {
      const auction = await service.createAuction(testUserId, {
        title: 'Race Test Auction',
        startPrice: 100.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

      await service.activateAuction(auction.id);

      // Place initial bid
      await service.placeBid(bidder1Id, {
        auctionId: auction.id,
        amount: 120.0,
      });

      // Simulate concurrent bids at same price
      const bid1Promise = service.placeBid(bidder1Id, {
        auctionId: auction.id,
        amount: 150.0,
      });

      const bid2Promise = service.placeBid(bidder2Id, {
        auctionId: auction.id,
        amount: 150.0,
      });

      const results = await Promise.allSettled([bid1Promise, bid2Promise]);

      // One should succeed, one should fail
      const succeeded = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');

      expect(succeeded.length).toBe(1);
      expect(failed.length).toBe(1);

      // Verify final auction state
      const finalAuction = await service.getAuction(auction.id);
      expect(finalAuction.currentPrice).toBe(150.0);
      expect(finalAuction.bidCount).toBe(2); // Initial bid + one successful concurrent bid
    });

    it('should increment bid_count with each bid', async () => {
      const auction = await service.createAuction(testUserId, {
        title: 'Count Test',
        startPrice: 100.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

      await service.activateAuction(auction.id);

      await service.placeBid(bidder1Id, {
        auctionId: auction.id,
        amount: 110.0,
      });

      await service.placeBid(bidder2Id, {
        auctionId: auction.id,
        amount: 120.0,
      });

      await service.placeBid(bidder1Id, {
        auctionId: auction.id,
        amount: 130.0,
      });

      const finalAuction = await service.getAuction(auction.id);
      expect(finalAuction.bidCount).toBe(3);
    });
  });

  describe('getAuction', () => {
    it('should return auction by id', async () => {
      const created = await service.createAuction(testUserId, {
        title: 'Test Auction',
        startPrice: 100.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

      const fetched = await service.getAuction(created.id);

      expect(fetched.id).toBe(created.id);
      expect(fetched.title).toBe('Test Auction');
    });

    it('should throw for non-existent auction', async () => {
      await expect(
        service.getAuction('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('Auction not found');
    });
  });

  describe('listAuctions', () => {
    beforeEach(async () => {
      // Create test auctions
      await service.createAuction(testUserId, {
        title: 'Pending Auction',
        startPrice: 100.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

      const active1 = await service.createAuction(testUserId, {
        title: 'Active Auction 1',
        startPrice: 200.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });
      await service.activateAuction(active1.id);

      const active2 = await service.createAuction(bidder1Id, {
        title: 'Active Auction 2',
        startPrice: 300.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 172800000).toISOString(),
      });
      await service.activateAuction(active2.id);
    });

    it('should list all auctions with pagination', async () => {
      const result = await service.listAuctions({ limit: 10 });

      expect(result.auctions.length).toBe(3);
    });

    it('should filter by status', async () => {
      const result = await service.listAuctions({ status: 'active', limit: 10 });

      expect(result.auctions.length).toBe(2);
      expect(result.auctions.every((a) => a.status === 'active')).toBe(true);
    });

    it('should filter by userId', async () => {
      const result = await service.listAuctions({ userId: bidder1Id, limit: 10 });

      expect(result.auctions.length).toBe(1);
      expect(result.auctions[0].userId).toBe(bidder1Id);
    });

    it('should respect limit', async () => {
      const result = await service.listAuctions({ limit: 2 });

      expect(result.auctions.length).toBe(2);
    });
  });

  describe('getBidHistory', () => {
    it('should return bid history in descending order', async () => {
      const auction = await service.createAuction(testUserId, {
        title: 'History Test',
        startPrice: 100.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

      await service.activateAuction(auction.id);

      await service.placeBid(bidder1Id, {
        auctionId: auction.id,
        amount: 110.0,
      });

      await service.placeBid(bidder2Id, {
        auctionId: auction.id,
        amount: 120.0,
      });

      await service.placeBid(bidder1Id, {
        auctionId: auction.id,
        amount: 130.0,
      });

      const result = await service.getBidHistory({
        auctionId: auction.id,
        limit: 10,
        offset: 0,
      });

      expect(result.bids.length).toBe(3);
      expect(result.total).toBe(3);
      expect(result.bids[0].amount).toBe(130.0); // Most recent first
      expect(result.bids[1].amount).toBe(120.0);
      expect(result.bids[2].amount).toBe(110.0);
    });

    it('should paginate bid history', async () => {
      const auction = await service.createAuction(testUserId, {
        title: 'Pagination Test',
        startPrice: 100.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

      await service.activateAuction(auction.id);

      for (let i = 1; i <= 5; i++) {
        await service.placeBid(bidder1Id, {
          auctionId: auction.id,
          amount: 100 + i * 10,
        });
      }

      const page1 = await service.getBidHistory({
        auctionId: auction.id,
        limit: 2,
        offset: 0,
      });

      expect(page1.bids.length).toBe(2);
      expect(page1.total).toBe(5);

      const page2 = await service.getBidHistory({
        auctionId: auction.id,
        limit: 2,
        offset: 2,
      });

      expect(page2.bids.length).toBe(2);
      expect(page2.total).toBe(5);
    });

    it('should return empty array for auction with no bids', async () => {
      const auction = await service.createAuction(testUserId, {
        title: 'No Bids',
        startPrice: 100.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

      const result = await service.getBidHistory({
        auctionId: auction.id,
        limit: 10,
        offset: 0,
      });

      expect(result.bids).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getAuctionsByIds - DataLoader Batch Method', () => {
    it('should return map of auctions by IDs', async () => {
      const auction1 = await service.createAuction(testUserId, {
        title: 'Auction 1',
        startPrice: 100.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

      const auction2 = await service.createAuction(testUserId, {
        title: 'Auction 2',
        startPrice: 200.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

      const auction3 = await service.createAuction(bidder1Id, {
        title: 'Auction 3',
        startPrice: 300.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

      const result = await service.getAuctionsByIds([auction1.id, auction2.id, auction3.id]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(3);
      expect(result.get(auction1.id)?.title).toBe('Auction 1');
      expect(result.get(auction2.id)?.title).toBe('Auction 2');
      expect(result.get(auction3.id)?.title).toBe('Auction 3');
    });

    it('should return empty map for empty IDs array', async () => {
      const result = await service.getAuctionsByIds([]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should return map with only found auctions for partial matches', async () => {
      const auction1 = await service.createAuction(testUserId, {
        title: 'Found Auction',
        startPrice: 100.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

      const result = await service.getAuctionsByIds([
        auction1.id,
        '00000000-0000-0000-0000-000000000000',
        '11111111-1111-1111-1111-111111111111',
      ]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(1);
      expect(result.get(auction1.id)?.title).toBe('Found Auction');
      expect(result.has('00000000-0000-0000-0000-000000000000')).toBe(false);
      expect(result.has('11111111-1111-1111-1111-111111111111')).toBe(false);
    });

    it('should maintain correct ID mapping', async () => {
      const auction1 = await service.createAuction(testUserId, {
        title: 'First',
        startPrice: 100.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

      const auction2 = await service.createAuction(bidder1Id, {
        title: 'Second',
        startPrice: 200.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

      // Request in reverse order to test mapping
      const result = await service.getAuctionsByIds([auction2.id, auction1.id]);

      expect(result.get(auction1.id)?.title).toBe('First');
      expect(result.get(auction2.id)?.title).toBe('Second');
    });
  });
});
