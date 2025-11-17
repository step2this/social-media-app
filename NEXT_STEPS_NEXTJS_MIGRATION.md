# Next.js Migration - Current Status & Next Steps

**Last Updated:** 2025-11-13 (Session 2 - Logging + Interactive Likes Complete)
**Branch:** `claude/nextjs-migration-review-011CV5pwJyQPm6G9wAVahXe6`

---

## 🎉 What's Been Completed

### Backend Enhancements (Phase 1 - GraphQL Server)
✅ **Drizzle ORM Migration** - Type-safe PostgreSQL operations for auctions
✅ **Pothos Relay Plugin** - Standardized pagination across all GraphQL types
✅ **Pothos Tracing Plugin** - Resolver performance monitoring
📄 See: `PHASE_1_COMPLETE.md`

### Next.js Migration Progress

✅ **Phase 0: Foundation & Setup** (COMPLETE)
- Next.js 15 app structure created in `apps/web/`
- Workspace configuration updated
- Environment variables configured
- Testing setup with Vitest
- Next.js builds successfully ✨

✅ **Phase 1: Route Structure** (COMPLETE)
- All page routes created
- Layouts implemented (root, auth, app)
- Route groups configured ((auth), (app))

✅ **Phase 2: Authentication & API Routes** (COMPLETE)
- Server-side auth utilities
- API routes: login, register, logout, refresh
- Auth forms (LoginForm, RegisterForm)
- Middleware for protected routes

✅ **Phase 3: Layout Components** (COMPLETE)
- Sidebar component
- Header component
- Design system CSS imported
- Global styles configured

✅ **Phase 4: GraphQL Integration** (COMPLETE)
- GraphQL client for Server Components
- Feed queries implemented
- PostCard component with real data
- Server-side data fetching working

✅ **Phase 5.1: Interactive Post Components** (COMPLETE) 🆕
- Server Actions for like/unlike posts
- Optimistic UI updates for likes
- LikeButton component with real-time feedback
- Tests with dependency injection pattern

✅ **Phase 5.2: Profile Pages & Social Interactions** (COMPLETE) 🆕
- Dynamic profile loading by handle
- ProfileHeader component with user stats
- Follow/unfollow Server Actions
- FollowButton with optimistic updates
- Follow status fetching
- Own profile vs other profile handling

✅ **Production Logging & Observability** (COMPLETE) 🆕
- Pino structured JSON logging
- Logger utilities for Next.js and GraphQL server
- Logging added to all pages, API routes, and Server Actions
- Helper functions (logAuth, logServerAction, logGraphQL)
- Documentation (LOGGING_USAGE_GUIDE.md)

---

## 📊 Current Architecture

```
social-media-app/
├── apps/
│   └── web/                    # ✅ Next.js 15 App (NEW)
│       ├── app/
│       │   ├── (auth)/         # Login, Register
│       │   ├── (app)/          # Feed, Profile, etc.
│       │   └── api/auth/       # Auth API routes
│       ├── components/
│       │   ├── auth/           # LoginForm, RegisterForm
│       │   ├── layout/         # Sidebar, Header
│       │   └── posts/          # PostCard
│       └── lib/
│           ├── auth/           # Session, cookies, service
│           └── graphql/        # Client, queries, types
├── packages/
│   ├── frontend/               # ⚠️ Old Vite app (TO BE DEPRECATED)
│   ├── graphql-server/         # ✅ Apollo Server (ENHANCED)
│   ├── shared/                 # ✅ Built for Next.js
│   ├── dal/                    # ✅ Built for Next.js
│   └── auth-utils/             # ✅ Built for Next.js
```

---

## 🎯 What's Working Now

### ✅ Completed Features
- **Authentication Flow**: Login, register, logout, token refresh
- **Protected Routes**: Middleware redirects unauthenticated users
- **Server Components**: Feed page loads posts from GraphQL
- **GraphQL Integration**: Server-side data fetching with auth tokens
- **Layouts**: Root, auth, and app layouts with proper styling
- **API Routes**: Auth endpoints working

### ⚠️ Partially Complete
- **Feed Page**: Loads data but needs better error handling
- **Components**: PostCard exists, but needs interactivity (likes, comments)

### ❌ Not Started
- Most core functionality (see Phase 5 below)

---

## 🚀 Next Steps: Phase 5 - Complete Feature Migration

### Priority 1: Core User Interactions (Week 1)

