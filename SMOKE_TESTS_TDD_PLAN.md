# Smoke Tests TDD Implementation Plan

## 🎯 **Methodology: Incremental TDD Approach**

**Core Principles:**
- One small, testable change at a time
- Each step must pass its test before moving to next
- Git commit after each successful step
- No regressions allowed - full test suite must pass
- Each commit represents working, deployable state

**TDD Cycle for Each Step:**
```
1. Write minimal test that fails
2. Implement minimum code to pass
3. Run test to verify it passes
4. Run full test suite to ensure no regressions
5. Git commit with descriptive message
6. Move to next step
```

## 📋 **Implementation Phases**

### **Phase 1: Foundation (3 commits)**

#### **Step 1.1: Create Package Structure**
- **Goal**: Basic smoke-tests package that builds
- **Test**: `pnpm build` succeeds, basic import works
- **Files**: package.json, tsconfig.json, vitest.config.ts, basic test
- **Commit**: "feat: Create smoke-tests package structure with TypeScript setup"
- **Success Criteria**: Package builds, test runner works, can import utilities

#### **Step 1.2: Test ID Generation**
- **Goal**: Core test isolation utility
- **Test**: `generateTestId()` returns unique values
- **Files**: src/utils/test-id.ts, src/utils/test-id.test.ts
- **Commit**: "feat: Add test ID generation utility for data isolation"
- **Success Criteria**: Generates unique IDs, safe for parallel execution

#### **Step 1.3: Basic Health Check**
- **Goal**: Simplest possible external connectivity test
- **Test**: HTTP request to public API succeeds
- **Files**: src/tests/connectivity.test.ts
- **Commit**: "feat: Add basic HTTP connectivity smoke test"
- **Success Criteria**: Can make external HTTP requests

### **Phase 2: Configuration (2 commits)**

#### **Step 2.1: Environment Detection**
- **Goal**: Load environment-specific configurations
- **Test**: Config loads for dev/staging/prod environments
- **Files**: src/config/environments.ts, src/config/environments.test.ts
- **Commit**: "feat: Add environment-based configuration system"
- **Success Criteria**: Loads correct config based on environment variables

#### **Step 2.2: CDK Output Discovery**
- **Goal**: Automatically discover deployed API URLs
- **Test**: Can read CDK outputs and extract API endpoints
- **Files**: src/config/endpoints.ts, src/config/endpoints.test.ts
- **Commit**: "feat: Add CDK output parsing for endpoint discovery"
- **Success Criteria**: Discovers API endpoints from CDK outputs

### **Phase 3: Basic API Tests (3 commits)**

#### **Step 3.1: API Connectivity**
- **Goal**: Basic connectivity to deployed API Gateway
- **Test**: GET request to API health endpoint succeeds
- **Files**: src/tests/api-connectivity.test.ts
- **Commit**: "feat: Add API Gateway connectivity validation"
- **Success Criteria**: Can reach deployed API Gateway

#### **Step 3.2: Hello Endpoint**
- **Goal**: Validate core API functionality
- **Test**: POST to /hello returns expected response
- **Files**: src/tests/api-functionality.test.ts
- **Commit**: "feat: Add hello endpoint smoke test validation"
- **Success Criteria**: Hello endpoint responds correctly

#### **Step 3.3: Error Handling**
- **Goal**: Validate API error responses
- **Test**: Invalid requests return proper error codes
- **Files**: Add to api-functionality.test.ts
- **Commit**: "feat: Add API error response validation"
- **Success Criteria**: API returns proper error codes and messages

### **Phase 4: Authentication Flow (4 commits)**

#### **Step 4.1: Test User Factory**
- **Goal**: Create unique test users
- **Test**: Factory generates valid, unique user data
- **Files**: src/fixtures/user-factory.ts, src/fixtures/user-factory.test.ts
- **Commit**: "feat: Add test user factory for data isolation"
- **Success Criteria**: Generates unique, valid test user data

#### **Step 4.2: User Registration**
- **Goal**: Test user registration endpoint
- **Test**: Register unique test user successfully
- **Files**: src/tests/auth-registration.test.ts
- **Commit**: "feat: Add user registration smoke test"
- **Success Criteria**: Can register new test users

#### **Step 4.3: User Login**
- **Goal**: Test login with created user
- **Test**: Login returns valid tokens
- **Files**: src/tests/auth-login.test.ts
- **Commit**: "feat: Add user login smoke test validation"
- **Success Criteria**: Login returns valid JWT tokens

