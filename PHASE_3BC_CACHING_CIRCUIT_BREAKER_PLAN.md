# Phase 3B/3C: Backend Caching & Circuit Breaker Implementation

**Created:** 2025-11-10
**Status:** Planning Phase
**Estimated Duration:** 1-2 weeks
**Risk Level:** Low-Medium
**Priority:** Medium (Performance & Resilience)

---

## 🎯 Executive Summary

This plan implements backend caching (Phase 3B) and circuit breaker patterns (Phase 3C) to improve performance and resilience of the social media app backend.

**Expected Benefits:**
- 70-80% reduction in DynamoDB read operations
- 40-50% reduction in API response times (p95)
- Automatic failover during external service outages
- Graceful degradation under load

**Key Metrics:**
- Cache hit rate target: >80%
- Circuit breaker trip threshold: 50% error rate
- Memory usage increase: <50MB per Lambda
- Zero data inconsistency issues

---

## 📋 Phase Overview

| Component | Technology | Purpose | Priority |
|-----------|-----------|---------|----------|
| **Cache Store** | Keyv + @keyv/redis | Distributed caching | High |
| **Cache Layer** | Custom abstraction | Service-level caching | High |
| **Circuit Breaker** | Opossum | External call protection | Medium |
| **Monitoring** | CloudWatch metrics | Observability | High |

---

## 🚀 Phase 3B: Backend Caching Layer

### Goals
1. Cache frequently accessed data (profiles, posts, auctions)
2. Reduce DynamoDB read operations by 70%+
3. Improve API response times by 40%+
4. Implement cache invalidation strategy
5. Add cache metrics and monitoring

### Architecture Decision: Where to Cache?

**Option 1: Lambda-level caching** ❌
```typescript
// In-memory cache in Lambda
const cache = new Map<string, any>();
```
**Pros**: Simple, no external dependencies
**Cons**: Cold starts lose cache, no sharing across Lambdas

**Option 2: Redis caching** ✅ **RECOMMENDED**
```typescript
// Shared Redis cache
const cache = new Keyv({ store: new KeyvRedis('redis://...') });
```
**Pros**: Shared across all Lambdas, persistent, scalable
**Cons**: Additional infrastructure cost (~$15-30/month)

**Decision: Use Redis** (Option 2) for shared, persistent caching.

---

## 📦 Step 3B.1: Install Dependencies

```bash
cd packages/backend
pnpm add keyv @keyv/redis
pnpm add -D @types/keyv
```

**Why Keyv?**
- Simple, consistent API
- Multiple backend support (Redis, MongoDB, etc.)
- Built-in TTL handling
- Promise-based
- 1.5M+ weekly downloads

---

## 🏗️ Step 3B.2: Create Cache Abstraction Layer

**File:** `packages/backend/src/infrastructure/cache/CacheService.ts`

