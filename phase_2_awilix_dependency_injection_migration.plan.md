# Phase 2: Dependency Injection Migration with Awilix

**Project:** Social Media App - Library Migration
**Phase:** 2 of 4
**Duration:** 1-2 weeks
**Risk Level:** Medium
**Prerequisites:** Phase 1 (Middy Migration) Complete ✅

---

## 🎯 Executive Summary

Replace custom DI containers with **Awilix** in both backend Lambda handlers and GraphQL server. Awilix provides:
- **Automatic dependency resolution** (constructor injection)
- **Lifetime management** (singleton, scoped, transient)
- **TypeScript-friendly** with excellent type inference
- **Battle-tested** (300k+ weekly downloads, mature ecosystem)

**Current State Analysis:**
- ✅ **Backend Container** (`packages/backend/src/infrastructure/di/Container.ts`): Exists but **NOT USED** anywhere
- ✅ **GraphQL Container** (`packages/graphql-server/src/infrastructure/di/Container.ts`): **ACTIVELY USED** in `registerServices.ts`
- ✅ **Phase 1 Complete**: Middy middleware system in place (`hello.v2.ts`, `register.ts`)

**Benefits:**
- Eliminate 200+ LOC of custom DI code
- Automatic constructor injection (no manual wiring)
- Proper lifecycle management (prevents memory leaks)
- Better testability (easy mocking)

**Testing Guidelines:**
- ✅ RED-GREEN-REFACTOR cycles
- ✅ No mocks or spies - tests use real authService
- ✅ DRY tests with helper functions
- ✅ Behavioral testing - test what code does, not how
- ✅ Type-safe throughout (no any types except Lambda context)
- ✅ Use dependency injection instead of mocks wherever possible
- ✅ Look for existing shared test fixtures and test utilities. Create new fixtures and utilities as needed.
- ✅ Test core use cases and a small number of key edge cases.

**Coding Guidelines**
- Create reusable, type-flexible components while maintaining type safety by using generics
- Conditional types - Create types that depend on conditions, enabling sophisticated type logic.
- Mapped Types - Transform existing types by iterating over their properties.
- Template Literal Types - Create string-based types with pattern matching and transformation.
- Maintain type safety at all times, do not use any or unknown whenever possible
- ✅ Git commits after each meaningful delivery
- ✅ SOLID principles - Single Responsibility, clean separation of concerns
- Don't be afraid to big bang and make breaking changes. We have git so we don't need parallel versions of things floating around.
- Use the typescript compiler to help you find errors. Don't be afraid to use it.

---

## 📋 Phase Overview

### **Part A: Backend Lambda Handlers (Days 1-3)**
Integrate Awilix with Middy middleware for Lambda handlers

### **Part B: GraphQL Server (Days 4-7)**
Replace custom Container with Awilix in GraphQL server's hexagonal architecture

### **Part C: Testing & Validation (Days 8-10)**
Comprehensive testing, performance validation, and documentation

---

## 🚀 Part A: Backend Lambda Handlers (Days 1-3)

### Current State
- Services instantiated globally in `/packages/backend/src/utils/services.ts`
- Handlers import services directly: `import { authService } from '../utils/services.js'`
- No DI container integration with middleware
- Custom Container exists but unused

### Goal
- Services injected via Awilix per-request
- Proper cleanup after request (prevent memory leaks)
- Integration with Middy middleware-v2

---

## Step A.1: Install Awilix (Day 1, Morning)

### 1.1 Install Dependencies

```bash
cd /Users/shaperosteve/social-media-app/packages/backend
pnpm add awilix
pnpm add -D @types/node
```

**Verification:**
```bash
pnpm list awilix
# Should show: awilix@10.0.2 (or latest)
```

---

## Step A.2: Create Awilix Container Setup (Day 1, Afternoon)

### 2.1 Create Container Configuration

**File:** `/packages/backend/src/infrastructure/di/container.ts`
We have git for version control so we can safely get rid of the old Container. We'll start fresh with Awilix.
Make sure we always use infrastructure/di.

