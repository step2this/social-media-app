# Library Migration Plan: Replace Hand-Rolled Implementations

**Project:** Social Media App
**Created:** 2025-11-08
**Status:** Planning Phase
**Estimated Duration:** 4-6 weeks
**Risk Level:** Medium

---

## 🎯 Executive Summary

This plan outlines the migration from custom implementations to battle-tested open-source libraries across the social-media-app monorepo. The migration is organized into 4 phases over 4-6 weeks, prioritized by impact and risk.

**Key Metrics:**
- Lines of Code Reduction: ~2,500 LOC
- Maintenance Burden Reduction: ~60%
- Test Coverage Target: 90%+ for all migrations
- Zero Downtime: All migrations use feature flags

---

## 📋 Migration Phases Overview

| Phase | Focus Area | Duration | Risk | Impact |
|-------|-----------|----------|------|--------|
| **Phase 1** | Backend Middleware (Middy) | 1 week | Low | High |
| **Phase 2** | Dependency Injection (Awilix) | 1-2 weeks | Medium | High |
| **Phase 3** | API Client & Caching | 1-2 weeks | Low | High |
| **Phase 4** | DynamoDB & GraphQL Utils | 1-2 weeks | Medium | Medium |

---

## 🚀 Phase 1: Backend Middleware Migration (Week 1)

### **Goal:** Replace custom middleware with Middy

**Current:** `packages/backend/src/infrastructure/middleware/`
- `compose.ts` (138 lines)
- `withAuth.ts` (128 lines)
- `withValidation.ts` (63 lines)
- `withErrorHandling.ts` (132 lines)
- `withLogging.ts` (89 lines)
- `withServices.ts` (97 lines)

**Target:** Middy middleware engine

### Step 1.1: Install Dependencies

```bash
cd packages/backend
pnpm add @middy/core @middy/http-error-handler @middy/http-json-body-parser @middy/http-cors
pnpm add @middy/validator @middy/http-header-normalizer
pnpm add -D @types/aws-lambda
```

### Step 1.2: Create Middy Middleware Adapters

**File:** `packages/backend/src/infrastructure/middleware-v2/index.ts`

```typescript
/**
 * Middy middleware adapters
 * Bridges our current patterns with Middy
 */
import middy from '@middy/core'
import httpErrorHandler from '@middy/http-error-handler'
import httpJsonBodyParser from '@middy/http-json-body-parser'
import httpHeaderNormalizer from '@middy/http-header-normalizer'
import { z } from 'zod'
import type { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda'

/**
 * Custom Middy middleware: Zod Validation
 */
export const zodValidator = <T>(schema: z.ZodSchema<T>) => {
  return {
    before: async (request: middy.Request) => {
      const body = request.event.body ? JSON.parse(request.event.body) : {}

      try {
        request.event.validatedBody = schema.parse(body)
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(JSON.stringify({
            statusCode: 400,
            message: 'Validation failed',
            errors: error.errors
          }))
        }
        throw error
      }
    }
  }
}

/**
 * Custom Middy middleware: JWT Authentication
 */
export const jwtAuth = (options: { required?: boolean } = {}) => {
  const { required = true } = options

  return {
    before: async (request: middy.Request) => {
      const authHeader = request.event.headers?.authorization ||
                        request.event.headers?.Authorization

      if (!authHeader) {
        if (required) {
          throw new Error(JSON.stringify({
            statusCode: 401,
            message: 'Missing authorization header'
          }))
        }
        return
      }

      const token = authHeader.replace(/^Bearer\s+/i, '')
      const { verifyAccessToken, getJWTConfigFromEnv } = await import('../../utils/jwt.js')
      const jwtConfig = getJWTConfigFromEnv()

      try {
        const payload = await verifyAccessToken(token, jwtConfig.secret)

        if (!payload) {
          if (required) {
            throw new Error(JSON.stringify({
              statusCode: 401,
              message: 'Invalid token'
            }))
          }
          return
        }

        request.event.userId = payload.userId
        request.event.authPayload = payload
      } catch (error) {
        if (required) {
          throw new Error(JSON.stringify({
            statusCode: 401,
            message: error instanceof Error ? error.message : 'Invalid token'
          }))
        }
      }
    }
  }
}

/**
 * Custom Middy middleware: Service Injection
 */
export const injectServices = (serviceNames: string[]) => {
  return {
    before: async (request: middy.Request) => {
      const { Container } = await import('../di/Container.js')
      // ... service injection logic
    }
  }
}

/**
 * Standard handler wrapper
 */
export const createHandler = (
  handler: APIGatewayProxyHandlerV2,
  options: {
    validation?: z.ZodSchema
    auth?: boolean
    services?: string[]
  } = {}
) => {
  const middleware = middy(handler)
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())

  if (options.auth) {
    middleware.use(jwtAuth({ required: true }))
  }

  if (options.validation) {
    middleware.use(zodValidator(options.validation))
  }

  if (options.services) {
    middleware.use(injectServices(options.services))
  }

  middleware.use(httpErrorHandler())

  return middleware
}
```