```typescript
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';

/**
 * Cache Service Configuration
 */
export interface CacheConfig {
  /**
   * Redis connection string
   * @example 'redis://localhost:6379'
   */
  redisUrl: string;

  /**
   * Namespace for cache keys (prevents collisions)
   * @example 'social-media-app:dev'
   */
  namespace: string;

  /**
   * Default TTL in milliseconds
   * @default 3600000 (1 hour)
   */
  defaultTTL?: number;

  /**
   * Enable cache metrics
   * @default true
   */
  enableMetrics?: boolean;
}

/**
 * Cache Service Interface
 *
 * Provides a simple, type-safe caching layer over Keyv/Redis.
 * Supports TTL, namespacing, and optional metrics.
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;
}

/**
 * Cache Metrics for monitoring
 */
export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
}

/**
 * Keyv-based Cache Service Implementation
 *
 * Wraps Keyv with additional features:
 * - Type safety
 * - Metrics tracking
 * - Error handling
 * - getOrSet pattern
 */
export class CacheService implements ICacheService {
  private readonly store: Keyv;
  private readonly config: Required<CacheConfig>;
  private metrics: CacheMetrics;

  constructor(config: CacheConfig) {
    this.config = {
      defaultTTL: 3600000, // 1 hour
      enableMetrics: true,
      ...config,
    };

    // Initialize Keyv with Redis backend
    this.store = new Keyv({
      store: new KeyvRedis(this.config.redisUrl),
      namespace: this.config.namespace,
      ttl: this.config.defaultTTL,
    });

    // Initialize metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
    };

    // Handle connection errors
    this.store.on('error', (err) => {
      console.error('Cache error:', err);
      this.metrics.errors++;
    });
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.store.get<T>(key);

      if (this.config.enableMetrics) {
        if (value !== undefined) {
          this.metrics.hits++;
        } else {
          this.metrics.misses++;
        }
        this.updateHitRate();
      }

      return value;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      this.metrics.errors++;
      return undefined;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.store.set(key, value, ttl);

      if (this.config.enableMetrics) {
        this.metrics.sets++;
      }
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      this.metrics.errors++;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.store.delete(key);

      if (this.config.enableMetrics) {
        this.metrics.deletes++;
      }
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      this.metrics.errors++;
    }
  }

  /**
   * Clear entire cache namespace
   */
  async clear(): Promise<void> {
    try {
      await this.store.clear();
    } catch (error) {
      console.error('Cache clear error:', error);
      this.metrics.errors++;
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }

  /**
   * Get-or-set pattern: Try cache first, fallback to factory
   *
   * @example
   * const profile = await cache.getOrSet(
   *   `profile:${userId}`,
   *   () => profileService.getById(userId),
   *   300000 // 5 minutes
   * );
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Cache miss - call factory
    const value = await factory();

    // Store in cache for next time
    await this.set(key, value, ttl);

    return value;
  }

  /**
   * Get current cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
    };
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }
}

/**
 * Create CacheService from environment variables
 */
export function createCacheServiceFromEnv(): CacheService {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const namespace = `social-media-app:${process.env.STAGE || 'dev'}`;

  return new CacheService({
    redisUrl,
    namespace,
    defaultTTL: 3600000, // 1 hour
    enableMetrics: true,
  });
}
```

---

## 🔌 Step 3B.3: Integrate Cache with Awilix DI

**File:** `packages/backend/src/infrastructure/di/Container.ts`

```typescript
import { createContainer, asValue, asFunction, Lifetime } from 'awilix';
import { CacheService, createCacheServiceFromEnv } from '../cache/CacheService.js';

export function setupContainer() {
  const container = createContainer();

  // Register cache service (singleton - shared across requests)
  container.register({
    cacheService: asFunction(() => {
      return createCacheServiceFromEnv();
    }).singleton(),
  });

  // Register DAL services with cache support
  container.register({
    profileService: asFunction(({ dynamoClient, tableName, cacheService }) => {
      const { ProfileService } = require('@social-media-app/dal');
      return new ProfileService(dynamoClient, tableName, cacheService);
    }).scoped(),

    postService: asFunction(({ dynamoClient, tableName, cacheService }) => {
      const { PostService } = require('@social-media-app/dal');
      return new PostService(dynamoClient, tableName, cacheService);
    }).scoped(),
  });

  return container;
}
```

---

## 🎯 Step 3B.4: Add Caching to ProfileService

**File:** `packages/dal/src/services/profile.service.ts`

```typescript
import type { ICacheService } from '../infrastructure/cache/CacheService.js';

export class ProfileService {
  constructor(
    private readonly dynamoClient: DynamoDBDocumentClient,
    private readonly tableName: string,
    private readonly cache?: ICacheService // Optional for backward compatibility
  ) {}

  /**
   * Get profile by ID with caching
   */
  async getProfileById(userId: string): Promise<Profile | null> {
    const cacheKey = `profile:${userId}`;

    // Use getOrSet pattern if cache available
    if (this.cache) {
      return this.cache.getOrSet(
        cacheKey,
        () => this.fetchProfileFromDB(userId),
        300000 // 5 minutes TTL
      );
    }

    // Fallback to direct DB call if no cache
    return this.fetchProfileFromDB(userId);
  }

  /**
   * Fetch profile from DynamoDB (no cache)
   */
  private async fetchProfileFromDB(userId: string): Promise<Profile | null> {
    const result = await this.dynamoClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      })
    );

    return result.Item ? this.mapToProfile(result.Item) : null;
  }

  /**
   * Update profile with cache invalidation
   */
  async updateProfile(userId: string, updates: ProfileUpdates): Promise<Profile> {
    const cacheKey = `profile:${userId}`;

    // Update in DynamoDB
    const updated = await this.updateProfileInDB(userId, updates);

    // Invalidate cache
    if (this.cache) {
      await this.cache.delete(cacheKey);
    }

    return updated;
  }

  // ... rest of service
}
```

