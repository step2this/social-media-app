# GraphQL Services Cleanup Status

## ✅ Deleted (Frontend Services and Legacy Components)

These frontend services and components were deleted after migrating to Relay:

### Legacy Components Deleted in Cycle 7
- **PostDetailPage.tsx** → Replaced by PostDetailPage.relay.tsx
  - Deleted: Cycle 7
  - Reason: App.tsx uses Relay version (PostDetailPageRelay)
  - Verified: No imports found in codebase

- **ProfilePage.tsx** → Replaced by ProfilePage.relay.tsx
  - Deleted: Cycle 7
  - Reason: App.tsx uses Relay version (ProfilePageRelay)
  - Verified: No imports found in codebase

### Legacy Components Deleted in Previous Cycles
- **HomePage.tsx** → Replaced by HomePage.relay.tsx
- **ExplorePage.tsx** → Replaced by ExplorePage.relay.tsx
- **NotificationsPage.tsx** → Replaced by NotificationsPage.relay.tsx

---

## ❌ Must Keep (Backend Resolvers)

These backend files are CRITICAL and must NOT be deleted:

### /packages/graphql-server/src/schema/resolvers/Query.ts
**Why**: Backend GraphQL API resolvers that Relay queries hit
**Used by**: All Relay components (HomePage.relay, ExplorePage.relay, PostDetailPage.relay, ProfilePage.relay, NotificationsPage.relay)
**Status**: ✅ ACTIVE - serves Relay queries
**Documentation**: Added critical "DO NOT DELETE" warning in Cycle 7

### /packages/graphql-server/src/schema/resolvers/*.ts
**Why**: Backend resolvers for GraphQL types (Post, User, Comment, etc.)
**Used by**: Relay queries and mutations
**Status**: ✅ ACTIVE - serves Relay queries

### /schema.graphql
**Why**: GraphQL schema that defines API contract
**Used by**: Relay compiler, backend resolvers
**Status**: ✅ ACTIVE - source of truth for GraphQL API

---

## ⏳ Pending Migration (High Priority)

These frontend services are still used and awaiting migration:

### PostService.graphql.ts
**Used by:**
- `/packages/frontend/src/components/posts/createPostAction.ts`

**Migration**: Needs Relay mutation for createPost
**Priority**: 🔴 High (core user feature)
**Status**: Migration warning added to facade

### ProfileService.graphql.ts
**Used by:**
- `/packages/frontend/src/components/profile/MyProfilePage.tsx`
- `/packages/frontend/src/components/common/ProfileHoverCard.tsx`

**Migration**: Needs MyProfilePage.relay.tsx and ProfileHoverCard.relay.tsx
**Priority**: 🔴 High (core user feature)
**Status**: Migration warning added to facade

### CommentService.graphql.ts
**Used by:**
- `/packages/frontend/src/components/comments/CommentItem.tsx`
- `/packages/frontend/src/components/comments/CommentForm.tsx`
- `/packages/frontend/src/components/comments/CommentList.tsx`

**Migration**: Needs Relay components for all comment functionality
**Priority**: 🔴 High (core user feature)
**Status**: Migration warning added to facade

### LikeService.graphql.ts
**Used by:**
- `/packages/frontend/src/hooks/useLike.ts`

**Migration**: Needs Relay mutations in useLike hook
**Priority**: 🔴 High (core user feature)
**Status**: Migration warning added to facade

### FollowService.graphql.ts
**Used by:**
- `/packages/frontend/src/hooks/useFollow.ts`

**Migration**: Needs Relay mutations in useFollow hook
**Priority**: 🔴 High (core user feature)
**Status**: Migration warning added to facade

---

## ⏳ Pending Migration (Medium/Low Priority)

### FeedService.graphql.ts
**Used by:**
- `/packages/frontend/src/components/dev/DevManualMarkButton.tsx` (dev tool)
- `/packages/frontend/src/hooks/useFeedItemAutoRead.ts` (auto-read feature)

**Migration**: Needs Relay mutations for markAsRead
**Priority**: 🟡 Medium (useFeedItemAutoRead), 🟢 Low (DevManualMarkButton)
**Status**: Migration warning added to facade

---

## ⚠️ Can Be Deleted (When Service Container Is Cleaned Up)

### NotificationDataService.graphql.ts
**Used by:**
- `/packages/frontend/src/services/ServiceContainer.ts` (container only)
- `/packages/frontend/src/services/notificationDataService.ts` (facade only)