### Step 1.3: Migrate One Handler (Proof of Concept)

**Before:** `packages/backend/src/handlers/auth/login.ts`

```typescript
import { compose } from '../../infrastructure/middleware/compose.js'
import { withErrorHandling } from '../../infrastructure/middleware/withErrorHandling.js'
import { withValidation } from '../../infrastructure/middleware/withValidation.js'
import { LoginRequestSchema } from '@social-media-app/shared'

export const handler = compose(
  withErrorHandling(),
  withValidation(LoginRequestSchema),
  async (event, context) => {
    // handler logic
  }
)
```

**After:** `packages/backend/src/handlers/auth/login.v2.ts`

```typescript
import { createHandler } from '../../infrastructure/middleware-v2/index.js'
import { LoginRequestSchema } from '@social-media-app/shared'
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'

const loginHandler: APIGatewayProxyHandlerV2 = async (event) => {
  const { email, password } = event.validatedBody

  // handler logic using Middy context

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  }
}

export const handler = createHandler(loginHandler, {
  validation: LoginRequestSchema
})
```

### Step 1.4: Test Migration

**File:** `packages/backend/src/handlers/auth/login.v2.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { handler } from './login.v2.js'

describe('Login Handler (Middy)', () => {
  it('should validate request body', async () => {
    const event = {
      body: JSON.stringify({ email: 'test@example.com', password: 'pass123' }),
      headers: {}
    }

    const result = await handler(event, {} as any, () => {})

    expect(result.statusCode).toBe(200)
  })

  it('should return 400 for invalid body', async () => {
    const event = {
      body: JSON.stringify({ email: 'invalid' }),
      headers: {}
    }

    const result = await handler(event, {} as any, () => {})

    expect(result.statusCode).toBe(400)
  })
})
```

### Step 1.5: Gradual Rollout

1. **Week 1, Day 1-2:** Create middleware-v2 adapters
2. **Week 1, Day 3:** Migrate login handler (POC)
3. **Week 1, Day 4:** Migrate 2-3 more handlers, gather feedback
4. **Week 1, Day 5:** Create migration script to automate remaining handlers

**Migration Script:** `scripts/migrate-to-middy.ts`

```typescript
#!/usr/bin/env tsx
/**
 * Automated migration script for handlers
 * Usage: tsx scripts/migrate-to-middy.ts <handler-path>
 */
import fs from 'fs'
import path from 'path'

// Parse handler file and generate Middy version
// This will save hours of manual work
```

### Step 1.6: Rollback Strategy

**Feature Flag Approach:**

```typescript
// packages/backend/src/config.ts
export const USE_MIDDY = process.env.USE_MIDDY === 'true'

// In handler files
export const handler = USE_MIDDY ? middyHandler : legacyHandler
```

**Rollback Process:**
1. Set `USE_MIDDY=false` in environment
2. Redeploy
3. Monitor for 24 hours
4. If issues: keep legacy, debug Middy version
5. If success: remove legacy code

### Phase 1 Success Criteria

- ✅ All backend handlers use Middy
- ✅ All tests pass
- ✅ Performance metrics unchanged or improved
- ✅ Zero production incidents
- ✅ Remove ~500 LOC of custom middleware

---

## 🏗️ Phase 2: Dependency Injection Migration (Weeks 2-3)

### **Goal:** Replace custom DI containers with Awilix

**Current:**
- `packages/backend/src/infrastructure/di/Container.ts`
- `packages/graphql-server/src/infrastructure/di/Container.ts`

**Target:** Awilix

### Step 2.1: Install Dependencies

```bash
# Backend
cd packages/backend
pnpm add awilix

# GraphQL Server
cd packages/graphql-server
pnpm add awilix
```

### Step 2.2: Create Awilix Container Setup

**File:** `packages/backend/src/infrastructure/di-v2/container.ts`

