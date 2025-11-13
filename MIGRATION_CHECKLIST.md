# Next.js Migration Quick Reference Checklist

Use this checklist to track progress through the migration phases.

---

## 📋 Phase 0: Preparation & Setup (Week 1, Days 1-2)

- [ ] Create Next.js app structure (`apps/web`)
- [ ] Update pnpm workspace configuration
- [ ] Configure `next.config.ts`
- [ ] Set up environment variables (`.env.local`, `.env.production`)
- [ ] Configure TypeScript (`tsconfig.json`)
- [ ] Set up Vitest for testing
- [ ] Update root package.json scripts
- [ ] Verify: Next.js dev server starts
- [ ] Verify: Legacy frontend still works

**Completion Criteria:** Both old and new apps can run simultaneously

---

## 🏗️ Phase 1: Next.js Foundation (Week 1-2, Days 3-10)

- [ ] Create root layout (`app/layout.tsx`)
- [ ] Create global styles (`app/globals.css`)
- [ ] Create home page placeholder
- [ ] Create auth layout (`app/(auth)/layout.tsx`)
- [ ] Create login page placeholder
- [ ] Create register page placeholder
- [ ] Create app layout for authenticated pages (`app/(app)/layout.tsx`)
- [ ] Create protected route placeholders (feed, profile, etc.)
- [ ] Verify: All routes accessible
- [ ] Verify: Metadata renders correctly
- [ ] Verify: Layouts apply correctly
- [ ] Demo to team

**Completion Criteria:** All page routes exist and render with basic layouts

---

## 🔐 Phase 2: Auth & API Routes (Week 2-3, Days 11-21)

### Server-Side Auth
- [ ] Create session utilities (`lib/auth/session.ts`)
- [ ] Create cookie management (`lib/auth/cookies.ts`)
- [ ] Create auth service wrapper (`lib/auth/service.ts`)
- [ ] Create login API route (`app/api/auth/login/route.ts`)
- [ ] Create register API route (`app/api/auth/register/route.ts`)
- [ ] Create logout API route (`app/api/auth/logout/route.ts`)
- [ ] Create refresh API route (`app/api/auth/refresh/route.ts`)
- [ ] Create middleware for auth (`middleware.ts`)

### Client Components
- [ ] Create LoginForm component
- [ ] Create RegisterForm component
- [ ] Update login page with form
- [ ] Update register page with form

### Testing
- [ ] Test: User can register
- [ ] Test: User can log in
- [ ] Test: Cookies set correctly
- [ ] Test: Protected routes redirect
- [ ] Test: Logout clears cookies
- [ ] Test: Refresh token works
- [ ] Test: Middleware redirects work
- [ ] Demo to team

**Completion Criteria:** Full authentication flow works end-to-end

---

## 🎨 Phase 3: Pages & Components (Week 3-5, Days 22-35)

### Layout Components
- [ ] Create Sidebar component
- [ ] Create Header component
- [ ] Update app layout with components

### Core Components (migrate from old app)
- [ ] PostCard component
- [ ] PostList component
- [ ] ProfileHeader component
- [ ] ProfileCard component
- [ ] CreatePostForm component
- [ ] EditProfileForm component
- [ ] LoadingSpinner component
- [ ] ErrorMessage component

### Pages
- [ ] Migrate Home/Feed page
- [ ] Migrate Profile page (dynamic route)
- [ ] Migrate Post detail page
- [ ] Migrate Explore page
- [ ] Migrate Create post page
- [ ] Migrate Notifications page
- [ ] Migrate Settings page
- [ ] Migrate Messages page

### Replace Legacy Patterns
- [ ] Replace React Router Link → Next.js Link
- [ ] Replace `<img>` → Next.js `<Image>`
- [ ] Add `'use client'` where needed
- [ ] Update import paths to use `@/` alias

### Testing
- [ ] Test: All pages render
- [ ] Test: Navigation works
- [ ] Test: Components styled correctly
- [ ] Test: Images load and optimize
- [ ] Test: No TypeScript errors
- [ ] Visual regression testing
- [ ] Demo to team

**Completion Criteria:** All pages migrated and functional (without data)

---

## 🔄 Phase 4: GraphQL Integration (Week 5-6, Days 36-42)

### GraphQL Client Setup
- [ ] Create GraphQL client for Server Components (`lib/graphql/client.ts`)
- [ ] Create GraphQL queries (`lib/graphql/queries.ts`)
- [ ] Create GraphQL mutations

### Connect Pages to Data
- [ ] Update Feed page with GraphQL
- [ ] Update Profile page with GraphQL
- [ ] Update Post detail page with GraphQL
- [ ] Update Explore page with GraphQL

### Implement Mutations
- [ ] Create post with Server Actions
- [ ] Like/unlike post
- [ ] Follow/unfollow user
- [ ] Update profile
- [ ] Delete post

