# Phase 2: Component Replacement & Cleanup

## Goal
Replace all `.relay` suffix components with main versions, update imports, and clean up old service files.

## Current State (Phase 1 Complete ✅)
- ✅ All 5 hooks migrated to Relay
- ✅ Relay component versions exist with `.relay` suffix
- ❌ Old components deleted but `.relay` suffix still present
- ❌ Service layer files still exist

## Phase 2 Scope

### Pages to Replace (2 files)
1. `/packages/frontend/src/pages/HomePage.relay.tsx` → `HomePage.tsx`
2. `/packages/frontend/src/pages/NotificationsPage.relay.tsx` → `NotificationsPage.tsx`

### Components to Replace (7 files)
1. `/packages/frontend/src/components/explore/ExplorePage.relay.tsx` → `ExplorePage.tsx`
2. `/packages/frontend/src/components/posts/CreatePostPage.relay.tsx` → `CreatePostPage.tsx`
3. `/packages/frontend/src/components/posts/PostDetailPage.relay.tsx` → `PostDetailPage.tsx`
4. `/packages/frontend/src/components/posts/PostCard.relay.tsx` → `PostCard.tsx`
5. `/packages/frontend/src/components/profile/ProfilePage.relay.tsx` → `ProfilePage.tsx`
6. `/packages/frontend/src/components/profile/MyProfilePage.relay.tsx` → `MyProfilePage.tsx`
7. `/packages/frontend/src/components/comments/CommentForm.relay.tsx` → `CommentForm.tsx`

### Sub-components (3 files)
1. `/packages/frontend/src/components/feed/FeedPost.relay.tsx` → `FeedPost.tsx`
2. `/packages/frontend/src/components/notifications/NotificationBellRelay.tsx` → `NotificationBell.tsx`
3. `/packages/frontend/src/components/notifications/NotificationItemRelay.tsx` → `NotificationItem.tsx`

**Total:** 12 components to replace

---

## Strategy

### Step 1: Rename Components (Remove `.relay` suffix)
For each component:
1. Rename file (remove `.relay` suffix)
2. Update component names inside file (remove `Relay` suffix from exports)
3. Update test files (remove `.relay` suffix)
4. Update imports in test files

### Step 2: Update Imports Across App
Search and replace imports:
- `from './HomePage.relay'` → `from './HomePage'`
- `from './ExplorePage.relay'` → `from './ExplorePage'`
- etc.

Key files that import components:
- `/packages/frontend/src/App.tsx` (routing)
- Various test files
- Parent components

### Step 3: Clean Up Service Layer
Remove old REST service files that are no longer used:
- Delete implementation files (e.g., `FeedService.graphql.ts`)
- Update barrel exports
- Remove from ServiceContainer if still referenced

### Step 4: Verify & Test
- Run all tests
- Check for broken imports
- Verify app still works

---

## Detailed Steps

### Phase 2.1: Pages (2 files)

#### HomePage
```bash
# Rename files
mv packages/frontend/src/pages/HomePage.relay.tsx \
   packages/frontend/src/pages/HomePage.tsx

mv packages/frontend/src/pages/HomePage.relay.test.tsx \
   packages/frontend/src/pages/HomePage.test.tsx

# Update test import
# In HomePage.test.tsx: './HomePage.relay' → './HomePage'
```

#### NotificationsPage
```bash
# Rename files
mv packages/frontend/src/pages/NotificationsPage.relay.tsx \
   packages/frontend/src/pages/NotificationsPage.tsx

mv packages/frontend/src/pages/NotificationsPage.relay.test.tsx \
   packages/frontend/src/pages/NotificationsPage.test.tsx

# Update test import
# In NotificationsPage.test.tsx: './NotificationsPage.relay' → './NotificationsPage'
```

### Phase 2.2: Main Components (7 files)

#### ExplorePage
```bash
mv packages/frontend/src/components/explore/ExplorePage.relay.tsx \
   packages/frontend/src/components/explore/ExplorePage.tsx

mv packages/frontend/src/components/explore/ExplorePage.relay.test.tsx \
   packages/frontend/src/components/explore/ExplorePage.test.tsx
```

#### CreatePostPage
```bash
mv packages/frontend/src/components/posts/CreatePostPage.relay.tsx \
   packages/frontend/src/components/posts/CreatePostPage.tsx

# No test file for CreatePostPage
```

#### PostDetailPage
```bash
mv packages/frontend/src/components/posts/PostDetailPage.relay.tsx \
   packages/frontend/src/components/posts/PostDetailPage.tsx

mv packages/frontend/src/components/posts/PostDetailPage.relay.test.tsx \
   packages/frontend/src/components/posts/PostDetailPage.test.tsx
```

