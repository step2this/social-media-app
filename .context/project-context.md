# Social Media App - Comprehensive Project Context
**Last Updated**: 2025-10-12
**Context Version**: 1.0
**Status**: Notification System TDD Implementation Complete - Awaiting Verification

---

## 1. PROJECT OVERVIEW

### 1.1 Project Goals
- Build a production-ready social media application with AWS infrastructure
- Implement core social features: posts, likes, comments, follows, notifications
- Use Test-Driven Development (TDD) for all feature implementation
- Maintain clean architecture with separation of concerns
- Ensure type safety across frontend and backend with shared schemas

### 1.2 Key Architectural Decisions

#### Monorepo Structure
```
packages/
├── shared/          # Domain schemas, types, validation (Zod)
├── dal/             # Data Access Layer services
├── backend/         # Lambda handlers and utilities
├── frontend/        # React UI
├── infrastructure/  # AWS CDK constructs
└── integration-tests/ # End-to-end workflow tests
```

#### Single Source of Truth Principle
- **ONE definition** for all wire protocols, schemas, interfaces, APIs
- Shared between client and server via `@social-media-app/shared`
- Prevents schema drift and validation inconsistencies
- Full TypeScript type safety across entire stack

#### Data Access Pattern
- Data Access Layer (DAL) provides clean service interfaces
- Services encapsulate DynamoDB operations
- Pure functional patterns with Zod validation
- Separate mappers for DB <-> Domain transformations

### 1.3 Technology Stack

#### Backend
- **Runtime**: Node.js v22
- **Framework**: AWS Lambda (Express for local dev)
- **Database**: DynamoDB (LocalStack for local dev)
- **Validation**: Zod schemas
- **AWS SDK**: v3 (latest)
- **Utilities**: lodash/fp for functional patterns

#### Frontend
- **Framework**: React with Vite
- **Testing**: Vitest
- **Development Modes**:
  - LocalStack mode (real AWS services locally)
  - MSW mock mode (frontend-only with mocked APIs)

#### Infrastructure
- **IaC**: AWS CDK
- **Local Development**: LocalStack
- **Compute**: Lambda functions
- **Storage**: DynamoDB tables

#### Testing
- **Unit Tests**: Vitest for all packages
- **Integration Tests**: Full workflow tests with real LocalStack services
- **Philosophy**: TDD-first approach

### 1.4 Team Conventions

#### Code Style
- **Functional over Procedural**: map/filter/reduce > loops
- **Small Scope Try-Catch**: Isolate error boundaries
- **SOLID Design Patterns**: Single responsibility, dependency injection
- **DRY Code**: No duplication via shared utilities
- **Minimal Conditionals**: Avoid complex if/else chains
- **Short Functions**: Keep methods small and unit testable
- **Barrel Exports**: Clean import paths via index.js

#### Documentation
- JSDoc comments for all public APIs
- Clear error messages with debugging context
- Architecture decision records in code comments

#### Error Handling
- **Throw hard errors**: Crash early, fail loudly
- **Never let compilation fail**: Fix errors immediately
- **Error isolation**: Failures in non-critical paths don't break core flows

#### Git Workflow
- Commit after each incremental completion
- Always run tests before committing
- Clear, descriptive commit messages

---

## 2. CURRENT STATE

### 2.1 Recently Implemented Features

#### Notification System (Phase 3 - COMPLETE)
**Date**: 2025-10-12
**Status**: Code complete, awaiting verification after server restart

