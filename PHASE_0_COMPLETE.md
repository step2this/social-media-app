# Phase 0: Preparation & Setup - COMPLETE ✅

**Completed:** $(date +%Y-%m-%d)
**Duration:** ~2 hours
**Status:** ✅ Ready for Phase 1

---

## What Was Completed

### 1. Next.js App Structure Created
- ✅ Created `apps/web` directory structure
- ✅ Set up Next.js 15 with App Router
- ✅ Created basic app layout and home page
- ✅ Configured directory structure: `app/`, `components/`, `lib/`

### 2. Workspace Configuration
- ✅ Updated `pnpm-workspace.yaml` to include `apps/*`
- ✅ Configured workspace dependencies
- ✅ Set up monorepo package imports

### 3. Next.js Configuration
- ✅ Created `next.config.ts` with:
  - Workspace package transpilation
  - GraphQL server proxy
  - Image optimization for S3
  - React strict mode
- ✅ Configured TypeScript (`tsconfig.json`)
- ✅ Set up ESLint with Next.js rules

### 4. Environment Variables
- ✅ Created `.env.local` for development
- ✅ Created `.env.example` for documentation
- ✅ Configured for LocalStack and GraphQL server

### 5. Testing Setup
- ✅ Configured Vitest for Next.js
- ✅ Set up React Testing Library
- ✅ Created test setup with Next.js mocks
- ✅ Configured coverage thresholds

### 6. Scripts & Tooling
- ✅ Added `dev:web` script for Next.js dev server
- ✅ Added `dev:nextjs` script for Next.js + GraphQL
- ✅ Added `build:web` and `test:web` scripts
- ✅ Set up concurrency for multiple servers

### 7. Verification
- ✅ TypeScript compiles without errors
- ✅ Next.js builds successfully
- ✅ Bundle size: ~105 KB (excellent baseline)
- ✅ All dependencies installed

---

## File Structure Created

```
apps/web/
├── app/
│   ├── layout.tsx              # Root layout with metadata
│   ├── page.tsx                # Home page
│   └── globals.css             # Global styles
├── components/                 # React components (empty for now)
├── lib/                        # Utilities (empty for now)
├── .env.local                  # Environment variables
├── .env.example                # Env var template
├── .gitignore                  # Next.js gitignore
├── eslint.config.mjs           # ESLint configuration
├── next.config.ts              # Next.js configuration
├── package.json                # Next.js dependencies
├── test-setup.ts               # Vitest setup
├── tsconfig.json               # TypeScript config
└── vitest.config.ts            # Vitest config
```

---

## Key Configuration Files

### next.config.ts
- Transpiles workspace packages
- Proxies `/graphql` to GraphQL server
- Configures image optimization for AWS S3
- Enables React strict mode

### package.json (apps/web)
**Dependencies:**
- next ^15.1.0
- react ^19.0.0
- react-dom ^19.0.0
- graphql, graphql-request (for GraphQL integration)
- zustand, zod (state & validation)
- Workspace packages: @social-media-app/{shared,auth-utils,dal}

**DevDependencies:**
- TypeScript, ESLint, Vitest
- React Testing Library
- @vitejs/plugin-react

### Environment Variables (.env.local)
```bash
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
AWS_REGION=us-east-1
USE_LOCALSTACK=true
LOCALSTACK_ENDPOINT=http://localhost:4566
TABLE_NAME=tamafriends-local
JWT_SECRET=development-secret-key
JWT_REFRESH_SECRET=development-refresh-secret-key
REDIS_URL=redis://localhost:6379
```

---

## New NPM Scripts

From project root:

```bash
# Run Next.js dev server only
pnpm dev:web

# Run Next.js + GraphQL together (recommended)
pnpm dev:nextjs

# Build Next.js app
pnpm build:web

# Test Next.js app
pnpm test:web

# Legacy frontend still available
pnpm dev:frontend
```

---

## Verification Results

### TypeScript Compilation ✅
```bash
pnpm --filter @social-media-app/web tsc --noEmit
# No errors
```

### Next.js Build ✅
```bash
pnpm build:web
# Build succeeded
# Bundle size: 105 KB first load (excellent!)
```

### Build Output
```
Route (app)                                 Size  First Load JS
┌ ○ /                                    3.44 kB         105 kB
└ ○ /_not-found                            988 B         103 kB
+ First Load JS shared by all             102 kB
```

---

## What Works Right Now

1. **Next.js dev server** can start (port 3000)
2. **Home page** renders with welcome message
3. **TypeScript** compiles successfully
4. **Production build** creates optimized bundles
5. **ESLint** configured for Next.js
6. **Vitest** ready for testing
7. **Workspace packages** resolve correctly

---

## What's NOT Yet Implemented

These will be added in subsequent phases:

- [ ] Authentication (Phase 2)
- [ ] API routes (Phase 2)
- [ ] Protected routes (Phase 2)
- [ ] Actual pages (login, profile, feed) (Phase 3)
- [ ] Components (Phase 3)
- [ ] GraphQL integration (Phase 4)
- [ ] Image optimization in use (Phase 5)
- [ ] SEO metadata per page (Phase 5)

---

## Compatibility with Existing App

✅ **Legacy frontend still works**
- Old Vite app: `pnpm dev:frontend`
- New Next.js app: `pnpm dev:web`
- Both can run simultaneously on different ports

✅ **GraphQL server unchanged**
- Still runs on port 4000
- Next.js will connect to it via proxy

✅ **Backend Lambda handlers unchanged**
- Will be migrated to API routes in Phase 2

---

## Next Steps: Phase 1

**Goal:** Basic routing, layouts, and static pages

**Tasks:**
1. Create auth layout (`app/(auth)/layout.tsx`)
2. Create app layout for protected pages (`app/(app)/layout.tsx`)
3. Create placeholder pages:
   - Login (`app/(auth)/login/page.tsx`)
   - Register (`app/(auth)/register/page.tsx`)
   - Feed (`app/(app)/page.tsx`)
   - Profile (`app/(app)/profile/[handle]/page.tsx`)
4. Set up route groups
5. Add basic navigation

**Estimated Time:** 2-3 days

---

## Commands Reference

```bash
# Start Next.js dev server only
pnpm dev:web

# Start Next.js + GraphQL (recommended for development)
pnpm dev:nextjs

# Start legacy frontend (for comparison)
pnpm dev:frontend

# Build Next.js app
pnpm build:web

# Run Next.js tests
pnpm test:web

# TypeScript check
cd apps/web && pnpm tsc --noEmit

# Lint
cd apps/web && pnpm lint
```

---

## Troubleshooting

### If Next.js dev server won't start:
```bash
# Clear port 3000
pnpm port:clear:3000

# Try again
pnpm dev:web
```

### If TypeScript errors:
```bash
cd apps/web
rm -rf .next
pnpm tsc --noEmit
```

### If dependencies missing:
```bash
pnpm install
```

---

## Phase 0 Checklist ✅

- [x] Create Next.js app structure
- [x] Update pnpm workspace
- [x] Configure Next.js
- [x] Set up environment variables
- [x] Configure TypeScript
- [x] Set up testing
- [x] Update root scripts
- [x] Install dependencies
- [x] Verify TypeScript compilation
- [x] Verify Next.js build
- [x] Verify legacy app still works

---

## Success Metrics

- ✅ Next.js builds without errors
- ✅ TypeScript compiles cleanly
- ✅ Bundle size reasonable (105 KB baseline)
- ✅ All workspace dependencies resolve
- ✅ Development scripts work
- ✅ Legacy app unaffected

**Phase 0 is complete and ready for Phase 1!** 🎉
