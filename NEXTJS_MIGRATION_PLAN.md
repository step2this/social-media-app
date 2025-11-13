# Next.js 15 Migration Plan
## Social Media App - Detailed Migration Strategy

**Timeline:** 6-8 weeks
**Risk Level:** Medium
**Team Size:** 2-3 developers
**Strategy:** Gradual migration with parallel running capability

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 0: Preparation & Setup (Week 1)](#phase-0-preparation--setup)
3. [Phase 1: Next.js Foundation (Week 1-2)](#phase-1-nextjs-foundation)
4. [Phase 2: Auth & API Routes (Week 2-3)](#phase-2-auth--api-routes)
5. [Phase 3: Pages & Components (Week 3-5)](#phase-3-pages--components)
6. [Phase 4: GraphQL Integration (Week 5-6)](#phase-4-graphql-integration)
7. [Phase 5: Optimization & Polish (Week 6-7)](#phase-5-optimization--polish)
8. [Phase 6: Deployment & Cutover (Week 7-8)](#phase-6-deployment--cutover)
9. [Rollback Strategy](#rollback-strategy)
10. [Risk Mitigation](#risk-mitigation)

---

## Overview

### Current Architecture
```
packages/
├── frontend/          # React + Vite (port 3000)
├── backend/           # Express + Lambda (port 3001)
├── graphql-server/    # Apollo Server (port 4000)
├── shared/            # Types, schemas
├── dal/               # Data Access Layer
└── auth-utils/        # JWT utilities
```

### Target Architecture
```
apps/
├── web/               # Next.js 15 App (port 3000)
│   ├── app/           # App Router (pages + API routes)
│   ├── components/    # React components
│   └── lib/           # Utilities, GraphQL client
packages/
├── graphql-server/    # Keep as-is (port 4000)
├── shared/            # Keep as-is
├── dal/               # Keep as-is
└── auth-utils/        # Adapt for Next.js
```

### What's Changing
- ✅ React Router → Next.js App Router
- ✅ Vite → Next.js (Turbopack)
- ✅ Express backend → Next.js API Routes
- ✅ Custom API client → Server Components + fetch
- ✅ CSR only → SSR + RSC
- ✅ Manual env vars → Next.js conventions

### What's Staying
- ✅ GraphQL server (Apollo Server on port 4000)
- ✅ DynamoDB + Redis infrastructure
- ✅ AWS Lambda handlers (for GraphQL resolvers)
- ✅ Pothos + Relay
- ✅ Shared packages (dal, auth-utils, shared)
- ✅ Vitest for testing

---

## Phase 0: Preparation & Setup
**Duration:** Week 1 (Days 1-2)
**Goal:** Set up Next.js alongside existing app without breaking anything

### Tasks

#### 0.1 Create Next.js App Structure
```bash
# In project root
mkdir -p apps/web
cd apps/web
npx create-next-app@latest . --typescript --app --no-src-dir --import-alias "@/*"
```

Configuration choices:
- ✅ TypeScript
- ✅ App Router
- ✅ No src/ directory
- ✅ Import alias `@/*`
- ✅ Turbopack for dev

#### 0.2 Update pnpm Workspace
**File:** `pnpm-workspace.yaml`
```yaml
packages:
  - 'packages/*'
  - 'apps/*'  # Add this
```

**File:** `apps/web/package.json`
```json
{
  "name": "@social-media-app/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@social-media-app/shared": "workspace:*",
    "@social-media-app/auth-utils": "workspace:*",
    "@social-media-app/dal": "workspace:*",
    "graphql": "^16.10.0",
    "relay-runtime": "^19.0.0",
    "zustand": "^5.0.3",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.8.0",
    "vitest": "^3.0.0"
  }
}
```

#### 0.3 Configure Next.js
**File:** `apps/web/next.config.ts`
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable Turbopack
  turbopack: {
    enabled: true,
  },

  // Transpile workspace packages
  transpilePackages: [
    '@social-media-app/shared',
    '@social-media-app/auth-utils',
    '@social-media-app/dal',
  ],

  // GraphQL server proxy
  async rewrites() {
    return [
      {
        source: '/graphql',
        destination: process.env.GRAPHQL_URL || 'http://localhost:4000/graphql',
      },
    ];
  },

  // Image optimization (S3 presigned URLs)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4566', // LocalStack
      },
    ],
  },

  // React strict mode
  reactStrictMode: true,

  // Environment variables
  env: {
    NEXT_PUBLIC_GRAPHQL_URL: process.env.NEXT_PUBLIC_GRAPHQL_URL,
  },
};

export default nextConfig;
```

#### 0.4 Set Up Environment Variables
**File:** `apps/web/.env.local`
```bash
# GraphQL Server
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql

# AWS (for server-side operations)
AWS_REGION=us-east-1
USE_LOCALSTACK=true
LOCALSTACK_ENDPOINT=http://localhost:4566
TABLE_NAME=tamafriends-local

# JWT Secrets (server-side only)
JWT_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# Redis
REDIS_URL=redis://localhost:6379
```

**File:** `apps/web/.env.production`
```bash
NEXT_PUBLIC_GRAPHQL_URL=https://api.yourdomain.com/graphql
AWS_REGION=us-east-1
TABLE_NAME=tamafriends-prod
# Add production secrets via deployment platform
```

#### 0.5 Configure TypeScript
**File:** `apps/web/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### 0.6 Set Up Testing
**File:** `apps/web/vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 90,
        functions: 85,
        branches: 85,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

**File:** `apps/web/test-setup.ts`
```typescript
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
```

#### 0.7 Update Root Scripts
**File:** `package.json` (root)
```json
{
  "scripts": {
    "dev": "pnpm --filter @social-media-app/web dev",
    "dev:all": "concurrently \"pnpm --filter @social-media-app/graphql-server dev\" \"pnpm --filter @social-media-app/web dev\"",
    "dev:legacy": "pnpm --filter @social-media-app/frontend dev",
    "build:web": "pnpm --filter @social-media-app/web build",
    "test:web": "pnpm --filter @social-media-app/web test"
  }
}
```

### Verification Checklist
- [ ] Next.js dev server starts on port 3000
- [ ] TypeScript compilation works
- [ ] Workspace packages resolve correctly
- [ ] Environment variables load
- [ ] Test runner executes
- [ ] Legacy frontend still works on different port

---

## Phase 1: Next.js Foundation
**Duration:** Week 1-2 (Days 3-10)
**Goal:** Basic routing, layouts, and static pages working

### Tasks

#### 1.1 Create Root Layout
**File:** `apps/web/app/layout.tsx`
```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    template: '%s | Social Media App',
    default: 'Social Media App - Connect with Friends',
  },
  description: 'A modern social media platform for sharing moments',
  keywords: ['social media', 'social network', 'connect'],
  authors: [{ name: 'Your Team' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://yourdomain.com',
    siteName: 'Social Media App',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
```

#### 1.2 Create Global Styles
**File:** `apps/web/app/globals.css`
```css
/* Copy from packages/frontend/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --primary-color: #1976d2;
  --secondary-color: #dc004e;
  --background-color: #fafafa;
  --text-primary: #212121;
  --text-secondary: #757575;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--background-color);
}

* {
  box-sizing: border-box;
}
```

#### 1.3 Create Home Page (Static)
**File:** `apps/web/app/page.tsx`
```typescript
import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Welcome to Social Media App</h1>
      <p>Next.js Migration - Phase 1</p>
      <nav style={{ marginTop: '2rem' }}>
        <Link href="/login">Login</Link>
        {' | '}
        <Link href="/register">Register</Link>
      </nav>
    </div>
  );
}
```

#### 1.4 Create Authentication Layout
**File:** `apps/web/app/(auth)/layout.tsx`
```typescript
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Social Media App</h1>
        </div>
        {children}
      </div>
      <style jsx>{`
        .auth-layout {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .auth-container {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          max-width: 400px;
          width: 100%;
        }
        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
        }
      `}</style>
    </div>
  );
}
```

#### 1.5 Create Login Page (Static)
**File:** `apps/web/app/(auth)/login/page.tsx`
```typescript
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Log in to your account',
};

export default function LoginPage() {
  return (
    <div>
      <h2>Log In</h2>
      <p>Login form will be implemented in Phase 2</p>
      <Link href="/register">Don't have an account? Register</Link>
    </div>
  );
}
```

#### 1.6 Create Register Page (Static)
**File:** `apps/web/app/(auth)/register/page.tsx`
```typescript
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Register',
  description: 'Create a new account',
};

export default function RegisterPage() {
  return (
    <div>
      <h2>Create Account</h2>
      <p>Registration form will be implemented in Phase 2</p>
      <Link href="/login">Already have an account? Log in</Link>
    </div>
  );
}
```

#### 1.7 Create Main App Layout (for authenticated pages)
**File:** `apps/web/app/(app)/layout.tsx`
```typescript
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  // Redirect to login if not authenticated
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="app-layout">
      <nav className="sidebar">
        {/* Sidebar will be implemented in Phase 3 */}
        <div>Sidebar</div>
      </nav>
      <main className="main-content">
        {children}
      </main>
      <style jsx>{`
        .app-layout {
          display: flex;
          min-height: 100vh;
        }
        .sidebar {
          width: 240px;
          background: #1e1e1e;
          color: white;
          padding: 1rem;
        }
        .main-content {
          flex: 1;
          padding: 2rem;
        }
      `}</style>
    </div>
  );
}
```

#### 1.8 Create Protected Pages (Placeholders)
**File:** `apps/web/app/(app)/page.tsx` (Feed)
```typescript
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home Feed',
};

export default function FeedPage() {
  return (
    <div>
      <h1>Home Feed</h1>
      <p>Feed will be implemented in Phase 3</p>
    </div>
  );
}
```

**File:** `apps/web/app/(app)/profile/[handle]/page.tsx`
```typescript
import { Metadata } from 'next';

type Props = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `@${handle}`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params;

  return (
    <div>
      <h1>Profile: @{handle}</h1>
      <p>Profile will be implemented in Phase 3</p>
    </div>
  );
}
```

### File Mapping (Phase 1)
| Current File | Next.js File | Status |
|--------------|--------------|--------|
| `frontend/src/App.tsx` | `app/layout.tsx` + route groups | ✅ Basic structure |
| `frontend/src/pages/Home.tsx` | `app/(app)/page.tsx` | ✅ Placeholder |
| `frontend/src/pages/Login.tsx` | `app/(auth)/login/page.tsx` | ✅ Placeholder |
| `frontend/src/pages/Register.tsx` | `app/(auth)/register/page.tsx` | ✅ Placeholder |
| `frontend/src/pages/Profile.tsx` | `app/(app)/profile/[handle]/page.tsx` | ✅ Placeholder |

### Verification Checklist
- [ ] All routes accessible
- [ ] Metadata renders correctly (check `<head>` in browser)
- [ ] Layouts apply correctly
- [ ] Protected route redirects to login
- [ ] TypeScript compiles without errors
- [ ] No console errors

---

## Phase 2: Auth & API Routes
**Duration:** Week 2-3 (Days 11-21)
**Goal:** Authentication working with Next.js API routes

### Tasks

#### 2.1 Create Auth Utilities
**File:** `apps/web/lib/auth/session.ts`
```typescript
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@social-media-app/auth-utils';

export interface Session {
  userId: string;
  email: string;
  username: string;
}

export async function getServerSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = await verifyAccessToken(token);
    return {
      userId: payload.userId,
      email: payload.email,
      username: payload.username,
    };
  } catch (error) {
    return null;
  }
}