---

## 📊 Step 3B.5: Add Cache Metrics Endpoint

**File:** `packages/backend/src/handlers/monitoring/cache-metrics.ts`

```typescript
import { createHandler } from '../../infrastructure/middleware/index.js';

/**
 * GET /monitoring/cache-metrics
 *
 * Returns cache performance metrics
 */
const metricsHandler = async (event) => {
  const { cacheService } = event.services;

  const metrics = cacheService.getMetrics();

  return {
    statusCode: 200,
    body: JSON.stringify({
      metrics,
      timestamp: new Date().toISOString(),
    }),
  };
};

export const handler = createHandler(metricsHandler, {
  auth: false, // Public endpoint (or protect with API key)
  services: ['cacheService'],
});
```

---

## 🚀 Phase 3C: Circuit Breaker Implementation

### Goals
1. Protect against cascading failures
2. Automatic failover during outages
3. Graceful degradation under load
4. Self-healing with half-open state

---

## 📦 Step 3C.1: Install Dependencies

```bash
cd packages/backend
pnpm add opossum
pnpm add -D @types/opossum
```

**Why Opossum?**
- Battle-tested circuit breaker (1M+ downloads)
- Configurable thresholds
- Half-open state for automatic recovery
- Prometheus metrics support
- Event-driven API

---

## 🔌 Step 3C.2: Create Circuit Breaker Service

**File:** `packages/backend/src/infrastructure/resilience/CircuitBreakerService.ts`

```typescript
import CircuitBreaker from 'opossum';

/**
 * Circuit Breaker Configuration
 */
export interface CircuitBreakerConfig {
  /**
   * Timeout in ms before considering operation failed
   * @default 3000
   */
  timeout?: number;

  /**
   * Error threshold percentage (0-100) to trip circuit
   * @default 50
   */
  errorThresholdPercentage?: number;

  /**
   * Time in ms before attempting to close circuit
   * @default 30000 (30 seconds)
   */
  resetTimeout?: number;

  /**
   * Minimum requests before circuit can trip
   * @default 10
   */
  volumeThreshold?: number;

  /**
   * Name for logging/metrics
   */
  name: string;
}

/**
 * Circuit Breaker Service
 *
 * Wraps critical external calls with circuit breaker pattern.
 * Prevents cascading failures by failing fast when downstream is unhealthy.
 */
export class CircuitBreakerService {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Create or get circuit breaker for a specific operation
   */
  create<T extends (...args: any[]) => Promise<any>>(
    operation: T,
    config: CircuitBreakerConfig
  ): CircuitBreaker<T> {
    const existingBreaker = this.breakers.get(config.name);
    if (existingBreaker) {
      return existingBreaker as CircuitBreaker<T>;
    }

    const options = {
      timeout: config.timeout ?? 3000,
      errorThresholdPercentage: config.errorThresholdPercentage ?? 50,
      resetTimeout: config.resetTimeout ?? 30000,
      volumeThreshold: config.volumeThreshold ?? 10,
      name: config.name,
    };

    const breaker = new CircuitBreaker(operation, options);

    // Add logging for circuit state changes
    breaker.on('open', () => {
      console.warn(`🔴 Circuit breaker OPENED: ${config.name}`);
    });

    breaker.on('halfOpen', () => {
      console.log(`🟡 Circuit breaker HALF-OPEN: ${config.name}`);
    });

    breaker.on('close', () => {
      console.log(`🟢 Circuit breaker CLOSED: ${config.name}`);
    });

    breaker.on('failure', (error) => {
      console.error(`❌ Circuit breaker failure: ${config.name}`, error);
    });

    this.breakers.set(config.name, breaker);
    return breaker;
  }

  /**
   * Get all circuit breaker stats
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [name, breaker] of this.breakers.entries()) {
      stats[name] = {
        state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
        stats: breaker.stats,
      };
    }

    return stats;
  }

  /**
   * Reset all circuit breakers (useful for testing)
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.close();
    }
  }
}

/**
 * Singleton circuit breaker service
 */
let circuitBreakerInstance: CircuitBreakerService | null = null;

export function getCircuitBreakerService(): CircuitBreakerService {
  if (!circuitBreakerInstance) {
    circuitBreakerInstance = new CircuitBreakerService();
  }
  return circuitBreakerInstance;
}
```

