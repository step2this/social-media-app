# Complete useFeedItemAutoRead Relay Migration - Replace Old System

## Goal
Replace the old REST-based `useFeedItemAutoRead` implementation entirely with the Relay version. No parallel implementations - clean replacement.

## Current State
✅ Relay versions exist with `.relay` suffix:
- `useFeedItemAutoRead.relay.ts` (new Relay hook)
- `useFeedItemAutoRead.relay.test.tsx` (5 passing tests)
- `FeedItemWrapper.relay.tsx` (new component)

❌ Old REST versions still exist:
- `useFeedItemAutoRead.ts` (old hook)
- `useFeedItemAutoRead.test.ts` (failing - expected)
- `FeedItemWrapper.tsx` (old component)

## Step 1: Replace Hook Implementation

**Delete old hook:**
```bash
rm packages/frontend/src/hooks/useFeedItemAutoRead.ts
```

**Rename Relay hook to remove `.relay` suffix:**
```bash
mv packages/frontend/src/hooks/useFeedItemAutoRead.relay.ts \
   packages/frontend/src/hooks/useFeedItemAutoRead.ts
```

**Update the mutation name inside the hook:**
- Change `useFeedItemAutoReadRelayMutation` to `useFeedItemAutoReadMutation`
- This keeps the GraphQL mutation name clean

## Step 2: Replace Hook Tests

**Delete old failing test:**
```bash
rm packages/frontend/src/hooks/useFeedItemAutoRead.test.ts
```

**Rename Relay test:**
```bash
mv packages/frontend/src/hooks/useFeedItemAutoRead.relay.test.tsx \
   packages/frontend/src/hooks/useFeedItemAutoRead.test.tsx
```

**Update test imports:**
- Remove `.relay` from import path: `from './useFeedItemAutoRead'`

## Step 3: Replace Component

**Delete old component:**
```bash
rm packages/frontend/src/components/feed/FeedItemWrapper.tsx
```

**Rename Relay component:**
```bash
mv packages/frontend/src/components/feed/FeedItemWrapper.relay.tsx \
   packages/frontend/src/components/feed/FeedItemWrapper.tsx
```

**Update component:**
- Remove `Relay` suffix from component name: `FeedItemWrapperRelayProps` → `FeedItemWrapperProps`
- Remove `Relay` suffix from export: `FeedItemWrapperRelay` → `FeedItemWrapper`
- Update import path for hook: remove `.relay` suffix

## Step 4: Re-run Relay Compiler

After renaming, regenerate GraphQL types:

```bash
cd packages/frontend && npm run relay
```

This will generate:
- `__generated__/useFeedItemAutoReadMutation.graphql.ts` (new)
- Old `useFeedItemAutoReadRelayMutation.graphql.ts` can be deleted manually or ignored

## Step 5: Update FeedItemWrapper Test

**File:** `packages/frontend/src/components/feed/FeedItemWrapper.test.tsx`

This test file currently tests the OLD component. It needs to be updated or replaced:

**Option A:** Update existing test to use Relay patterns
**Option B:** Delete old test and create minimal integration test

**Recommended: Option B** - Create minimal test:

```typescript
import { render } from '@testing-library/react';
import { createMockEnvironment } from 'relay-test-utils';
import { RelayEnvironmentProvider } from 'react-relay';
import { FeedItemWrapper } from './FeedItemWrapper';
import { createMockPost } from '@social-media-app/shared';

it('should render with post data', () => {
  const environment = createMockEnvironment();
  const post = createMockPost({ id: 'post-123' });
  
  const { getByTestId } = render(
    <RelayEnvironmentProvider environment={environment}>
      <FeedItemWrapper post={post} />
    </RelayEnvironmentProvider>
  );

  expect(getByTestId('feed-item-wrapper')).toBeInTheDocument();
});
```

## Step 6: Clean Up Service Dependencies

**File:** `packages/frontend/src/services/interfaces/IFeedService.ts`

Remove `markPostsAsRead` method from interface:

```typescript
// DELETE THIS:
markPostsAsRead(input: MarkPostsAsReadInput): Promise<AsyncState<MarkPostsAsReadResult>>;
```

**File:** `packages/frontend/src/services/feedService.ts`

Remove `markPostsAsRead` implementation and update comments.

**File:** `packages/frontend/src/test-utils/mock-service-container.ts`

Remove `markPostsAsRead: vi.fn()` from mock feedService.

## Step 7: Handle DevManualMarkButton

**File:** `packages/frontend/src/components/dev/DevManualMarkButton.tsx`

This dev tool currently uses the old service. Two options:

**Option A:** Delete it (it's just a dev tool)
**Option B:** Update it to use the Relay hook

**Recommended: Option B** - Update to use Relay:

```typescript
import { useFeedItemAutoRead } from '../../hooks/useFeedItemAutoRead';

// Replace:
// await feedService.markPostsAsRead({ postIds: [post.id] });

// With:
const { markAsRead } = useFeedItemAutoRead();
markAsRead(post.id);
```

## Step 8: Run All Tests

```bash
# Run hook tests
npm test -- useFeedItemAutoRead.test

# Run component tests  
npm test -- FeedItemWrapper.test

# Run all frontend tests
cd packages/frontend && npm test
```

## Step 9: Verify No Remaining References

Search for any remaining references to the old implementation:

```bash
# Should return no results:
grep -r "useFeedItemAutoRead.ts" packages/frontend/src --include="*.ts" --include="*.tsx"

# Check for old service method:
grep -r "markPostsAsRead" packages/frontend/src --include="*.ts" --include="*.tsx" | grep -v test
```

## Step 10: Update Documentation

**Delete:** `RELAY_MIGRATION_FEEDITEM_AUTOREAD_COMPLETE.md` (outdated - was about parallel migration)

**Create:** `FEEDITEM_AUTOREAD_RELAY_COMPLETE.md` (final state documentation)

## Expected Outcome

After completion:

✅ Single source of truth: `useFeedItemAutoRead.ts` (Relay version)
✅ All tests passing
✅ No `.relay` suffix in production code
✅ Clean mutation names
✅ Service dependencies removed
✅ No breaking changes to components using FeedItemWrapper

## Risk Mitigation

**Low Risk Changes:**
- Hook API is the same (returns ref)
- Component API is identical (same props)
- Tests validate behavior

**Rollback Plan:**
- Git revert if issues found
- Old code is in Git history

## Time Estimate

- 20 minutes for file operations and updates
- 10 minutes for testing
- 5 minutes for cleanup

**Total:** ~35 minutes