# Service Factory Test Plan - TDD RED Phase Complete

## Overview

Comprehensive test suite for Dependency Injection pattern to eliminate ~400 lines of duplicated service instantiation code across GraphQL resolvers.

## Problem Statement

Current resolvers duplicate service instantiation code ~20 times:
```typescript
// Duplicated in EVERY resolver mutation/query:
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
// ... more service instantiations
```

## Solution

Service factory pattern creates services once in GraphQL context:
```typescript
// Services created once per request in context
interface GraphQLContext {
  services: Services; // All DAL services pre-instantiated
  // ... other context properties
}

// Resolvers just use services directly
const result = await context.services.postService.createPost({...});
```

## Test Suite Structure

### Total: 18 Tests (All Failing - RED Phase ✓)

#### 1. Service Factory Creation (6 tests)
- ✓ should create all required services
- ✓ should pass correct dependencies to ProfileService
- ✓ should pass correct dependencies to PostService
- ✓ should reuse ProfileService instance across dependent services
- ✓ should create services with correct AWS configuration
- ✓ should return Services interface with all required properties

#### 2. Context Integration (4 tests)
- ✓ should include services in GraphQL context
- ✓ should allow services to be accessible via context.services
- ✓ should use same dynamoClient as context
- ✓ should use same tableName as context

#### 3. Service Reusability (3 tests)
- ✓ should reuse same service instances across multiple resolver calls in same request
- ✓ should create different service instances for different requests
- ✓ should not leak service state between requests

#### 4. Configuration (3 tests)
- ✓ should use correct S3 bucket name from environment
- ✓ should use correct CloudFront domain from environment
- ✓ should use correct DynamoDB table name from context

#### 5. Error Handling (2 tests)
- ✓ should handle missing S3 bucket name gracefully
- ✓ should handle missing CloudFront domain gracefully

## Service Dependencies

### ProfileService
```typescript
constructor(
  dynamoClient: DynamoDBDocumentClient,
  tableName: string,
  s3BucketName?: string,
  cloudFrontDomain?: string,
  s3Client?: S3Client
)
```

### PostService
```typescript
constructor(
  dynamoClient: DynamoDBDocumentClient,
  tableName: string,
  profileService: ProfileService  // Dependency injection
)
```

### LikeService
```typescript
constructor(
  dynamoClient: DynamoDBDocumentClient,
  tableName: string
)
```

### FollowService
```typescript
constructor(
  dynamoClient: DynamoDBDocumentClient,
  tableName: string
)
```

### CommentService
```typescript
constructor(
  dynamoClient: DynamoDBDocumentClient,
  tableName: string
)
```

## Test Execution Results (RED Phase)

```
Test Files  1 failed (1)
Tests       18 failed (18)
Duration    178ms

All tests failing with: "createServices not implemented"
```

### Sample Test Output
```
✗ Service Factory > Service Factory Creation > should create all required services
  → createServices not implemented

✗ Service Factory > Context Integration > should include services in GraphQL context
  → createServices not implemented

✗ Service Factory > Service Reusability > should reuse same service instances
  → createServices not implemented
```

## Files Created

1. **Test Suite**: `/packages/graphql-server/__tests__/services/service-factory.test.ts`
   - 18 comprehensive tests
   - All tests failing (RED phase)
   - Tests interface contracts, not implementation

2. **Stub Implementation**: `/packages/graphql-server/src/services/factory.ts`
   - TypeScript interfaces defined
   - Stub function throws error
   - Ready for GREEN phase implementation

## Next Steps (GREEN Phase)

1. Implement `createServices()` function
   - Create S3 client
   - Get environment configuration
   - Instantiate ProfileService
   - Instantiate other services with ProfileService dependency
   - Return Services object

2. Update GraphQL context
   - Add `services` property to GraphQLContext interface
   - Call `createServices()` in `createContext()`
   - Remove old service instantiation code

3. Update resolvers
   - Replace service instantiation with `context.services.XXX`
   - Remove ~400 lines of duplicated code
   - Verify all resolvers work

4. Run tests to verify GREEN phase

## Benefits

### Code Quality
- ✓ Eliminates ~400 lines of duplicated code
- ✓ Single Responsibility Principle (service factory has one job)
- ✓ Dependency Injection pattern
- ✓ DRY (Don't Repeat Yourself)
- ✓ Easier to maintain and test

### Performance
- ✓ Services created once per request (not per resolver)
- ✓ ProfileService instance reused across dependent services
- ✓ Reduced object instantiation overhead

### Developer Experience
- ✓ Cleaner resolver code
- ✓ Easy to add new services
- ✓ Clear service dependencies
- ✓ Better testability

## Test Coverage

### What's Tested
- ✓ Service creation and initialization
- ✓ Dependency injection (ProfileService → PostService)
- ✓ Context integration
- ✓ Service isolation between requests
- ✓ Service reuse within request
- ✓ Environment configuration
- ✓ Error handling

### What's NOT Tested (Unit tests exist elsewhere)
- Individual service methods (tested in DAL package)
- GraphQL resolver logic (tested in resolver tests)
- DataLoader integration (tested in dataloaders.test.ts)

## Verification Commands

```bash
# Run service factory tests
cd packages/graphql-server
pnpm test service-factory

# Run all GraphQL server tests
pnpm test

# Build and verify TypeScript
pnpm build
```

## Related Files

- `/packages/graphql-server/src/context.ts` - GraphQL context (will be updated)
- `/packages/graphql-server/src/schema/resolvers/*.ts` - Resolvers (will be simplified)
- `/packages/dal/src/services/*.service.ts` - Service implementations
- `/packages/graphql-server/__tests__/context.test.ts` - Context tests (will need updates)

## TDD Progress

- [x] **RED Phase**: Write failing tests (18 tests)
- [ ] **GREEN Phase**: Implement minimal code to pass tests
- [ ] **REFACTOR Phase**: Clean up and optimize implementation