---

## 🎯 Step 3C.3: Wrap Critical Operations

**File:** `packages/dal/src/services/profile.service.ts` (with circuit breaker)

```typescript
import { getCircuitBreakerService } from '../infrastructure/resilience/CircuitBreakerService.js';

export class ProfileService {
  private circuitBreaker: CircuitBreakerService;
  private getProfileBreaker: CircuitBreaker;

  constructor(
    private readonly dynamoClient: DynamoDBDocumentClient,
    private readonly tableName: string,
    private readonly cache?: ICacheService
  ) {
    this.circuitBreaker = getCircuitBreakerService();

    // Create circuit breaker for DynamoDB get operations
    this.getProfileBreaker = this.circuitBreaker.create(
      (userId: string) => this.fetchProfileFromDB(userId),
      {
        name: 'ProfileService.getProfileById',
        timeout: 2000,
        errorThresholdPercentage: 50,
        resetTimeout: 15000,
      }
    );

    // Add fallback for circuit open state
    this.getProfileBreaker.fallback(() => {
      console.warn('Circuit breaker OPEN - returning fallback profile');
      return null; // Or return cached stale data
    });
  }

  /**
   * Get profile by ID with circuit breaker protection
   */
  async getProfileById(userId: string): Promise<Profile | null> {
    const cacheKey = `profile:${userId}`;

    // Try cache first
    if (this.cache) {
      const cached = await this.cache.get<Profile>(cacheKey);
      if (cached) return cached;
    }

    try {
      // Use circuit breaker for DB call
      const profile = await this.getProfileBreaker.fire(userId);

      // Cache result
      if (profile && this.cache) {
        await this.cache.set(cacheKey, profile, 300000);
      }

      return profile;
    } catch (error) {
      // If circuit is open, fallback will be called
      // Otherwise, this is a real error
      console.error(`Error fetching profile ${userId}:`, error);

      // Try to return stale cache as last resort
      if (this.cache) {
        const stale = await this.cache.get<Profile>(cacheKey);
        if (stale) {
          console.warn('Returning stale cache due to error');
          return stale;
        }
      }

      throw error;
    }
  }

  // ... rest of service
}
```

---

## 📊 Step 3C.4: Add Circuit Breaker Metrics Endpoint

**File:** `packages/backend/src/handlers/monitoring/circuit-breaker-metrics.ts`

```typescript
import { createHandler } from '../../infrastructure/middleware/index.js';
import { getCircuitBreakerService } from '../../infrastructure/resilience/CircuitBreakerService.js';

const metricsHandler = async () => {
  const circuitBreaker = getCircuitBreakerService();
  const stats = circuitBreaker.getStats();

  return {
    statusCode: 200,
    body: JSON.stringify({
      circuitBreakers: stats,
      timestamp: new Date().toISOString(),
    }),
  };
};

export const handler = createHandler(metricsHandler, {
  auth: false,
});
```

---

## 🧪 Testing Strategy

### Unit Tests for CacheService