### Optional: Keep Relay
- [ ] Create Relay environment for client
- [ ] Set up RelayProvider
- [ ] Migrate Relay queries/mutations

### Testing
- [ ] Test: Feed loads data
- [ ] Test: Profiles load correctly
- [ ] Test: Dynamic metadata works
- [ ] Test: Create post works
- [ ] Test: Auth tokens sent with requests
- [ ] Test: Error handling works
- [ ] Test: Loading states display
- [ ] Demo to team

**Completion Criteria:** Full feature parity with old app

---

## ⚡ Phase 5: Optimization & Polish (Week 6-7, Days 43-49)

### Image Optimization
- [ ] Replace all `<img>` with `<Image>`
- [ ] Add `priority` for above-fold images
- [ ] Implement blur placeholders
- [ ] Configure remote patterns

### Loading States
- [ ] Add loading.tsx for pages
- [ ] Add skeleton screens
- [ ] Implement streaming for slow components

### Error Handling
- [ ] Add error.tsx for pages
- [ ] Add global error boundary
- [ ] Add not-found.tsx
- [ ] Implement error logging (Sentry)

### SEO
- [ ] Add sitemap.ts
- [ ] Add robots.ts
- [ ] Verify metadata for all pages
- [ ] Test Open Graph tags
- [ ] Test Twitter cards

### Performance
- [ ] Analyze bundle size
- [ ] Implement code splitting improvements
- [ ] Add analytics
- [ ] Run Lighthouse audit
- [ ] Optimize Core Web Vitals

### Testing
- [ ] Test: Images optimized
- [ ] Test: Bundle size < 200KB
- [ ] Test: Lighthouse score > 90
- [ ] Test: Core Web Vitals pass
- [ ] Test: Streaming works
- [ ] Test: Error boundaries work
- [ ] Load testing
- [ ] Demo to stakeholders

**Completion Criteria:** App is production-ready and optimized

---

## 🚀 Phase 6: Deployment & Cutover (Week 7-8, Days 50-56)

### Pre-Deployment
- [ ] Update CDK/infrastructure for Next.js
- [ ] Configure deployment platform (Vercel/AWS)
- [ ] Set up environment variables in prod
- [ ] Update GraphQL server CORS
- [ ] Test production build locally
- [ ] Run Lighthouse on production build

### Staging Deployment (Week 7)
- [ ] Deploy to staging environment
- [ ] Test all features in staging
- [ ] Load test with production-like traffic
- [ ] Fix any issues
- [ ] Get stakeholder approval

### Production Deployment (Week 8)
- [ ] Deploy to production
- [ ] Implement gradual traffic shift (10% → 25% → 50% → 100%)
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Monitor user feedback

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Set up performance monitoring
- [ ] Set up uptime monitoring
- [ ] Set up alerting

### Cutover
- [ ] Update DNS to point to new deployment
- [ ] Monitor for 24 hours
- [ ] Decommission old deployment
- [ ] Archive legacy code

### Verification
- [ ] Zero data loss
- [ ] Error rate < 0.1%
- [ ] No performance regression
- [ ] All features working
- [ ] User satisfaction maintained

**Completion Criteria:** New app is live and stable, old app decommissioned

---

## 📊 Success Metrics

### Technical Metrics
- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Bundle size < 200KB
- [ ] Test coverage > 90%
- [ ] Error rate < 0.1%

### Business Metrics
- [ ] Zero data loss
- [ ] No downtime during migration
- [ ] User satisfaction maintained or improved
- [ ] SEO rankings maintained or improved
- [ ] Page load time improved by at least 30%

---

## 🆘 Rollback Plan

### Immediate Rollback Triggers
- Error rate > 1%
- Performance degradation > 20%
- Critical feature broken
- Data loss detected

### Rollback Steps
1. [ ] Revert DNS to old deployment
2. [ ] OR: Rollback Vercel deployment
3. [ ] OR: Update CloudFront origin
4. [ ] Verify old app working
5. [ ] Communicate to users
6. [ ] Debug issues
7. [ ] Prepare redeployment

---

## 📞 Key Contacts

- **Technical Lead:** _______________
- **Product Owner:** _______________
- **DevOps:** _______________
- **On-Call Engineer:** _______________

---

## 📚 Resources

### Documentation
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Migration Plan](./NEXTJS_MIGRATION_PLAN.md)

### Tools
- Vercel Dashboard: _______________
- AWS Console: _______________
- Monitoring Dashboard: _______________

### Communication
- Slack Channel: #nextjs-migration
- Daily Standup: _______________
- Weekly Review: _______________

---

## 🎯 Current Status

**Current Phase:** _______________ (update as you progress)

**Blockers:**
- _______________
- _______________

**Next Milestone:** _______________

**Est. Completion Date:** _______________

---

## Notes

(Use this space for migration-specific notes, decisions made, issues encountered, etc.)