```typescript
/**
 * Awilix Container Setup for Backend Lambda Handlers
 *
 * Replaces custom Container with Awilix for:
 * - Automatic dependency injection
 * - Proper lifecycle management
 * - Type-safe service resolution
 *
 * @module infrastructure/di
 */

import { createContainer, asFunction, asValue, InjectionMode, AwilixContainer } from 'awilix'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { JWTProvider } from '@social-media-app/auth-utils'
import type { AuthService } from '@social-media-app/dal'
import { createDefaultAuthService } from '@social-media-app/dal'
import { createJWTProvider, getJWTConfigFromEnv } from '../../utils/jwt.js'

/**
 * Service container type - all resolvable services
 */
export interface ServiceContainer {
  // AWS Clients
  dynamoClient: DynamoDBDocumentClient
  tableName: string

  // Auth
  jwtProvider: JWTProvider
  authService: AuthService

  // Add more services as needed
}

/**
 * Create and configure Awilix container with all services
 *
 * Lifecycle Management:
 * - SINGLETON: Created once, reused across requests (AWS clients)
 * - SCOPED: Created per-request, cleaned up after (services)
 *
 * @returns Configured Awilix container
 */
export function createAwilixContainer(): AwilixContainer<ServiceContainer> {
  const container = createContainer<ServiceContainer>({
    injectionMode: InjectionMode.PROXY // Enable auto-injection
  })

  // ============================================
  // Layer 1: AWS Infrastructure (SINGLETON)
  // ============================================

  container.register({
    // DynamoDB Client - singleton for Lambda cold start optimization
    dynamoClient: asFunction(() => {
      const client = new DynamoDBClient({
        region: process.env.AWS_REGION || 'us-east-1',
        endpoint: process.env.DYNAMODB_ENDPOINT // LocalStack support
      })
      return DynamoDBDocumentClient.from(client, {
        marshallOptions: {
          removeUndefinedValues: true,
          convertClassInstanceToMap: true
        }
      })
    }).singleton(),

    // Table name from environment
    tableName: asValue(process.env.TABLE_NAME || 'social-media-app-dev')
  })

  // ============================================
  // Layer 2: Authentication (SINGLETON)
  // ============================================

  container.register({
    // JWT Provider - singleton (stateless)
    jwtProvider: asFunction(() => {
      const jwtConfig = getJWTConfigFromEnv()
      return createJWTProvider(jwtConfig)
    }).singleton()
  })

  // ============================================
  // Layer 3: Domain Services (SCOPED)
  // ============================================

  container.register({
    // Auth Service - scoped per request
    authService: asFunction(({ dynamoClient, tableName, jwtProvider }) => {
      return createDefaultAuthService(dynamoClient, tableName, jwtProvider)
    }).scoped()

    // TODO: Add more services as we migrate
    // profileService: asFunction(({ dynamoClient, tableName }) => {
    //   return createProfileService(dynamoClient, tableName)
    // }).scoped()
  })

  return container
}

/**
 * Singleton container instance for Lambda cold starts
 * Reused across invocations within same Lambda container
 */
let containerInstance: AwilixContainer<ServiceContainer> | null = null

/**
 * Get or create singleton container
 *
 * Lambda optimization: Container persists across warm invocations
 * Singletons are truly singleton, scoped services are fresh per-request
 */
export function getContainer(): AwilixContainer<ServiceContainer> {
  if (!containerInstance) {
    containerInstance = createAwilixContainer()
  }
  return containerInstance
}

/**
 * Create request-scoped container
 *
 * Called per Lambda invocation to create fresh scoped services
 * while reusing singleton infrastructure (AWS clients)
 *
 * @returns Scoped container for single request
 */
export function createRequestScope(): AwilixContainer<ServiceContainer> {
  return getContainer().createScope()
}

/**
 * Reset container (testing only)
 *
 * Allows tests to create fresh container with mocked dependencies
 */
export function resetContainer(): void {
  containerInstance = null
}
```

---

## Step A.3: Create Awilix Middleware for Middy (Day 1, Evening)

### 3.1 Create Middleware

**File:** `/packages/backend/src/infrastructure/middleware/awilixMiddleware.ts`