**File:** `packages/backend/src/infrastructure/cache/__tests__/CacheService.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheService } from '../CacheService.js';

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService({
      redisUrl: 'redis://localhost:6379',
      namespace: 'test',
      enableMetrics: true,
    });
  });

  afterEach(async () => {
    await cache.clear();
  });

  it('should store and retrieve values', async () => {
    await cache.set('key1', 'value1');
    const value = await cache.get('key1');
    expect(value).toBe('value1');
  });

  it('should return undefined for missing keys', async () => {
    const value = await cache.get('nonexistent');
    expect(value).toBeUndefined();
  });

  it('should delete values', async () => {
    await cache.set('key1', 'value1');
    await cache.delete('key1');
    const value = await cache.get('key1');
    expect(value).toBeUndefined();
  });

  it('should implement getOrSet pattern', async () => {
    let callCount = 0;
    const factory = async () => {
      callCount++;
      return 'computed-value';
    };

    // First call should invoke factory
    const value1 = await cache.getOrSet('key1', factory);
    expect(value1).toBe('computed-value');
    expect(callCount).toBe(1);

    // Second call should use cache
    const value2 = await cache.getOrSet('key1', factory);
    expect(value2).toBe('computed-value');
    expect(callCount).toBe(1); // Factory not called again
  });

  it('should track metrics', async () => {
    await cache.set('key1', 'value1');
    await cache.get('key1'); // Hit
    await cache.get('key2'); // Miss

    const metrics = cache.getMetrics();
    expect(metrics.hits).toBe(1);
    expect(metrics.misses).toBe(1);
    expect(metrics.sets).toBe(1);
    expect(metrics.hitRate).toBe(0.5);
  });

  it('should handle TTL correctly', async () => {
    await cache.set('key1', 'value1', 100); // 100ms TTL

    const value1 = await cache.get('key1');
    expect(value1).toBe('value1');

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));

    const value2 = await cache.get('key1');
    expect(value2).toBeUndefined();
  });
});
```

### Integration Tests for Circuit Breaker

**File:** `packages/backend/src/infrastructure/resilience/__tests__/CircuitBreakerService.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreakerService } from '../CircuitBreakerService.js';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(() => {
    service = new CircuitBreakerService();
  });

  it('should allow calls when circuit is closed', async () => {
    const operation = async (x: number) => x * 2;
    const breaker = service.create(operation, {
      name: 'test-multiply',
      volumeThreshold: 5,
    });

    const result = await breaker.fire(10);
    expect(result).toBe(20);
  });

  it('should open circuit after error threshold', async () => {
    let callCount = 0;
    const operation = async () => {
      callCount++;
      throw new Error('Service unavailable');
    };

    const breaker = service.create(operation, {
      name: 'test-failing',
      volumeThreshold: 3,
      errorThresholdPercentage: 50,
    });

    // Trigger enough failures to open circuit
    for (let i = 0; i < 5; i++) {
      try {
        await breaker.fire();
      } catch (e) {
        // Expected
      }
    }

    // Circuit should be open now
    expect(breaker.opened).toBe(true);

    // Next call should fail immediately without invoking operation
    const beforeCount = callCount;
    try {
      await breaker.fire();
    } catch (e) {
      // Expected
    }
    expect(callCount).toBe(beforeCount); // No new call
  });

  it('should use fallback when circuit is open', async () => {
    const operation = async () => {
      throw new Error('Service unavailable');
    };

    const breaker = service.create(operation, {
      name: 'test-fallback',
      volumeThreshold: 2,
    });

    breaker.fallback(() => 'fallback-value');

    // Trigger circuit open
    for (let i = 0; i < 3; i++) {
      await breaker.fire(); // Returns fallback value
    }

    expect(breaker.opened).toBe(true);

    // Should return fallback
    const result = await breaker.fire();
    expect(result).toBe('fallback-value');
  });
});
```

---

## 🏗️ Infrastructure Setup

### Redis Deployment (AWS ElastiCache)

**Option 1: CDK Stack** (Recommended)

**File:** `packages/infrastructure/src/stacks/CacheStack.ts`

```typescript
import * as cdk from 'aws-cdk-lib';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class CacheStack extends cdk.Stack {
  public readonly redisEndpoint: string;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Use existing VPC
    const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
      vpcName: 'social-media-app-vpc',
    });

    // Security group for Redis
    const securityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc,
      description: 'Security group for Redis cache',
      allowAllOutbound: true,
    });

    // Allow Lambda security group to access Redis
    securityGroup.addIngressRule(
      ec2.Peer.securityGroupId('lambda-sg-id'),
      ec2.Port.tcp(6379),
      'Allow Lambda to access Redis'
    );

    // ElastiCache Redis cluster
    const redis = new elasticache.CfnCacheCluster(this, 'RedisCache', {
      cacheNodeType: 'cache.t3.micro', // $0.017/hour (~$12/month)
      engine: 'redis',
      numCacheNodes: 1,
      vpcSecurityGroupIds: [securityGroup.securityGroupId],
      cacheSubnetGroupName: 'default',
    });

    this.redisEndpoint = redis.attrRedisEndpointAddress;

    // Output Redis endpoint
    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: this.redisEndpoint,
      exportName: 'RedisEndpoint',
    });
  }
}
```

