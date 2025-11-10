# Auction System MVP - Backend-First TDD Implementation Plan

## Executive Summary

**Goal:** Build auction system MVP using PostgreSQL for ACID transactions, following existing TDD patterns and reusing shared infrastructure.

**Architecture Decision:** Hybrid approach - PostgreSQL (RDS) for auctions, DynamoDB for existing social media features.

**Timeline:** ~8-10 hours total (backend + integration tests)

---

## Phase 1: PostgreSQL Infrastructure (1-2 hours)

### 1.1 CDK Stack for RDS PostgreSQL
**File:** `infrastructure/lib/stacks/auction-database-stack.ts`
- RDS PostgreSQL 15 instance (db.t4g.micro for dev)
- VPC configuration (reuse existing VPC from current stacks)
- Security group allowing Lambda access
- Secret Manager for credentials
- Connection pooling via RDS Proxy (optional, add later)

**Pattern:** Follow existing `database-stack.ts` structure

### 1.2 Database Schema Migration
**File:** `packages/auction-dal/migrations/001_initial_schema.sql`
```sql
CREATE TABLE auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(50) NOT NULL,  -- References DynamoDB USER#<userId>
  title VARCHAR(200) NOT NULL,
  description TEXT,
  start_price DECIMAL(10,2) NOT NULL,
  reserve_price DECIMAL(10,2),
  current_price DECIMAL(10,2) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions(id),
  user_id VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_auctions_status_end ON auctions(status, end_time);
CREATE INDEX idx_auctions_user ON auctions(user_id);
CREATE INDEX idx_bids_auction ON bids(auction_id, created_at DESC);
CREATE INDEX idx_bids_user ON bids(user_id, created_at DESC);
```

---

## Phase 2: Shared Schemas (30 min)

### 2.1 Auction Schemas
**File:** `packages/shared/src/schemas/auction.schema.ts`
```typescript
import { z } from 'zod';

export const AuctionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  startPrice: z.number().positive(),
  reservePrice: z.number().positive().optional(),
  currentPrice: z.number().positive(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  status: z.enum(['pending', 'active', 'ended', 'cancelled']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const BidSchema = z.object({
  id: z.string().uuid(),
  auctionId: z.string().uuid(),
  userId: z.string(),
  amount: z.number().positive(),
  createdAt: z.string().datetime()
});

// Request/Response schemas
export const CreateAuctionRequestSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  startPrice: z.number().positive(),
  reservePrice: z.number().positive().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime()
});

export const PlaceBidRequestSchema = z.object({
  auctionId: z.string().uuid(),
  amount: z.number().positive()
});

export const CreateAuctionResponseSchema = z.object({
  auction: AuctionSchema
});

export const PlaceBidResponseSchema = z.object({
  bid: BidSchema,
  auction: AuctionSchema
});

export const AuctionListResponseSchema = z.object({
  auctions: z.array(AuctionSchema),
  nextCursor: z.string().optional()
});

// Type exports
export type Auction = z.infer<typeof AuctionSchema>;
export type Bid = z.infer<typeof BidSchema>;
export type CreateAuctionRequest = z.infer<typeof CreateAuctionRequestSchema>;
export type PlaceBidRequest = z.infer<typeof PlaceBidRequestSchema>;
export type CreateAuctionResponse = z.infer<typeof CreateAuctionResponseSchema>;
export type PlaceBidResponse = z.infer<typeof PlaceBidResponseSchema>;
export type AuctionListResponse = z.infer<typeof AuctionListResponseSchema>;
```

**File:** `packages/shared/src/schemas/index.ts` (update)
```typescript
// Add to existing exports
export * from './auction.schema.js';
```

---

## Phase 3: Auction DAL Service (TDD - 2 hours)