export async function requireSession(): Promise<Session> {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
```

#### 2.2 Create Cookie Management
**File:** `apps/web/lib/auth/cookies.ts`
```typescript
import { cookies } from 'next/headers';
import { AuthTokens } from '@social-media-app/shared';

export async function setAuthCookies(tokens: AuthTokens) {
  const cookieStore = await cookies();

  // Access token (short-lived, 15min)
  cookieStore.set('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15, // 15 minutes
    path: '/',
  });

  // Refresh token (long-lived, 7 days)
  cookieStore.set('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete('accessToken');
  cookieStore.delete('refreshToken');
}

export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('refreshToken')?.value || null;
}
```

#### 2.3 Create Auth Service (Server-Side)
**File:** `apps/web/lib/auth/service.ts`
```typescript
import { container } from '@social-media-app/backend/infrastructure/di/Container';
import { LoginRequest, RegisterRequest } from '@social-media-app/shared';

// Reuse existing auth service from backend
export async function loginUser(credentials: LoginRequest) {
  const authService = container.resolve('authService');
  return authService.login(credentials);
}

export async function registerUser(data: RegisterRequest) {
  const authService = container.resolve('authService');
  return authService.register(data);
}

export async function refreshAccessToken(refreshToken: string) {
  const authService = container.resolve('authService');
  return authService.refreshToken(refreshToken);
}

