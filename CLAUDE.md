# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Server Lifecycle Management

### Standard Development Commands
**These commands provide consistent, predictable server management:**

- `pnpm dev` - Start full development environment (LocalStack + servers)
- `pnpm dev:localstack` - Start LocalStack mode with backend + frontend
- `pnpm dev:mocks` - Start frontend-only with MSW mocks
- `pnpm servers:status` - Check what's currently running
- `pnpm servers:stop` - Stop all development servers
- `pnpm servers:restart` - Restart all servers cleanly
- `pnpm reset` - Clean everything and stop all servers
- `pnpm quick:localstack` - Reset and start LocalStack environment
- `pnpm quick:mocks` - Reset and start mock environment

### Port Assignment Rules
**ALWAYS use these port assignments:**
- **Frontend**: Port 3000 (Vite dev server)
- **Backend**: Port 3001 (Express server)
- **LocalStack**: Port 4566 (AWS services)

### Claude Code Guidelines
**IMPORTANT: Follow these server management rules consistently:**

1. **Status First**: ALWAYS use `pnpm servers:status` to check current state before starting servers
2. **Reset When Confused**: ALWAYS use `pnpm reset` when server state is unclear or problematic
3. **Use Standard Commands**: NEVER use ad-hoc server commands like `node server.js` or manual port assignments
4. **Default Development**: Use `pnpm dev` as the default development command
5. **Clean Restarts**: Use `pnpm servers:restart` when servers need restarting
6. **Environment Switching**: Use `pnpm quick:localstack` or `pnpm quick:mocks` for clean environment switches

### What This Prevents
- ❌ **Port Conflicts**: Multiple servers fighting for the same port
- ❌ **Server Chaos**: Dozens of orphaned processes running
- ❌ **Wrong Port Assignment**: Frontend ending up on port 3001
- ❌ **Connection Issues**: Backend not reachable from frontend
- ❌ **Cache Problems**: Stale Vite caches causing confusion

## Core Development Principles
- Do deep research
- Work on one file at a time
- Make one change, test and verify that change
- Use git so that you can make breaking changes and then roll them back if it doesn't work
- No hardcoding, no static brittle references
- Use ESM and always use the latest, recommended techniques to keep ESM as simple as possible. Never hardcode anything.
- To create a shared schema between client and server, use a shared schema as a node module that can be accessed by client and server
- Use CDK
- Use lambdas
- Use Node v22 and AWS SDK v3
- Use environment variables
- Use a Data Access Layer pattern
- Create and maintain a shared data access layer service for client and server
- Never handcode anything for http or JSON, use an http client and JSON libray
- Use functional programming idioms
- Scope try-catch blocks to be as small as possible
- Use a lint file to enforce code complexity warnings (avoid excessive indents etc)
- Use SOLID design patterns
- Keep concerns separate
- Use CDK constructs
- Keep code DRY
- Minimal conditional logic, avoid complext if/else chains
- Functional over procedural for example prefer map/filter/reduce over loops
- lodash fp is a good library to use, make sure you curry and do the functional things for highly fluent readable composable code
- keep methods and functions short and unit testable
- always write unit tests and run the test suite after every change
- always git commit after each incremental completion of something that works
- Use the JS equivalent of JavaDoc to comment and document everything you do
- Throw clear hard errors that crash the system
- Never let compilation failures linger and stop what you're doing and fix hard errors as soon as they come up
- Always present a plan and don't make big changes without a plan to review
- Use Zod schemas for runtime validation
- Include context for debugging in error messages
- Use Zod for all validation e.g. input/output
- Use barrel exports

> **There must be one and only one definition for all wire protocols, persistence schemas, interfaces, and APIs. These definitions must be shared between client and server.**

### What This Means

- ✅ **Single Source of Truth**: Every data structure has exactly one canonical definition
- ✅ **Shared Validation**: Client and server use identical validation rules
- ✅ **No Duplication**: Never define the same schema in multiple places
- ✅ **No Drift**: Schema changes automatically propagate to all consumers
- ✅ **Type Safety**: Full TypeScript support across the entire stack