### 3.1 Test First: AuctionService.test.ts
**File:** `packages/auction-dal/src/services/auction.service.test.ts`
```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { AuctionService } from './auction.service.js';
import type { CreateAuctionRequest, PlaceBidRequest } from '@social-media-app/shared';

describe('AuctionService', () => {
  let pool: Pool;
  let service: AuctionService;
  let testUserId: string;

  beforeAll(async () => {
    // Connect to test database
    pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'auctions_test',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres'
    });

    service = new AuctionService(pool);
    testUserId = 'USER#test-user-123';
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
        title: 'Test Auction',
        description: 'Test description',
        startPrice: 100.00,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString()
      };

      const result = await service.createAuction(testUserId, request);

      expect(result.id).toBeDefined();
      expect(result.userId).toBe(testUserId);
      expect(result.title).toBe('Test Auction');
      expect(result.currentPrice).toBe(100.00);
      expect(result.status).toBe('pending');
    });

    it('should reject auction with end time before start time', async () => {
      const request: CreateAuctionRequest = {
        title: 'Invalid Auction',
        startPrice: 100.00,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() - 1000).toISOString()
      };

      await expect(service.createAuction(testUserId, request))
        .rejects.toThrow('End time must be after start time');
    });
  });

  describe('placeBid - ACID Transaction Tests', () => {
    it('should place bid atomically when higher than current price', async () => {
      // Create auction
      const auction = await service.createAuction(testUserId, {
        title: 'Test Auction',
        startPrice: 100.00,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString()
      });

      // Activate auction
      await service.activateAuction(auction.id);

      // Place bid
      const bidRequest: PlaceBidRequest = {
        auctionId: auction.id,
        amount: 150.00
      };

      const result = await service.placeBid('USER#bidder-1', bidRequest);

      expect(result.bid.amount).toBe(150.00);
      expect(result.auction.currentPrice).toBe(150.00);
    });

    it('should reject bid lower than current price', async () => {
      const auction = await service.createAuction(testUserId, {
        title: 'Test Auction',
        startPrice: 100.00,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString()
      });

      await service.activateAuction(auction.id);

      const bidRequest: PlaceBidRequest = {
        auctionId: auction.id,
        amount: 50.00
      };

      await expect(service.placeBid('USER#bidder-1', bidRequest))
        .rejects.toThrow('Bid amount must be higher than current price');
    });

    it('should handle concurrent bids correctly (race condition test)', async () => {
      const auction = await service.createAuction(testUserId, {
        title: 'Test Auction',
        startPrice: 100.00,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString()
      });

      await service.activateAuction(auction.id);

      // Simulate concurrent bids
      const bid1Promise = service.placeBid('USER#bidder-1', {
        auctionId: auction.id,
        amount: 150.00
      });

      const bid2Promise = service.placeBid('USER#bidder-2', {
        auctionId: auction.id,
        amount: 150.00
      });

      const results = await Promise.allSettled([bid1Promise, bid2Promise]);

      // One should succeed, one should fail
      const succeeded = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(succeeded.length).toBe(1);
      expect(failed.length).toBe(1);

      // Verify final auction price
      const finalAuction = await service.getAuction(auction.id);
      expect(finalAuction.currentPrice).toBe(150.00);
    });
  });

  describe('getActiveAuctions', () => {
    it('should return only active auctions', async () => {
      // Create multiple auctions
      await service.createAuction(testUserId, {
        title: 'Pending Auction',
        startPrice: 100.00,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString()
      });

      const activeAuction = await service.createAuction(testUserId, {
        title: 'Active Auction',
        startPrice: 200.00,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString()
      });

      await service.activateAuction(activeAuction.id);

      const result = await service.getActiveAuctions({ limit: 10 });

      expect(result.auctions.length).toBe(1);
      expect(result.auctions[0].status).toBe('active');
    });
  });

  describe('getBidHistory', () => {
    it('should return bid history in chronological order', async () => {
      const auction = await service.createAuction(testUserId, {
        title: 'Test Auction',
        startPrice: 100.00,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString()
      });

      await service.activateAuction(auction.id);

      // Place multiple bids
      await service.placeBid('USER#bidder-1', { auctionId: auction.id, amount: 110.00 });
      await service.placeBid('USER#bidder-2', { auctionId: auction.id, amount: 120.00 });
      await service.placeBid('USER#bidder-1', { auctionId: auction.id, amount: 130.00 });

      const bids = await service.getBidHistory(auction.id);

      expect(bids.length).toBe(3);
      expect(bids[0].amount).toBe(130.00); // Most recent first
      expect(bids[1].amount).toBe(120.00);
      expect(bids[2].amount).toBe(110.00);
    });
  });
});
```