**Option 2: Upstash Redis** (Serverless, pay-per-request)

- Sign up at https://upstash.com/
- Create Redis database
- Get connection URL
- Set `REDIS_URL` environment variable
- Cost: ~$10-20/month for moderate traffic

---

## 🔄 Cache Invalidation Strategy

### When to Invalidate

| Operation | Cache Keys to Invalidate | Reason |
|-----------|-------------------------|---------|
| `updateProfile` | `profile:{userId}` | Profile data changed |
| `createPost` | `profile:{userId}`, `user-posts:{userId}` | Post count changed |
| `deletePost` | `post:{postId}`, `user-posts:{userId}` | Post removed |
| `likePost` | `post:{postId}` | Like count changed |
| `followUser` | `profile:{followerId}`, `profile:{followedId}` | Follow counts changed |

### Implementation Pattern

```typescript
async updateProfile(userId: string, updates: ProfileUpdates): Promise<Profile> {
  // Update in DB
  const updated = await this.updateProfileInDB(userId, updates);

  // Invalidate all related cache keys
  if (this.cache) {
    await Promise.all([
      this.cache.delete(`profile:${userId}`),
      this.cache.delete(`user-posts:${userId}`),
      this.cache.delete(`user-followers:${userId}`),
    ]);
  }

  return updated;
}
```

---

## 📈 Success Metrics & Monitoring

### CloudWatch Metrics to Track

```typescript
// Emit custom metrics
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatch({});

// Cache metrics
await cloudwatch.putMetricData({
  Namespace: 'SocialMediaApp/Cache',
  MetricData: [
    {
      MetricName: 'CacheHitRate',
      Value: metrics.hitRate * 100,
      Unit: 'Percent',
      Timestamp: new Date(),
    },
    {
      MetricName: 'CacheLatency',
      Value: latencyMs,
      Unit: 'Milliseconds',
    },
  ],
});

// Circuit breaker metrics
await cloudwatch.putMetricData({
  Namespace: 'SocialMediaApp/CircuitBreaker',
  MetricData: [
    {
      MetricName: 'CircuitBreakerState',
      Value: breaker.opened ? 1 : 0,
      Unit: 'Count',
      Dimensions: [{ Name: 'BreakerName', Value: 'ProfileService' }],
    },
  ],
});
```

### CloudWatch Alarms

```typescript
// CDK: Create alarm for low cache hit rate
new cloudwatch.Alarm(this, 'LowCacheHitRateAlarm', {
  metric: new cloudwatch.Metric({
    namespace: 'SocialMediaApp/Cache',
    metricName: 'CacheHitRate',
    statistic: 'Average',
  }),
  threshold: 50, // Alert if hit rate < 50%
  evaluationPeriods: 2,
  alarmDescription: 'Cache hit rate is below 50%',
});

// Circuit breaker open alarm
new cloudwatch.Alarm(this, 'CircuitBreakerOpenAlarm', {
  metric: new cloudwatch.Metric({
    namespace: 'SocialMediaApp/CircuitBreaker',
    metricName: 'CircuitBreakerState',
    statistic: 'Maximum',
  }),
  threshold: 1,
  evaluationPeriods: 1,
  alarmDescription: 'Circuit breaker is OPEN',
});
```

---

## 🔥 Rollback Strategy

### Feature Flag Approach

```typescript
// Environment variable feature flag
const CACHE_ENABLED = process.env.ENABLE_CACHE === 'true';

export class ProfileService {
  async getProfileById(userId: string): Promise<Profile | null> {
    // Feature flag check
    if (!CACHE_ENABLED || !this.cache) {
      return this.fetchProfileFromDB(userId);
    }

    // Use cache
    return this.cache.getOrSet(
      `profile:${userId}`,
      () => this.fetchProfileFromDB(userId),
      300000
    );
  }
}
```