```typescript
import { createContainer, asClass, asFunction, asValue, Lifetime } from 'awilix'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

/**
 * Create and configure Awilix container
 */
export function setupContainer() {
  const container = createContainer()

  // Register AWS clients (singleton)
  container.register({
    dynamoClient: asFunction(() => {
      const client = new DynamoDBClient({
        region: process.env.AWS_REGION || 'us-east-1',
        endpoint: process.env.DYNAMODB_ENDPOINT
      })
      return DynamoDBDocumentClient.from(client)
    }).singleton(),

    tableName: asValue(process.env.TABLE_NAME || 'social-media-app-dev')
  })

  // Register DAL services (scoped - new instance per request)
  container.register({
    authService: asFunction(({ dynamoClient, tableName, jwtProvider }) => {
      const { createDefaultAuthService } = require('@social-media-app/dal')
      return createDefaultAuthService(dynamoClient, tableName, jwtProvider)
    }).scoped(),

    profileService: asFunction(({ dynamoClient, tableName }) => {
      const { ProfileService } = require('@social-media-app/dal')
      return new ProfileService(dynamoClient, tableName)
    }).scoped(),

    postService: asFunction(({ dynamoClient, tableName }) => {
      const { PostService } = require('@social-media-app/dal')
      return new PostService(dynamoClient, tableName)
    }).scoped()
  })

  // Register utilities
  container.register({
    jwtProvider: asFunction(() => {
      const { createJWTProvider, getJWTConfigFromEnv } = require('../../utils/jwt.js')
      return createJWTProvider(getJWTConfigFromEnv())
    }).singleton()
  })

  return container
}

/**
 * Singleton container instance for Lambda cold starts
 */
let containerInstance: ReturnType<typeof createContainer> | null = null

export function getContainer() {
  if (!containerInstance) {
    containerInstance = setupContainer()
  }
  return containerInstance
}

/**
 * Create request-scoped container
 */
export function createScope() {
  return getContainer().createScope()
}
```

### Step 2.3: Create Awilix Middleware for Middy

**File:** `packages/backend/src/infrastructure/middleware-v2/awilixMiddleware.ts`

```typescript
import type { MiddlewareObj } from '@middy/core'
import { createScope } from '../di-v2/container.js'

/**
 * Middy middleware that injects Awilix-managed services
 */
export const awilixMiddleware = (serviceNames: string[]): MiddlewareObj => {
  return {
    before: async (request) => {
      // Create request-scoped container
      const scope = createScope()

      // Resolve requested services
      const services: Record<string, any> = {}
      for (const name of serviceNames) {
        services[name] = scope.resolve(name)
      }

      // Attach to event for handler access
      request.event.services = services

      // Store scope for cleanup
      request.internal.awilixScope = scope
    },

    after: async (request) => {
      // Cleanup scoped resources
      if (request.internal.awilixScope) {
        await request.internal.awilixScope.dispose()
      }
    },

    onError: async (request) => {
      // Cleanup on error
      if (request.internal.awilixScope) {
        await request.internal.awilixScope.dispose()
      }
    }
  }
}

// Update createHandler to use Awilix
export const createHandler = (
  handler: APIGatewayProxyHandlerV2,
  options: {
    validation?: z.ZodSchema
    auth?: boolean
    services?: string[]  // e.g., ['authService', 'profileService']
  } = {}
) => {
  const middleware = middy(handler)
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())

  if (options.auth) {
    middleware.use(jwtAuth({ required: true }))
  }

  if (options.validation) {
    middleware.use(zodValidator(options.validation))
  }

  if (options.services) {
    middleware.use(awilixMiddleware(options.services))
  }

  middleware.use(httpErrorHandler())

  return middleware
}
```

### Step 2.4: Update Handler to Use Awilix

**File:** `packages/backend/src/handlers/auth/register.ts`

```typescript
import { createHandler } from '../../infrastructure/middleware-v2/index.js'
import { RegisterRequestSchema, type RegisterRequest } from '@social-media-app/shared'
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'

const registerHandler: APIGatewayProxyHandlerV2 = async (event) => {
  const { email, password, username, fullName } = event.validatedBody as RegisterRequest

  // Services are injected via Awilix
  const { authService } = event.services

  const result = await authService.register({
    email,
    password,
    username,
    fullName
  })

  return {
    statusCode: 201,
    body: JSON.stringify(result)
  }
}

export const handler = createHandler(registerHandler, {
  validation: RegisterRequestSchema,
  services: ['authService']  // Awilix resolves this
})
```

### Step 2.5: GraphQL Server Migration