### 3.2 Implement: AuctionService
**File:** `packages/auction-dal/src/services/auction.service.ts`
```typescript
import { Pool, PoolClient } from 'pg';
import type {
  Auction,
  Bid,
  CreateAuctionRequest,
  PlaceBidRequest,
  CreateAuctionResponse,
  PlaceBidResponse,
  AuctionListResponse
} from '@social-media-app/shared';

export class AuctionService {
  constructor(private pool: Pool) {}

  async createAuction(userId: string, request: CreateAuctionRequest): Promise<Auction> {
    // Validate dates
    if (new Date(request.endTime) <= new Date(request.startTime)) {
      throw new Error('End time must be after start time');
    }

    const result = await this.pool.query(`
      INSERT INTO auctions (
        user_id, title, description, start_price, reserve_price,
        current_price, start_time, end_time
      )
      VALUES ($1, $2, $3, $4, $5, $4, $6, $7)
      RETURNING *
    `, [
      userId,
      request.title,
      request.description,
      request.startPrice,
      request.reservePrice,
      request.startTime,
      request.endTime
    ]);

    return this.mapRowToAuction(result.rows[0]);
  }

  async placeBid(userId: string, request: PlaceBidRequest): Promise<PlaceBidResponse> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Lock auction row and check current price
      const auctionResult = await client.query(`
        SELECT * FROM auctions
        WHERE id = $1 AND status = 'active'
        FOR UPDATE
      `, [request.auctionId]);

      if (auctionResult.rows.length === 0) {
        throw new Error('Auction not found or not active');
      }

      const auction = auctionResult.rows[0];

      if (request.amount <= auction.current_price) {
        throw new Error('Bid amount must be higher than current price');
      }

      // Insert bid
      const bidResult = await client.query(`
        INSERT INTO bids (auction_id, user_id, amount)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [request.auctionId, userId, request.amount]);

      // Update auction current price
      const updatedAuctionResult = await client.query(`
        UPDATE auctions
        SET current_price = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [request.amount, request.auctionId]);

      await client.query('COMMIT');

      return {
        bid: this.mapRowToBid(bidResult.rows[0]),
        auction: this.mapRowToAuction(updatedAuctionResult.rows[0])
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getAuction(auctionId: string): Promise<Auction> {
    const result = await this.pool.query(
      'SELECT * FROM auctions WHERE id = $1',
      [auctionId]
    );

    if (result.rows.length === 0) {
      throw new Error('Auction not found');
    }

    return this.mapRowToAuction(result.rows[0]);
  }

  async activateAuction(auctionId: string): Promise<Auction> {
    const result = await this.pool.query(`
      UPDATE auctions
      SET status = 'active', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [auctionId]);

    if (result.rows.length === 0) {
      throw new Error('Auction not found');
    }

    return this.mapRowToAuction(result.rows[0]);
  }

  async getActiveAuctions(options: { limit: number; offset?: number }): Promise<AuctionListResponse> {
    const result = await this.pool.query(`
      SELECT * FROM auctions
      WHERE status = 'active'
      ORDER BY end_time ASC
      LIMIT $1 OFFSET $2
    `, [options.limit, options.offset || 0]);

    return {
      auctions: result.rows.map(row => this.mapRowToAuction(row))
    };
  }

  async getBidHistory(auctionId: string): Promise<Bid[]> {
    const result = await this.pool.query(`
      SELECT * FROM bids
      WHERE auction_id = $1
      ORDER BY created_at DESC
    `, [auctionId]);

    return result.rows.map(row => this.mapRowToBid(row));
  }

  private mapRowToAuction(row: any): Auction {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      startPrice: parseFloat(row.start_price),
      reservePrice: row.reserve_price ? parseFloat(row.reserve_price) : undefined,
      currentPrice: parseFloat(row.current_price),
      startTime: row.start_time.toISOString(),
      endTime: row.end_time.toISOString(),
      status: row.status,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    };
  }

  private mapRowToBid(row: any): Bid {
    return {
      id: row.id,
      auctionId: row.auction_id,
      userId: row.user_id,
      amount: parseFloat(row.amount),
      createdAt: row.created_at.toISOString()
    };
  }
}
```

---

## Phase 4: Backend Lambda Handlers (TDD - 2 hours)

### 4.1 Test First: Handler Tests
**File:** `packages/backend/src/handlers/auctions/create-auction.test.ts`
**Pattern:** Follow existing handler test patterns from `create-post.test.ts`

### 4.2 Implement: Auction Handlers
**Files:**
- `packages/backend/src/handlers/auctions/create-auction.ts`
- `packages/backend/src/handlers/auctions/place-bid.ts`
- `packages/backend/src/handlers/auctions/get-auction.ts`
- `packages/backend/src/handlers/auctions/list-auctions.ts`
- `packages/backend/src/handlers/auctions/get-bid-history.ts`

**Pattern:** Reuse existing handler structure (JWT auth, error handling, response helpers)

---

## Phase 5: Integration Tests (TDD - 1 hour)

### 5.1 End-to-End Auction Workflow
**File:** `packages/integration-tests/src/scenarios/auction-workflow.test.ts`
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import {
  createTestUser,
  createLocalStackHttpClient,
  type TestUser
} from '../utils/index.js';
import type { CreateAuctionRequest, PlaceBidRequest } from '@social-media-app/shared';

describe('Auction Workflow Integration', () => {
  const httpClient = createLocalStackHttpClient();
  let seller: TestUser;
  let bidder1: TestUser;
  let bidder2: TestUser;

  beforeAll(async () => {
    // Create test users via existing factory
    seller = await createTestUser(httpClient, { prefix: 'auction-seller' });
    bidder1 = await createTestUser(httpClient, { prefix: 'auction-bidder1' });
    bidder2 = await createTestUser(httpClient, { prefix: 'auction-bidder2' });
  });

  it('should complete full auction lifecycle', async () => {
    // Step 1: Seller creates auction
    const createRequest: CreateAuctionRequest = {
      title: 'Vintage Camera',
      description: 'Rare camera from 1960s',
      startPrice: 100.00,
      reservePrice: 500.00,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 86400000).toISOString()
    };

    const createResponse = await httpClient.post('/auctions', createRequest, {
      headers: { Authorization: `Bearer ${seller.token}` }
    });

    expect(createResponse.status).toBe(201);
    const { auction } = createResponse.data;
    const auctionId = auction.id;

    // Step 2: Activate auction
    await httpClient.post(`/auctions/${auctionId}/activate`, {}, {
      headers: { Authorization: `Bearer ${seller.token}` }
    });

    // Step 3: Bidder 1 places bid
    const bid1Request: PlaceBidRequest = {
      auctionId,
      amount: 150.00
    };

    const bid1Response = await httpClient.post('/bids', bid1Request, {
      headers: { Authorization: `Bearer ${bidder1.token}` }
    });

    expect(bid1Response.status).toBe(201);
    expect(bid1Response.data.auction.currentPrice).toBe(150.00);

    // Step 4: Bidder 2 places higher bid
    const bid2Request: PlaceBidRequest = {
      auctionId,
      amount: 200.00
    };

    const bid2Response = await httpClient.post('/bids', bid2Request, {
      headers: { Authorization: `Bearer ${bidder2.token}` }
    });

    expect(bid2Response.status).toBe(201);
    expect(bid2Response.data.auction.currentPrice).toBe(200.00);

    // Step 5: Bidder 1 tries to bid lower (should fail)
    const lowBidRequest: PlaceBidRequest = {
      auctionId,
      amount: 180.00
    };

    try {
      await httpClient.post('/bids', lowBidRequest, {
        headers: { Authorization: `Bearer ${bidder1.token}` }
      });
      expect.fail('Should have rejected low bid');
    } catch (error: any) {
      expect(error.status).toBe(400);
    }

    // Step 6: Get bid history
    const historyResponse = await httpClient.get(`/auctions/${auctionId}/bids`);
    expect(historyResponse.data.bids.length).toBe(2);
    expect(historyResponse.data.bids[0].amount).toBe(200.00); // Latest first

    console.log('✅ Complete auction lifecycle verified');
  });
});
```