export async function logoutUser(userId: string) {
  const authService = container.resolve('authService');
  return authService.logout(userId);
}
```

#### 2.4 Create Login API Route
**File:** `apps/web/app/api/auth/login/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { LoginRequestSchema } from '@social-media-app/shared';
import { loginUser } from '@/lib/auth/service';
import { setAuthCookies } from '@/lib/auth/cookies';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate with Zod
    const validated = LoginRequestSchema.parse(body);

    // Call auth service (reuses backend logic)
    const result = await loginUser(validated);

    // Set HTTP-only cookies
    await setAuthCookies(result.tokens);

    // Return user data (no tokens in response body)
    return NextResponse.json(
      { user: result.user },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### 2.5 Create Register API Route
**File:** `apps/web/app/api/auth/register/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { RegisterRequestSchema } from '@social-media-app/shared';
import { registerUser } from '@/lib/auth/service';
import { setAuthCookies } from '@/lib/auth/cookies';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = RegisterRequestSchema.parse(body);

    const result = await registerUser(validated);
    await setAuthCookies(result.tokens);

    return NextResponse.json(
      { user: result.user },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### 2.6 Create Logout API Route
**File:** `apps/web/app/api/auth/logout/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { clearAuthCookies } from '@/lib/auth/cookies';
import { logoutUser } from '@/lib/auth/service';

export async function POST() {
  try {
    const session = await requireSession();

    // Invalidate session on server
    await logoutUser(session.userId);

    // Clear cookies
    await clearAuthCookies();

    return NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}
```

#### 2.7 Create Refresh Token API Route
**File:** `apps/web/app/api/auth/refresh/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { getRefreshToken, setAuthCookies } from '@/lib/auth/cookies';
import { refreshAccessToken } from '@/lib/auth/service';

export async function POST() {
  try {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token' },
        { status: 401 }
      );
    }

    const result = await refreshAccessToken(refreshToken);
    await setAuthCookies(result.tokens);

    return NextResponse.json(
      { user: result.user },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid refresh token' },
      { status: 401 }
    );
  }
}
```

#### 2.8 Create Login Form Component (Client)
**File:** `apps/web/components/auth/LoginForm.tsx`
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoginRequest } from '@social-media-app/shared';

export function LoginForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      // Success - redirect to home
      router.push('/');
      router.refresh(); // Refresh server components
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="error-message">{error}</div>
      )}

      <div className="form-field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="form-field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          disabled={isSubmitting}
        />
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Log In'}
      </button>

      <p>
        Don't have an account? <Link href="/register">Register</Link>
      </p>
    </form>
  );
}
```

#### 2.9 Update Login Page to Use Form
**File:** `apps/web/app/(auth)/login/page.tsx`
```typescript
import { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Log in to your account',
};

export default function LoginPage() {
  return (
    <div>
      <h2>Log In</h2>
      <LoginForm />
    </div>
  );
}
```