#### PostCard
```bash
mv packages/frontend/src/components/posts/PostCard.relay.tsx \
   packages/frontend/src/components/posts/PostCard.tsx

# Check for test file
```

#### ProfilePage
```bash
mv packages/frontend/src/components/profile/ProfilePage.relay.tsx \
   packages/frontend/src/components/profile/ProfilePage.tsx

mv packages/frontend/src/components/profile/ProfilePage.relay.test.tsx \
   packages/frontend/src/components/profile/ProfilePage.test.tsx
```

#### MyProfilePage
```bash
mv packages/frontend/src/components/profile/MyProfilePage.relay.tsx \
   packages/frontend/src/components/profile/MyProfilePage.tsx

# Check for test file
```

#### CommentForm
```bash
mv packages/frontend/src/components/comments/CommentForm.relay.tsx \
   packages/frontend/src/components/comments/CommentForm.tsx

# Test file already exists (CommentForm.test.tsx)
```

### Phase 2.3: Sub-components (3 files)

#### FeedPost
```bash
mv packages/frontend/src/components/feed/FeedPost.relay.tsx \
   packages/frontend/src/components/feed/FeedPost.tsx
```

#### NotificationBell
```bash
mv packages/frontend/src/components/notifications/NotificationBellRelay.tsx \
   packages/frontend/src/components/notifications/NotificationBell.tsx

mv packages/frontend/src/components/notifications/NotificationBellRelay.test.tsx \
   packages/frontend/src/components/notifications/NotificationBell.test.tsx
```

#### NotificationItem
```bash
mv packages/frontend/src/components/notifications/NotificationItemRelay.tsx \
   packages/frontend/src/components/notifications/NotificationItem.tsx

# Update NotificationItem.tsx if it has "Relay" in component name
```

### Phase 2.4: Update Imports in App.tsx

Main routing file needs updates:

```typescript
// Before:
import { HomePage } from './pages/HomePage.relay';
import { ExplorePage } from './components/explore/ExplorePage.relay';
import { NotificationsPage } from './pages/NotificationsPage.relay';
import { ProfilePage } from './components/profile/ProfilePage.relay';
import { MyProfilePage } from './components/profile/MyProfilePage.relay';
import { CreatePostPage } from './components/posts/CreatePostPage.relay';
import { PostDetailPage } from './components/posts/PostDetailPage.relay';

// After:
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './components/explore/ExplorePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './components/profile/ProfilePage';
import { MyProfilePage } from './components/profile/MyProfilePage';
import { CreatePostPage } from './components/posts/CreatePostPage';
import { PostDetailPage } from './components/posts/PostDetailPage';
```

### Phase 2.5: Update Component Names (Remove `Relay` suffix)

Some components may have `Relay` in their export names:

**Example:**
```typescript
// Before:
export const HomePageRelay = () => { ... };

// After:
export const HomePage = () => { ... };
```

**Files to check:**
- HomePage.tsx (likely has `HomePageRelay`)
- ExplorePage.tsx (likely has `ExplorePageRelay`)
- NotificationsPage.tsx (likely has `NotificationsPageRelay`)
- PostDetailPage.tsx (likely has `PostDetailPageRelay`)
- ProfilePage.tsx (likely has `ProfilePageRelay`)
- CreatePostPage.tsx (likely has `CreatePostPageRelay`)

### Phase 2.6: Update Test Files

For each renamed test file, update imports:

```typescript
// Before:
import { HomePageRelay } from './HomePage.relay';

// After:
import { HomePage } from './HomePage';
```

### Phase 2.7: Run Relay Compiler

After all renames, regenerate Relay types:

```bash
cd packages/frontend && npm run relay
```

This ensures all generated files have correct names.

### Phase 2.8: Service Layer Cleanup

Remove old service implementation files (already deleted, just confirm):

```bash
# These should already be deleted:
# - FeedService.graphql.ts
# - ProfileService.graphql.ts
# - PostService.graphql.ts
# - CommentService.graphql.ts
# - LikeService.graphql.ts
# - AuctionService.graphql.ts
# - FollowService.graphql.ts
# - NotificationDataService.graphql.ts
```

Update barrel exports if they still reference these files.

---

## Git Commits