**File:** `packages/graphql-server/src/infrastructure/di-v2/container.ts`

```typescript
import { createContainer, asClass, asFunction, InjectionMode } from 'awilix'

export function setupGraphQLContainer() {
  const container = createContainer({
    injectionMode: InjectionMode.CLASSIC
  })

  // Register DAL services
  container.register({
    profileService: asClass(ProfileService).scoped(),
    postService: asClass(PostService).scoped(),
    feedService: asClass(FeedService).scoped()
  })

  // Register repositories (hexagonal architecture)
  container.register({
    profileRepository: asClass(ProfileServiceAdapter).scoped(),
    postRepository: asClass(PostServiceAdapter).scoped()
  })

  // Register use cases
  container.register({
    getProfileUseCase: asClass(GetCurrentUserProfile).scoped(),
    getUserPostsUseCase: asClass(GetUserPosts).scoped()
  })

  return container
}
```

### Step 2.6: Testing Strategy

```typescript
// Test with mocked services
import { createContainer, asValue } from 'awilix'

describe('AuthService with Awilix', () => {
  it('should inject dependencies correctly', async () => {
    const container = createContainer()

    // Mock dependencies
    const mockDynamoClient = { /* mock */ }
    const mockJwtProvider = { /* mock */ }

    container.register({
      dynamoClient: asValue(mockDynamoClient),
      jwtProvider: asValue(mockJwtProvider),
      tableName: asValue('test-table'),
      authService: asFunction(({ dynamoClient, tableName, jwtProvider }) => {
        return createDefaultAuthService(dynamoClient, tableName, jwtProvider)
      })
    })

    const authService = container.resolve('authService')

    // Test authService
  })
})
```

### Phase 2 Success Criteria

- ✅ All services use Awilix for DI
- ✅ Request-scoped instances work correctly
- ✅ Dispose/cleanup handlers prevent memory leaks
- ✅ Tests pass with mocked dependencies
- ✅ Performance benchmarks meet SLAs

---

## 🌐 Phase 3: API Client & Caching (Weeks 3-4)

### **Goal:** Replace custom API client and caching implementations

### Part A: API Client Migration to Ky

**File:** `packages/frontend/src/services/apiClient-v2.ts`

```typescript
import ky from 'ky'
import type { KyInstance } from 'ky'
import {
  LoginRequestSchema,
  LoginResponseSchema,
  RegisterRequestSchema,
  RegisterResponseSchema,
  type LoginRequest,
  type LoginResponse
} from '@social-media-app/shared'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/**
 * Create API client with ky
 */
export function createApiClient() {
  // Base client without auth
  const baseClient = ky.create({
    prefixUrl: API_BASE_URL,
    timeout: 30000,
    retry: {
      limit: 3,
      methods: ['get', 'post', 'put', 'patch', 'delete'],
      statusCodes: [408, 413, 429, 500, 502, 503, 504],
      backoffLimit: 10000
    },
    hooks: {
      beforeRequest: [
        (request) => {
          console.log(`🔵 API Request: ${request.method} ${request.url}`)
        }
      ],
      afterResponse: [
        (_request, _options, response) => {
          console.log(`📥 API Response: ${response.status} ${response.statusText}`)
        }
      ],
      beforeError: [
        (error) => {
          console.error('❌ API Error:', error)
          return error
        }
      ]
    }
  })

  // Authenticated client
  const authedClient = baseClient.extend({
    hooks: {
      beforeRequest: [
        (request) => {
          const token = getTokenFromStorage('accessToken')
          if (token) {
            request.headers.set('Authorization', `Bearer ${token}`)
          }
        }
      ]
    }
  })

  return {
    auth: {
      register: async (data: RegisterRequest): Promise<RegisterResponse> => {
        const validated = RegisterRequestSchema.parse(data)
        const response = await baseClient.post('auth/register', {
          json: validated
        }).json()

        const result = RegisterResponseSchema.parse(response)

        // Store tokens
        if (result.tokens) {
          localStorage.setItem('accessToken', result.tokens.accessToken)
          localStorage.setItem('refreshToken', result.tokens.refreshToken)
        }

        return result
      },

      login: async (data: LoginRequest): Promise<LoginResponse> => {
        const validated = LoginRequestSchema.parse(data)
        const response = await baseClient.post('auth/login', {
          json: validated
        }).json()

        const result = LoginResponseSchema.parse(response)

        // Store tokens
        localStorage.setItem('accessToken', result.tokens.accessToken)
        localStorage.setItem('refreshToken', result.tokens.refreshToken)

        return result
      },

      logout: async (): Promise<void> => {
        try {
          await authedClient.post('auth/logout').json()
        } finally {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
        }
      }
    },

    // Generic methods
    get: <T>(url: string) => authedClient.get(url).json<T>(),
    post: <T>(url: string, data?: unknown) => authedClient.post(url, { json: data }).json<T>(),
    put: <T>(url: string, data?: unknown) => authedClient.put(url, { json: data }).json<T>(),
    delete: <T>(url: string) => authedClient.delete(url).json<T>()
  }
}

export const apiClient = createApiClient()
```