**Replacement**: NotificationsPage.relay.tsx, NotificationBellRelay.tsx
**Priority**: 🟢 Low (cleanup task)
**Status**: NO components use it directly
**Action**: Can be deleted once service container references are removed

---

## 📊 Migration Progress Summary

### Components Migrated to Relay ✅
- HomePage → HomePage.relay.tsx
- ExplorePage → ExplorePage.relay.tsx
- PostDetailPage → PostDetailPage.relay.tsx ✅ (legacy deleted in Cycle 7)
- ProfilePage → ProfilePage.relay.tsx ✅ (legacy deleted in Cycle 7)
- NotificationsPage → NotificationsPage.relay.tsx
- NotificationBell → NotificationBellRelay.tsx

### Components Still Using GraphQL Services ❌
- MyProfilePage (ProfileService)
- ProfileHoverCard (ProfileService)
- createPostAction (PostService)
- CommentItem, CommentForm, CommentList (CommentService)
- useLike hook (LikeService)
- useFollow hook (FollowService)
- DevManualMarkButton (FeedService) - dev tool
- useFeedItemAutoRead (FeedService)

### Overall Progress
- **Pages Migrated**: 5/6 (83%)
- **Remaining Core Features**: Post creation, Comments, Likes, Follows, Profile edit
- **Backend Resolvers**: ✅ KEEP FOREVER (documented in Cycle 7)

---

## 📝 Key Learnings from Cycle 7

### What We Discovered
1. **Legacy Components**: Found ProfilePage.tsx alongside ProfilePage.relay.tsx (similar to PostDetailPage)
2. **Service Dependencies**: Comprehensive mapping revealed which services are truly unused
3. **Backend vs Frontend**: Clearly documented that backend resolvers (Query.ts) must stay

### What We Clarified
- **Frontend Services** (FeedService.graphql.ts, etc.) → Can be deleted after migration
- **Backend Resolvers** (Query.ts, Post.ts, etc.) → Must keep forever (Relay depends on them)
- **GraphQL Schema** (schema.graphql) → Must keep forever (API contract)

### What We Documented
1. Added critical "DO NOT DELETE" warning to Query.ts
2. Created GRAPHQL_SERVICES_DEPENDENCY_MAP.md with complete dependency analysis
3. Added migration warnings to all service facade files
4. Created deletion verification test

---

## 🎯 Next Steps (Cycle 8 and Beyond)

### Cycle 8: Migrate Remaining High-Priority Features
1. **MyProfilePage**: Create MyProfilePage.relay.tsx with mutations
2. **Comments**: Create Relay components for comment CRUD
3. **Likes/Follows**: Create Relay mutations in hooks
4. **Post Creation**: Migrate createPostAction to Relay mutation

### Cycle 9: Final Cleanup
1. Delete ALL frontend GraphQL services (once no dependencies remain)
2. Delete service facade files (feedService.ts, postService.ts, etc.)
3. Delete service container references to old services
4. Achieve 100% Relay migration

### Long-Term Architecture
- **Frontend**: 100% Relay (queries, mutations, subscriptions)
- **Backend**: GraphQL resolvers serving Relay (Query.ts, Mutation.ts, etc.)
- **Schema**: Single source of truth (schema.graphql)

---

## Summary

### ✅ What Changed in Cycle 7
- Deleted legacy PostDetailPage.tsx
- Deleted legacy ProfilePage.tsx
- Documented Query.ts with critical warning
- Created dependency analysis document
- Added migration warnings to service facades
- Created deletion verification test

### 📌 Critical Reminders
1. **NEVER delete Query.ts or other backend resolvers** - Relay depends on them!
2. **Only delete frontend services** - Backend stays intact
3. **Verify zero dependencies** before deleting any service
4. **Update documentation** as services are migrated

### 🎉 Achievements
- **2 legacy components deleted** (PostDetailPage.tsx, ProfilePage.tsx)
- **Backend resolvers documented** with clear warnings
- **Service dependencies mapped** comprehensively
- **Migration warnings added** to all active services
- **Deletion verification** in place via tests

---

## References
- **Dependency Map**: See GRAPHQL_SERVICES_DEPENDENCY_MAP.md
- **Backend Resolvers**: See packages/graphql-server/src/schema/resolvers/Query.ts
- **Migration Plan**: See relay_cleanup_cycle_7.plan.md
- **Deletion Test**: See packages/frontend/src/__tests__/graphql-services-deleted.test.ts