#### 2.10 Create Middleware for Auth
**File:** `apps/web/middleware.ts`
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  const { pathname } = request.nextUrl;

  // Public routes
  const isPublicRoute = pathname.startsWith('/login') ||
                       pathname.startsWith('/register') ||
                       pathname === '/';

  // If no token and trying to access protected route
  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If has token and trying to access auth pages
  if (token && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### File Mapping (Phase 2)
| Current File | Next.js File | Status |
|--------------|--------------|--------|
| `backend/src/handlers/auth/login.ts` | `app/api/auth/login/route.ts` | ✅ Migrated |
| `backend/src/handlers/auth/register.ts` | `app/api/auth/register/route.ts` | ✅ Migrated |
| `backend/src/handlers/auth/logout.ts` | `app/api/auth/logout/route.ts` | ✅ Migrated |
| `backend/src/handlers/auth/refresh.ts` | `app/api/auth/refresh/route.ts` | ✅ Migrated |
| `frontend/src/components/auth/LoginForm.tsx` | `components/auth/LoginForm.tsx` | ✅ Adapted |
| `frontend/src/stores/authStore.ts` | Not needed (cookies + middleware) | ⚠️ Removed |

### Testing Checklist
- [ ] User can register new account
- [ ] User can log in
- [ ] Cookies are set correctly (check DevTools)
- [ ] Protected routes redirect to login
- [ ] Logout clears cookies
- [ ] Refresh token works
- [ ] Middleware redirects work correctly

---

## Phase 3: Pages & Components
**Duration:** Week 3-5 (Days 22-35)
**Goal:** All pages migrated with components

### Tasks

#### 3.1 Create Shared Components

**File:** `apps/web/components/layout/Sidebar.tsx`
```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Home', icon: 'home' },
    { href: '/explore', label: 'Explore', icon: 'explore' },
    { href: '/notifications', label: 'Notifications', icon: 'notifications' },
    { href: '/messages', label: 'Messages', icon: 'mail' },
    { href: '/profile', label: 'Profile', icon: 'person' },
    { href: '/create', label: 'Create', icon: 'add_circle' },
    { href: '/settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h1>Social App</h1>
      </div>
      <ul className="sidebar-links">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={pathname === link.href ? 'active' : ''}
            >
              <span className="material-icons">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

**File:** `apps/web/components/layout/Header.tsx`
```typescript
'use client';

import { useRouter } from 'next/navigation';

interface HeaderProps {
  user: {
    username: string;
    avatar?: string;
  };
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="user-info">
          <img
            src={user.avatar || '/default-avatar.png'}
            alt={user.username}
            width={32}
            height={32}
          />
          <span>@{user.username}</span>
        </div>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </header>
  );
}
```

#### 3.2 Update App Layout with Components
**File:** `apps/web/app/(app)/layout.tsx`
```typescript
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-container">
        <Header user={session} />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
```

#### 3.3 Create Post Component
**File:** `apps/web/components/posts/PostCard.tsx`
```typescript
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Post } from '@social-media-app/shared';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  return (
    <article className="post-card">
      <div className="post-header">
        <Link href={`/profile/${post.author.handle}`}>
          <Image
            src={post.author.avatar || '/default-avatar.png'}
            alt={post.author.username}
            width={40}
            height={40}
            className="avatar"
          />
        </Link>
        <div className="post-meta">
          <Link href={`/profile/${post.author.handle}`}>
            <strong>{post.author.username}</strong>
            <span className="handle">@{post.author.handle}</span>
          </Link>
          <time>{new Date(post.createdAt).toLocaleString()}</time>
        </div>
      </div>

      <div className="post-content">
        <p>{post.content}</p>
        {post.media && post.media.length > 0 && (
          <div className="post-media">
            {post.media.map((media, idx) => (
              <Image
                key={idx}
                src={media.url}
                alt="Post media"
                width={600}
                height={400}
                className="media-item"
              />
            ))}
          </div>
        )}
      </div>

      <div className="post-actions">
        <button className="action-button">
          <span className="material-icons">favorite_border</span>
          <span>{post.likesCount}</span>
        </button>
        <button className="action-button">
          <span className="material-icons">comment</span>
          <span>{post.commentsCount}</span>
        </button>
        <button className="action-button">
          <span className="material-icons">share</span>
        </button>
      </div>
    </article>
  );
}
```

#### 3.4 Migrate Components Strategy

**Priority Order:**
1. Layout components (Sidebar, Header) - Done above
2. Post components (PostCard, PostList)
3. Profile components (ProfileHeader, ProfileCard)
4. Form components (CreatePost, EditProfile)
5. Utility components (LoadingSpinner, ErrorBoundary)

**Migration Pattern:**
1. Copy component from `packages/frontend/src/components/`
2. Add `'use client'` if it uses hooks/events
3. Replace React Router `Link` → Next.js `Link`
4. Replace `<img>` → Next.js `<Image>` for optimization
5. Remove any Vite-specific imports
6. Update import paths to use `@/` alias
7. Test component in isolation
8. Write unit tests

**Example Migration:**
```bash
# Copy component
cp packages/frontend/src/components/posts/PostCard.tsx \
   apps/web/components/posts/PostCard.tsx