### Part B: Replace Custom Caching

**Backend Cache Migration:**

```bash
cd packages/backend
pnpm add keyv @keyv/redis
```

**File:** `packages/backend/src/infrastructure/cache-v2/index.ts`

```typescript
import Keyv from 'keyv'
import KeyvRedis from '@keyv/redis'

/**
 * Create cache instance with Redis backend
 */
export function createCache(namespace: string) {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

  return new Keyv({
    store: new KeyvRedis(redisUrl),
    namespace,
    ttl: 3600000 // 1 hour default
  })
}

// Usage in services
const profileCache = createCache('profiles')

export async function getCachedProfile(userId: string) {
  const cached = await profileCache.get(userId)
  if (cached) return cached

  const profile = await fetchProfileFromDB(userId)
  await profileCache.set(userId, profile, 300000) // 5 min TTL

  return profile
}
```

**Circuit Breaker with Opossum:**

```bash
pnpm add opossum
```

```typescript
import CircuitBreaker from 'opossum'

const options = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
}

const breaker = new CircuitBreaker(asyncDatabaseCall, options)

breaker.on('open', () => console.warn('Circuit breaker opened!'))
breaker.on('halfOpen', () => console.log('Circuit breaker half-open'))

// Use breaker
try {
  const result = await breaker.fire(userId)
} catch (err) {
  // Circuit open or function failed
}
```

### Phase 3 Success Criteria

- ✅ Frontend uses ky for all HTTP requests
- ✅ Retry logic works correctly
- ✅ Auth token injection automatic
- ✅ Cache hit rates > 80%
- ✅ Circuit breakers prevent cascade failures

---

## 🗄️ Phase 4: DynamoDB & GraphQL Utilities (Weeks 5-6)

### **Goal:** Replace DynamoDB query builders and GraphQL connection builders

### Part A: ElectroDB Migration

```bash
cd packages/dal
pnpm add electrodb
```

**File:** `packages/dal/src/entities-v2/user.entity.ts`

```typescript
import { Entity } from 'electrodb'

export const UserEntity = new Entity({
  model: {
    entity: 'user',
    version: '1',
    service: 'social-media-app'
  },
  attributes: {
    userId: {
      type: 'string',
      required: true
    },
    email: {
      type: 'string',
      required: true
    },
    username: {
      type: 'string',
      required: true
    },
    fullName: {
      type: 'string'
    },
    bio: {
      type: 'string'
    },
    avatarUrl: {
      type: 'string'
    },
    createdAt: {
      type: 'string',
      required: true,
      readOnly: true,
      default: () => new Date().toISOString()
    }
  },
  indexes: {
    primary: {
      pk: {
        field: 'PK',
        composite: ['userId']
      },
      sk: {
        field: 'SK',
        composite: []
      }
    },
    byEmail: {
      index: 'GSI1',
      pk: {
        field: 'GSI1PK',
        composite: ['email']
      },
      sk: {
        field: 'GSI1SK',
        composite: []
      }
    },
    byUsername: {
      index: 'GSI2',
      pk: {
        field: 'GSI2PK',
        composite: ['username']
      },
      sk: {
        field: 'GSI2SK',
        composite: []
      }
    }
  }
}, { client: dynamoClient, table: tableName })

// Usage
const user = await UserEntity.get({ userId: '123' }).go()
const userByEmail = await UserEntity.query.byEmail({ email: 'test@example.com' }).go()
```

**Migration Strategy:**
1. Create entities alongside existing services
2. Add feature flag: `USE_ELECTRODB`
3. Dual-write during transition
4. Compare results in tests
5. Switch over when confidence is high

### Part B: GraphQL Relay Connections

```bash
cd packages/graphql-server
pnpm add graphql-relay
```

**File:** `packages/graphql-server/src/infrastructure/pagination-v2/index.ts`

