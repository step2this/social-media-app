# Complete Dual Adapter Pattern Removal - Phase 1 Extension

## 🎯 Objective
Remove ALL remaining dual adapter patterns in the GraphQL server to complete Phase 1 anti-pattern cleanup. We successfully removed PostAdapter and FeedAdapter, but **3 dual adapter patterns remain**: Comment, Notification, and Profile.

## 📊 Current State

### Remaining Dual Adapter Patterns

**1. Comment Domain:**
- ❌ Legacy: `CommentAdapter.ts` (direct service wrapper)
- ✅ Modern: `CommentServiceAdapter.ts` (implements ICommentRepository)
- **Usage**: `src/resolvers/comment/commentsResolver.ts:9` imports CommentAdapter

**2. Notification Domain:**
- ❌ Legacy: `NotificationAdapter.ts` (direct service wrapper)
- ✅ Modern: `NotificationServiceAdapter.ts` (implements INotificationRepository)
- **Usage**: 
  - `src/resolvers/notification/notificationsResolver.ts:9` imports NotificationAdapter
  - `src/resolvers/notification/unreadNotificationsCountResolver.ts:9` imports NotificationAdapter

**3. Profile Domain:**
- ❌ Legacy: `ProfileAdapter.ts` (direct service wrapper)
- ✅ Modern: `ProfileServiceAdapter.ts` (implements IProfileRepository)
- **Usage**:
  - `src/resolvers/profile/profileResolver.ts:9` imports ProfileAdapter
  - `src/resolvers/profile/meResolver.ts:9` imports ProfileAdapter

### Impact
- **Files to Delete**: 6 files (3 adapters + 3 test files)
- **Files to Migrate**: 5 resolvers
- **Lines to Remove**: ~600-800 lines

---

## 🔧 Implementation Steps

### Step 1: Migrate commentsResolver to Use Case Pattern

**Current Pattern (commentsResolver.ts):**
```typescript
// ❌ Legacy adapter pattern
import { CommentAdapter } from '../../infrastructure/adapters/CommentAdapter';

const commentAdapter = new CommentAdapter(context.services.commentService);
return commentAdapter.getCommentsByPostId({ postId, first, after });
```

**New Pattern (Hexagonal Architecture):**
```typescript
// ✅ Use case pattern with DI container
import { GetCommentsByPost } from '../../application/use-cases/comment/GetCommentsByPost.js';
import { PostId, Cursor } from '../../shared/types/index.js';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';

export const createCommentsResolver = (container: Container): QueryResolvers['comments'] => {
  return async (_parent, args, context) => {
    // Authentication check
    if (!context.userId) {
      throw ErrorFactory.unauthenticated('Authentication required');
    }

    // Validate args
    if (!args.postId) {
      throw ErrorFactory.badRequest('postId is required');
    }

    // Resolve use case from container
    const useCase = container.resolve<GetCommentsByPost>('GetCommentsByPost');

    // Execute use case
    const result = await useCase.execute({
      postId: PostId(args.postId),
      pagination: {
        first: args.limit ?? 20,
        after: args.cursor ? Cursor(args.cursor) : undefined,
      },
    });

    // Handle result
    if (!result.success) {
      throw ErrorFactory.internalServerError(result.error.message);
    }

    return result.data as unknown as CommentConnection;
  };
};
```

**Files to Modify:**
- `/packages/graphql-server/src/resolvers/comment/commentsResolver.ts`
- `/packages/graphql-server/src/resolvers/index.ts` (update to use createCommentsResolver with container)

---

### Step 2: Migrate notificationsResolver to Use Case Pattern

**Current Pattern (notificationsResolver.ts):**
```typescript
// ❌ Legacy adapter pattern
import { NotificationAdapter } from '../../infrastructure/adapters/NotificationAdapter';

const adapter = new NotificationAdapter(context.services.notificationService);
return adapter.getNotifications({ userId: context.userId!, first, after });
```