### What This Prevents

- ❌ **Schema Drift**: Client and server getting out of sync
- ❌ **Validation Inconsistencies**: Different rules on client vs server
- ❌ **Runtime Errors**: Type mismatches causing production failures
- ❌ **Duplicate Maintenance**: Updating schemas in multiple places
- ❌ **Integration Issues**: API contracts changing without notice

## Monorepo Architecture & Dependency Management

### Package Responsibilities

#### `@social-media-app/shared`
- **Purpose**: Domain schemas, types, and business validation rules ONLY
- **Exports**: Zod schemas, TypeScript types, business logic
- **Never Export**: Third-party library re-exports, utility functions, infrastructure code
```typescript
// ✅ GOOD: Domain schemas and types
export const UserSchema = z.object({...});
export type User = z.infer<typeof UserSchema>;

// ❌ BAD: Third-party re-exports
export { z } from 'zod';
export { DynamoDBClient } from '@aws-sdk/client-dynamodb';
```

#### `@social-media-app/dal`
- **Purpose**: Data access layer with clean service interfaces
- **Exports**: Service classes, data access patterns
- **Dependencies**: Direct dependencies on AWS SDKs, shared schemas
```typescript
// ✅ GOOD: Service exports
export class ProfileService { ... }
export class PostService { ... }
```

#### `@social-media-app/backend`
- **Purpose**: Lambda handlers and backend utilities
- **Exports**: Lambda handlers (individual files, no package exports needed)
- **Dependencies**: Direct dependencies on all needed libraries

### Dependency Management Principles

#### 1. Direct Dependencies Over Proxy Imports
```typescript
// ✅ GOOD: Each package declares its own dependencies
import { z } from 'zod';                               // Direct import
import { PostSchema } from '@social-media-app/shared';  // Domain logic

// ❌ BAD: Using shared as proxy for third-party libraries
import { z } from '@social-media-app/shared';
```

#### 2. Barrel Exports for Internal Organization
```typescript
// ✅ GOOD: Internal package organization
// src/utils/index.ts
export * from './responses.js';
export * from './jwt.js';
export * from './dynamodb.js';

// Then import cleanly:
import { errorResponse, verifyToken } from '../utils/index.js';

// ❌ BAD: Hardcoded relative paths
import { errorResponse } from '../../utils/responses.js';
```

#### 3. Package Boundaries
- **shared**: Only domain logic, no infrastructure dependencies
- **dal**: Data access patterns, depends on shared + AWS SDKs
- **backend**: Lambda handlers, depends on dal + shared + all needed libs
- **frontend**: UI components, depends on shared only

#### 4. Clean Import Patterns
```typescript
// ✅ GOOD: Clean, maintainable imports
import { z } from 'zod';
import { PostSchema, type Post } from '@social-media-app/shared';
import { PostService } from '@social-media-app/dal';
import { errorResponse } from '../utils/index.js';

// ❌ BAD: Hardcoded, brittle paths
import { errorResponse } from '../../utils/responses.js';
import { verifyToken } from '../../utils/jwt.js';
```

### Architecture Benefits
- ✅ **Clear Separation**: Each package has single responsibility
- ✅ **No God Packages**: shared doesn't become a dependency proxy
- ✅ **Maintainable**: Changes don't cascade unnecessarily
- ✅ **Testable**: Each package can be tested independently
- ✅ **Scalable**: Easy to add new packages without breaking others

## Clean Testing Workflow (Monorepo Cache-Busting)

**When debugging shared package changes (schemas, types, etc.), always use this workflow to avoid cache issues:**

1. **Rebuild shared package**: `cd packages/shared && pnpm build`
2. **Clear Vite cache & restart**: `cd packages/frontend && rm -rf node_modules/.vite && pnpm dev`
3. **Alternative**: Use `pnpm dev --force` to force-clear Vite dependency cache

