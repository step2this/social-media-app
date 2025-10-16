# Service Factory Test Suite

## TDD RED Phase Complete ✓

All 18 tests are failing as expected. Ready for GREEN phase implementation.

## Quick Start

```bash
# Run service factory tests
cd packages/graphql-server
pnpm test service-factory

# Expected output: 18 failed tests (RED phase)
# Test Files  1 failed (1)
# Tests       18 failed (18)
```

## Test Suite Overview

### Purpose
Comprehensive test coverage for Dependency Injection pattern that eliminates ~400 lines of duplicated service instantiation code across GraphQL resolvers.

### Test Statistics
- **Total Tests**: 18
- **Test File**: `service-factory.test.ts` (308 lines)
- **Implementation File**: `../src/services/factory.ts` (46 lines stub)
- **Test Categories**: 5 major categories
- **Current Status**: All failing (RED phase) ✓

## Test Categories

### 1. Service Factory Creation (6 tests)
Tests that verify the factory creates all required services with correct dependencies.

```typescript
✗ should create all required services
✗ should pass correct dependencies to ProfileService
✗ should pass correct dependencies to PostService
✗ should reuse ProfileService instance across dependent services
✗ should create services with correct AWS configuration
✗ should return Services interface with all required properties
```

**What's being tested:**
- All 5 services are created (Profile, Post, Like, Follow, Comment)
- Services receive correct constructor parameters
- ProfileService dependency is injected into PostService
- AWS configuration (S3, CloudFront) is passed correctly
- Return type matches Services interface

### 2. Context Integration (4 tests)
Tests that verify services integrate correctly with GraphQL context.

```typescript
✗ should include services in GraphQL context
✗ should allow services to be accessible via context.services
✗ should use same dynamoClient as context
✗ should use same tableName as context
```

**What's being tested:**
- Services object fits in GraphQL context structure
- Services accessible via `context.services.XXX` pattern
- Shared DynamoDB client across all services
- Shared table name across all services

### 3. Service Reusability (3 tests)
Tests that verify service instance management and isolation.

```typescript
✗ should reuse same service instances across multiple resolver calls in same request
✗ should create different service instances for different requests
✗ should not leak service state between requests
```

**What's being tested:**
- Service instances reused within single request
- New service instances for each request
- No state leakage between requests (isolation)

### 4. Configuration (3 tests)
Tests that verify environment configuration is properly used.

```typescript
✗ should use correct S3 bucket name from environment
✗ should use correct CloudFront domain from environment
✗ should use correct DynamoDB table name from context
```

**What's being tested:**
- Environment variables read correctly
- Configuration passed to services
- Context parameters override environment when needed

### 5. Error Handling (2 tests)
Tests that verify graceful handling of missing configuration.

```typescript
✗ should handle missing S3 bucket name gracefully
✗ should handle missing CloudFront domain gracefully
```

**What's being tested:**
- Missing environment variables don't crash
- Services still created with defaults
- Graceful degradation

## Architecture

### Current Problem
Resolvers duplicate service instantiation code ~20 times:

```typescript
// DUPLICATED IN EVERY RESOLVER - ~400 LINES TOTAL
const dynamoClient = context.dynamoClient;
const s3Client = createS3Client();
const s3BucketName = getS3BucketName();
const cloudFrontDomain = getCloudFrontDomain();

const profileService = new ProfileService(
  dynamoClient,
  context.tableName,
  s3BucketName,
  cloudFrontDomain,
  s3Client
);
const postService = new PostService(dynamoClient, context.tableName, profileService);
// ... more duplication
```

### Proposed Solution
Service factory creates services once in GraphQL context:

```typescript
// IN CONTEXT - ONCE PER REQUEST
export function createServices(
  dynamoClient: DynamoDBDocumentClient,
  tableName: string
): Services {
  // Create S3 client
  const s3Client = createS3Client();
  const s3BucketName = getS3BucketName();
  const cloudFrontDomain = getCloudFrontDomain();

  // Create ProfileService
  const profileService = new ProfileService(
    dynamoClient,
    tableName,
    s3BucketName,
    cloudFrontDomain,
    s3Client
  );

  // Create other services (dependency injection)
  const postService = new PostService(dynamoClient, tableName, profileService);
  const likeService = new LikeService(dynamoClient, tableName);
  const followService = new FollowService(dynamoClient, tableName);
  const commentService = new CommentService(dynamoClient, tableName);

  return {
    profileService,
    postService,
    likeService,
    followService,
    commentService,
  };
}

// IN RESOLVERS - CLEAN AND SIMPLE
const result = await context.services.postService.createPost({...});
```

### Service Dependencies

```
ProfileService (no dependencies)
  ↓
PostService (depends on ProfileService)

LikeService (no dependencies)
FollowService (no dependencies)
CommentService (no dependencies)
```

## Test Execution

### Current Output (RED Phase)