**New Pattern:**
```typescript
// ✅ Use case pattern
export const createNotificationsResolver = (container: Container): QueryResolvers['notifications'] => {
  return withAuth(async (_parent, args, context) => {
    const useCase = container.resolve<GetNotifications>('GetNotifications');

    const result = await useCase.execute({
      userId: UserId(context.userId!),
      pagination: {
        first: args.first ?? 20,
        after: args.after ? Cursor(args.after) : undefined,
      },
    });

    if (!result.success) {
      throw ErrorFactory.internalServerError(result.error.message);
    }

    return result.data as unknown as NotificationConnection;
  });
};
```

**Files to Modify:**
- `/packages/graphql-server/src/resolvers/notification/notificationsResolver.ts`

---

### Step 3: Migrate unreadNotificationsCountResolver to Use Case Pattern

**Current Pattern (unreadNotificationsCountResolver.ts):**
```typescript
// ❌ Legacy adapter pattern
import { NotificationAdapter } from '../../infrastructure/adapters/NotificationAdapter';

const adapter = new NotificationAdapter(context.services.notificationService);
return adapter.getUnreadCount(context.userId!);
```

**New Pattern:**
```typescript
// ✅ Use case pattern
export const createUnreadNotificationsCountResolver = (container: Container): QueryResolvers['unreadNotificationsCount'] => {
  return withAuth(async (_parent, _args, context) => {
    const useCase = container.resolve<GetUnreadNotificationsCount>('GetUnreadNotificationsCount');

    const result = await useCase.execute({ userId: UserId(context.userId!) });

    if (!result.success) {
      throw ErrorFactory.internalServerError(result.error.message);
    }

    return result.data;
  });
};
```

**Files to Modify:**
- `/packages/graphql-server/src/resolvers/notification/unreadNotificationsCountResolver.ts`

---

### Step 4: Migrate profileResolver to Use Case Pattern

**Current Pattern (profileResolver.ts):**
```typescript
// ❌ Legacy adapter pattern
import { ProfileAdapter } from '../../infrastructure/adapters/ProfileAdapter';

const adapter = new ProfileAdapter(context.services.profileService);
return adapter.getByHandle(args.handle);
```

**New Pattern:**
```typescript
// ✅ Use case pattern (already using GetProfileByHandle!)
export const createProfileResolver = (container: Container): QueryResolvers['profile'] => {
  return async (_parent, args) => {
    const useCase = container.resolve<GetProfileByHandle>('GetProfileByHandle');

    const result = await useCase.execute({ handle: Handle(args.handle) });

    if (!result.success) {
      throw ErrorFactory.internalServerError(result.error.message);
    }

    if (!result.data) {
      throw ErrorFactory.notFound('Profile', args.handle);
    }

    return result.data as unknown as Profile;
  };
};
```

**Files to Modify:**
- `/packages/graphql-server/src/resolvers/profile/profileResolver.ts`

---

### Step 5: Migrate meResolver to Use Case Pattern

**Current Pattern (meResolver.ts):**
```typescript
// ❌ Legacy adapter pattern
import { ProfileAdapter } from '../../infrastructure/adapters/ProfileAdapter';

const adapter = new ProfileAdapter(context.services.profileService);
return adapter.getCurrentProfile(context.userId!);
```

**New Pattern:**
```typescript
// ✅ Use case pattern (already using GetCurrentUserProfile!)
export const createMeResolver = (container: Container): QueryResolvers['me'] => {
  return withAuth(async (_parent, _args, context) => {
    const useCase = container.resolve<GetCurrentUserProfile>('GetCurrentUserProfile');

    const result = await useCase.execute({ userId: UserId(context.userId!) });

    if (!result.success) {
      throw ErrorFactory.internalServerError(result.error.message);
    }

    if (!result.data) {
      throw ErrorFactory.notFound('Profile', context.userId!);
    }

    return result.data as unknown as Profile;
  });
};
```