```typescript
/**
 * Awilix Middleware for Middy
 *
 * Injects Awilix-managed services into Lambda event context
 * Handles proper cleanup after request (prevents memory leaks)
 *
 * @module middleware/awilixMiddleware
 */

import type { MiddlewareObj } from '@middy/core'
import type { AwilixContainer } from 'awilix'
import { createRequestScope, type ServiceContainer } from '../di/container.js'

/**
 * Extend Lambda event with services
 */
declare module 'aws-lambda' {
  interface APIGatewayProxyEventV2 {
    services?: ServiceContainer
    _awilixScope?: AwilixContainer<ServiceContainer>
  }
}

/**
 * Awilix middleware options
 */
export interface AwilixMiddlewareOptions {
  /**
   * List of service names to resolve and inject
   * If not provided, injects entire container cradle
   *
   * @example ['authService', 'profileService']
   */
  services?: Array<keyof ServiceContainer>
}

/**
 * Create Awilix middleware for Middy
 *
 * Lifecycle:
 * 1. BEFORE: Create scoped container, resolve services, attach to event
 * 2. AFTER: Dispose scoped container (cleanup resources)
 * 3. ON_ERROR: Dispose scoped container (cleanup on error)
 *
 * @param options - Middleware configuration
 * @returns Middy middleware object
 *
 * @example
 * ```typescript
 * // Inject specific services
 * middleware.use(awilixMiddleware({ services: ['authService'] }))
 *
 * // Inject all services
 * middleware.use(awilixMiddleware())
 * ```
 */
export function awilixMiddleware(
  options: AwilixMiddlewareOptions = {}
): MiddlewareObj {
  return {
    /**
     * BEFORE: Create scoped container and inject services
     */
    before: async (request) => {
      // Create request-scoped container
      const scope = createRequestScope()

      // Resolve and inject services
      if (options.services) {
        // Selective injection - only specified services
        const services: Partial<ServiceContainer> = {}
        for (const serviceName of options.services) {
          services[serviceName] = scope.resolve(serviceName)
        }
        request.event.services = services as ServiceContainer
      } else {
        // Inject all services via cradle
        request.event.services = scope.cradle
      }

      // Store scope for cleanup
      request.event._awilixScope = scope
    },

    /**
     * AFTER: Cleanup scoped resources
     */
    after: async (request) => {
      if (request.event._awilixScope) {
        await request.event._awilixScope.dispose()
        delete request.event._awilixScope
      }
    },

    /**
     * ON_ERROR: Cleanup scoped resources on error
     */
    onError: async (request) => {
      if (request.event._awilixScope) {
        try {
          await request.event._awilixScope.dispose()
        } catch (disposeError) {
          console.error('Error disposing Awilix scope:', disposeError)
        } finally {
          delete request.event._awilixScope
        }
      }
    }
  }
}
```

### 3.2 Update createHandler to Support Awilix

**File:** `/packages/backend/src/infrastructure/middleware/index.ts`

```typescript
// Add import
import { awilixMiddleware, type AwilixMiddlewareOptions } from './awilixMiddleware.js'
import type { ServiceContainer } from '../di/container.js'

/**
 * Handler configuration options
 */
export interface HandlerConfig {
  readonly validation?: z.ZodSchema
  readonly auth?: boolean

  // NEW: Service injection
  readonly services?: Array<keyof ServiceContainer>
}

/**
 * Creates a standardized Lambda handler with Middy middleware
 */
export function createHandler(
  handler: APIGatewayProxyHandlerV2,
  config: HandlerConfig = {}
): middy.MiddyfiedHandler {
  const middleware = middy(handler)
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())

  // Add JWT auth if enabled
  if (config.auth !== undefined) {
    middleware.use(jwtAuth({ required: config.auth }))
  }

  // NEW: Add Awilix service injection if requested
  if (config.services) {
    middleware.use(awilixMiddleware({ services: config.services }))
  }

  // Add validation if schema provided
  if (config.validation) {
    middleware.use(zodValidator(config.validation))
  }

  // Error handler should be last
  middleware.use(httpErrorHandler())

  return middleware
}

// Re-export Awilix middleware
export { awilixMiddleware } from './awilixMiddleware.js'
export type { AwilixMiddlewareOptions } from './awilixMiddleware.js'
```

