# Query.ts TDD Cleanup Plan

## Current Issues (from validate_changes)

### Type Safety Errors
1. **Line 300**: `post` parameter has implicit `any` type
2. **Line 364**: `postWithAuthor` parameter has implicit `any` type  
3. **Lines 614-616**: Nullable types passed to service that doesn't accept null
4. **Line 640**: bids resolver return type missing `bidder` field

## TDD Cycle Plan

### Cycle 1: Fix Helper Function Type Annotations
**Test First**: Verify helper functions have proper types
**Fix**: Add explicit type annotations to `buildPostCursor`

```typescript
// BEFORE (line 59)
function buildPostCursor(post: { id: string; createdAt: string }): string {

// AFTER
interface PostCursorData {
  id: string;
  createdAt: string;
}

function buildPostCursor(post: PostCursorData): string {
```

### Cycle 2: Fix exploreFeed map Function
**Test First**: TypeScript should infer post type from result.posts
**Fix**: Add explicit type to map parameter

```typescript
// BEFORE (line 301)
const edges = result.posts.map((post) => ({

// AFTER
const edges = result.posts.map((post: PostGridItem) => ({
```

### Cycle 3: Fix followingFeed map Function
**Test First**: TypeScript should infer postWithAuthor type
**Fix**: Add explicit type to map parameter

```typescript
// BEFORE (line 365)
const edges = result.posts.map((postWithAuthor) => ({

// AFTER  
const edges = result.posts.map((postWithAuthor: PostWithAuthor) => ({
```

### Cycle 4: Fix Auction Service Null Handling
**Test First**: Service expects non-null values, but GraphQL args can be null
**Fix**: Filter out null values before passing to service

```typescript
// BEFORE (lines 614-617)
const result = await context.services.auctionService.listAuctions({
  limit: args.limit || 20,
  cursor: args.cursor,
  status: args.status,
  userId: args.userId,
});

// AFTER
const result = await context.services.auctionService.listAuctions({
  limit: args.limit || 20,
  cursor: args.cursor ?? undefined,
  status: args.status ?? undefined,
  userId: args.userId ?? undefined,
});
```

### Cycle 5: Fix Bids Resolver Return Type
**Test First**: Return type should match BidConnection schema
**Fix**: Add bidder field resolver reference

```typescript
// Option 1: Add bidder to returned bid objects
return {
  bids: result.bids.map(bid => ({
    ...bid,
    // bidder will be resolved by Bid.bidder field resolver
  })),
  total: result.total,
};

// Option 2: Add comment explaining field resolver handles it
// @ts-expect-error - bidder field resolved by Bid.bidder field resolver
return {
  bids: result.bids,
  total: result.total,
};
```

## Expected Outcomes

- ✅ Zero TypeScript errors in Query.ts
- ✅ All type parameters explicitly annotated
- ✅ Null safety handled correctly
- ✅ No `@ts-ignore` comments (only `@ts-expect-error` with explanations)
- ✅ Helper functions have proper type definitions

## Verification

Run `validate_changes` after each cycle to confirm:
1. Error count decreases
2. No new errors introduced
3. Existing tests still pass