#### 1.1 Interactive Post Components ✅ PARTIALLY COMPLETE
**Files created/updated:**
- ✅ `components/posts/LikeButton.tsx` - Interactive like button with optimistic updates
- ✅ `app/actions/posts.ts` - Server Actions for post mutations (like/unlike)
- ✅ `components/posts/PostCard.tsx` - Updated with LikeButton integration
- ⏸️ `components/posts/CommentButton.tsx` - Comment interaction (NOT STARTED)

**Tasks:**
- ✅ Create Server Actions for likePost, unlikePost
- ✅ Add optimistic UI updates for likes
- ✅ Test mutations work with auth
- ✅ Add comprehensive tests with dependency injection
- [ ] Create comment form component
- [ ] Add comment posting functionality

#### 1.2 Profile Pages ✅ COMPLETE
**Files created/updated:**
- ✅ `app/(app)/profile/[handle]/page.tsx` - Dynamic profile loading with follow status
- ✅ `components/profile/ProfileHeader.tsx` - Profile info, stats, follow button
- ✅ `components/profile/FollowButton.tsx` - Interactive follow button with optimistic updates
- ✅ `app/actions/follows.ts` - Server Actions for follow/unfollow
- ⏸️ `components/profile/ProfileTabs.tsx` - Posts/Following/Followers tabs (DEFERRED)

**Tasks:**
- ✅ Implement GET_PROFILE query
- ✅ Add follow/unfollow mutations with GraphQL
- ✅ Add GET_FOLLOW_STATUS query
- ✅ Implement optimistic UI updates for follow button
- ✅ Handle own profile vs other profiles
- ✅ Error handling for missing profiles
- [ ] Create profile posts grid (DEFERRED)
- [ ] Add tabs for posts/followers/following (DEFERRED)

#### 1.3 Post Creation
**Files to create/update:**
- `app/(app)/create/page.tsx` - Create post page
- `components/posts/CreatePostForm.tsx` - Form with image upload
- `app/actions/posts.ts` - createPost Server Action
- `lib/upload/s3.ts` - S3 upload helper

**Tasks:**
- [ ] Create post form with validation
- [ ] Implement image upload to S3
- [ ] Add preview before posting
- [ ] Add success/error states
- [ ] Redirect to feed after posting

### Priority 2: Enhanced Pages (Week 2)

#### 2.1 Post Detail Page
**Files to update:**
- `app/(app)/post/[postId]/page.tsx` - Full post with comments
- `components/posts/CommentList.tsx` - List of comments
- `components/posts/CommentForm.tsx` - Add comment form

**Tasks:**
- [ ] Load post with comments
- [ ] Add comment pagination
- [ ] Enable comment posting
- [ ] Add delete comment (if owner)

#### 2.2 Explore Page
**Files to update:**
- `app/(app)/explore/page.tsx` - Explore feed implementation

**Tasks:**
- [ ] Implement GET_EXPLORE_FEED query
- [ ] Add infinite scroll or pagination
- [ ] Add loading states

#### 2.3 Notifications
**Files to update:**
- `app/(app)/notifications/page.tsx` - Notifications list
- `components/notifications/NotificationItem.tsx` - Individual notification

**Tasks:**
- [ ] Load notifications from GraphQL
- [ ] Mark notifications as read
- [ ] Group by type (likes, comments, follows)

### Priority 3: Settings & Profile Management (Week 3)

#### 3.1 Settings Page
**Files to update:**
- `app/(app)/settings/page.tsx` - Settings forms
- `components/settings/ProfileEditForm.tsx` - Edit profile
- `components/settings/PasswordChangeForm.tsx` - Change password

**Tasks:**
- [ ] Edit profile (name, bio, avatar)
- [ ] Change password
- [ ] Account settings

### Priority 4: Production Logging & Observability ✅ COMPLETE

**Status:** ✅ **Phase 1 Complete** - Pino logging implemented across entire application

**Goal:** Replace console.log with production-ready logging and monitoring

#### 4.0 Logging Implementation (Phase 1: Structured Logging) ✅ DONE
**Files created:**
- ✅ `apps/web/lib/logger.ts` - Pino logger setup for Next.js
- ✅ `packages/graphql-server/src/lib/logger.ts` - Pino logger for GraphQL server
- ✅ `LOGGING_USAGE_GUIDE.md` - Complete usage documentation
- ⏸️ `instrumentation.ts` - OpenTelemetry config (DEFERRED - Phase 2)
- ⏸️ `sentry.client.config.ts` - Sentry client config (DEFERRED - Phase 2)
- ⏸️ `sentry.server.config.ts` - Sentry server config (DEFERRED - Phase 2)