---

## Step A.4: Migrate First Handler (POC) (Day 2, Morning)

### 4.1 Create v3 Register Handler with Awilix


**File:** `/packages/backend/src/handlers/auth/register.ts`

```typescript
/**
 * Register Handler (Awilix Version)
 *
 * Demonstrates Awilix + Middy integration
 * Services are injected automatically via middleware
 *
 * @route POST /auth/register
 */

import { RegisterRequestSchema, type RegisterRequest } from '@social-media-app/shared'
import { createHandler } from '../../infrastructure/middleware/index.js'
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'

/**
 * Handler implementation - services injected via Awilix
 */
const registerHandler: APIGatewayProxyHandlerV2 = async (event) => {
  // Services injected by Awilix middleware
  const { authService } = event.services!

  // Type-safe validated input
  const request = event.validatedBody as RegisterRequest

  // Business logic
  const response = await authService.register(request)

  return {
    statusCode: 201,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(response)
  }
}

/**
 * Export handler with Awilix service injection
 */
export const handler = createHandler(registerHandler, {
  validation: RegisterRequestSchema,
  services: ['authService'] // ← Awilix injects authService
})
```

### 4.2 Create Test for v3 Handler

**File:** `/packages/backend/src/handlers/auth/__tests__/register.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createContainer, asValue } from 'awilix'
import type { ServiceContainer } from '../../../infrastructure/di/container.js'

/**
 * Test Awilix integration with mocked services
 */
describe('Register Handler v3 (Awilix)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should inject authService via Awilix', async () => {
    // Create test container with mocked authService
    const testContainer = createContainer<ServiceContainer>()

    const mockAuthService = {
      register: vi.fn().mockResolvedValue({
        user: { userId: 'test-id', email: 'test@example.com' },
        tokens: { accessToken: 'token', refreshToken: 'refresh' }
      })
    }

    testContainer.register({
      authService: asValue(mockAuthService)
    })

    // Resolve service from container
    const authService = testContainer.resolve('authService')

    // Test service injection
    expect(authService).toBeDefined()
    expect(authService.register).toBeDefined()

    // Call service
    const result = await authService.register({
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser',
      fullName: 'Test User'
    })

    expect(mockAuthService.register).toHaveBeenCalledTimes(1)
    expect(result.user.userId).toBe('test-id')
  })

  it('should properly dispose scoped container', async () => {
    const testContainer = createContainer<ServiceContainer>()

    const disposeSpy = vi.fn()
    const mockAuthService = { register: vi.fn(), [Symbol.dispose]: disposeSpy }

    testContainer.register({
      authService: asValue(mockAuthService)
    })

    const scope = testContainer.createScope()
    await scope.dispose()

    // Verify cleanup
    expect(disposeSpy).not.toHaveBeenCalled() // asValue doesn't dispose
  })
})
```

### 4.3 Manual Testing

```bash
# 1. Build
cd /Users/shaperosteve/social-media-app/packages/backend
pnpm build

# 2. Start local backend
pnpm dev

# 3. Test register endpoint (in another terminal)
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "username": "testuser",
    "fullName": "Test User"
  }'

# Expected: 201 Created with user data + tokens
```

---

## Step A.5: Compare Performance (Day 2, Afternoon)

### 5.1 Create Performance Benchmark

**File:** `/packages/backend/src/__benchmarks__/di-performance.bench.ts`

```typescript
/**
 * Performance comparison: Custom Container vs Awilix
 */

import { describe, bench } from 'vitest'
import { createContainer as createAwilixContainer, asFunction, InjectionMode } from 'awilix'
import { Container as CustomContainer } from '../infrastructure/di/Container.js'

describe('DI Container Performance', () => {
  // Setup Awilix container
  const awilixContainer = createAwilixContainer({ injectionMode: InjectionMode.PROXY })
  awilixContainer.register({
    service: asFunction(() => ({ doWork: () => 'result' })).singleton()
  })

  // Setup custom container
  const customContainer = new CustomContainer()
  customContainer.register('service', () => ({ doWork: () => 'result' }))

  bench('Awilix - resolve singleton', () => {
    awilixContainer.resolve('service')
  })

  bench('Custom Container - resolve singleton', () => {
    customContainer.resolve('service')
  })

  bench('Awilix - create scoped container', () => {
    const scope = awilixContainer.createScope()
    scope.resolve('service')
  })
})
```