**Implementation Details**:
- Added automatic notification creation to social action handlers
- Notifications triggered on: like, comment, follow actions
- Error isolation ensures notification failures don't break social actions
- Self-action prevention (users don't get notified of their own actions)

**Files Modified**:
1. `/packages/backend/src/handlers/likes/like-post.ts`
   - Added notification creation after successful like
   - Uses NotificationService from DAL
   - Error isolation with try-catch

2. `/packages/backend/src/handlers/comments/create-comment.ts`
   - Added notification creation after successful comment
   - Includes comment text in metadata
   - Error isolation pattern

3. `/packages/backend/src/handlers/follows/follow-user.ts`
   - Already had notification creation implemented
   - Used as reference pattern for other handlers

4. `/packages/integration-tests/src/scenarios/notifications-workflow.test.ts`
   - Fixed schema mismatches
   - Corrected field names (targetUserId -> userId)
   - Updated response expectations (items -> notifications)
   - Removed invalid `url` field from tests

**Test Results**:
- All 465 backend unit tests passing
- All 28 notification integration tests expected to pass (pending verification)
- Handlers loading successfully in test environment

### 2.2 Work in Progress
- **Current**: Manual server restart needed to verify integration tests
- **Blocker**: Server chaos from background processes preventing clean test run
- **Next Step**: Use `pnpm reset && pnpm dev` for clean environment

### 2.3 Known Issues and Technical Debt

#### Critical: Server Management Problems
**Issue**: Background bash processes create "server chaos"
- Multiple conflicting server instances
- Orphaned processes that survive cleanup
- Port conflicts (3000, 3001, 4566)
- Context loss between agent sessions

**Root Cause**: Ad-hoc bash commands with `&` (background processes)

**Solution**: ALWAYS use standardized pnpm scripts:
```bash
# ✅ ALWAYS USE:
pnpm dev              # Standard development
pnpm reset            # Clean recovery
pnpm servers:status   # Check state
pnpm servers:stop     # Stop all servers

# ❌ NEVER USE:
node server.js &      # Creates chaos
npm run dev &         # Unmanaged process
```

#### Minor: URL Field in Notifications
**Issue**: Schema has optional `url` field, but handlers don't provide it
**Reason**: Frontend constructs URLs from notificationId + type
**Impact**: None - this is by design
**Documentation**: Added comments explaining the pattern

### 2.4 Performance Baselines
- Backend unit tests: ~465 tests, fast execution
- Integration tests: ~28 notification tests
- LocalStack startup: ~10-15 seconds
- Server startup: ~2-3 seconds

---

## 3. DESIGN DECISIONS

### 3.1 Notification Architecture

#### Schema Design
```typescript
// Notification schema captures WHO did WHAT to WHOM
{
  notificationId: string,      // UUID
  userId: string,              // WHO receives notification
  type: 'like' | 'comment' | 'follow',
  message: string,             // Human-readable message
  isRead: boolean,             // Read status
  createdAt: string,           // ISO timestamp
  actor: {                     // WHO performed action
    userId: string,
    username: string
  },
  target: {                    // WHAT was affected
    type: 'post' | 'comment' | 'user',
    id: string,
    metadata?: Record<string, unknown>  // Extra context
  },
  url?: string                 // Optional, usually frontend-constructed
}
```

#### Key Decisions:
1. **Actor/Target Pattern**: Rich metadata for UI rendering
2. **Optional URL**: Frontend builds URLs from type + ID
3. **Error Isolation**: Notification failures don't break social actions
4. **Self-Prevention**: Users don't notify themselves
5. **Type Safety**: Zod schemas enforce structure

### 3.2 API Design Patterns

#### Request/Response Structure
- All requests validated with Zod schemas
- Standard response wrapper: `{ success, data?, error? }`
- Consistent error handling with HTTP status codes
- JWT authentication via Authorization header

#### Handler Pattern
```typescript
// Consistent handler structure:
1. Authenticate user (JWT verification)
2. Validate request body (Zod parse)
3. Execute business logic (via DAL service)
4. (Optional) Trigger side effects (notifications)
5. Return standardized response
```

#### URL Routing
- RESTful conventions: `/api/posts`, `/api/likes`, etc.
- POST for creates, GET for reads, DELETE for removals
- Resource IDs in URL path: `/api/posts/:postId`

### 3.3 Database Schema Decisions

#### DynamoDB Tables
- **posts-table**: Posts with GSI for user's posts
- **likes-table**: Likes with composite key (userId, postId)
- **comments-table**: Comments with GSI for post's comments
- **follows-table**: Follow relationships with GSI
- **notifications-table**: Notifications with GSI for user's notifications

#### Key Patterns:
- UUID primary keys for all entities
- GSIs for common query patterns (user's items, post's items)
- ISO timestamp strings for dates
- Denormalized data for performance (actor metadata)

### 3.4 Security Implementations

#### Authentication
- JWT tokens with expiration
- User ID embedded in token claims
- Token verification middleware

#### Authorization
- Users can only modify their own resources
- Post/comment ownership validation
- Follow relationship validation

#### Data Validation
- Zod schemas validate all inputs
- Type-safe operations throughout stack
- Runtime validation prevents invalid data

---

## 4. CODE PATTERNS

### 4.1 Coding Conventions

#### Functional Programming
```typescript
// ✅ GOOD: Functional patterns
const usernames = users.map(u => u.username).filter(Boolean);

// ❌ BAD: Procedural loops
const usernames = [];
for (const user of users) {
  if (user.username) {
    usernames.push(user.username);
  }
}
```

#### Lodash FP Usage
```typescript
import { pipe, map, filter, sortBy } from 'lodash/fp';

const processData = pipe(
  filter(isValid),
  map(transform),
  sortBy('createdAt')
);
```

#### Error Handling
```typescript
// Small scope try-catch for isolation
try {
  await notificationService.createNotification(data);
} catch (error) {
  console.error('[like-post] Failed to create notification:', error);
  // Continue - notification failure doesn't break like
}
```

### 4.2 Common Patterns and Abstractions

#### Service Pattern
```typescript
export class NotificationService {
  constructor(
    private readonly client: DynamoDBClient,
    private readonly tableName: string
  ) {}

  async createNotification(data: NotificationData): Promise<Notification> {
    // Validate, transform, persist, return
  }
}
```

#### Mapper Pattern
```typescript
// DB <-> Domain transformations
export const toDomainNotification = (
  item: Record<string, AttributeValue>
): Notification => {
  // Pure function: DynamoDB item -> Domain object
};

export const toDynamoNotification = (
  notification: Notification
): Record<string, AttributeValue> => {
  // Pure function: Domain object -> DynamoDB item
};
```

#### Barrel Exports
```typescript
// packages/shared/src/index.ts
export * from './schemas/post.js';
export * from './schemas/user.js';
export * from './schemas/notification.js';

// Clean imports:
import { PostSchema, NotificationSchema } from '@social-media-app/shared';
```

### 4.3 Testing Strategies

#### TDD Workflow
1. **RED**: Write failing tests first (define expected behavior)
2. **GREEN**: Implement minimal code to pass tests
3. **REFACTOR**: Clean up while keeping tests green

#### Test Structure
```typescript
describe('Feature', () => {
  beforeEach(() => {
    // Setup test environment
  });

  it('should handle success case', async () => {
    // Arrange
    const input = createTestData();

    // Act
    const result = await handler(input);

    // Assert
    expect(result).toMatchObject({ success: true });
  });

  it('should handle error case', async () => {
    // Test error paths
  });
});
```

#### Integration Test Patterns
```typescript
// Full workflow tests with real LocalStack
describe('Notification Workflow', () => {
  it('creates notification when user likes post', async () => {
    // 1. Create users
    // 2. Create post
    // 3. Like post
    // 4. Verify notification created
    // 5. Verify notification content
  });
});
```

### 4.4 Error Handling Approaches

#### Hard Errors (Fail Fast)
```typescript
if (!userId) {
  throw new Error('userId is required');
}
```

#### Error Isolation (Non-Critical Paths)
```typescript
// Notification failure doesn't break like action
try {
  await createNotification();
} catch (error) {
  console.error('Notification failed:', error);
  // Continue execution
}
```

#### Contextual Error Messages
```typescript
throw new Error(`[like-post] Failed to create like: ${error.message}`);
```

---

## 5. AGENT COORDINATION HISTORY

### 5.1 Agent Work Summary

#### Context Engineering Agent (Current Session)
**Date**: 2025-10-12
**Focus**: Notification system TDD implementation and context preservation

**Work Completed**:
1. TDD Phase 1 (RED): Added 17 failing tests across handlers
2. TDD Phase 2 (GREEN): Implemented notification creation in handlers
3. Integration Test Fixes: Corrected schema mismatches
4. Context Documentation: Created comprehensive project context

**Challenges Encountered**:
- Server chaos from background processes
- Schema validation mismatches in tests
- Field naming inconsistencies (targetUserId vs userId)

**Solutions Applied**:
- Used standardized pnpm scripts
- Fixed schema property names
- Added error isolation patterns

### 5.2 Successful Agent Combinations
- **Single Agent Focus**: TDD implementation works well with focused, incremental approach
- **Context Preservation**: Critical for maintaining continuity across sessions

### 5.3 Agent-Specific Context

#### For Backend Development Agents
- Always use DAL services, never direct DynamoDB calls
- Follow error isolation pattern for side effects
- Run full test suite after changes: `pnpm test`
- Use `pnpm dev` for local testing with LocalStack

#### For Testing Agents
- Integration tests require LocalStack running
- Use `pnpm test:integration` in integration-tests package
- Clear Vite cache when shared package changes: `rm -rf node_modules/.vite`
- Rebuild shared after schema changes: `cd packages/shared && pnpm build`

#### For Infrastructure Agents
- Use CDK for all infrastructure changes
- LocalStack simulates AWS services locally
- Port assignments: Frontend 3000, Backend 3001, LocalStack 4566
- Always use `pnpm reset` when server state is unclear

### 5.4 Cross-Agent Dependencies

#### Schema Changes
1. Modify schema in `packages/shared/src/schemas/`
2. Rebuild shared: `cd packages/shared && pnpm build`
3. Clear Vite cache: `cd packages/frontend && rm -rf node_modules/.vite`
4. Update affected handlers/services
5. Update tests to match new schema
6. Run full test suite

#### Handler Changes
1. Implement handler in `packages/backend/src/handlers/`
2. Update DAL service if needed
3. Add/update integration tests
4. Verify with LocalStack: `pnpm dev`
5. Run backend tests: `pnpm test`

#### Service Changes
1. Modify service in `packages/dal/src/`
2. Update mappers if schema changed
3. Update handler usage
4. Add unit tests for service
5. Update integration tests

---

## 6. FUTURE ROADMAP

### 6.1 Planned Features

#### Immediate (Next Sprint)
- [ ] Verify notification integration tests pass after server restart
- [ ] Add notification read/unread functionality
- [ ] Implement notification polling/refresh endpoint
- [ ] Add frontend notification UI components

#### Short-term (1-2 Sprints)
- [ ] Real-time notifications with WebSockets
- [ ] Notification preferences (opt-in/opt-out by type)
- [ ] Notification batching for high-volume users
- [ ] Mark all as read functionality

#### Medium-term (2-4 Sprints)
- [ ] User profiles with bio and avatar
- [ ] Image upload for posts
- [ ] Direct messaging between users
- [ ] Search functionality (users, posts)

#### Long-term (4+ Sprints)
- [ ] Analytics and metrics dashboard
- [ ] Content moderation tools
- [ ] Multi-media posts (video, audio)
- [ ] Advanced privacy controls

### 6.2 Identified Improvements

#### Code Quality
- [ ] Add more comprehensive error handling tests
- [ ] Improve test coverage for edge cases
- [ ] Add performance benchmarks
- [ ] Implement rate limiting

#### Developer Experience
- [ ] Improve server management scripts reliability
- [ ] Add development environment health checks
- [ ] Create agent-specific playbooks
- [ ] Add automated context preservation

#### Architecture
- [ ] Consider event-driven architecture for notifications
- [ ] Evaluate caching strategies for hot data
- [ ] Plan for horizontal scaling patterns
- [ ] Design data archival strategy

### 6.3 Technical Debt to Address

#### High Priority
1. **Server Management**: Eliminate background process chaos completely
   - Refactor all development scripts
   - Add process monitoring
   - Implement automatic cleanup on exit

2. **Test Reliability**: Ensure tests are deterministic
   - Fix any flaky tests
   - Improve test isolation
   - Add retry mechanisms for integration tests

#### Medium Priority
1. **Error Handling**: Standardize error responses
   - Create error code catalog
   - Improve error logging
   - Add error tracking (Sentry, etc.)

2. **Documentation**: Keep docs up-to-date
   - API documentation
   - Architecture diagrams
   - Onboarding guides

#### Low Priority
1. **Code Cleanup**: Refactor old code to new patterns
2. **Dependency Updates**: Keep packages current
3. **Performance Tuning**: Optimize hot paths

### 6.4 Performance Optimization Opportunities

#### Database
- Add indexes for common query patterns
- Implement caching layer (Redis/ElastiCache)
- Optimize DynamoDB capacity planning
- Consider read replicas for high-traffic endpoints

#### Backend
- Implement Lambda cold start optimization
- Add response compression
- Optimize bundle sizes
- Implement connection pooling

#### Frontend
- Code splitting for faster initial load
- Image optimization and lazy loading
- Implement service worker for offline support
- Add progressive web app (PWA) features

---

## 7. CRITICAL OPERATIONAL GUIDELINES

### 7.1 Server Management (MOST IMPORTANT)

#### The Golden Rule
**NEVER USE BACKGROUND BASH PROCESSES (`&`)**

#### Standard Commands (ALWAYS USE THESE)
```bash
# Check server status FIRST
pnpm servers:status

# Start development (default)
pnpm dev

# Clean recovery (when confused)
pnpm reset
pnpm dev

# Stop servers cleanly
pnpm servers:stop

# Restart servers
pnpm servers:restart
```

#### Emergency Recovery
```bash
# Step 1: Always start with reset
pnpm reset

# Step 2: If reset fails, clear ports
pnpm port:clear

# Step 3: Nuclear option (use sparingly)
pkill -f "node.*server"
pkill -f "pnpm.*dev"

# Step 4: Fresh start
pnpm dev
```

### 7.2 Testing Workflow

#### Before Running Tests
```bash
# 1. Check server status
pnpm servers:status

# 2. Ensure LocalStack is running (for integration tests)
pnpm dev:localstack

# 3. If shared package changed, rebuild it
cd packages/shared && pnpm build

# 4. Clear Vite cache if needed
cd packages/frontend && rm -rf node_modules/.vite
```

#### Running Tests
```bash
# Unit tests (fast)
pnpm test

# Integration tests (requires LocalStack)
cd packages/integration-tests && pnpm test

# Watch mode for development
pnpm test:watch
```

### 7.3 Dependency Management

#### Adding Dependencies
```bash
# To workspace root
pnpm add -w <package>

# To specific package
pnpm --filter @social-media-app/backend add <package>
```

#### Shared Package Pattern
```typescript
// ✅ GOOD: Direct imports from dependencies
import { z } from 'zod';
import { PostSchema } from '@social-media-app/shared';

// ❌ BAD: Using shared as dependency proxy
import { z } from '@social-media-app/shared';
```

### 7.4 Git Workflow

#### Before Committing
```bash
# 1. Run all tests
pnpm test

# 2. Check for TypeScript errors
pnpm type-check

# 3. Format code (if formatter configured)
pnpm format

# 4. Review changes
git status
git diff
```

#### Commit Message Format
```
feat: Add notification creation to like handler

- Implemented automatic notification on post like
- Added error isolation for notification failures
- Updated integration tests for new behavior

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 8. CONTEXT RESTORATION CHECKLIST

When a new agent session starts, follow this checklist:

### 8.1 Environment Verification
- [ ] Read this context document thoroughly
- [ ] Check current git branch and recent commits
- [ ] Run `pnpm servers:status` to check server state
- [ ] Review recent test results
- [ ] Check for any modified files: `git status`

### 8.2 Orientation Questions
- What was the last completed feature?
- What tests are currently failing (if any)?
- Are there any blockers or known issues?
- What is the next planned work item?
- Are servers running properly?

### 8.3 Before Starting Work
- [ ] Ensure clean server state: `pnpm reset && pnpm dev`
- [ ] Run test suite to establish baseline: `pnpm test`
- [ ] Review relevant code sections
- [ ] Create test plan for new work
- [ ] Update this context document if needed

---

## 9. QUICK REFERENCE

### 9.1 Port Assignments
- **Frontend**: 3000 (Vite)
- **Backend**: 3001 (Express)
- **LocalStack**: 4566 (AWS services)

### 9.2 Key Commands
```bash
# Development
pnpm dev                 # Start everything
pnpm dev:localstack      # LocalStack mode
pnpm dev:mocks          # MSW mock mode

# Server control
pnpm servers:status     # Check status
pnpm servers:stop       # Stop all
pnpm servers:restart    # Restart all
pnpm reset             # Clean recovery

# Testing
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
cd packages/integration-tests && pnpm test  # Integration tests

# Building
cd packages/shared && pnpm build  # Rebuild shared package

# Cache clearing
cd packages/frontend && rm -rf node_modules/.vite  # Clear Vite cache
```

### 9.3 Key File Locations
```
packages/
├── shared/src/schemas/          # Zod schemas
├── dal/src/                     # Services and mappers
├── backend/src/handlers/        # Lambda handlers
├── backend/src/utils/           # Backend utilities
├── frontend/src/                # React components
├── integration-tests/src/       # E2E tests
└── infrastructure/lib/          # CDK constructs
```

### 9.4 Important Files
- `/CLAUDE.md` - Primary development guidelines
- `/packages/shared/package.json` - Shared package config
- `/packages/integration-tests/test-results.json` - Test results
- `/.localstack/init.sh` - LocalStack initialization

---

## 10. METADATA

### Document Information
- **Version**: 1.0
- **Last Updated**: 2025-10-12
- **Created By**: Context Engineering Agent
- **Purpose**: Comprehensive context preservation for agent coordination

### Change Log
- **2025-10-12**: Initial context document created
  - Captured notification system implementation state
  - Documented TDD process and outcomes
  - Recorded server management issues and solutions
  - Established patterns and conventions

### Related Documents
- `/CLAUDE.md` - Primary development guidelines
- `/README.md` - Project overview (if exists)
- Git commit history - Detailed change history

### Next Review Date
- Recommended: After each major feature completion
- Minimum: Weekly updates for active development

---

## END OF CONTEXT DOCUMENT

This document provides complete context for continuing work on the Social Media App project. Any agent reading this should have sufficient information to:
1. Understand the current state
2. Continue pending work
3. Make informed decisions
4. Maintain consistency with established patterns
5. Avoid known pitfalls and issues

For questions or clarifications, refer to:
- Git commit messages for detailed change history
- Test files for behavior specifications
- CLAUDE.md for development guidelines
- Integration test results for current system behavior