---

## Phase 6: API Gateway Integration (30 min)

### 6.1 Update API Stack
**File:** `infrastructure/lib/stacks/api-stack.ts`
```typescript
// Add auction endpoints to existing API Gateway
const auctionRoutes = [
  { path: '/auctions', method: 'POST', handler: createAuctionLambda },
  { path: '/auctions', method: 'GET', handler: listAuctionsLambda },
  { path: '/auctions/{id}', method: 'GET', handler: getAuctionLambda },
  { path: '/auctions/{id}/activate', method: 'POST', handler: activateAuctionLambda },
  { path: '/bids', method: 'POST', handler: placeBidLambda },
  { path: '/auctions/{id}/bids', method: 'GET', handler: getBidHistoryLambda }
];
```

---

## Phase 7: Local Development Setup (30 min)

### 7.1 Docker Compose for PostgreSQL
**File:** `docker-compose.yml` (update)
```yaml
services:
  localstack:
    # ... existing LocalStack config

  postgres:
    image: postgres:15-alpine
    container_name: auction-postgres-local
    environment:
      POSTGRES_DB: auctions_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./packages/auction-dal/migrations:/docker-entrypoint-initdb.d

volumes:
  postgres_data:
```

### 7.2 Update Dev Scripts
**File:** `package.json` (root)
```json
"scripts": {
  "dev:postgres": "docker-compose up postgres -d",
  "dev": "pnpm dev:localstack && pnpm dev:postgres && pnpm dev:servers",
  "migrate:dev": "psql postgresql://postgres:postgres@localhost:5432/auctions_dev -f packages/auction-dal/migrations/001_initial_schema.sql"
}
```