```typescript
import { connectionFromArray, connectionFromArraySlice, cursorToOffset } from 'graphql-relay'

export function createConnection<T>(
  items: T[],
  args: {
    first?: number | null
    after?: string | null
  }
) {
  return connectionFromArray(items, args)
}

// For paginated results
export function createConnectionFromSlice<T>(
  items: T[],
  args: {
    first?: number | null
    after?: string | null
  },
  meta: {
    sliceStart: number
    arrayLength: number
  }
) {
  return connectionFromArraySlice(items, args, meta)
}
```

### Phase 4 Success Criteria

- ✅ ElectroDB entities cover all DynamoDB operations
- ✅ Type safety improved
- ✅ GraphQL pagination uses graphql-relay
- ✅ All tests pass
- ✅ Query performance maintained or improved

---

## 📊 Testing Strategy

### Unit Testing

```typescript
// Test Middy handlers
import { handler } from './login.js'

describe('Login Handler', () => {
  it('should validate input', async () => {
    const event = createMockEvent({ body: { email: 'invalid' } })
    const result = await handler(event, {} as any, () => {})
    expect(result.statusCode).toBe(400)
  })
})
```

### Integration Testing

```typescript
// Test Awilix DI
describe('Awilix Integration', () => {
  it('should resolve services correctly', () => {
    const container = setupContainer()
    const authService = container.resolve('authService')
    expect(authService).toBeDefined()
  })
})
```

### Performance Testing

```bash
# Load test with Artillery
artillery run load-test.yml

# Compare before/after metrics
```

---

## 🔄 Rollback Procedures

### Immediate Rollback (< 1 hour)

```bash
# Revert deployment
git revert <migration-commit>
git push
./deploy-backend.sh

# Or use CDK
cdk deploy --rollback
```

### Gradual Rollback (Feature Flags)

```typescript
// Environment variable approach
const USE_NEW_IMPLEMENTATION = process.env.FEATURE_NEW_IMPL === 'true'

export const handler = USE_NEW_IMPLEMENTATION
  ? newMiddyHandler
  : legacyHandler
```

### Data Rollback

- No data migrations in this plan
- All library changes are drop-in replacements
- No schema changes required

---

## 📈 Success Metrics

### Code Quality
- [ ] Lines of code reduced by 2,000+
- [ ] Test coverage maintained at 85%+
- [ ] Zero new ESLint errors
- [ ] TypeScript strict mode passes

### Performance
- [ ] API response times < 200ms (p95)
- [ ] Lambda cold starts < 1s
- [ ] Cache hit rate > 80%
- [ ] Zero memory leaks

### Reliability
- [ ] Zero production incidents
- [ ] Error rate < 0.1%
- [ ] Uptime > 99.9%

---

## 🚨 Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking changes | Medium | High | Feature flags, gradual rollout |
| Performance regression | Low | High | Load testing, monitoring |
| Memory leaks | Low | Medium | Proper cleanup in middleware |
| Dependencies unmaintained | Low | Low | All libs have 1M+ downloads |

---

## 📅 Timeline

```
Week 1: Phase 1 (Middy)
├── Day 1-2: Setup & POC
├── Day 3: Migrate 3 handlers
├── Day 4-5: Bulk migration
└── Weekend: Monitoring

Week 2-3: Phase 2 (Awilix)
├── Week 2: Backend DI
└── Week 3: GraphQL DI

Week 3-4: Phase 3 (API & Cache)
├── Week 3: Frontend API client
└── Week 4: Backend caching

Week 5-6: Phase 4 (DynamoDB & GraphQL)
├── Week 5: ElectroDB
└── Week 6: GraphQL utilities
```

---

## ✅ Pre-Migration Checklist

- [ ] All tests passing
- [ ] Feature flags implemented
- [ ] Monitoring/alerting configured
- [ ] Rollback procedures documented
- [ ] Team trained on new libraries
- [ ] Dependencies security-scanned
- [ ] Load testing environment ready

---

## 📚 Additional Resources

- [Middy Documentation](https://middy.js.org/)
- [Awilix Guide](https://github.com/jeffijoe/awilix)
- [Ky Documentation](https://github.com/sindresorhus/ky)
- [ElectroDB Examples](https://electrodb.dev/)
- [Opossum Circuit Breaker](https://nodeshift.dev/opossum/)

---

**Next Steps:**
1. Review this plan with team
2. Get approval for Phase 1
3. Create feature branch: `feat/library-migration-phase-1`
4. Begin Middy migration

