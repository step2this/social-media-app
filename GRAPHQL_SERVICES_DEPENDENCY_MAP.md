# GraphQL Services Dependency Analysis

## Services Still in Use

### ProfileServiceGraphQL
**Used by:**
- `/packages/frontend/src/components/common/ProfileHoverCard.tsx` (imports profileService)
- `/packages/frontend/src/components/profile/MyProfilePage.tsx` (imports ProfileServiceGraphQL)
- `/packages/frontend/src/components/profile/ProfilePage.tsx` (LEGACY - can be deleted)
- `/packages/frontend/src/services/profileService.ts` (facade)

**Functions used:**
- `getProfileByHandle()` - Load user's profile
- `updateProfile()` - Edit profile (fullName, bio)

**Migration path:**
- Create MyProfilePage.relay.tsx with:
  - Query: `myProfile` (viewer's own profile)
  - Mutation: `updateProfile`
- Update ProfileHoverCard to use Relay
- Delete legacy ProfilePage.tsx (already replaced with ProfilePage.relay.tsx)

**Complexity**: Medium (needs mutation support)

---

### PostServiceGraphQL
**Used by:**
- `/packages/frontend/src/components/posts/createPostAction.ts` (imports PostServiceGraphQL)
- `/packages/frontend/src/components/profile/ProfilePage.tsx` (LEGACY - can be deleted)
- `/packages/frontend/src/services/postService.ts` (facade)

**Functions used:**
- `createPost()` - Create new post with image upload

**Migration path:**
- Create CreatePost.relay.tsx with:
  - Mutation: `createPost`
  - Handle file upload (S3 presigned URL flow)

**Complexity**: High (file upload + complex mutation)

---

### FeedServiceGraphQL
**Used by:**
- `/packages/frontend/src/components/dev/DevManualMarkButton.tsx` (dev tool)
- `/packages/frontend/src/hooks/useFeedItemAutoRead.ts` (auto-read functionality)
- `/packages/frontend/src/services/feedService.ts` (facade)
- `/packages/frontend/src/services/ServiceContainer.ts` (container)

**Functions used:**
- `markFeedItemAsRead()` - Dev utility and auto-read feature

**Migration path:**
- Low priority for DevManualMarkButton (dev tool)
- Migrate useFeedItemAutoRead to use Relay mutation
- Can create Relay mutation when needed

**Complexity**: Low-Medium (simple mutation, but used by hook)

---

### CommentServiceGraphQL
**Used by:**
- `/packages/frontend/src/components/comments/CommentItem.tsx` (imports commentService)
- `/packages/frontend/src/components/comments/CommentForm.tsx` (imports commentService)
- `/packages/frontend/src/components/comments/CommentList.tsx` (imports commentService)
- `/packages/frontend/src/services/commentService.ts` (facade)

**Functions used:**
- `getCommentsByPost()` - Load comments for a post
- `createComment()` - Add new comment
- `deleteComment()` - Remove comment

**Migration path:**
- Create Relay components for comments:
  - CommentList.relay.tsx with query
  - CommentForm.relay.tsx with createComment mutation
  - CommentItem.relay.tsx with deleteComment mutation

**Complexity**: High (multiple components, mutations, and queries)

---

### LikeServiceGraphQL
**Used by:**
- `/packages/frontend/src/hooks/useLike.ts` (imports likeService)
- `/packages/frontend/src/services/likeService.ts` (facade)

**Functions used:**
- `likePost()` - Like a post
- `unlikePost()` - Unlike a post

**Migration path:**
- Create Relay mutations in useLike hook:
  - `likePost` mutation
  - `unlikePost` mutation

**Complexity**: Medium (mutations with optimistic updates)

---

### FollowServiceGraphQL
**Used by:**
- `/packages/frontend/src/hooks/useFollow.ts` (imports followService)
- `/packages/frontend/src/services/followService.ts` (facade)

**Functions used:**
- `followUser()` - Follow a user
- `unfollowUser()` - Unfollow a user

**Migration path:**
- Create Relay mutations in useFollow hook:
  - `followUser` mutation
  - `unfollowUser` mutation

**Complexity**: Medium (mutations with optimistic updates)

---

## Services No Longer Used (Can Be Deleted)

### ✅ NotificationDataServiceGraphQL
**Status**: Only used by service container and facade, NO components use it

**Used by:**
- `/packages/frontend/src/services/ServiceContainer.ts` (imports notificationDataService)
- `/packages/frontend/src/services/notificationDataService.ts` (facade)

**Replacement**: NotificationsPage.relay.tsx, NotificationBellRelay.tsx

**Action**: Can be safely deleted once service container/facade are removed

---

## Legacy Components to Delete

### ✅ ProfilePage.tsx
**Path**: `/packages/frontend/src/components/profile/ProfilePage.tsx`
**Status**: Legacy version, replaced by ProfilePage.relay.tsx
**Used by**: NONE (App.tsx uses ProfilePage.relay.tsx)
**Action**: DELETE immediately

---

## Migration Priority

### High Priority (Core User Features)
1. **PostServiceGraphQL** - createPostAction.ts (post creation)
2. **ProfileServiceGraphQL** - MyProfilePage.tsx (edit profile)
3. **CommentServiceGraphQL** - All comment components (comments CRUD)
4. **LikeServiceGraphQL** - useLike hook (post likes)
5. **FollowServiceGraphQL** - useFollow hook (user follows)

### Medium Priority
1. **FeedServiceGraphQL** - useFeedItemAutoRead (auto-read functionality)

### Low Priority (Dev Tools)
1. **FeedServiceGraphQL** - DevManualMarkButton (dev utility)

---

## Deletion Checklist

Before deleting any GraphQL service, verify:
- [ ] No components import it directly (checked via grep)
- [ ] No hooks use it (checked via grep)
- [ ] Service facade can be deleted or marked for deletion
- [ ] Tests using the service are updated or removed
- [ ] Relay replacement exists and works

---

## Notes

### Why NotificationDataService Can Be Deleted
- NotificationBellRelay.tsx uses Relay queries
- NotificationsPage.relay.tsx uses Relay queries
- NO other components import notificationDataService
- Only service container and facade reference it
- Safe to delete once service container is cleaned up

### Why ProfilePage.tsx Can Be Deleted
- App.tsx imports ProfilePage.relay.tsx (line 5)
- No other components import ProfilePage.tsx
- ProfilePage.relay.tsx provides all the same functionality
- Safe to delete immediately

### Why PostDetailPage.tsx Was Deleted
- App.tsx imports PostDetailPage.relay.tsx (line 10)
- No other components imported PostDetailPage.tsx
- PostDetailPage.relay.tsx provides all the same functionality
- Already deleted in this cycle