**Files to Modify:**
- `/packages/graphql-server/src/resolvers/profile/meResolver.ts`

---

### Step 6: Delete Legacy Adapter Files

**Files to DELETE:**
1. `/packages/graphql-server/src/infrastructure/adapters/CommentAdapter.ts`
2. `/packages/graphql-server/src/infrastructure/adapters/__tests__/CommentAdapter.test.ts`
3. `/packages/graphql-server/src/infrastructure/adapters/NotificationAdapter.ts`
4. `/packages/graphql-server/src/infrastructure/adapters/__tests__/NotificationAdapter.test.ts`
5. `/packages/graphql-server/src/infrastructure/adapters/ProfileAdapter.ts`
6. `/packages/graphql-server/src/infrastructure/adapters/__tests__/ProfileAdapter.test.ts`

**Impact**: -600 to -800 lines removed

---

### Step 7: Verify No Other References

Search for any remaining imports of legacy adapters:
```bash
cd /packages/graphql-server
grep -r "CommentAdapter\|NotificationAdapter\|ProfileAdapter" src/ \
  --include="*.ts" | grep -v "ServiceAdapter" | grep -v "__tests__"
```

**Expected**: Zero results after migration

---

### Step 8: Run Tests and Validate

**Test Commands:**
```bash
cd /packages/graphql-server
npm test src/resolvers/comment/__tests__/commentsResolver.test.ts
npm test src/resolvers/notification/__tests__/notificationsResolver.test.ts
npm test src/resolvers/notification/__tests__/unreadNotificationsCountResolver.test.ts
npm test src/resolvers/profile/__tests__/profileResolver.test.ts
npm test src/resolvers/profile/__tests__/meResolver.test.ts
```

**Expected Results:**
- ✅ All 5 resolver tests passing
- ✅ All use case tests passing
- ✅ Integration tests passing
- ✅ Zero TypeScript errors

---

### Step 9: Update CODEBASE_ANALYSIS

Mark Task 1.1 as **fully complete** with all dual adapter patterns removed:

```markdown
### 1. Dual Adapter Pattern (GraphQL Server) ✅ FULLY RESOLVED

**Original Anti-Pattern**: Multiple adapter implementations for the same service

**Files Deleted (Phase 1a - Post/Feed)**:
- PostAdapter.ts, PostAdapter.test.ts
- FeedAdapter.ts, FeedAdapter.test.ts

**Files Deleted (Phase 1b - Comment/Notification/Profile)**:
- CommentAdapter.ts, CommentAdapter.test.ts
- NotificationAdapter.ts, NotificationAdapter.test.ts
- ProfileAdapter.ts, ProfileAdapter.test.ts

**Total Impact**:
- 10 adapter files deleted (~1,000-1,200 lines)
- 10 resolvers migrated to hexagonal architecture
- Zero dual adapter patterns remain
- Consistent use case + DI container pattern across all domains

**Current State**: ALL resolvers use hexagonal architecture with proper use cases.
```

---

### Step 10: Create Clean Git Commits

**Commit Strategy:**

**Commit 1**: Migrate comment resolver
```
refactor(graphql-server): migrate commentsResolver to use case pattern

- Replace CommentAdapter with GetCommentsByPost use case
- Use DI container for dependency resolution
- Add proper error handling with ErrorFactory
- Type-safe with branded types (PostId, Cursor)
- Part of dual adapter pattern cleanup
```

**Commit 2**: Migrate notification resolvers
```
refactor(graphql-server): migrate notification resolvers to use case pattern

- Migrate notificationsResolver to use GetNotifications use case
- Migrate unreadNotificationsCountResolver to use GetUnreadNotificationsCount use case
- Replace NotificationAdapter with proper use cases
- Consistent error handling and type safety
- Part of dual adapter pattern cleanup
```

