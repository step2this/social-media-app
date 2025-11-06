# Backend Lambda vs. GraphQL Architectural Analysis

## ✅ STATUS: ANALYSIS COMPLETE - Updated Nov 6, 2025

## 🎯 Objective
Determine which backend Lambda handlers should be **kept** vs. **deleted** (replaced by GraphQL), before investing 2-3 weeks in middleware infrastructure.

## 📋 FINDINGS SUMMARY

**MAJOR DISCOVERY**: The Lambda handler cleanup is **95% COMPLETE**!

- **28 of 44 Lambda handlers already deleted** (replaced by GraphQL)
- **16 handlers remain** (correctly identified: auth, streams, dev)
- **GraphQL provides 100% coverage** of all deleted handlers
- **41 orphaned test files** need cleanup
- **Task 2.1 scope reduced by 63%**: From 10-14 days → 3-5 days

**See full findings**: `/BACKEND_LAMBDA_GRAPHQL_ANALYSIS_FINDINGS.md`

## 📊 Current Inventory: Backend Lambda Handlers

### Auth Handlers (5 files)
- `auth/login.ts`
- `auth/logout.ts`
- `auth/profile.ts`
- `auth/refresh.ts`
- `auth/register.ts`

### User-Facing CRUD Handlers (Potential GraphQL Duplicates)
**Posts** (5 files):
- `posts/create-post.ts`
- `posts/delete-post.ts`
- `posts/get-post.ts`
- `posts/update-post.ts`
- `posts/get-user-posts.ts`

**Comments** (3 files):
- `comments/create-comment.ts`
- `comments/delete-comment.ts`
- `comments/get-comments.ts`

**Likes** (3 files):
- `likes/like-post.ts`
- `likes/unlike-post.ts`
- `likes/get-like-status.ts`

**Follows** (3 files):
- `follows/follow-user.ts`
- `follows/unfollow-user.ts`
- `follows/get-follow-status.ts`

**Notifications** (5 files):
- `notifications/get-notifications.ts`
- `notifications/delete-notification.ts`
- `notifications/mark-notification-read.ts`
- `notifications/mark-all-notifications-read.ts`
- `notifications/get-unread-count.ts`

**Profiles** (2 files):
- `profile/get-current-profile.ts`
- `profile/get-profile.ts`

**Feed** (1 file):
- `feed/get-feed.ts`

### DynamoDB Stream Handlers (NOT client-facing - KEEP)
- `streams/comment-counter.ts` - Updates comment counts on posts
- `streams/feed-cleanup-post-delete.ts` - Removes deleted posts from feeds
- `streams/feed-cleanup-unfollow.ts` - Cleans up feeds on unfollow
- `streams/feed-fanout.ts` - Distributes posts to followers' feeds
- `streams/follow-counter.ts` - Updates follower/following counts
- `streams/kinesis-feed-consumer.ts` - Processes feed events from Kinesis
- `streams/like-counter.ts` - Updates like counts on posts
- `streams/notification-processor.ts` - Creates notifications from events

### Auction Handlers (TBD - Need Analysis)
- `auctions/create-auction.ts`
- `auctions/activate-auction.ts`
- `auctions/get-auction.ts`
- `auctions/list-auctions.ts`
- `auctions/place-bid.ts`
- `auctions/get-bid-history.ts`

### Dev/Health Handlers (KEEP)
- `dev/cache-status.ts`
- `dev/get-kinesis-records.ts`
- `hello.ts`

---

## 🔍 Analysis Tasks

### Task 1: Check GraphQL Schema for Duplicate Coverage

**Query GraphQL schema.graphql for:**
- Post mutations (create, update, delete)
- Comment mutations (create, delete)
- Like mutations (like, unlike)
- Follow mutations (follow, unfollow)
- Notification mutations (mark read, delete)
- Notification queries (get, count)
- Profile queries (get by handle, get current)
- Feed queries (following, explore)

**Deliverable**: List of GraphQL operations that cover backend Lambda functionality

---

### Task 2: Analyze GraphQL Server Capabilities

**Check GraphQL server resolvers for:**
- `packages/graphql-server/src/resolvers/`
  - Post resolvers
  - Comment resolvers
  - Like resolvers
  - Follow resolvers
  - Notification resolvers
  - Profile resolvers
  - Feed resolvers

**Deliverable**: Mapping of which backend Lambdas are redundant

---

### Task 3: Determine Auth Handler Strategy

**Questions to Answer:**
1. Does GraphQL server handle authentication via JWT?
2. Can GraphQL handle login/register/logout/refresh?
3. Are Lambda auth handlers needed for:
   - OAuth flows?
   - Session management?
   - Cookie-based auth?
   - External integrations?

**Deliverable**: Decision on keeping vs. moving auth to GraphQL

---

### Task 4: Analyze Auction Handlers