---

## Success Criteria

### Backend Complete When:
- ✅ All unit tests passing (AuctionService)
- ✅ All integration tests passing (auction-workflow.test.ts)
- ✅ ACID transactions verified (concurrent bid test)
- ✅ Local development working (docker-compose + pnpm dev)
- ✅ API endpoints responding correctly
- ✅ Race condition handling tested and working

### Reused Patterns:
- ✅ Zod schemas in `@social-media-app/shared`
- ✅ Test factories from `@social-media-app/integration-tests`
- ✅ Handler structure from existing backend handlers
- ✅ JWT authentication middleware
- ✅ Error response helpers
- ✅ CDK stack patterns

### TDD Workflow:
1. Write test first (Red)
2. Implement minimal code (Green)
3. Refactor if needed
4. Run full test suite
5. Git commit when tests pass

---

## Architecture Decisions Captured

### Why PostgreSQL Instead of DynamoDB?

**Auction Requirements:**
- ✅ ACID transactions (bid placement must be atomic)
- ✅ Strong consistency (current price must be accurate)
- ✅ Row-level locking (handle concurrent bids)
- ✅ Complex queries (filter by status, price, time)
- ✅ Relational integrity (bids reference auctions)

**DynamoDB Limitations for Auctions:**
- ❌ Best-effort transactions only (expensive, limited)
- ❌ Hot partition problem (popular auctions throttle)
- ❌ Eventually consistent reads (price could be stale)
- ❌ Complex workarounds needed (sharding, caching, GSIs)
- ❌ 4x cost for transactional writes

**Cost Comparison (10K auctions/day):**
- PostgreSQL RDS: ~$75/month
- DynamoDB with workarounds: ~$800+/month

### Hybrid Architecture Benefits

**DynamoDB (keep for):**
- User profiles (high read, eventual consistency OK)
- Posts/likes/comments (idempotent, event-driven)
- Follows (eventual consistency works fine)
- Feed generation (cached in Redis anyway)

**PostgreSQL (use for):**
- Auctions (ACID required)
- Bids (strong consistency required)
- Financial records (audit trail needed)

**Integration:**
- Share user IDs between systems
- Use Kinesis for cross-system events
- Redis for caching (works with both)
- S3 for media (shared storage)

---

## Next Steps After Backend Complete

### Frontend (Phase 8-10)
1. Auction list page
2. Auction detail page with bid form
3. My auctions page (seller view)
4. My bids page (bidder view)
5. Real-time bid updates (WebSocket or polling)

### Future Enhancements
- Auto-bidding (proxy bids)
- Auction close automation (scheduled Lambda)
- Payment integration
- Auction categories/search
- Notifications (bid outbid, auction ending)
- Admin tools (manage auctions)

---

**Document Version:** 1.0
**Created:** October 2025
**Status:** Ready to implement