**Why**: Vite caches shared packages aggressively. Schema/type changes won't propagate without explicit cache clearing, leading to hours of debugging phantom issues.

## 🚨 CRITICAL SERVER MANAGEMENT RULES 🚨

**⚠️ NEVER USE BACKGROUND BASH PROCESSES - THEY CREATE SERVER CHAOS! ⚠️**

### 🔥 URGENT: Context Loss Prevention
When you lose context or start a new session, you MUST read this first:
- **NEVER** run commands with `&` (background processes)
- **NEVER** use `node server.js` directly
- **NEVER** use ad-hoc bash commands for servers
- **ALWAYS** use `pnpm reset` when confused about server state
- **ALWAYS** use `pnpm dev` or other standardized scripts

### 💥 What Creates Server Chaos (BANNED COMMANDS):
```bash
# 🚫 NEVER DO THESE - THEY CREATE 50+ BACKGROUND PROCESSES:
node server.js &                    # Background process chaos
npm run dev &                       # Unmanaged background process
cd packages/backend && node server.js &   # Directory + background = disaster
pnpm --filter @social-media-app/backend dev:local &  # Even pnpm + & = chaos
```

### ✅ What to Do Instead:
```bash
# Status check first (ALWAYS)
pnpm servers:status

# Clean start (when confused)
pnpm reset
pnpm dev

# Standard development
pnpm dev                    # This is the default!
```

## Server Management & Process Control

**CRITICAL: Always use pnpm scripts for server lifecycle management. Never use ad-hoc bash commands or background processes.**

### ✅ ALWAYS Use These Commands:
```bash
# Start development environment
pnpm dev                    # Start full LocalStack + servers
pnpm dev:localstack        # LocalStack mode with real services
pnpm dev:mocks             # MSW mock mode (no LocalStack)

# Server control
pnpm servers:start         # Start both frontend/backend servers
pnpm servers:stop          # Stop all development servers
pnpm servers:restart       # Clean restart all servers
pnpm servers:status        # Check server and port status

# Environment switching
pnpm switch:localstack     # Switch to LocalStack mode
pnpm switch:mocks          # Switch to MSW mock mode

# Cleanup & recovery
pnpm reset                 # Clean up all processes and ports
pnpm port:clear            # Clear specific ports if needed
```

### ❌ NEVER Use These Patterns:
```bash
# DON'T: Ad-hoc background processes
node server.js &
npm run dev &

# DON'T: Manual port management
lsof -ti:3000 | xargs kill -9
pkill -f node

# DON'T: Direct bash commands for servers
bash -c "cd packages/backend && node dist/server.js" &
```

### Why This Matters:
- **Prevents Server Chaos**: Unmanaged processes create port conflicts and zombie processes
- **Consistent Environment**: All developers use same server lifecycle
- **Easy Recovery**: `pnpm reset` can clean up any mess
- **Port Safety**: Managed port allocation prevents conflicts
- **Context Preservation**: Scripts maintain proper environment variables and dependencies

### 🚨 Emergency Recovery from Server Chaos:
If you ever create server chaos with background processes:

**Step 1: Emergency Reset (ALWAYS START HERE)**
```bash
pnpm reset              # This cleans up most chaos
```

**Step 2: If pnpm reset isn't enough**
```bash
pnpm port:clear         # Clear specific ports
pnpm servers:status     # Check what's still running
```

**Step 3: Nuclear Option (if servers still chaotic)**
```bash
# Only if above steps fail - be very careful
pkill -f "node.*server"
pkill -f "pnpm.*dev"
```

**Step 4: Fresh Start**
```bash
pnpm dev               # Start with proper management
```

**⚠️ IMPORTANT: Background processes can survive even `pnpm reset`**
- This is why you must NEVER use background processes (`&`)
- They become orphaned and unmanaged
- Even your reset scripts can't clean them up reliably
- The only solution is prevention: **NO BACKGROUND PROCESSES EVER**