**Commit 3**: Migrate profile resolvers
```
refactor(graphql-server): migrate profile resolvers to use case pattern

- Migrate profileResolver to use GetProfileByHandle use case
- Migrate meResolver to use GetCurrentUserProfile use case
- Replace ProfileAdapter with proper use cases
- Consistent error handling and type safety
- Part of dual adapter pattern cleanup
```

**Commit 4**: Delete all legacy adapters
```
refactor(graphql-server): remove all legacy adapters (complete dual adapter cleanup)

- Delete CommentAdapter.ts and CommentAdapter.test.ts
- Delete NotificationAdapter.ts and NotificationAdapter.test.ts
- Delete ProfileAdapter.ts and ProfileAdapter.test.ts
- Complete removal of dual adapter anti-pattern
- ALL resolvers now use hexagonal architecture

Impact: -~800 lines, zero dual adapters remain
```

**Commit 5**: Update documentation
```
docs: update CODEBASE_ANALYSIS - dual adapter cleanup complete

- Mark Task 1.1 as fully resolved
- Document all 10 adapter deletions
- Update Phase 1 completion status
- All resolvers now use hexagonal architecture consistently
```

---

## 📊 Impact Summary

### Before This Plan
- **Dual Adapter Patterns**: 5 (Post, Feed, Comment, Notification, Profile)
- **Resolved in Previous Work**: 2 (Post, Feed)
- **Still Remaining**: 3 (Comment, Notification, Profile)

### After This Plan
- **Dual Adapter Patterns**: 0 ✅
- **All Resolvers**: Use hexagonal architecture with use cases
- **Consistency**: 100% across all domains

### Code Metrics
- **Lines Removed**: ~800 lines (6 adapter files + 6 test files)
- **Resolvers Migrated**: 5 resolvers
- **Architecture Consistency**: 100% (all resolvers use same pattern)

---

## 🎯 Success Criteria

- [ ] commentsResolver migrated to GetCommentsByPost use case
- [ ] notificationsResolver migrated to GetNotifications use case
- [ ] unreadNotificationsCountResolver migrated to GetUnreadNotificationsCount use case
- [ ] profileResolver migrated to GetProfileByHandle use case
- [ ] meResolver migrated to GetCurrentUserProfile use case
- [ ] All 6 legacy adapter files deleted
- [ ] All tests passing
- [ ] Zero references to deleted adapters
- [ ] CODEBASE_ANALYSIS updated
- [ ] Clean git commits with descriptive messages

---

## ⏱️ Estimated Time

**Total: 2-3 hours**
- Step 1 (commentsResolver): 30 minutes
- Step 2-3 (notification resolvers): 30 minutes
- Step 4-5 (profile resolvers): 30 minutes
- Step 6 (delete adapters): 10 minutes
- Step 7 (verify): 10 minutes
- Step 8 (tests): 20 minutes
- Step 9 (documentation): 20 minutes
- Step 10 (git commits): 20 minutes

---

## 🚀 Execution Order

1. Migrate commentsResolver → test
2. Migrate notificationsResolver → test
3. Migrate unreadNotificationsCountResolver → test
4. Migrate profileResolver → test
5. Migrate meResolver → test
6. Delete all 6 legacy adapter files
7. Run full test suite
8. Update CODEBASE_ANALYSIS
9. Create 5 clean git commits
10. Final validation

---

## 📝 Notes

**Why This Matters:**
- The dual adapter pattern creates architectural confusion
- Developers don't know which adapter to use (legacy vs modern)
- Inconsistent error handling across domains
- Makes codebase harder to maintain and extend
- Violates Single Responsibility Principle

**After This Plan:**
- ✅ Zero architectural ambiguity
- ✅ Consistent use case pattern across ALL domains
- ✅ Single source of truth for each domain operation
- ✅ Proper hexagonal architecture throughout
- ✅ Clean, maintainable codebase

This completes Phase 1 anti-pattern cleanup comprehensively!