#### **Step 4.4: Protected Endpoint**
- **Goal**: Test authenticated requests
- **Test**: Access protected endpoint with token
- **Files**: src/tests/auth-protected.test.ts
- **Commit**: "feat: Add protected endpoint access validation"
- **Success Criteria**: Authenticated requests work with JWT tokens

### **Phase 5: Data Operations (3 commits)**

#### **Step 5.1: Profile Operations**
- **Goal**: Test profile read/update
- **Test**: Get and update user profile successfully
- **Files**: src/tests/profile-operations.test.ts
- **Commit**: "feat: Add profile operations smoke tests"
- **Success Criteria**: Can read and update user profiles

#### **Step 5.2: Data Cleanup**
- **Goal**: Clean test data after tests
- **Test**: Cleanup removes test users and data
- **Files**: src/utils/cleanup.ts, src/utils/cleanup.test.ts
- **Commit**: "feat: Add test data cleanup utilities"
- **Success Criteria**: Test data is properly removed after tests

#### **Step 5.3: TTL Validation**
- **Goal**: Ensure test data expires automatically
- **Test**: Verify TTL fields are set on test records
- **Files**: Add TTL validation to existing tests
- **Commit**: "feat: Add TTL-based test data expiration"
- **Success Criteria**: Test data has TTL fields for automatic expiration

### **Phase 6: CI/CD Integration (2 commits)**

#### **Step 6.1: GitHub Actions Integration**
- **Goal**: Run smoke tests in deployment pipeline
- **Test**: Tests execute successfully in GitHub Actions
- **Files**: .github/workflows/smoke-tests.yml
- **Commit**: "feat: Integrate smoke tests into CI/CD pipeline"
- **Success Criteria**: Smoke tests run automatically after deployment

#### **Step 6.2: Deployment Validation**
- **Goal**: Fail deployment if smoke tests fail
- **Test**: Failed smoke tests prevent deployment promotion
- **Files**: Update deployment workflows
- **Commit**: "feat: Add deployment validation with smoke test gates"
- **Success Criteria**: Failed smoke tests block deployment progression

## 📁 **Final Package Structure**
```
packages/smoke-tests/
├── src/
│   ├── config/
│   │   ├── environments.ts       # Environment-specific configs
│   │   ├── environments.test.ts
│   │   ├── endpoints.ts          # CDK output discovery
│   │   └── endpoints.test.ts
│   ├── fixtures/
│   │   ├── user-factory.ts       # Test user generation
│   │   └── user-factory.test.ts
│   ├── utils/
│   │   ├── test-id.ts           # Unique test ID generation
│   │   ├── test-id.test.ts
│   │   ├── cleanup.ts           # Test data cleanup
│   │   └── cleanup.test.ts
│   └── tests/
│       ├── connectivity.test.ts      # Basic connectivity
│       ├── api-connectivity.test.ts  # API Gateway health
│       ├── api-functionality.test.ts # Core API endpoints
│       ├── auth-registration.test.ts # User registration
│       ├── auth-login.test.ts        # User login
│       ├── auth-protected.test.ts    # Protected endpoints
│       └── profile-operations.test.ts # Profile CRUD
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## ✅ **Success Criteria for Each Step**

Every step must meet ALL criteria before moving to next:

1. **Test Passes**: New functionality works as expected
2. **Build Succeeds**: `pnpm build` completes without errors
3. **Suite Passes**: `pnpm test` shows all tests passing
4. **Isolated**: Change doesn't break existing functionality
5. **Documented**: Clear commit message explains what was added
6. **Reviewable**: Change is small enough to understand quickly

## 🚫 **What NOT to Do**

- ❌ Don't skip ahead to complex features
- ❌ Don't make multiple changes in one commit
- ❌ Don't commit if any test is failing
- ❌ Don't add features without corresponding tests
- ❌ Don't create shared test data that could conflict
- ❌ Don't hardcode environment-specific values

## 🎯 **Key Principles**

1. **One Thing at a Time**: Each commit adds exactly one small feature
2. **Always Working**: Every commit represents a working state
3. **Test First**: Write failing test before implementation
4. **Clean History**: Git history tells story of incremental progress
5. **Fail Fast**: If step doesn't work, fix it before moving on

## 📝 **Usage**

To implement this plan:

1. Start with Step 1.1
2. Follow TDD cycle for each step
3. Commit after each successful step
4. Move to next step only when current step is complete
5. Reference this document if you forget the approach

This methodology ensures steady, reliable progress while maintaining code quality and avoiding the brittleness that often plagues integration tests.