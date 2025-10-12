# Agent Coordination Playbook
**Social Media App Project**
**Last Updated**: 2025-10-12

---

## Purpose
This playbook provides quick-reference workflows for common agent tasks and coordination patterns. Use this alongside `project-context.md` for efficient work.

---

## Table of Contents
1. [Quick Start Scenarios](#quick-start-scenarios)
2. [Agent Role Patterns](#agent-role-patterns)
3. [Common Task Workflows](#common-task-workflows)
4. [Troubleshooting Guide](#troubleshooting-guide)
5. [Communication Protocols](#communication-protocols)

---

## Quick Start Scenarios

### Scenario 1: New Agent Session Startup
**Context**: You're a new agent starting fresh on this project.

```bash
# 1. Orient yourself
git log --oneline -10          # Recent changes
git status                     # Current state
pnpm servers:status            # Server state

# 2. Read context
# - Read /Users/shaperosteve/social-media-app/.context/project-context.md
# - Review /Users/shaperosteve/social-media-app/CLAUDE.md

# 3. Establish clean environment
pnpm reset                     # Clean slate
pnpm dev                       # Start servers

# 4. Verify baseline
pnpm test                      # Run tests

# 5. Check for pending work
# - Review last section of project-context.md
# - Check git diff for uncommitted changes
# - Look at test-results.json for failures
```

**Expected Outcome**: You understand project state and have clean environment.

---

### Scenario 2: Continuing Notification System Work
**Context**: Previous agent left notification implementation in "code complete, needs verification" state.

```bash
# 1. Check current state
pnpm servers:status            # Are servers running?
git status                     # Any uncommitted changes?

# 2. Review notification context
# Read project-context.md Section 2.1 "Recently Implemented Features"

# 3. Verify tests pass
pnpm reset && pnpm dev         # Clean environment
cd packages/integration-tests
pnpm test                      # Run notification tests

# 4. If tests pass
git add .
git commit -m "feat: Complete notification system integration

All notification integration tests passing:
- Like notifications working
- Comment notifications working
- Follow notifications working

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# 5. If tests fail
# - Read error messages carefully
# - Check handler implementations
# - Verify schema alignment
# - Update integration tests if needed
```

**Expected Outcome**: Notification system verified working or issues identified and fixed.

---

### Scenario 3: Adding New Feature (TDD Approach)
**Context**: User requests new feature implementation.

```bash
# Phase 1: RED (Write failing tests)
# 1. Design the feature behavior
# 2. Add schema to packages/shared/src/schemas/
# 3. Write integration test in packages/integration-tests/
# 4. Run test to verify it fails: pnpm test
# 5. Commit failing test

# Phase 2: GREEN (Make tests pass)
# 1. Implement service in packages/dal/src/
# 2. Add handler in packages/backend/src/handlers/
# 3. Run tests: pnpm test
# 4. Iterate until green
# 5. Commit working implementation

# Phase 3: REFACTOR (Clean up)
# 1. Review code for duplication
# 2. Extract shared utilities
# 3. Improve naming and structure
# 4. Ensure tests still pass
# 5. Commit refactoring

# Final: Document
# 1. Update project-context.md with new feature
# 2. Add JSDoc comments
# 3. Update API documentation if needed
```

**Expected Outcome**: New feature implemented with full test coverage.

---

### Scenario 4: Debugging Test Failures
**Context**: Tests are failing and you need to diagnose why.

```bash
# 1. Isolate the problem
pnpm test                      # Run all tests
# Note which tests fail

# 2. Run failing test in isolation
cd packages/integration-tests
pnpm test -- -t "specific test name"

# 3. Check environment
pnpm servers:status            # LocalStack running?
curl http://localhost:4566     # LocalStack responding?
curl http://localhost:3001/health  # Backend responding?

# 4. Check for common issues
# - Schema mismatches (check Zod validation errors)
# - Field name typos (userId vs targetUserId)
# - Response property names (items vs notifications)
# - Authentication tokens (expired or invalid)

# 5. Verify shared package is current
cd packages/shared
pnpm build
cd packages/frontend
rm -rf node_modules/.vite      # Clear cache

# 6. Re-run tests
pnpm test
```

**Expected Outcome**: Root cause identified and test failures resolved.

---

### Scenario 5: Server Chaos Recovery
**Context**: Multiple servers running, ports conflicting, general chaos.

```bash
# NEVER PANIC - We have recovery procedures!

# Step 1: Standard reset (fixes 90% of problems)
pnpm reset

# Step 2: Verify clean state
pnpm servers:status            # Should show nothing running
lsof -i :3000                  # Should be empty
lsof -i :3001                  # Should be empty
lsof -i :4566                  # Should be empty

# Step 3: If ports still occupied
pnpm port:clear

# Step 4: Nuclear option (only if above fail)
pkill -f "node.*server"
pkill -f "pnpm.*dev"
pkill -f "localstack"

# Step 5: Fresh start
pnpm dev

# Step 6: Verify health
pnpm servers:status
curl http://localhost:3001/health
```

**Expected Outcome**: Clean server environment restored.

---

## Agent Role Patterns

### Backend Implementation Agent
**Strengths**: Service implementation, handler logic, database operations

**Typical Tasks**:
- Implement new Lambda handlers
- Create/modify DAL services
- Add database mappers
- Update business logic

**Key Files**:
- `packages/backend/src/handlers/`
- `packages/dal/src/`
- `packages/shared/src/schemas/`

**Workflow**:
1. Review shared schemas
2. Implement service in DAL
3. Create handler in backend
4. Add error handling
5. Run backend tests: `pnpm test`

**Common Pitfalls**:
- Forgetting error isolation for side effects
- Not preventing self-actions (self-likes, self-follows)
- Skipping input validation
- Direct DynamoDB calls (always use DAL)

---

### Testing Agent
**Strengths**: Test design, coverage analysis, test debugging

**Typical Tasks**:
- Write integration tests
- Debug test failures
- Improve test coverage
- Refactor test code

**Key Files**:
- `packages/integration-tests/src/`
- `test-results.json`
- Various `*.test.ts` files

**Workflow**:
1. Ensure LocalStack running: `pnpm dev:localstack`
2. Write test scenarios
3. Run tests: `pnpm test`
4. Analyze failures
5. Update code or tests as needed

**Common Pitfalls**:
- Forgetting to rebuild shared package after schema changes
- Not clearing Vite cache
- Tests depending on execution order
- Not waiting for async operations

---

### Schema Design Agent
**Strengths**: Data modeling, validation, type definitions

**Typical Tasks**:
- Design Zod schemas
- Update TypeScript types
- Define validation rules
- Document schema decisions

**Key Files**:
- `packages/shared/src/schemas/`
- `packages/shared/src/index.ts` (barrel exports)

**Workflow**:
1. Design schema with Zod
2. Export from index.ts
3. Rebuild: `cd packages/shared && pnpm build`
4. Update dependent code
5. Clear caches if needed

**Common Pitfalls**:
- Breaking changes without version consideration
- Forgetting to rebuild shared package
- Not updating all consumers
- Overly permissive validation

---

### Infrastructure Agent
**Strengths**: CDK, AWS services, deployment, DevOps

**Typical Tasks**:
- Update CDK constructs
- Modify LocalStack configuration
- Manage environment variables
- Deploy infrastructure changes

**Key Files**:
- `packages/infrastructure/lib/`
- `.localstack/init.sh`
- Various environment configs

**Workflow**:
1. Design infrastructure change
2. Update CDK constructs
3. Test locally with LocalStack
4. Deploy to AWS (if needed)
5. Verify health

**Common Pitfalls**:
- Not testing with LocalStack first
- Forgetting IAM permissions
- Hardcoding configuration values
- Not documenting infrastructure decisions

---

### Documentation Agent
**Strengths**: Writing, organization, clarity, knowledge management

**Typical Tasks**:
- Update project documentation
- Write API documentation
- Create guides and playbooks
- Maintain context documents

**Key Files**:
- `CLAUDE.md`
- `.context/project-context.md`
- `.context/agent-playbook.md`
- Various README files

**Workflow**:
1. Identify documentation needs
2. Research current state
3. Write clear, structured content
4. Review for accuracy
5. Update metadata (dates, versions)

**Common Pitfalls**:
- Documentation drift (outdated info)
- Too verbose or too terse
- Lack of examples
- Not maintaining change logs

---

## Common Task Workflows

### Workflow: Adding a New API Endpoint

**Step 1: Design Schema**
```typescript
// packages/shared/src/schemas/new-feature.ts
import { z } from 'zod';

export const NewFeatureRequestSchema = z.object({
  field1: z.string().min(1),
  field2: z.number().int().positive()
});

export const NewFeatureResponseSchema = z.object({
  id: z.string().uuid(),
  field1: z.string(),
  field2: z.number(),
  createdAt: z.string().datetime()
});

export type NewFeatureRequest = z.infer<typeof NewFeatureRequestSchema>;
export type NewFeatureResponse = z.infer<typeof NewFeatureResponseSchema>;
```

**Step 2: Export from Shared**
```typescript
// packages/shared/src/index.ts
export * from './schemas/new-feature.js';
```

**Step 3: Rebuild Shared**
```bash
cd packages/shared && pnpm build
```

**Step 4: Create Service**
```typescript
// packages/dal/src/new-feature-service.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { NewFeatureRequest, NewFeatureResponse } from '@social-media-app/shared';

export class NewFeatureService {
  constructor(
    private readonly client: DynamoDBClient,
    private readonly tableName: string
  ) {}

  async createFeature(request: NewFeatureRequest): Promise<NewFeatureResponse> {
    // Implementation
  }
}
```

**Step 5: Create Handler**
```typescript
// packages/backend/src/handlers/new-feature/create.ts
import { NewFeatureRequestSchema } from '@social-media-app/shared';
import { NewFeatureService } from '@social-media-app/dal';
import { successResponse, errorResponse } from '../utils/index.js';

export const handler = async (event: any) => {
  try {
    // 1. Authenticate
    const userId = verifyToken(event.headers.authorization);

    // 2. Validate
    const request = NewFeatureRequestSchema.parse(JSON.parse(event.body));

    // 3. Execute
    const service = new NewFeatureService(/* ... */);
    const result = await service.createFeature(request);

    // 4. Respond
    return successResponse(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
};
```

**Step 6: Add Integration Test**
```typescript
// packages/integration-tests/src/scenarios/new-feature.test.ts
describe('New Feature Workflow', () => {
  it('should create new feature', async () => {
    // Test implementation
  });
});
```

**Step 7: Run Tests**
```bash
pnpm test
cd packages/integration-tests && pnpm test
```

**Step 8: Commit**
```bash
git add .
git commit -m "feat: Add new feature endpoint

- Created schema with validation
- Implemented service in DAL
- Added Lambda handler
- Full integration test coverage

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Workflow: Modifying Existing Schema

**Step 1: Impact Analysis**
```bash
# Find all usages of the schema
cd /Users/shaperosteve/social-media-app
grep -r "SchemaName" packages/
```

**Step 2: Update Schema**
```typescript
// packages/shared/src/schemas/existing.ts
// Make changes carefully, consider backwards compatibility
```

**Step 3: Rebuild and Clear Caches**
```bash
cd packages/shared && pnpm build
cd packages/frontend && rm -rf node_modules/.vite
```

**Step 4: Update All Consumers**
- Update services in DAL
- Update handlers in backend
- Update tests
- Update frontend components

**Step 5: Test Everything**
```bash
pnpm test
cd packages/integration-tests && pnpm test
```

**Step 6: Document Breaking Changes**
- Update project-context.md
- Add migration notes if needed
- Document in commit message

---

### Workflow: Debugging Integration Test

**Step 1: Reproduce Consistently**
```bash
cd packages/integration-tests
pnpm test -- -t "failing test name"
```

**Step 2: Add Debug Logging**
```typescript
console.log('[DEBUG] Request:', JSON.stringify(request, null, 2));
console.log('[DEBUG] Response:', JSON.stringify(response, null, 2));
```

**Step 3: Verify Environment**
```bash
pnpm servers:status
curl http://localhost:4566   # LocalStack
curl http://localhost:3001/health  # Backend
```

**Step 4: Check Schema Validation**
- Look for Zod validation errors in output
- Compare request/response against schemas
- Check field names and types

**Step 5: Isolate the Issue**
- Test handler directly if possible
- Test service in isolation
- Test mapper functions

**Step 6: Fix and Verify**
- Make minimal fix
- Re-run test
- Verify no regressions

---

## Troubleshooting Guide

### Problem: Tests Passing Locally, Failing in CI
**Symptoms**: Tests work on your machine but fail in CI environment

**Diagnosis**:
- Timing issues (race conditions)
- Environment differences
- Test isolation problems

**Solution**:
1. Add explicit waits for async operations
2. Ensure tests don't depend on execution order
3. Mock time-dependent functionality
4. Check for hardcoded values (ports, paths)

---

### Problem: "Module not found" Errors
**Symptoms**: Import statements failing, cannot find module

**Diagnosis**:
- Shared package not built
- Wrong import path
- Missing .js extension (ESM requirement)

**Solution**:
```bash
# Rebuild shared
cd packages/shared && pnpm build

# Check import paths
# ✅ GOOD: import { foo } from './bar.js';
# ❌ BAD: import { foo } from './bar';

# Verify package.json exports
cat packages/shared/package.json | grep exports
```

---

### Problem: Schema Validation Failures
**Symptoms**: Zod throwing validation errors

**Diagnosis**:
- Data doesn't match schema
- Optional fields not handled
- Type coercion needed

**Solution**:
```typescript
// Add detailed error logging
try {
  const parsed = Schema.parse(data);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Validation failed:', error.errors);
  }
  throw error;
}

// Check for common mismatches:
// - String vs number
// - Camel case vs snake case
// - Optional vs required fields
// - Array vs single value
```

---

### Problem: LocalStack Not Working
**Symptoms**: Cannot connect to DynamoDB, services unavailable

**Diagnosis**:
- LocalStack not running
- Wrong endpoint configuration
- Port conflicts

**Solution**:
```bash
# Check if running
pnpm servers:status

# Restart LocalStack
pnpm reset
pnpm dev:localstack

# Verify endpoint
echo $AWS_ENDPOINT_URL  # Should be http://localhost:4566

# Test connectivity
aws --endpoint-url=http://localhost:4566 dynamodb list-tables

# Check LocalStack logs
docker logs localstack  # If using Docker
```

---

### Problem: Vite Cache Issues
**Symptoms**: Changes not reflecting, stale imports

**Diagnosis**:
- Vite caching shared package
- Node modules cache stale

**Solution**:
```bash
# Clear Vite cache
cd packages/frontend
rm -rf node_modules/.vite

# Force rebuild dependencies
pnpm dev --force

# Nuclear option: clean install
cd /Users/shaperosteve/social-media-app
rm -rf node_modules packages/*/node_modules
pnpm install
```

---

### Problem: TypeScript Type Errors
**Symptoms**: tsc reporting type mismatches

**Diagnosis**:
- Shared types not updated
- Import path wrong
- Type vs interface confusion

**Solution**:
```bash
# Rebuild shared types
cd packages/shared && pnpm build

# Check import
import type { User } from '@social-media-app/shared';

# Verify package exports
cat packages/shared/package.json

# Run type check
pnpm type-check
```

---

## Communication Protocols

### Handoff Between Agents

**When completing work, document**:
1. What was accomplished
2. What tests were run
3. Any issues encountered
4. Next recommended steps
5. Uncommitted changes (if any)

**Update these files**:
- `.context/project-context.md` - Add to recent work section
- Git commit messages - Clear description
- Test results - Ensure latest results saved

---

### Reporting Blockers

**When blocked, document**:
1. What you were trying to accomplish
2. What error/issue occurred
3. What you tried to fix it
4. What context might help next agent

**Format**:
```markdown
## BLOCKER: [Short description]
**Date**: YYYY-MM-DD
**Agent**: [Your role]
**Task**: [What you were doing]

### Issue
[Detailed description]

### Attempted Solutions
1. [What you tried]
2. [Result]

### Required to Unblock
- [What would help]

### Context Links
- Files: [List relevant files]
- Commits: [Relevant commit hashes]
- Tests: [Related test files]
```

---

### Context Updates

**Update project-context.md when**:
- New feature completed
- Architecture decision made
- New pattern established
- Technical debt identified
- Blocker resolved

**Update agent-playbook.md when**:
- New workflow discovered
- Better solution found
- Common problem solved
- New agent role defined

---

## Quick Reference Commands

### Most Common Commands
```bash
# Server management (use these 90% of the time)
pnpm dev                    # Start everything
pnpm reset                  # Clean recovery
pnpm servers:status         # Check state

# Testing
pnpm test                   # Run all tests
cd packages/integration-tests && pnpm test  # Integration tests

# Shared package updates
cd packages/shared && pnpm build
cd packages/frontend && rm -rf node_modules/.vite

# Git workflow
git status                  # Check state
git log --oneline -10       # Recent commits
git diff                    # See changes
```

### Emergency Commands (Use Sparingly)
```bash
# Port conflicts
pnpm port:clear

# Process cleanup
pkill -f "node.*server"
pkill -f "pnpm.*dev"

# Full reset
rm -rf node_modules packages/*/node_modules
pnpm install
```

---

## End of Playbook

This playbook should be updated as new patterns emerge and solutions are discovered. Keep it current!

For comprehensive context, always read `project-context.md` first, then use this playbook for tactical execution.
