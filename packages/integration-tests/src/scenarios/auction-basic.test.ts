/**
 * Basic Auction Scenarios Integration Tests
 *
 * Simple test suite covering basic auction functionality:
 * 1. Create and retrieve auctions
 * 2. Multiple sellers
 * 3. Basic validation
 *
 * Prerequisites:
 * - PostgreSQL running on port 5432
 * - Backend API running on port 3001
 * - Database migrated with auction schema
 *
 * Run with: pnpm --filter @social-media-app/integration-tests test src/scenarios/auction-basic.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  createTestUser,
  createLocalStackHttpClient,
  type TestUser,
} from '../utils/index.js';
import type {
  CreateAuctionRequest,
  Auction,
} from '@social-media-app/shared';

describe('Basic Auction Scenarios', () => {
  const httpClient = createLocalStackHttpClient();
  let seller1: TestUser;
  let seller2: TestUser;

  beforeAll(async () => {
    seller1 = await createTestUser(httpClient, { prefix: 'basic-seller1' });
    seller2 = await createTestUser(httpClient, { prefix: 'basic-seller2' });
    console.log('✅ Test setup complete: 2 sellers created');
  }, 30000);

  describe('Create and Retrieve', () => {
    it('should create auction and retrieve it', async () => {
      // Create auction
      const createRequest: CreateAuctionRequest = {
        title: 'Test Camera',
        description: 'A nice camera for testing',
        startPrice: 100.0,
        reservePrice: 500.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(), // 24 hours
      };

      const createResponse = await httpClient.post('/auctions', createRequest, {
        headers: { Authorization: `Bearer ${seller1.token}` },
      });

      expect(createResponse.status).toBe(201);
      const { auction } = createResponse.data as { auction: Auction };

      expect(auction.title).toBe('Test Camera');
      expect(auction.userId).toBe(seller1.userId);
      expect(auction.startPrice).toBe(100.0);
      expect(auction.currentPrice).toBe(100.0);
      expect(auction.status).toBe('pending');
      expect(auction.bidCount).toBe(0);

      console.log('✅ Auction created', { auctionId: auction.id });

      // Retrieve auction by ID
      const getResponse = await httpClient.get(`/auctions/${auction.id}`);
      expect(getResponse.status).toBe(200);

      const { auction: retrieved } = getResponse.data as { auction: Auction };
      expect(retrieved.id).toBe(auction.id);
      expect(retrieved.title).toBe('Test Camera');

      console.log('✅ Auction retrieved by ID');

      // Check it appears in listings
      const listResponse = await httpClient.get('/auctions?limit=50');
      expect(listResponse.status).toBe(200);

      const { auctions } = listResponse.data as { auctions: Auction[] };
      const found = auctions.find((a) => a.id === auction.id);
      expect(found).toBeDefined();

      console.log('✅ Auction appears in listings');
    }, 30000);
  });

  describe('Multiple Sellers', () => {
    it('should handle auctions from multiple sellers', async () => {
      // Seller 1 creates an auction
      const auction1Response = await httpClient.post(
        '/auctions',
        {
          title: 'Seller 1 Item',
          startPrice: 50.0,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString(),
        } as CreateAuctionRequest,
        {
          headers: { Authorization: `Bearer ${seller1.token}` },
        }
      );

      expect(auction1Response.status).toBe(201);
      const { auction: auction1 } = auction1Response.data as { auction: Auction };

      // Seller 2 creates an auction
      const auction2Response = await httpClient.post(
        '/auctions',
        {
          title: 'Seller 2 Item',
          startPrice: 75.0,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString(),
        } as CreateAuctionRequest,
        {
          headers: { Authorization: `Bearer ${seller2.token}` },
        }
      );

      expect(auction2Response.status).toBe(201);
      const { auction: auction2 } = auction2Response.data as { auction: Auction };

      console.log('✅ Two auctions created by different sellers');

      // Filter by seller 1
      const seller1Response = await httpClient.get(
        `/auctions?userId=${seller1.userId}&limit=50`
      );
      const { auctions: seller1Auctions } = seller1Response.data as {
        auctions: Auction[];
      };

      const hasSeller1Auction = seller1Auctions.some((a) => a.id === auction1.id);
      const hasSeller2Auction = seller1Auctions.some((a) => a.id === auction2.id);

      expect(hasSeller1Auction).toBe(true);
      expect(hasSeller2Auction).toBe(false);

      console.log('✅ Seller 1 filter works correctly');

      // Filter by seller 2
      const seller2Response = await httpClient.get(
        `/auctions?userId=${seller2.userId}&limit=50`
      );
      const { auctions: seller2Auctions } = seller2Response.data as {
        auctions: Auction[];
      };

      const hasSeller1AuctionInSeller2 = seller2Auctions.some((a) => a.id === auction1.id);
      const hasSeller2AuctionInSeller2 = seller2Auctions.some((a) => a.id === auction2.id);

      expect(hasSeller1AuctionInSeller2).toBe(false);
      expect(hasSeller2AuctionInSeller2).toBe(true);

      console.log('✅ Seller 2 filter works correctly');
    }, 30000);
  });

  describe('Basic Validation', () => {
    it('should reject invalid auction data', async () => {
      // Test 1: Empty title
      try {
        await httpClient.post(
          '/auctions',
          {
            title: '',
            startPrice: 100.0,
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 86400000).toISOString(),
          } as CreateAuctionRequest,
          {
            headers: { Authorization: `Bearer ${seller1.token}` },
          }
        );
        expect.fail('Should reject empty title');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
      }

      console.log('✅ Empty title rejected');

      // Test 2: Negative price
      try {
        await httpClient.post(
          '/auctions',
          {
            title: 'Invalid Price',
            startPrice: -10.0,
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 86400000).toISOString(),
          } as CreateAuctionRequest,
          {
            headers: { Authorization: `Bearer ${seller1.token}` },
          }
        );
        expect.fail('Should reject negative price');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
      }

      console.log('✅ Negative price rejected');

      // Test 3: End time before start time
      try {
        await httpClient.post(
          '/auctions',
          {
            title: 'Invalid Times',
            startPrice: 100.0,
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() - 1000).toISOString(), // In the past
          } as CreateAuctionRequest,
          {
            headers: { Authorization: `Bearer ${seller1.token}` },
          }
        );
        expect.fail('Should reject end time before start time');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
      }

      console.log('✅ End time before start time rejected');

      // Test 4: Missing authentication
      try {
        await httpClient.post('/auctions', {
          title: 'No Auth',
          startPrice: 100.0,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString(),
        } as CreateAuctionRequest);
        expect.fail('Should require authentication');
      } catch (error: any) {
        expect(error.response?.status).toBe(401);
      }

      console.log('✅ Missing authentication rejected');
    }, 30000);
  });
});