# Edit to add 'use client' if needed
# Update imports
# Replace Link and Image components
# Test
```

### File Mapping (Phase 3)
| Current File | Next.js File | Notes |
|--------------|--------------|-------|
| `frontend/src/components/auth/*` | `components/auth/*` | Add 'use client' |
| `frontend/src/components/layout/*` | `components/layout/*` | Mix client/server |
| `frontend/src/components/posts/*` | `components/posts/*` | Use Next Image |
| `frontend/src/components/profile/*` | `components/profile/*` | Add 'use client' |
| `frontend/src/components/common/*` | `components/common/*` | Utility components |
| `frontend/src/pages/Home.tsx` | `app/(app)/page.tsx` | Use Server Components |
| `frontend/src/pages/Profile.tsx` | `app/(app)/profile/[handle]/page.tsx` | Dynamic route |
| `frontend/src/pages/Post.tsx` | `app/(app)/post/[postId]/page.tsx` | Dynamic route |
| `frontend/src/pages/Explore.tsx` | `app/(app)/explore/page.tsx` | Server Component |
| `frontend/src/pages/Create.tsx` | `app/(app)/create/page.tsx` | Client Component |

### Verification Checklist
- [ ] All pages render correctly
- [ ] Navigation works
- [ ] Components styled correctly
- [ ] Images optimized (check Network tab)
- [ ] No broken imports
- [ ] TypeScript compiles
- [ ] Tests pass

---

## Phase 4: GraphQL Integration
**Duration:** Week 5-6 (Days 36-42)
**Goal:** GraphQL data fetching working with Server Components

### Tasks

#### 4.1 Create GraphQL Client for Server Components
**File:** `apps/web/lib/graphql/client.ts`
```typescript
import { GraphQLClient } from 'graphql-request';
import { cookies } from 'next/headers';

export async function getGraphQLClient() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  return new GraphQLClient(
    process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql',
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // Next.js caching options
      next: {
        revalidate: 60, // Revalidate every 60 seconds
      },
    }
  );
}

// For client components
export function getClientGraphQLClient() {
  // Token is in HTTP-only cookie, will be sent automatically
  return new GraphQLClient(
    process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql',
    {
      credentials: 'include', // Send cookies
    }
  );
}
```

#### 4.2 Create GraphQL Query Helpers
**File:** `apps/web/lib/graphql/queries.ts`
```typescript
import { gql } from 'graphql-request';

export const GET_FEED = gql`
  query GetFeed($cursor: String, $limit: Int) {
    feed(cursor: $cursor, limit: $limit) {
      posts {
        id
        content
        createdAt
        likesCount
        commentsCount
        author {
          id
          username
          handle
          avatar
        }
        media {
          url
          type
        }
      }
      cursor
      hasMore
    }
  }
`;

export const GET_PROFILE = gql`
  query GetProfile($handle: String!) {
    profile(handle: $handle) {
      id
      username
      handle
      bio
      avatar
      followersCount
      followingCount
      postsCount
      isFollowing
    }
  }
`;

export const GET_POST = gql`
  query GetPost($postId: String!) {
    post(id: $postId) {
      id
      content
      createdAt
      likesCount
      commentsCount
      author {
        id
        username
        handle
        avatar
      }
      media {
        url
        type
      }
      comments {
        id
        content
        createdAt
        author {
          id
          username
          handle
          avatar
        }
      }
    }
  }
`;
```

#### 4.3 Update Feed Page with GraphQL
**File:** `apps/web/app/(app)/page.tsx`
```typescript
import { Metadata } from 'next';
import { getGraphQLClient } from '@/lib/graphql/client';
import { GET_FEED } from '@/lib/graphql/queries';
import { PostCard } from '@/components/posts/PostCard';
import { Post } from '@social-media-app/shared';

export const metadata: Metadata = {
  title: 'Home Feed',
};

// Revalidate every 60 seconds
export const revalidate = 60;

interface FeedData {
  feed: {
    posts: Post[];
    cursor: string | null;
    hasMore: boolean;
  };
}

export default async function FeedPage() {
  const client = await getGraphQLClient();

  const data = await client.request<FeedData>(GET_FEED, {
    limit: 20,
  });

  return (
    <div className="feed-container">
      <h1>Home Feed</h1>
      <div className="posts-list">
        {data.feed.posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      {/* Pagination will be added later */}
    </div>
  );
}
```

#### 4.4 Update Profile Page with GraphQL
**File:** `apps/web/app/(app)/profile/[handle]/page.tsx`
```typescript
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getGraphQLClient } from '@/lib/graphql/client';
import { GET_PROFILE } from '@/lib/graphql/queries';
import { ProfileHeader } from '@/components/profile/ProfileHeader';

type Props = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;

  try {
    const client = await getGraphQLClient();
    const data = await client.request(GET_PROFILE, { handle });

    return {
      title: `${data.profile.username} (@${data.profile.handle})`,
      description: data.profile.bio || `${data.profile.username}'s profile`,
      openGraph: {
        title: data.profile.username,
        description: data.profile.bio,
        images: [data.profile.avatar],
      },
    };
  } catch {
    return {
      title: 'Profile Not Found',
    };
  }
}

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params;

  try {
    const client = await getGraphQLClient();
    const data = await client.request(GET_PROFILE, { handle });

    return (
      <div className="profile-container">
        <ProfileHeader profile={data.profile} />
        {/* Posts will be loaded separately */}
      </div>
    );
  } catch (error) {
    notFound();
  }
}

