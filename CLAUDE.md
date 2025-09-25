# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
