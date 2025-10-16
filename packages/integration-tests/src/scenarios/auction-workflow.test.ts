/**
 * Auction Workflow Integration Test
 *
 * This test demonstrates the complete auction lifecycle:
 * 1. Seller creates auction (status: pending)
 * 2. Get auction details
 * 3. Try to bid on pending auction (should fail)
 * 4. Seller activates auction (status: active, owner-only)
 * 5. Bidder 1 places first bid
 * 6. Bidder 2 places higher bid
 * 7. Bidder 1 tries to place lower bid (should fail)
 * 8. Get bid history
 * 9. List auctions with filters
 *
 * Prerequisites:
 * - PostgreSQL running on port 5432
 * - Backend API running on port 3001
 * - Database migrated with auction schema
 *
 * Run with: pnpm --filter @social-media-app/integration-tests test src/scenarios/auction-workflow.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  createTestUser,
  createLocalStackHttpClient,
  type TestUser,
} from '../utils/index.js';
import type {
  CreateAuctionRequest,
  PlaceBidRequest,
  Auction,
  Bid,
} from '@social-media-app/shared';

describe('Auction Workflow Integration', () => {
  const httpClient = createLocalStackHttpClient();
  let seller: TestUser;
  let bidder1: TestUser;
  let bidder2: TestUser;

  beforeAll(async () => {
    // Create test users
    seller = await createTestUser(httpClient, { prefix: 'auction-seller' });
    bidder1 = await createTestUser(httpClient, { prefix: 'auction-bidder1' });
    bidder2 = await createTestUser(httpClient, { prefix: 'auction-bidder2' });
  }, 60000);

  describe('Complete Auction Lifecycle', () => {
    it('should complete full auction workflow from creation to bidding', async () => {
      // ===================================================================
      // STEP 1: Seller creates auction
      // ===================================================================
      const createRequest: CreateAuctionRequest = {
        title: 'Vintage Camera',
        description: 'Rare 1960s camera in excellent condition',
        startPrice: 100.0,
        reservePrice: 500.0,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(), // 24 hours
      };

      const createResponse = await httpClient.post('/auctions', createRequest, {
        headers: { Authorization: `Bearer ${seller.token}` },
      });

      expect(createResponse.status).toBe(201);
      const { auction: createdAuction } = createResponse.data as { auction: Auction };
      const auctionId = createdAuction.id;

      expect(createdAuction.userId).toBe(seller.userId);
      expect(createdAuction.title).toBe('Vintage Camera');
      expect(createdAuction.startPrice).toBe(100.0);
      expect(createdAuction.currentPrice).toBe(100.0);
      expect(createdAuction.status).toBe('pending');
      expect(createdAuction.bidCount).toBe(0);

      console.log('✅ Step 1: Auction created', { auctionId, seller: seller.userId });

      // ===================================================================
      // STEP 2: Get auction details (public endpoint)
      // ===================================================================
      const getResponse = await httpClient.get(`/auctions/${auctionId}`);

      expect(getResponse.status).toBe(200);
      const { auction: fetchedAuction } = getResponse.data as { auction: Auction };
      expect(fetchedAuction.id).toBe(auctionId);
      expect(fetchedAuction.title).toBe('Vintage Camera');

      console.log('✅ Step 2: Auction retrieved', { auctionId });

      // ===================================================================
      // STEP 3: Try to bid on pending auction (should fail)
      // ===================================================================
      try {
        await httpClient.post(
          '/bids',
          {
            auctionId,
            amount: 150.0,
          } as PlaceBidRequest,
          {
            headers: { Authorization: `Bearer ${bidder1.token}` },
          }
        );
        expect.fail('Should not allow bidding on pending auction');
      } catch (error: any) {
        expect(error.status).toBe(404);
        if (error.data?.message) {
          expect(error.data.message).toContain('not found or not active');
        } else if (error.data?.error) {
          expect(error.data.error).toContain('not found or not active');
        }
      }

      console.log('✅ Step 3: Bidding blocked on pending auction');

      // ===================================================================
      // STEP 4: Activate auction (seller activates to enable bidding)
      // ===================================================================
      const activateResponse = await httpClient.post(
        `/auctions/${auctionId}/activate`,
        {},
        {
          headers: { Authorization: `Bearer ${seller.token}` },
        }
      );

      expect(activateResponse.status).toBe(200);
      const { auction: activatedAuction } = activateResponse.data as { auction: Auction };
      expect(activatedAuction.status).toBe('active');
      expect(activatedAuction.id).toBe(auctionId);

      console.log('✅ Step 4: Auction activated', { auctionId, status: 'active' });

      // Verify non-owner cannot activate
      try {
        await httpClient.post(
          `/auctions/${auctionId}/activate`,
          {},
          {
            headers: { Authorization: `Bearer ${bidder1.token}` },
          }
        );
        expect.fail('Non-owner should not be able to activate auction');
      } catch (error: any) {
        expect(error.status).toBe(403);
      }

      console.log('✅ Step 4b: Non-owner activation blocked');

      // ===================================================================
      // STEP 5: Bidder 1 places first bid
      // ===================================================================
      const bid1Request: PlaceBidRequest = {
        auctionId,
        amount: 150.0,
      };

      const bid1Response = await httpClient.post('/bids', bid1Request, {
        headers: { Authorization: `Bearer ${bidder1.token}` },
      });

      expect(bid1Response.status).toBe(201);
      const { bid: firstBid, auction: auctionAfterBid1 } = bid1Response.data as {
        bid: Bid;
        auction: Auction;
      };

      expect(firstBid.auctionId).toBe(auctionId);
      expect(firstBid.userId).toBe(bidder1.userId);
      expect(firstBid.amount).toBe(150.0);
      expect(auctionAfterBid1.currentPrice).toBe(150.0);
      expect(auctionAfterBid1.bidCount).toBe(1);

      console.log('✅ Step 5: First bid placed', {
        bidder: bidder1.userId,
        amount: 150.0,
      });

      // ===================================================================
      // STEP 6: Bidder 2 places higher bid
      // ===================================================================
      const bid2Request: PlaceBidRequest = {
        auctionId,
        amount: 200.0,
      };

      const bid2Response = await httpClient.post('/bids', bid2Request, {
        headers: { Authorization: `Bearer ${bidder2.token}` },
      });

      expect(bid2Response.status).toBe(201);
      const { bid: secondBid, auction: auctionAfterBid2 } = bid2Response.data as {
        bid: Bid;
        auction: Auction;
      };

      expect(secondBid.amount).toBe(200.0);
      expect(auctionAfterBid2.currentPrice).toBe(200.0);
      expect(auctionAfterBid2.bidCount).toBe(2);

      console.log('✅ Step 6: Higher bid placed', {
        bidder: bidder2.userId,
        amount: 200.0,
      });

      // ===================================================================
      // STEP 7: Bidder 1 tries to place lower bid (should fail)
      // ===================================================================
      try {
        await httpClient.post(
          '/bids',
          {
            auctionId,
            amount: 175.0, // Lower than current price of 200
          } as PlaceBidRequest,
          {
            headers: { Authorization: `Bearer ${bidder1.token}` },
          }
        );
        expect.fail('Should not allow bid lower than current price');
      } catch (error: any) {
        expect(error.status).toBe(400);
        if (error.data?.message) {
          expect(error.data.message).toContain('higher than current price');
        } else if (error.data?.error) {
          expect(error.data.error).toContain('higher than current price');
        }
      }

      console.log('✅ Step 7: Lower bid rejected');

      // ===================================================================
      // STEP 8: Get bid history
      // ===================================================================
      const historyResponse = await httpClient.get(`/auctions/${auctionId}/bids`);
      expect(historyResponse.status).toBe(200);
      const { bids: bidHistory, total: totalBids } = historyResponse.data as {
        bids: Bid[];
        total: number;
      };

      expect(totalBids).toBe(2);
      expect(bidHistory).toHaveLength(2);
      // Bids should be ordered by amount descending
      expect(bidHistory[0].amount).toBeGreaterThanOrEqual(bidHistory[1].amount);

      console.log('✅ Step 8: Bid history retrieved', { totalBids: 2 });

      // ===================================================================
      // STEP 9: Filter auctions by userId
      // ===================================================================
      const userAuctionsResponse = await httpClient.get(
        `/auctions?userId=${seller.userId}&limit=10`
      );
      expect(userAuctionsResponse.status).toBe(200);
      const { auctions: userAuctions } = userAuctionsResponse.data as {
        auctions: Auction[];
      };
      expect(userAuctions.length).toBeGreaterThan(0);
      expect(userAuctions.every((a) => a.userId === seller.userId)).toBe(true);

      console.log('✅ Step 9: Filtered auctions by seller', {
        count: userAuctions.length,
      });

      console.log('');
      console.log('🎉 Complete Auction Workflow Test Passed!');
      console.log('   ✓ Auction creation');
      console.log('   ✓ Auction retrieval');
      console.log('   ✓ Pending auction protection');
      console.log('   ✓ Auction activation (owner-only)');
      console.log('   ✓ First bid placement');
      console.log('   ✓ Higher bid placement');
      console.log('   ✓ Lower bid rejection');
      console.log('   ✓ Bid history retrieval');
      console.log('   ✓ Auction listing');
      console.log('   ✓ User filtering');
      console.log('');
    }, 30000);
  });

  describe('Auction Listing and Filtering', () => {
    it('should list and filter auctions correctly', async () => {
      // Create multiple auctions
      const auction1 = await httpClient.post(
        '/auctions',
        {
          title: 'Auction 1',
          startPrice: 50.0,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString(),
        } as CreateAuctionRequest,
        {
          headers: { Authorization: `Bearer ${seller.token}` },
        }
      );

      const auction2 = await httpClient.post(
        '/auctions',
        {
          title: 'Auction 2',
          startPrice: 75.0,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString(),
        } as CreateAuctionRequest,
        {
          headers: { Authorization: `Bearer ${bidder1.token}` },
        }
      );

      expect(auction1.status).toBe(201);
      expect(auction2.status).toBe(201);

      // List all auctions
      const allResponse = await httpClient.get('/auctions?limit=20');
      expect(allResponse.status).toBe(200);
      const { auctions: allAuctions } = allResponse.data as { auctions: Auction[] };
      expect(allAuctions.length).toBeGreaterThanOrEqual(2);

      // Filter by seller
      const sellerResponse = await httpClient.get(
        `/auctions?userId=${seller.userId}&limit=20`
      );
      const { auctions: sellerAuctions } = sellerResponse.data as { auctions: Auction[] };
      expect(sellerAuctions.every((a) => a.userId === seller.userId)).toBe(true);

      // Filter by status
      const pendingResponse = await httpClient.get('/auctions?status=pending&limit=20');
      const { auctions: pendingAuctions } = pendingResponse.data as {
        auctions: Auction[];
      };
      expect(pendingAuctions.every((a) => a.status === 'pending')).toBe(true);

      console.log('✅ Auction listing and filtering working correctly');
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle invalid requests correctly', async () => {
      // Missing required fields
      try {
        await httpClient.post(
          '/auctions',
          {
            title: 'Invalid',
            // Missing startPrice, startTime, endTime
          },
          {
            headers: { Authorization: `Bearer ${seller.token}` },
          }
        );
        expect.fail('Should reject invalid auction data');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }

      // Invalid date range
      try {
        await httpClient.post(
          '/auctions',
          {
            title: 'Invalid Dates',
            startPrice: 100.0,
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() - 1000).toISOString(), // End before start
          } as CreateAuctionRequest,
          {
            headers: { Authorization: `Bearer ${seller.token}` },
          }
        );
        expect.fail('Should reject invalid date range');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }

      // Non-existent auction
      try {
        await httpClient.get('/auctions/00000000-0000-0000-0000-000000000000');
        expect.fail('Should return 404 for non-existent auction');
      } catch (error: any) {
        expect(error.status).toBe(404);
      }

      // Missing authentication
      try {
        await httpClient.post('/auctions', {
          title: 'No Auth',
          startPrice: 100.0,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString(),
        } as CreateAuctionRequest);
        expect.fail('Should require authentication');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }

      console.log('✅ Error handling working correctly');
    }, 30000);
  });
});