// Static paths for popular profiles (optional)
export async function generateStaticParams() {
  // Generate static pages for top 100 users
  return [
    { handle: 'example' },
    // Add more...
  ];
}
```

#### 4.5 Create Mutations with Server Actions
**File:** `apps/web/app/(app)/create/actions.ts`
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getGraphQLClient } from '@/lib/graphql/client';
import { gql } from 'graphql-request';

const CREATE_POST = gql`
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      content
      createdAt
    }
  }
`;

export async function createPost(formData: FormData) {
  const content = formData.get('content') as string;

  if (!content || content.trim().length === 0) {
    return { error: 'Content is required' };
  }

  try {
    const client = await getGraphQLClient();
    const result = await client.request(CREATE_POST, {
      input: { content },
    });

    // Revalidate feed to show new post
    revalidatePath('/');

    // Redirect to home feed
    redirect('/');
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create post',
    };
  }
}
```

**File:** `apps/web/app/(app)/create/page.tsx`
```typescript
import { Metadata } from 'next';
import { CreatePostForm } from '@/components/posts/CreatePostForm';

export const metadata: Metadata = {
  title: 'Create Post',
};

export default function CreatePostPage() {
  return (
    <div className="create-container">
      <h1>Create Post</h1>
      <CreatePostForm />
    </div>
  );
}
```

**File:** `apps/web/components/posts/CreatePostForm.tsx`
```typescript
'use client';

import { useFormStatus } from 'react-dom';
import { createPost } from '@/app/(app)/create/actions';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Posting...' : 'Post'}
    </button>
  );
}

export function CreatePostForm() {
  return (
    <form action={createPost}>
      <textarea
        name="content"
        placeholder="What's on your mind?"
        rows={4}
        required
      />
      <SubmitButton />
    </form>
  );
}
```

#### 4.6 Handle Relay (Optional - Gradual Migration)

If you want to keep Relay for client-side features:

**File:** `apps/web/lib/relay/environment.ts`
```typescript
'use client';

import {
  Environment,
  Network,
  RecordSource,
  Store,
  FetchFunction,
} from 'relay-runtime';

const fetchQuery: FetchFunction = async (operation, variables) => {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Send cookies
    body: JSON.stringify({
      query: operation.text,
      variables,
    }),
  });

  return response.json();
};

export function createRelayEnvironment() {
  return new Environment({
    network: Network.create(fetchQuery),
    store: new Store(new RecordSource()),
  });
}
```

**File:** `apps/web/components/RelayProvider.tsx`
```typescript
'use client';

import { RelayEnvironmentProvider } from 'react-relay';
import { useMemo } from 'react';
import { createRelayEnvironment } from '@/lib/relay/environment';

export function RelayProvider({ children }: { children: React.ReactNode }) {
  const environment = useMemo(() => createRelayEnvironment(), []);

  return (
    <RelayEnvironmentProvider environment={environment}>
      {children}
    </RelayEnvironmentProvider>
  );
}
```

Add to root layout if keeping Relay:
```typescript
// app/layout.tsx
import { RelayProvider } from '@/components/RelayProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <RelayProvider>
          {children}
        </RelayProvider>
      </body>
    </html>
  );
}
```

### Testing Checklist
- [ ] Feed loads data from GraphQL
- [ ] Profile pages load correctly
- [ ] Dynamic metadata works (check `<head>`)
- [ ] Create post works and revalidates feed
- [ ] Authentication tokens sent with GraphQL requests
- [ ] Error handling works (network errors, GraphQL errors)
- [ ] Loading states display correctly

---

## Phase 5: Optimization & Polish
**Duration:** Week 6-7 (Days 43-49)
**Goal:** Performance optimization, SEO, error handling

### Tasks

#### 5.1 Optimize Images
- Replace all `<img>` with `<Image>`
- Add `priority` for above-the-fold images
- Configure remote patterns in `next.config.ts`
- Implement blur placeholders

**File:** `apps/web/components/posts/PostCard.tsx` (update)
```typescript
import Image from 'next/image';

// Replace:
<img src={post.media.url} alt="..." />

// With:
<Image
  src={post.media.url}
  alt="Post media"
  width={600}
  height={400}
  className="media-item"
  loading="lazy"
  placeholder="blur"
  blurDataURL="/placeholder.jpg"
/>
```

#### 5.2 Add Loading States
**File:** `apps/web/app/(app)/loading.tsx`
```typescript
export default function Loading() {
  return (
    <div className="loading-container">
      <div className="spinner" />
      <p>Loading...</p>
    </div>
  );
}
```

#### 5.3 Add Error Boundaries
**File:** `apps/web/app/(app)/error.tsx`
```typescript
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="error-container">
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

#### 5.4 Add Not Found Pages
**File:** `apps/web/app/not-found.tsx`
```typescript
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="not-found">
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link href="/">Go home</Link>
    </div>
  );
}
```

#### 5.5 Implement Streaming
**File:** `apps/web/app/(app)/profile/[handle]/page.tsx` (update)
```typescript
import { Suspense } from 'react';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfilePosts } from '@/components/profile/ProfilePosts';
import { ProfilePostsSkeleton } from '@/components/profile/ProfilePostsSkeleton';