**Tasks:**
- ✅ Install Pino (`pnpm add pino pino-pretty`)
- ✅ Create structured logger utility
- ✅ Replace console.log in Server Actions
- ✅ Replace console.log in API routes
- ✅ Replace console.log in Server Components (pages)
- ✅ Add logging to middleware (all requests)
- ✅ Add logging to public pages (login/register)
- ✅ Configure log levels by environment
- ✅ Test JSON output (default format)
- ✅ Add helper functions (logAuth, logServerAction, logGraphQL)
- ✅ Fix pino-pretty worker thread issues (JSON default, pretty optional)
- [ ] Add OpenTelemetry instrumentation (DEFERRED - Phase 2)
- [ ] Set up Sentry for error tracking (DEFERRED - Phase 2)

**See:**
- `LOGGING_OBSERVABILITY_RESEARCH.md` for detailed recommendations
- `LOGGING_USAGE_GUIDE.md` for how to use logging

**Phase 1 Stack (Implemented):**
- ✅ **Pino** - Fast structured JSON logging (5x faster than Winston)
- ✅ **Helper utilities** - logAuth, logServerAction, logGraphQL
- ✅ **Strategic placement** - Entry points, errors, business logic

**Phase 2 Stack (Future):**
- ⏸️ **OpenTelemetry** - Distributed tracing (Next.js 15 built-in)
- ⏸️ **Sentry** - Error tracking with session replay

---

### Priority 5: Optimization & Polish (Week 4)

#### 5.1 Loading States
**Files to create:**
- `app/(app)/loading.tsx` - Loading UI
- `components/ui/LoadingSpinner.tsx` - Spinner component
- `components/ui/Skeleton.tsx` - Skeleton screens

**Tasks:**
- [ ] Add loading.tsx for all routes
- [ ] Implement skeleton screens
- [ ] Add Suspense boundaries

#### 4.2 Error Handling
**Files to create:**
- `app/(app)/error.tsx` - Error boundary
- `app/not-found.tsx` - 404 page
- `components/ui/ErrorMessage.tsx` - Error display

**Tasks:**
- [ ] Add error boundaries
- [ ] Create 404 page
- [ ] Add error logging (Sentry?)

#### 4.3 Image Optimization
**Tasks:**
- [ ] Replace all `<img>` with Next.js `<Image>`
- [ ] Add blur placeholders
- [ ] Configure remote patterns for S3

#### 4.4 SEO & Metadata
**Tasks:**
- [ ] Add dynamic metadata for posts
- [ ] Add Open Graph tags
- [ ] Create sitemap.ts
- [ ] Create robots.ts

---

## 🔧 Development Workflow

### Starting the Development Environment

```bash
# Terminal 1: Start GraphQL server
pnpm run dev:graphql-server

# Terminal 2: Start Next.js dev server
pnpm run dev:web

# Or run both together:
pnpm run dev:nextjs
```

### Building for Production

```bash
# Build workspace packages first
pnpm --filter=@social-media-app/shared build
pnpm --filter=@social-media-app/dal build
pnpm --filter=@social-media-app/auth-utils build

# Then build Next.js
pnpm --filter=@social-media-app/web build
```

### Testing

```bash
# Test Next.js app
pnpm --filter=@social-media-app/web test

# Test all packages
pnpm test
```

---

## 📋 Migration Checklist Reference

See `MIGRATION_CHECKLIST.md` for the complete checklist.

**Current Progress:**
- ✅ Phase 0: Preparation & Setup (100%)
- ✅ Phase 1: Next.js Foundation (100%)
- ✅ Phase 2: Auth & API Routes (100%)
- ✅ Phase 3: Layout Components (100%)
- ✅ Phase 4: GraphQL Integration (100%)
- 🚧 Phase 5: Feature Completion (55% - likes & follows done, post creation & comments pending)
- ✅ Production Logging (100% - Phase 1 complete)
- ⏸️ Phase 6: Optimization & Polish (0%)
- ⏸️ Phase 7: Deployment (0%)

---

## 🚨 Known Issues & Considerations

### 1. Workspace Package Builds
**Issue:** Next.js requires workspace packages to be built before it can use them.