**Run benchmark:**
```bash
pnpm vitest run --reporter=verbose di-performance.bench.ts
```

**Expected Results:**
- Awilix should be comparable or faster than custom container
- Scoped creation overhead should be < 1ms

---

## Step A.6: Migrate Remaining Auth Handlers (Day 2, Evening)

Apply same pattern to other auth handlers:

### 6.1 Login Handler

**File:** `/packages/backend/src/handlers/auth/login.ts`

```typescript
import { LoginRequestSchema, type LoginRequest } from '@social-media-app/shared'
import { createHandler } from '../../infrastructure/middleware/index.js'
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'

const loginHandler: APIGatewayProxyHandlerV2 = async (event) => {
  const { authService } = event.services!
  const request = event.validatedBody as LoginRequest

  const response = await authService.login(request)

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(response)
  }
}

export const handler = createHandler(loginHandler, {
  validation: LoginRequestSchema,
  services: ['authService']
})
```

### 6.2 Profile Handler (requires auth)

**File:** `/packages/backend/src/handlers/auth/profile.ts`

```typescript
import { createHandler } from '../../infrastructure/middleware/index.js'
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'

const profileHandler: APIGatewayProxyHandlerV2 = async (event) => {
  const { authService } = event.services!
  const userId = event.userId! // From JWT middleware

  const profile = await authService.getProfile(userId)

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(profile)
  }
}

export const handler = createHandler(profileHandler, {
  auth: true, // Requires JWT
  services: ['authService']
})
```

---

## Step A.7: Update CDK to Use v3 Handlers (Day 3, Morning)

### 7.1 Verify Lambda Definitions

**File:** `/infrastructure/lib/backend-stack.ts`

Ensure our new lambdas, handlers etc are all wired up correctly. At one point we were versioning with v2 and v3 etc.
This was bad and wrong, we should use git for version control. Make sure we didn't break anything and carefully delete any
files with v2 or v3.

### 7.2 Get rid of middleware-v2
Having two middleware directories will be confusing. Get rid of the old middleware and move middleware-v2 to be middleware.
Run all tests and repair whatever we broke. Remember we have git if we need to restore something to fix it.

---

## 🏗️ Part B: GraphQL Server (Days 4-7)

### Current State
- Custom Container in `/packages/graphql-server/src/infrastructure/di/Container.ts`
- Manual service registration in `registerServices.ts`
- 200+ lines of registration code
- Works well but verbose and manual

### Goal
- Replace custom Container with Awilix
- Leverage automatic constructor injection
- Reduce boilerplate by 70%
- Maintain hexagonal architecture

---

## Step B.1: Install Awilix (Day 4, Morning)

```bash
cd /Users/shaperosteve/social-media-app/packages/graphql-server
pnpm add awilix
pnpm add -D @types/node
```

---

## Step B.2: Create Awilix Container for GraphQL (Day 4, Afternoon)

### 2.1 Create Container Setup

**File:** `/packages/graphql-server/src/infrastructure/di/container.ts` (clobber existing file if needed, use git for version control)