### Commit 1: Rename pages
```bash
git add packages/frontend/src/pages/HomePage.tsx \
        packages/frontend/src/pages/HomePage.test.tsx \
        packages/frontend/src/pages/NotificationsPage.tsx \
        packages/frontend/src/pages/NotificationsPage.test.tsx

git commit -m "refactor(pages): Remove .relay suffix from page components

- Rename HomePage.relay.tsx → HomePage.tsx
- Rename HomePage.relay.test.tsx → HomePage.test.tsx
- Rename NotificationsPage.relay.tsx → NotificationsPage.tsx
- Rename NotificationsPage.relay.test.tsx → NotificationsPage.test.tsx
- Update test imports to remove .relay suffix

These are now the main page components (no parallel versions)

Phase 2: Component Replacement (Step 1/4)"
```

### Commit 2: Rename main components
```bash
git add packages/frontend/src/components/

git commit -m "refactor(components): Remove .relay suffix from main components

- Rename ExplorePage.relay.tsx → ExplorePage.tsx
- Rename CreatePostPage.relay.tsx → CreatePostPage.tsx
- Rename PostDetailPage.relay.tsx → PostDetailPage.tsx
- Rename PostCard.relay.tsx → PostCard.tsx
- Rename ProfilePage.relay.tsx → ProfilePage.tsx
- Rename MyProfilePage.relay.tsx → MyProfilePage.tsx
- Rename CommentForm.relay.tsx → CommentForm.tsx
- Update component names (remove Relay suffix from exports)
- Update test files and imports

Phase 2: Component Replacement (Step 2/4)"
```

### Commit 3: Rename sub-components
```bash
git add packages/frontend/src/components/

git commit -m "refactor(components): Remove .relay suffix from sub-components

- Rename FeedPost.relay.tsx → FeedPost.tsx
- Rename NotificationBellRelay.tsx → NotificationBell.tsx
- Rename NotificationItemRelay.tsx → NotificationItem.tsx
- Update component names and imports
- Update test files

Phase 2: Component Replacement (Step 3/4)"
```

### Commit 4: Update App.tsx imports
```bash
git add packages/frontend/src/App.tsx

git commit -m "refactor(routing): Update App.tsx to use new component names

- Remove .relay suffix from all component imports
- Update route references
- All routes now use main Relay-based components

Phase 2: Component Replacement (Step 4/4 - COMPLETE)"
```

### Commit 5: Update Relay generated files
```bash
git add packages/frontend/src/**/__generated__/

git commit -m "chore(relay): Regenerate Relay types after component renames

- Run relay compiler to regenerate all GraphQL types
- Generated files now match new component names
- No .relay suffix in generated filenames

Phase 2: Cleanup"
```

### Commit 6: Documentation
```bash
git add phase_2_component_replacement.plan.md \
        RELAY_MIGRATION_AUDIT.md

git commit -m "docs: Complete Phase 2 component replacement documentation

- Phase 2 plan with detailed steps
- Update RELAY_MIGRATION_AUDIT.md progress
- All 12 components successfully migrated
- Remove .relay suffix from all production code

Phase 2: 100% COMPLETE

Progress: Phase 1 (100%) + Phase 2 (100%) = 2/3 phases complete"
```

---

## Success Criteria

- ✅ All 12 components renamed (no `.relay` suffix)
- ✅ All test files updated
- ✅ App.tsx imports updated
- ✅ All tests passing
- ✅ Relay compiler generates correct files
- ✅ App runs without errors
- ✅ No `.relay` suffix in production code

---

## Verification Checklist

```bash
# 1. Check for remaining .relay files
find packages/frontend/src -name "*.relay.tsx" -o -name "*.relay.ts"
# Should return: NO FILES

# 2. Check for Relay suffix in exports
grep -r "export.*Relay" packages/frontend/src/pages packages/frontend/src/components
# Should return: MINIMAL RESULTS (only in relay-test-utils, etc.)

# 3. Run all tests
cd packages/frontend && npm test

# 4. Run app
cd packages/frontend && npm run dev
# Navigate to all pages and verify they work

# 5. Check for broken imports
npm run typecheck
```

---

## Estimated Time

- Phase 2.1 (Pages): 10 minutes
- Phase 2.2 (Main Components): 20 minutes
- Phase 2.3 (Sub-components): 10 minutes
- Phase 2.4-2.5 (Update imports/names): 15 minutes
- Phase 2.6 (Test files): 10 minutes
- Phase 2.7-2.8 (Compiler/cleanup): 10 minutes
- Git commits & verification: 15 minutes

**Total:** ~90 minutes (1.5 hours)

---

## Next Phase Preview

After Phase 2, Phase 3 will involve:
- Final service layer cleanup
- Remove unused barrel exports
- Update documentation
- Performance optimization
- Final quality tune-up

But first... let's complete Phase 2! 🚀