### Gradual Rollout

1. **Week 1**: Deploy with `ENABLE_CACHE=false` (verify no regressions)
2. **Week 2**: Enable for 10% of traffic, monitor metrics
3. **Week 3**: Enable for 50% of traffic
4. **Week 4**: Enable for 100% of traffic

### Emergency Rollback

```bash
# Disable cache immediately
aws lambda update-function-configuration \
  --function-name social-media-app-backend \
  --environment Variables={ENABLE_CACHE=false}

# Restart Redis (if issues)
aws elasticache reboot-cache-cluster \
  --cache-cluster-id social-media-app-redis
```

---

## 📅 Implementation Timeline

### Week 1: Setup & Infrastructure
- **Day 1-2**: Install dependencies, create CacheService abstraction
- **Day 3**: Deploy Redis (ElastiCache or Upstash)
- **Day 4**: Integrate with Awilix DI
- **Day 5**: Write unit tests

### Week 2: Service Integration
- **Day 1**: Add caching to ProfileService
- **Day 2**: Add caching to PostService
- **Day 3**: Add caching to AuctionService
- **Day 4**: Implement cache invalidation
- **Day 5**: Add cache metrics endpoint

### Week 3: Circuit Breaker
- **Day 1**: Create CircuitBreakerService
- **Day 2**: Wrap critical DynamoDB calls
- **Day 3**: Add fallback strategies
- **Day 4**: Add circuit breaker metrics
- **Day 5**: Write integration tests

### Week 4: Testing & Monitoring
- **Day 1-2**: Load testing with cache enabled
- **Day 3**: Set up CloudWatch alarms
- **Day 4**: Documentation
- **Day 5**: Deploy to production with feature flag

---

## ✅ Success Criteria

### Phase 3B: Caching
- ✅ Cache hit rate >80% for profiles
- ✅ Cache hit rate >70% for posts
- ✅ API response time reduced by 40%+ (p95)
- ✅ DynamoDB read operations reduced by 70%+
- ✅ Zero data inconsistency issues
- ✅ Memory usage increase <50MB per Lambda
- ✅ All unit tests pass

### Phase 3C: Circuit Breaker
- ✅ Circuit breakers protect all critical external calls
- ✅ Automatic failover works during simulated outages
- ✅ Half-open state recovers automatically
- ✅ Fallback strategies provide graceful degradation
- ✅ CloudWatch alarms trigger correctly
- ✅ Zero cascading failures during load testing

---

## 💰 Cost Analysis

### Redis (ElastiCache)
- **cache.t3.micro**: $0.017/hour = ~$12/month
- **cache.t3.small**: $0.034/hour = ~$25/month
- **Data transfer**: Minimal (same VPC)

### Upstash Redis (Alternative)
- **Free tier**: 10K commands/day
- **Pay-as-you-go**: $0.20 per 100K commands
- **Estimate**: ~$10-20/month for moderate traffic

### Total Estimated Increase
- **Infrastructure**: $12-25/month (ElastiCache)
- **Lambda memory**: ~$2-5/month (50MB increase)
- **Total**: **$15-30/month**

### ROI
- DynamoDB cost reduction: -$50-100/month (70% fewer reads)
- **Net savings**: $20-70/month**
- Plus improved user experience (faster responses)

---

## 🔗 References

- [Keyv Documentation](https://github.com/jaredwray/keyv)
- [Opossum Circuit Breaker](https://nodeshift.dev/opossum/)
- [AWS ElastiCache Best Practices](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/BestPractices.html)
- [Circuit Breaker Pattern (Martin Fowler)](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Cache Invalidation Strategies](https://www.2ndquadrant.com/en/blog/cache-invalidation-strategies/)

---

## 📝 Next Steps

1. **Review this plan** with team
2. **Get approval** for Redis infrastructure cost
3. **Create feature branch**: `feat/caching-circuit-breaker`
4. **Begin Week 1**: Setup & Infrastructure
5. **Schedule weekly progress reviews**

---

**Ready to implement!** 🚀