```bash
$ pnpm test service-factory --run

 RUN  v1.6.1 /Users/shaperosteve/social-media-app/packages/graphql-server

 ❯ __tests__/services/service-factory.test.ts  (18 tests | 18 failed) 5ms

 Test Files  1 failed (1)
      Tests  18 failed (18)
   Duration  178ms
```

All 18 tests failing with:
```
Error: createServices not implemented
```

### Expected Output (GREEN Phase - After Implementation)

```bash
 Test Files  1 passed (1)
      Tests  18 passed (18)
   Duration  ~200ms
```

## Implementation Checklist

### Phase 1: Implement Service Factory (GREEN)

- [ ] Implement `createServices()` function in `/src/services/factory.ts`
  - [ ] Create S3 client using aws-utils
  - [ ] Get S3 bucket name from environment
  - [ ] Get CloudFront domain from environment
  - [ ] Instantiate ProfileService with AWS config
  - [ ] Instantiate PostService with ProfileService dependency
  - [ ] Instantiate LikeService
  - [ ] Instantiate FollowService
  - [ ] Instantiate CommentService
  - [ ] Return Services object

### Phase 2: Update GraphQL Context

- [ ] Update `GraphQLContext` interface in `/src/context.ts`
  - [ ] Add `services: Services` property

- [ ] Update `createContext()` function
  - [ ] Call `createServices(dynamoClient, tableName)`
  - [ ] Add services to returned context
  - [ ] Remove old service instantiation code (currently creates profileService, postService, likeService for dataloaders)

### Phase 3: Update Resolvers

- [ ] Update `/src/schema/resolvers/Mutation.ts`
  - [ ] Replace service instantiation with `context.services.XXX`
  - [ ] Remove ~20 service instantiation blocks
  - [ ] Test all mutations work

- [ ] Update `/src/schema/resolvers/Query.ts`
  - [ ] Replace service instantiation with `context.services.XXX`
  - [ ] Remove service instantiation blocks
  - [ ] Test all queries work

- [ ] Update other resolver files as needed

### Phase 4: Verify Tests Pass (GREEN)

- [ ] Run `pnpm test service-factory` - should pass 18/18
- [ ] Run `pnpm test context` - update and verify
- [ ] Run `pnpm test` - all tests should pass
- [ ] Manually test GraphQL API

### Phase 5: Refactor (REFACTOR)

- [ ] Review code for improvements
- [ ] Add JSDoc comments
- [ ] Optimize imports
- [ ] Clean up any remaining duplication

## Benefits

### Code Quality
- **-400 lines**: Eliminates duplicated service instantiation code
- **DRY**: Single source of truth for service creation
- **SOLID**: Single Responsibility Principle (factory has one job)
- **Dependency Injection**: Clear service dependencies
- **Testability**: Easy to mock services in tests

### Performance
- **Fewer allocations**: Services created once per request
- **Shared instances**: ProfileService reused across dependent services
- **Reduced overhead**: No repeated AWS client creation in resolvers

### Developer Experience
- **Cleaner resolvers**: Focus on business logic, not infrastructure
- **Easy to extend**: Add new services in one place
- **Clear dependencies**: Explicit service relationships
- **Better IntelliSense**: Type-safe access to services

## Related Files

```
packages/graphql-server/
├── __tests__/
│   ├── services/
│   │   ├── service-factory.test.ts         (NEW - 308 lines, 18 tests)
│   │   ├── SERVICE_FACTORY_TEST_PLAN.md    (NEW - test documentation)
│   │   └── README.md                        (NEW - this file)
│   ├── context.test.ts                      (UPDATE - add services tests)
│   └── resolvers/                           (UPDATE - simplify tests)
├── src/
│   ├── services/
│   │   └── factory.ts                       (NEW - 46 lines stub)
│   ├── context.ts                           (UPDATE - add services)
│   └── schema/
│       └── resolvers/
│           ├── Mutation.ts                  (UPDATE - use context.services)
│           └── Query.ts                     (UPDATE - use context.services)
└── package.json
```

## Run Commands

```bash
# Run only service factory tests
pnpm test service-factory

# Run only service factory tests (once, no watch)
pnpm test service-factory --run

# Run all tests
pnpm test

# Run all tests once
pnpm test --run

# Run with coverage
pnpm test --coverage

# Build TypeScript
pnpm build

# Type check
pnpm type-check
```

## TDD Progress

- [x] **RED Phase**: Write failing tests (18 tests) ✓
- [ ] **GREEN Phase**: Implement minimal code to pass tests
- [ ] **REFACTOR Phase**: Clean up and optimize implementation

## Current Status

🔴 **RED PHASE COMPLETE**

All 18 tests are failing with "createServices not implemented".

Ready to proceed to GREEN phase: Implement the service factory to make tests pass.

---

**Created**: 2025-10-14
**Test Suite**: Service Factory Dependency Injection
**Purpose**: Eliminate ~400 lines of duplicated service instantiation code
**TDD Phase**: RED (Complete) → Ready for GREEN