**Solution:** Build packages before Next.js:
```bash
pnpm --filter=@social-media-app/shared build
pnpm --filter=@social-media-app/dal build
pnpm --filter=@social-media-app/auth-utils build
```

**Long-term:** Add pre-build script or use turbo for automatic dependency building.

### 2. GraphQL Server Must Be Running
**Issue:** Next.js app expects GraphQL server on port 4000.

**Solution:** Always run GraphQL server during development.

### 3. Auth Tokens & Cookies
**Issue:** Server Components need auth tokens for GraphQL queries.

**Current Status:** ✅ Working - tokens stored in cookies, passed to GraphQL client.

### 4. Dynamic vs Static Rendering
**Issue:** Pages using cookies/auth are dynamically rendered.

**Expected:** This is correct for authenticated pages. Login/Register can be static.

---

## 📝 Development Notes

### Server Components vs Client Components

**Server Components (default):**
- Pages that fetch data from GraphQL
- PostList, ProfileHeader (display only)
- Layout shells

**Client Components (`'use client'`):**
- Interactive buttons (like, follow)
- Forms (login, register, create post)
- Components using hooks (useState, useEffect)
- Navigation with useRouter

### GraphQL Queries Location
- **Server Components:** Use `lib/graphql/client.ts` directly
- **Client Components:** Use Server Actions or API routes (not implemented yet)

### Authentication Flow
1. User logs in via `/api/auth/login`
2. JWT tokens stored in HTTP-only cookies
3. Middleware checks cookies on protected routes
4. GraphQL client reads cookies and adds Bearer token
5. GraphQL server validates token

---

## 🎯 Success Criteria for Next Phase

### Phase 5 Complete When:
- ✅ Users can create posts with images
- ✅ Users can like/unlike posts
- ✅ Users can comment on posts
- ✅ Users can follow/unfollow others
- ✅ Profile pages show user data and posts
- ✅ Notifications page works
- ✅ Settings page allows profile editing
- ✅ All core features have parity with old app

### Ready for Production When:
- ✅ All features working
- ✅ Loading states implemented
- ✅ Error handling complete
- ✅ Images optimized
- ✅ SEO metadata added
- ✅ Tests passing (>90% coverage)
- ✅ Performance: Lighthouse score > 90
- ✅ No console errors
- ✅ Deployed to staging and tested

---

## 📚 Key Documentation

- **Migration Plan:** `NEXTJS_MIGRATION_PLAN.md` - Full migration strategy
- **Migration Checklist:** `MIGRATION_CHECKLIST.md` - Detailed task list
- **File Mapping:** `FILE_MAPPING_REFERENCE.md` - Old → New file locations
- **GraphQL Phase 1:** `PHASE_1_COMPLETE.md` - Backend enhancements
- **Next.js Phase 0:** `PHASE_0_COMPLETE.md` - Foundation setup

---

## 🤝 Recommendations

### Immediate Next Steps (This Week)
1. **Implement Post Interactions**
   - Start with like/unlike functionality
   - Add Server Actions for mutations
   - Test with real GraphQL server

2. **Complete Profile Pages**
   - Load profile data dynamically
   - Add follow/unfollow
   - Show user's posts

3. **Add Post Creation**
   - Create post form
   - Image upload to S3
   - Redirect after success

### Technical Debt to Address
1. **Add Turbo or Build Scripts**
   - Automate workspace package builds
   - Speed up development workflow

2. **Add Client-Side GraphQL (Optional)**
   - Consider adding React Query or Relay for client mutations
   - Or continue with Server Actions (simpler)

3. **Improve Error Handling**
   - Add Sentry or error logging
   - Better user-facing error messages

### Testing Strategy
- **Unit Tests:** Components and utilities
- **Integration Tests:** Auth flow, mutations
- **E2E Tests:** Critical user journeys (Playwright?)

---

## ✅ Action Items for Next Session

1. [ ] **Pick a feature to implement** (recommend: Post interactions or Profile pages)
2. [ ] **Start development server** and verify current state
3. [ ] **Create Server Actions** for chosen feature
4. [ ] **Build components** incrementally
5. [ ] **Test with real GraphQL server**
6. [ ] **Update this document** with progress

---

**Status:** 🟢 **Ready to Continue** - Foundation is solid, time to build features!

**Next Milestone:** Complete Phase 5 (Feature Migration) - ETA 2-3 weeks