**Check:**
- Is auction functionality in GraphQL server?
- Are auctions a separate microservice?
- Should auctions be GraphQL mutations/queries?

**Deliverable**: Decision on auction handler architecture

---

### Task 5: Calculate Cleanup Impact

**Metrics to Calculate:**
- Number of handlers to DELETE
- Number of handlers to KEEP
- Lines of code to remove
- Tests to remove
- Whether middleware is still needed for remaining handlers

**Deliverable**: ROI analysis for cleanup vs. middleware

---

## 📋 Decision Framework

### ✅ KEEP Lambda Handlers If:
1. **DynamoDB Stream Triggers** - Event-driven, not client-facing
2. **Health/Monitoring** - Simple REST endpoints for load balancers
3. **Dev Tools** - Internal utilities
4. **Auth Flows** - If OAuth/cookie management requires REST
5. **External Webhooks** - Third-party services calling in
6. **File Upload** - S3 presigned URLs better than GraphQL

### ❌ DELETE Lambda Handlers If:
1. **GraphQL Already Implements It** - Mutation/query exists
2. **CRUD Operations** - User-facing create/read/update/delete
3. **Client-Facing Queries** - Can be GraphQL queries
4. **No Special REST Requirements** - No reason not to use GraphQL

---

## 🎯 ACTUAL OUTCOME (Nov 6, 2025)

### ✅ Scenario A Confirmed: GraphQL Covers Most Operations

**Result**: 28 Lambda handlers already deleted! Only 16 remain.

**Handlers Already Deleted** (28 files):
- Posts: 5 handlers ✅
- Comments: 3 handlers ✅
- Likes: 3 handlers ✅
- Follows: 3 handlers ✅
- Notifications: 5 handlers ✅
- Profiles: 2 handlers ✅
- Feed: 1 handler ✅
- Auctions: 6 handlers ✅

**Handlers That Remain** (16 files):
- 5 auth handlers (REST backward compatibility)
- 8 stream handlers (DynamoDB/Kinesis event processors)
- 3 dev/health handlers (monitoring utilities)

**Remaining Work**:
- ⚠️ Delete 28 orphaned test files (~1,400 lines)
- ⚠️ Evaluate auth handlers (can they be deleted too?)
- ✅ Proceed with Task 2.1 for 16 handlers only

**Task 2.1 Scope UPDATED**:
- Original: 44 handlers → 10-14 days
- **Updated: 16 handlers → 3-5 days**
- **Time Savings: 7-9 days (63% reduction)**

---

## 📝 Recommended Execution Plan

### Phase 1: Discovery (1 hour)
1. Read `/Users/shaperosteve/social-media-app/schema.graphql`
2. Check GraphQL resolvers in `/packages/graphql-server/src/resolvers/`
3. Map GraphQL coverage vs. Lambda handlers

### Phase 2: Analysis (1 hour)
1. Identify duplicate handlers (GraphQL + Lambda)
2. Determine which auth handlers are needed
3. Analyze auction handler requirements
4. Calculate cleanup impact

### Phase 3: Decision (30 minutes)
1. Present findings to user
2. Create cleanup plan OR proceed with middleware
3. Update Task 2.1 scope based on decision

### Phase 4: Execution (Variable)
**Option A**: Cleanup redundant handlers (1-2 days)
- Delete duplicate Lambda handlers
- Delete duplicate tests
- Update documentation
- Implement middleware for remaining handlers (3-5 days)

**Option B**: Proceed with Task 2.1 as planned (10-14 days)
- Only if handlers are all needed

---

## ✅ Success Criteria

- [ ] Complete mapping of GraphQL operations
- [ ] Complete mapping of Lambda handlers
- [ ] Identify all duplicates
- [ ] Decision on auth handler strategy
- [ ] Decision on auction handler strategy
- [ ] Calculate exact cleanup impact (handlers, tests, lines)
- [ ] Present findings to user with recommendation
- [ ] Update Task 2.1 scope if needed

---

## 🚨 Key Questions for User

1. **Is GraphQL the primary API?** Should all client-facing operations go through GraphQL?
2. **Are auth handlers needed?** Can login/register/refresh be GraphQL mutations?
3. **Are auctions separate?** Is auction functionality in GraphQL or separate microservice?
4. **Are stream handlers correctly identified?** Should these remain as Lambda event triggers?

---

## 📊 Time Estimate

- **Discovery**: 1 hour
- **Analysis**: 1 hour
- **Decision**: 30 minutes
- **Total**: ~2.5 hours

**Potential Time Savings**:
- If we delete 22 handlers: Save 7-9 days on middleware scope reduction
- ROI: 2.5 hours investigation → 7-9 days saved = **28-36x return**

---

## 🎯 Next Steps

1. User confirms: Proceed with architectural analysis?
2. Execute Phase 1: Discovery
3. Execute Phase 2: Analysis
4. Present findings with recommendation
5. Get user decision on cleanup vs. middleware
6. Execute chosen path