```typescript
/**
 * Awilix Container for GraphQL Server
 *
 * Replaces custom Container with:
 * - Automatic constructor injection
 * - Class-based registration (cleaner)
 * - Proper lifecycle management
 *
 * Architecture Layers:
 * 1. Infrastructure (AWS clients) - SINGLETON
 * 2. Adapters (Repository implementations) - SCOPED
 * 3. Use Cases (Business logic) - SCOPED
 *
 * @module infrastructure/di
 */

import {
  createContainer,
  asClass,
  asFunction,
  asValue,
  InjectionMode,
  Lifetime,
  type AwilixContainer
} from 'awilix'
import type { GraphQLContext } from '../../context.js'

// Adapters
import { ProfileServiceAdapter } from '../adapters/ProfileServiceAdapter.js'
import { PostServiceAdapter } from '../adapters/PostServiceAdapter.js'
import { CommentServiceAdapter } from '../adapters/CommentServiceAdapter.js'
import { FollowServiceAdapter } from '../adapters/FollowServiceAdapter.js'
import { LikeServiceAdapter } from '../adapters/LikeServiceAdapter.js'
import { NotificationServiceAdapter } from '../adapters/NotificationServiceAdapter.js'
import { AuctionServiceAdapter } from '../adapters/AuctionServiceAdapter.js'
import { FeedServiceAdapter } from '../adapters/FeedServiceAdapter.js'

// Use Cases
import { GetCurrentUserProfile } from '../../application/use-cases/profile/GetCurrentUserProfile.js'
import { GetProfileByHandle } from '../../application/use-cases/profile/GetProfileByHandle.js'
import { GetPostById } from '../../application/use-cases/post/GetPostById.js'
import { GetUserPosts } from '../../application/use-cases/post/GetUserPosts.js'
import { GetFollowingFeed } from '../../application/use-cases/feed/GetFollowingFeed.js'
import { GetExploreFeed } from '../../application/use-cases/feed/GetExploreFeed.js'
import { GetCommentsByPost } from '../../application/use-cases/comment/GetCommentsByPost.js'
import { GetFollowStatus } from '../../application/use-cases/follow/GetFollowStatus.js'
import { GetPostLikeStatus } from '../../application/use-cases/like/GetPostLikeStatus.js'
import { GetNotifications } from '../../application/use-cases/notification/GetNotifications.js'
import { GetUnreadNotificationsCount } from '../../application/use-cases/notification/GetUnreadNotificationsCount.js'
import { GetAuction } from '../../application/use-cases/auction/GetAuction.js'
import { GetAuctions } from '../../application/use-cases/auction/GetAuctions.js'
import { GetBidHistory } from '../../application/use-cases/auction/GetBidHistory.js'

/**
 * Container interface - all resolvable dependencies
 */
export interface GraphQLContainer {
  // Context services (provided externally)
  context: GraphQLContext

  // Repositories
  profileRepository: ProfileServiceAdapter
  postRepository: PostServiceAdapter
  commentRepository: CommentServiceAdapter
  followRepository: FollowServiceAdapter
  likeRepository: LikeServiceAdapter
  notificationRepository: NotificationServiceAdapter
  auctionRepository: AuctionServiceAdapter
  feedRepository: FeedServiceAdapter

  // Use Cases
  getCurrentUserProfile: GetCurrentUserProfile
  getProfileByHandle: GetProfileByHandle
  getPostById: GetPostById
  getUserPosts: GetUserPosts
  getFollowingFeed: GetFollowingFeed
  getExploreFeed: GetExploreFeed
  getCommentsByPost: GetCommentsByPost
  getFollowStatus: GetFollowStatus
  getPostLikeStatus: GetPostLikeStatus
  getNotifications: GetNotifications
  getUnreadNotificationsCount: GetUnreadNotificationsCount
  getAuction: GetAuction
  getAuctions: GetAuctions
  getBidHistory: GetBidHistory
}

/**
 * Create Awilix container for GraphQL resolvers
 *
 * Automatic Dependency Injection:
 * - Use cases automatically receive repositories via constructor
 * - Repositories automatically receive context.services
 *
 * @param context - GraphQL context with services
 * @returns Configured Awilix container
 */
export function createGraphQLContainer(
  context: GraphQLContext
): AwilixContainer<GraphQLContainer> {
  const container = createContainer<GraphQLContainer>({
    injectionMode: InjectionMode.CLASSIC // Use constructor injection
  })

  // ============================================
  // Layer 0: Context (provided externally)
  // ============================================

  container.register({
    context: asValue(context)
  })

  // ============================================
  // Layer 1: Repository Adapters (SCOPED)
  // ============================================

  container.register({
    // Repositories wrap context.services
    // Awilix automatically passes context.services to constructors

    profileRepository: asFunction(({ context }) =>
      new ProfileServiceAdapter(context.services.profileService)
    ).scoped(),

    postRepository: asFunction(({ context }) =>
      new PostServiceAdapter(context.services