export default async function ProfilePage({ params }) {
  const { handle } = await params;

  // Load profile immediately
  const client = await getGraphQLClient();
  const profile = await client.request(GET_PROFILE, { handle });

  return (
    <div>
      <ProfileHeader profile={profile} />

      {/* Stream posts separately */}
      <Suspense fallback={<ProfilePostsSkeleton />}>
        <ProfilePosts handle={handle} />
      </Suspense>
    </div>
  );
}
```

#### 5.6 Add Sitemap
**File:** `apps/web/app/sitemap.ts`
```typescript
import { MetadataRoute } from 'next';
import { getGraphQLClient } from '@/lib/graphql/client';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://yourdomain.com';

  // Get all user handles
  const client = await getGraphQLClient();
  const users = await client.request(GET_ALL_USERS);

  const userPages = users.map((user) => ({
    url: `${baseUrl}/profile/${user.handle}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 1,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    ...userPages,
  ];
}
```

#### 5.7 Add Robots.txt
**File:** `apps/web/app/robots.ts`
```typescript
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/settings/'],
    },
    sitemap: 'https://yourdomain.com/sitemap.xml',
  };
}
```

#### 5.8 Implement Analytics
**File:** `apps/web/components/Analytics.tsx`
```typescript
'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = pathname + searchParams.toString();
    // Send to analytics (Google Analytics, Plausible, etc.)
    console.log('Page view:', url);
  }, [pathname, searchParams]);

  return null;
}
```

Add to root layout:
```typescript
// app/layout.tsx
import { Analytics } from '@/components/Analytics';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### Performance Checklist
- [ ] Images optimized (WebP/AVIF)
- [ ] Code splitting working
- [ ] Bundle size < 200KB (check with `next build`)
- [ ] Lighthouse score > 90
- [ ] Core Web Vitals pass
- [ ] Streaming working for slow components
- [ ] Error boundaries in place
- [ ] Loading states display

---

## Phase 6: Deployment & Cutover
**Duration:** Week 7-8 (Days 50-56)
**Goal:** Deploy to production and switch traffic

### Tasks

#### 6.1 Prepare for Deployment

**Update CDK (if using AWS):**
```python
# infrastructure/stacks/frontend_stack.py
class FrontendStack(Stack):
    def __init__(self, scope, id, **kwargs):
        super().__init__(scope, id, **kwargs)

        # S3 bucket for Next.js static assets
        bucket = s3.Bucket(
            self, "NextJSAssets",
            public_read_access=True,
            website_index_document="index.html"
        )

        # CloudFront distribution
        distribution = cloudfront.Distribution(
            self, "NextJSDistribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3Origin(bucket),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
            )
        )
```

**Or use Vercel (Recommended):**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (from apps/web)
cd apps/web
vercel --prod
```

**Vercel Configuration:**
**File:** `apps/web/vercel.json`
```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_GRAPHQL_URL": "@graphql-url",
    "JWT_SECRET": "@jwt-secret",
    "JWT_REFRESH_SECRET": "@jwt-refresh-secret"
  },
  "regions": ["iad1"]
}
```

#### 6.2 Set Up Environment Variables in Deployment Platform

**Vercel:**
```bash
vercel env add NEXT_PUBLIC_GRAPHQL_URL production
vercel env add JWT_SECRET production
vercel env add JWT_REFRESH_SECRET production
vercel env add AWS_REGION production
vercel env add TABLE_NAME production
```

**Or AWS Systems Manager Parameter Store:**
```bash
aws ssm put-parameter \
  --name "/social-app/prod/jwt-secret" \
  --value "your-secret" \
  --type SecureString
```

#### 6.3 Update GraphQL Server for CORS

**File:** `packages/graphql-server/src/server-with-pothos.ts`
```typescript
const server = new ApolloServer({
  schema: mergedSchema,
  plugins: [
    ApolloServerPluginLandingPageDisabled(),
  ],
});

// Add CORS for Next.js frontend
app.use(cors({
  origin: [
    'http://localhost:3000',           // Local dev
    'https://yourdomain.com',          // Production
    'https://yourdomain.vercel.app',   // Vercel preview
  ],
  credentials: true,
}));
```

#### 6.4 Test Production Build

**Local production build:**
```bash
cd apps/web

# Build
pnpm build

# Test locally
pnpm start

# Check bundle size
du -sh .next
```

**Run Lighthouse:**
```bash
# Install Lighthouse
npm i -g lighthouse

# Run audit
lighthouse http://localhost:3000 --view
```

#### 6.5 Gradual Cutover Strategy

**Week 7: Deploy to Staging**
1. Deploy Next.js app to staging environment
2. Test all features thoroughly
3. Load test with production-like traffic
4. Fix any issues

**Week 8: Production Cutover**

**Option A: Blue-Green Deployment**
1. Deploy Next.js to new domain (new.yourdomain.com)
2. Test thoroughly
3. Update DNS to point to new deployment
4. Keep old deployment running for 24h as fallback

**Option B: Gradual Traffic Shift**
1. Deploy Next.js alongside old app
2. Use CloudFront to route 10% traffic to Next.js
3. Monitor metrics (errors, performance)
4. Gradually increase to 25%, 50%, 100%
5. Decommission old app

**Implementation (CloudFront weighted routing):**
```python
# CDK
distribution = cloudfront.Distribution(
    self, "MainDistribution",
    default_behavior=cloudfront.BehaviorOptions(
        origin=origins.OriginGroup(
            primary_origin=nextjs_origin,
            fallback_origin=legacy_origin,
            fallback_status_codes=[500, 502, 503, 504]
        )
    )
)
```

#### 6.6 Monitoring & Rollback

**Set up monitoring:**
- Error tracking (Sentry)
- Performance monitoring (Vercel Analytics, New Relic)
- Uptime monitoring (UptimeRobot, Pingdom)

**Rollback procedure:**
1. If errors > 1%: rollback immediately
2. If performance degrades > 20%: investigate, consider rollback
3. Update DNS back to old deployment if needed

**File:** `apps/web/instrumentation.ts` (Sentry)
```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
```

### Deployment Checklist
- [ ] Environment variables configured
- [ ] Production build successful
- [ ] Bundle size acceptable
- [ ] All tests pass
- [ ] Lighthouse score > 90
- [ ] Staging deployment tested
- [ ] Production deployment successful
- [ ] DNS updated
- [ ] Monitoring configured
- [ ] Rollback plan documented

---

## Rollback Strategy

### Immediate Rollback (< 5 minutes)
If critical issues detected in production:

1. **DNS Rollback:**
   ```bash
   # Update DNS to point back to old deployment
   aws route53 change-resource-record-sets --hosted-zone-id Z123 --change-batch file://rollback.json
   ```

2. **Vercel Rollback:**
   ```bash
   # Rollback to previous deployment
   vercel rollback
   ```

3. **CloudFront Rollback:**
   - Update origin to legacy deployment
   - Invalidate cache

### Partial Rollback
If issues affect only certain features:
- Use feature flags to disable problematic features
- Deploy hotfix

### Verification After Rollback
- [ ] Site accessible
- [ ] Critical flows working (login, post creation)
- [ ] Error rates normal
- [ ] Performance metrics normal

---

## Risk Mitigation

### Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during migration | High | Low | No data migration needed; only frontend |
| Auth breaks | High | Medium | Extensive testing, gradual rollout |
| Performance regression | Medium | Medium | Load testing, monitoring, rollback plan |
| SEO drop during cutover | Medium | Low | 301 redirects, sitemap, robots.txt |
| User confusion | Low | Medium | Communication, gradual rollout |
| Team knowledge gap | Medium | High | Training, documentation, pair programming |

### Mitigation Strategies

**1. Extensive Testing**
- Unit tests (90% coverage)
- Integration tests
- E2E tests with Playwright
- Load testing with k6

**2. Gradual Rollout**
- Internal testing (week 7)
- Beta users (10%, week 8 day 1-2)
- Gradual traffic shift (25%, 50%, 100%)

**3. Monitoring**
- Real-time error tracking
- Performance monitoring
- User feedback channel

**4. Communication**
- Announce migration to users
- Document changes for team
- Provide support channel

---

## Success Metrics

### Week-by-Week Goals

**Week 1:** Foundation complete, basic routing working
**Week 2:** Auth working, can log in/register
**Week 3:** All pages migrated, components working
**Week 4:** Pages connected to data, GraphQL working
**Week 5:** All features functional, parity with old app
**Week 6:** Optimized, SEO working, performance > baseline
**Week 7:** Staging deployed, tested thoroughly
**Week 8:** Production deployed, cutover complete

### Key Performance Indicators (KPIs)

**Technical:**
- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Bundle size < 200KB
- [ ] Test coverage > 90%

**Business:**
- [ ] Zero data loss
- [ ] < 0.1% error rate
- [ ] No performance regression
- [ ] SEO improvement (check Search Console after 2 weeks)
- [ ] User satisfaction maintained

---

## Team Assignments (Suggested)

**Developer 1: Auth & API Routes**
- Phase 2: Auth system
- API route migration
- Middleware implementation

**Developer 2: Components & Pages**
- Phase 3: Component migration
- Layout implementation
- Styling

**Developer 3: GraphQL & Optimization**
- Phase 4: GraphQL integration
- Phase 5: Performance optimization
- Testing

**All: Phase 1 & 6 together**
- Setup (Week 1)
- Deployment & cutover (Week 7-8)

---

## Daily Standup Questions

1. What did you complete yesterday?
2. What are you working on today?
3. Any blockers?
4. Are we on track for this week's goal?

---

## Definition of Done (per Phase)

**Phase complete when:**
- [ ] All tasks in phase completed
- [ ] Code reviewed by peer
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Demo to team successful
- [ ] No known critical bugs

---

## Resources & References

### Documentation
- [Next.js 15 Docs](https://nextjs.org/docs)
- [React Server Components](https://react.dev/reference/rsc/server-components)
- [App Router Migration](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration)

### Tools
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Next.js Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)
- [Vercel CLI](https://vercel.com/docs/cli)

### Community
- [Next.js Discord](https://nextjs.org/discord)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/next.js)

---

## Conclusion

This migration will take **6-8 weeks** with 2-3 developers. The biggest wins will be:

1. **SEO improvement** - SSR for all pages
2. **Performance** - Image optimization, streaming, code splitting
3. **Developer experience** - Unified dev server, better DX
4. **Maintainability** - Less custom infrastructure

The biggest risks are auth migration and performance regression, both mitigated by extensive testing and gradual rollout.

**Next Steps:**
1. Review this plan with team
2. Get stakeholder approval
3. Set up tracking (Jira, Linear, etc.)
4. Begin Phase 0 setup

Good luck with the migration!
