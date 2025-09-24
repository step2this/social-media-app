# Social Media Application - Testing Guide

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test-Driven Development (TDD)](#test-driven-development-tdd)
3. [Testing Architecture](#testing-architecture)
4. [Unit Testing](#unit-testing)
5. [Integration Testing](#integration-testing)
6. [End-to-End Testing](#end-to-end-testing)
7. [Testing Tools and Libraries](#testing-tools-and-libraries)
8. [Writing Effective Tests](#writing-effective-tests)
9. [Mocking Strategies](#mocking-strategies)
10. [Test Coverage](#test-coverage)
11. [Continuous Integration](#continuous-integration)
12. [Performance Testing](#performance-testing)

---

## Testing Philosophy

### Core Principles

1. **Test-First Development**: Write tests before implementation
2. **High Coverage, Smart Testing**: Aim for quality over quantity
3. **Fast Feedback Loops**: Tests should run quickly
4. **Isolation**: Tests should not depend on each other
5. **Clarity**: Tests serve as documentation
6. **Maintainability**: Tests should be easy to update

### The Testing Pyramid

```
         ┌────────┐
        /   E2E    \     5%  - Critical user journeys
       /────────────\
      / Integration  \   15% - Service boundaries
     /────────────────\
    /      Unit        \ 80% - Business logic
   /────────────────────\
```

### Why TDD?

Test-Driven Development ensures:
- **Design Quality**: Forces modular, testable code
- **Confidence**: Refactoring without fear
- **Documentation**: Tests describe behavior
- **Regression Prevention**: Catches breaking changes
- **Development Speed**: Faster debugging, fewer production issues

---

## Test-Driven Development (TDD)

### The TDD Cycle

```
┌─────────────────────────────────────┐
│                                     │
│  1. RED                             │
│  Write a failing test               │
│                                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│                                     │
│  2. GREEN                           │
│  Write minimal code to pass         │
│                                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│                                     │
│  3. REFACTOR                        │
│  Improve code while tests pass      │
│                                     │
└─────────────────────────────────────┘
```

### TDD in Practice: Profile Update Feature

#### Step 1: RED - Write Failing Test

```typescript
// packages/backend/src/handlers/profile/update-profile.test.ts
import { describe, it, expect } from 'vitest';
import { handler } from './update-profile';

describe('Update Profile Handler', () => {
  it('should update user profile with valid data', async () => {
    // Arrange
    const event = createMockEvent({
      body: {
        handle: 'johndoe',
        bio: 'Software Developer',
        fullName: 'John Doe'
      },
      headers: {
        authorization: 'Bearer valid-token'
      }
    });

    // Act
    const response = await handler(event);

    // Assert
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({
      profile: {
        handle: 'johndoe',
        bio: 'Software Developer',
        fullName: 'John Doe'
      }
    });
  });
});
```

Run test: `pnpm test`
Result: ❌ FAIL - handler is not defined

#### Step 2: GREEN - Minimal Implementation

```typescript
// packages/backend/src/handlers/profile/update-profile.ts
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile: {
        handle: 'johndoe',
        bio: 'Software Developer',
        fullName: 'John Doe'
      }
    })
  };
};
```

Run test: `pnpm test`
Result: ✅ PASS

#### Step 3: REFACTOR - Improve Implementation

```typescript
// packages/backend/src/handlers/profile/update-profile.ts
import { UpdateProfileWithHandleRequestSchema } from '@social-media-app/shared';
import { createProfileService } from '@social-media-app/dal';
import { extractUserId, createResponse } from '../../utils';

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract and validate user
    const userId = extractUserId(event);
    if (!userId) {
      return createResponse(401, { error: 'Unauthorized' });
    }

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const validatedData = UpdateProfileWithHandleRequestSchema.parse(body);

    // Update profile
    const profileService = createProfileService();
    const updatedProfile = await profileService.updateProfile(userId, validatedData);

    // Return success response
    return createResponse(200, { profile: updatedProfile });
  } catch (error) {
    if (error instanceof ZodError) {
      return createResponse(400, {
        error: 'Validation failed',
        details: error.errors
      });
    }
    return createResponse(500, { error: 'Internal server error' });
  }
};
```

Run test: `pnpm test`
Result: ✅ PASS (with proper mocks)

### TDD Benefits Realized

1. **Clear Requirements**: Test defines expected behavior
2. **Incremental Development**: Small, verifiable steps
3. **Confidence**: Refactoring without breaking functionality
4. **Documentation**: Test shows how to use the handler

---

## Testing Architecture

### Package Structure

```
social-media-app/
├── packages/
│   ├── shared/
│   │   └── src/
│   │       └── schemas/
│   │           ├── auth.schema.ts
│   │           └── auth.schema.test.ts  # Schema tests
│   ├── backend/
│   │   └── src/
│   │       └── handlers/
│   │           ├── auth/
│   │           │   ├── login.ts
│   │           │   └── login.test.ts    # Handler tests
│   │           └── profile/
│   │               ├── update.ts
│   │               └── update.test.ts
│   ├── dal/
│   │   └── src/
│   │       └── services/
│   │           ├── auth.service.ts
│   │           └── auth.service.test.ts # Service tests
│   └── frontend/
│       └── src/
│           ├── components/
│           │   ├── ProfileDisplay.tsx
│           │   └── ProfileDisplay.test.tsx # Component tests
│           └── hooks/
│               ├── useAuth.ts
│               └── useAuth.test.ts      # Hook tests
└── e2e/
    ├── auth.e2e.test.ts                 # E2E tests
    └── profile.e2e.test.ts
```

### Test Configuration

#### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '*.config.ts',
        '**/test-*.ts',
        '**/*.test.ts',
        '**/index.ts'
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  }
});
```

#### Test Setup

```typescript
// packages/frontend/src/test-setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from './mocks/server';

// Start MSW server
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
```

---

## Unit Testing

### Backend Unit Tests

#### Lambda Handler Testing

```typescript
// packages/backend/src/handlers/auth/register.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler } from './register';
import { createDefaultAuthService } from '@social-media-app/dal';

// Mock the DAL
vi.mock('@social-media-app/dal', () => ({
  createDefaultAuthService: vi.fn()
}));

describe('Register Handler', () => {
  const mockAuthService = {
    register: vi.fn(),
    login: vi.fn(),
    getUserById: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createDefaultAuthService as any).mockReturnValue(mockAuthService);
  });

  describe('Successful Registration', () => {
    it('should register user with valid data', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: false,
        createdAt: '2024-01-01T00:00:00Z'
      };

      mockAuthService.register.mockResolvedValue(mockUser);

      const event = createMockEvent({
        body: {
          email: 'test@example.com',
          password: 'SecurePass123!',
          username: 'testuser'
        }
      });

      // Act
      const response = await handler(event);

      // Assert
      expect(response.statusCode).toBe(201);
      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'SecurePass123!',
        username: 'testuser'
      });

      const body = JSON.parse(response.body);
      expect(body.user).toEqual(mockUser);
      expect(body.message).toContain('successfully');
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for invalid email', async () => {
      const event = createMockEvent({
        body: {
          email: 'invalid-email',
          password: 'SecurePass123!',
          username: 'testuser'
        }
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Invalid email');
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should return 400 for weak password', async () => {
      const event = createMockEvent({
        body: {
          email: 'test@example.com',
          password: 'weak',
          username: 'testuser'
        }
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('Password must');
    });
  });

  describe('Error Handling', () => {
    it('should return 409 for duplicate email', async () => {
      mockAuthService.register.mockRejectedValue(
        new ConflictError('Email already exists')
      );

      const event = createMockEvent({
        body: {
          email: 'existing@example.com',
          password: 'SecurePass123!',
          username: 'newuser'
        }
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(409);
      expect(response.body).toContain('already exists');
    });

    it('should return 500 for unexpected errors', async () => {
      mockAuthService.register.mockRejectedValue(
        new Error('Database connection failed')
      );

      const event = createMockEvent({
        body: {
          email: 'test@example.com',
          password: 'SecurePass123!',
          username: 'testuser'
        }
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(500);
      expect(response.body).toContain('Internal server error');
    });
  });
});

// Helper function
function createMockEvent(overrides: any = {}): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: 'POST /auth/register',
    rawPath: '/auth/register',
    headers: {
      'content-type': 'application/json',
      ...overrides.headers
    },
    requestContext: {
      requestId: 'test-request-id',
      http: {
        method: 'POST',
        path: '/auth/register'
      }
    },
    body: JSON.stringify(overrides.body || {}),
    ...overrides
  };
}
```

### Frontend Unit Tests

#### Component Testing

```typescript
// packages/frontend/src/components/profile/ProfileDisplay.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileDisplay } from './ProfileDisplay';
import type { UserProfile } from '@social-media-app/shared';

describe('ProfileDisplay Component', () => {
  const mockProfile: UserProfile = {
    id: 'user-123',
    email: 'john@example.com',
    username: 'johndoe',
    fullName: 'John Doe',
    bio: 'Software Developer',
    avatarUrl: 'https://example.com/avatar.jpg',
    emailVerified: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  };

  describe('Rendering', () => {
    it('should render profile information', () => {
      render(<ProfileDisplay profile={mockProfile} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('@johndoe')).toBeInTheDocument();
      expect(screen.getByText('Software Developer')).toBeInTheDocument();
    });

    it('should render avatar image', () => {
      render(<ProfileDisplay profile={mockProfile} />);

      const avatar = screen.getByRole('img', { name: /avatar/i });
      expect(avatar).toHaveAttribute('src', mockProfile.avatarUrl);
    });

    it('should show placeholder for missing avatar', () => {
      const profileNoAvatar = { ...mockProfile, avatarUrl: undefined };
      render(<ProfileDisplay profile={profileNoAvatar} />);

      expect(screen.getByTestId('avatar-placeholder')).toBeInTheDocument();
    });
  });

  describe('Edit Functionality', () => {
    it('should show edit button when authorized', () => {
      render(
        <ProfileDisplay
          profile={mockProfile}
          showEditButton={true}
        />
      );

      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    it('should not show edit button for other users', () => {
      render(
        <ProfileDisplay
          profile={mockProfile}
          showEditButton={false}
        />
      );

      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    });

    it('should call onEditClick when edit button clicked', () => {
      const mockOnEdit = vi.fn();

      render(
        <ProfileDisplay
          profile={mockProfile}
          showEditButton={true}
          onEditClick={mockOnEdit}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /edit/i }));
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive classes', () => {
      const { container } = render(<ProfileDisplay profile={mockProfile} />);

      const profileCard = container.querySelector('.profile-card');
      expect(profileCard).toHaveClass('md:flex-row', 'flex-col');
    });
  });
});
```

#### Hook Testing

```typescript
// packages/frontend/src/hooks/useAuth.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';
import { apiClient } from '../services/apiClient';

vi.mock('../services/apiClient', () => ({
  apiClient: {
    auth: {
      login: vi.fn(),
      logout: vi.fn(),
      getProfile: vi.fn(),
      refresh: vi.fn()
    }
  }
}));

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should start with unauthenticated state', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('Login', () => {
    it('should login successfully', async () => {
      const mockResponse = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser'
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 900
        }
      };

      apiClient.auth.login.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password'
        });
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockResponse.user);
      expect(localStorage.getItem('refreshToken')).toBe('refresh-token');
    });

    it('should handle login errors', async () => {
      apiClient.auth.login.mockRejectedValue(
        new Error('Invalid credentials')
      );

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.login({
            email: 'test@example.com',
            password: 'wrong'
          });
        })
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token before expiry', async () => {
      const mockRefreshResponse = {
        tokens: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 900
        }
      };

      apiClient.auth.refresh.mockResolvedValue(mockRefreshResponse);
      localStorage.setItem('refreshToken', 'old-refresh-token');

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(apiClient.auth.refresh).toHaveBeenCalledWith({
        refreshToken: 'old-refresh-token'
      });
      expect(localStorage.getItem('refreshToken')).toBe('new-refresh-token');
    });
  });

  describe('Logout', () => {
    it('should clear auth state on logout', async () => {
      apiClient.auth.logout.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());

      // Set initial authenticated state
      act(() => {
        result.current.user = { id: 'user-123' };
        result.current.isAuthenticated = true;
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });
});
```

### DAL Unit Tests

```typescript
// packages/dal/src/services/profile.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProfileService } from './profile.service';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

describe('ProfileService', () => {
  let service: ProfileService;
  let mockClient: Partial<DynamoDBDocumentClient>;

  beforeEach(() => {
    mockClient = {
      send: vi.fn()
    };
    service = new ProfileService(mockClient as DynamoDBDocumentClient, 'test-table');
  });

  describe('getProfileByHandle', () => {
    it('should retrieve profile by handle', async () => {
      const mockProfile = {
        id: 'user-123',
        handle: 'johndoe',
        fullName: 'John Doe',
        bio: 'Developer'
      };

      mockClient.send.mockResolvedValue({
        Items: [{ ...mockProfile, PK: 'HANDLE#johndoe', SK: 'HANDLE#johndoe' }]
      });

      const result = await service.getProfileByHandle('johndoe');

      expect(result).toEqual(mockProfile);
      expect(mockClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            KeyConditionExpression: 'PK = :pk AND SK = :sk',
            ExpressionAttributeValues: {
              ':pk': 'HANDLE#johndoe',
              ':sk': 'HANDLE#johndoe'
            }
          })
        })
      );
    });

    it('should return null for non-existent handle', async () => {
      mockClient.send.mockResolvedValue({ Items: [] });

      const result = await service.getProfileByHandle('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should update profile fields', async () => {
      const updates = {
        bio: 'Senior Developer',
        fullName: 'John Smith'
      };

      const updatedProfile = {
        id: 'user-123',
        handle: 'johndoe',
        ...updates,
        updatedAt: '2024-01-15T00:00:00Z'
      };

      mockClient.send.mockResolvedValue({
        Attributes: updatedProfile
      });

      const result = await service.updateProfile('user-123', updates);

      expect(result).toEqual(updatedProfile);
      expect(mockClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            UpdateExpression: expect.stringContaining('SET'),
            Key: {
              PK: 'USER#user-123',
              SK: 'USER#user-123'
            }
          })
        })
      );
    });

    it('should validate handle uniqueness on update', async () => {
      const updates = { handle: 'existinghandle' };

      // First call checks handle existence
      mockClient.send.mockResolvedValueOnce({
        Items: [{ PK: 'HANDLE#existinghandle' }]
      });

      await expect(
        service.updateProfile('user-123', updates)
      ).rejects.toThrow('Handle already taken');
    });
  });
});
```

---

## Integration Testing

### API Integration Tests

```typescript
// packages/backend/src/integration/auth-flow.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { handler as registerHandler } from '../handlers/auth/register';
import { handler as loginHandler } from '../handlers/auth/login';
import { handler as profileHandler } from '../handlers/auth/profile';

describe('Authentication Flow Integration', () => {
  let dynamoClient: DynamoDBDocumentClient;
  const testTableName = 'test-auth-table';

  beforeAll(async () => {
    // Setup test database
    const client = new DynamoDBClient({ region: 'us-east-1' });
    dynamoClient = DynamoDBDocumentClient.from(client);

    // Create test table
    await createTestTable(dynamoClient, testTableName);
  });

  afterAll(async () => {
    // Cleanup test table
    await deleteTestTable(dynamoClient, testTableName);
  });

  it('should complete full authentication flow', async () => {
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPass123!',
      username: `user${Date.now()}`,
      fullName: 'Test User'
    };

    // Step 1: Register user
    const registerEvent = createEvent('POST', '/auth/register', testUser);
    const registerResponse = await registerHandler(registerEvent);

    expect(registerResponse.statusCode).toBe(201);
    const registerBody = JSON.parse(registerResponse.body);
    expect(registerBody.user.email).toBe(testUser.email);

    // Step 2: Login
    const loginEvent = createEvent('POST', '/auth/login', {
      email: testUser.email,
      password: testUser.password
    });
    const loginResponse = await loginHandler(loginEvent);

    expect(loginResponse.statusCode).toBe(200);
    const loginBody = JSON.parse(loginResponse.body);
    expect(loginBody.tokens.accessToken).toBeDefined();

    // Step 3: Access protected route
    const profileEvent = createEvent('GET', '/auth/profile', null, {
      authorization: `Bearer ${loginBody.tokens.accessToken}`
    });
    const profileResponse = await profileHandler(profileEvent);

    expect(profileResponse.statusCode).toBe(200);
    const profileBody = JSON.parse(profileResponse.body);
    expect(profileBody.user.email).toBe(testUser.email);
  });

  it('should prevent duplicate registrations', async () => {
    const testUser = {
      email: `duplicate-${Date.now()}@example.com`,
      password: 'TestPass123!',
      username: `dup${Date.now()}`
    };

    // First registration
    const firstEvent = createEvent('POST', '/auth/register', testUser);
    const firstResponse = await registerHandler(firstEvent);
    expect(firstResponse.statusCode).toBe(201);

    // Duplicate registration
    const secondEvent = createEvent('POST', '/auth/register', testUser);
    const secondResponse = await registerHandler(secondEvent);
    expect(secondResponse.statusCode).toBe(409);
    expect(secondResponse.body).toContain('already exists');
  });
});
```

### Service Integration Tests

```typescript
// packages/dal/src/integration/profile-posts.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ProfileService } from '../services/profile.service';
import { PostService } from '../services/post.service';
import { setupTestDatabase, cleanupTestDatabase } from '../test-utils';

describe('Profile and Posts Integration', () => {
  let profileService: ProfileService;
  let postService: PostService;
  let testUserId: string;

  beforeAll(async () => {
    const { client, tableName } = await setupTestDatabase();
    profileService = new ProfileService(client, tableName);
    postService = new PostService(client, tableName);

    // Create test user
    testUserId = await createTestUser(profileService);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  it('should update post count when creating posts', async () => {
    // Get initial profile
    const initialProfile = await profileService.getProfile(testUserId);
    expect(initialProfile.postsCount).toBe(0);

    // Create first post
    const post1 = await postService.createPost(testUserId, {
      caption: 'First post',
      imageUrl: 'https://example.com/image1.jpg',
      thumbnailUrl: 'https://example.com/thumb1.jpg'
    });

    // Check updated count
    const afterFirst = await profileService.getProfile(testUserId);
    expect(afterFirst.postsCount).toBe(1);

    // Create second post
    const post2 = await postService.createPost(testUserId, {
      caption: 'Second post',
      imageUrl: 'https://example.com/image2.jpg',
      thumbnailUrl: 'https://example.com/thumb2.jpg'
    });

    // Check final count
    const afterSecond = await profileService.getProfile(testUserId);
    expect(afterSecond.postsCount).toBe(2);

    // Verify posts are retrievable
    const userPosts = await postService.getUserPosts(testUserId);
    expect(userPosts.posts).toHaveLength(2);
    expect(userPosts.totalCount).toBe(2);
  });

  it('should maintain consistency when deleting posts', async () => {
    // Create post
    const post = await postService.createPost(testUserId, {
      caption: 'Post to delete',
      imageUrl: 'https://example.com/image.jpg',
      thumbnailUrl: 'https://example.com/thumb.jpg'
    });

    const beforeDelete = await profileService.getProfile(testUserId);
    const initialCount = beforeDelete.postsCount;

    // Delete post
    await postService.deletePost(post.id, testUserId);

    // Verify count decreased
    const afterDelete = await profileService.getProfile(testUserId);
    expect(afterDelete.postsCount).toBe(initialCount - 1);

    // Verify post is not retrievable
    const deletedPost = await postService.getPost(post.id);
    expect(deletedPost).toBeNull();
  });
});
```

---

## End-to-End Testing

### E2E Test Setup

```typescript
// e2e/setup.ts
import { chromium, type Browser, type Page } from 'playwright';
import { spawn, type ChildProcess } from 'child_process';

let browser: Browser;
let page: Page;
let backendProcess: ChildProcess;
let frontendProcess: ChildProcess;

export async function setupE2E() {
  // Start backend
  backendProcess = spawn('pnpm', ['run', 'dev:backend'], {
    env: { ...process.env, PORT: '4000' }
  });

  // Start frontend
  frontendProcess = spawn('pnpm', ['run', 'dev:frontend'], {
    env: { ...process.env, VITE_API_URL: 'http://localhost:4000' }
  });

  // Wait for services to be ready
  await waitForService('http://localhost:4000/health');
  await waitForService('http://localhost:3000');

  // Launch browser
  browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false'
  });

  page = await browser.newPage();

  return { browser, page };
}

export async function teardownE2E() {
  await browser?.close();
  backendProcess?.kill();
  frontendProcess?.kill();
}
```

### E2E User Journey Tests

```typescript
// e2e/user-journey.test.ts
import { test, expect } from '@playwright/test';
import { setupE2E, teardownE2E } from './setup';

test.describe('User Registration and Profile Setup', () => {
  test.beforeAll(async () => {
    await setupE2E();
  });

  test.afterAll(async () => {
    await teardownE2E();
  });

  test('should complete full user journey', async ({ page }) => {
    // Generate unique test data
    const testEmail = `e2e-${Date.now()}@example.com`;
    const testUsername = `e2euser${Date.now()}`;

    // Step 1: Navigate to app
    await page.goto('http://localhost:3000');
    await expect(page).toHaveTitle('Social Media App');

    // Step 2: Open registration
    await page.click('button:has-text("Sign In")');
    await page.click('text=Don\'t have an account');

    // Step 3: Fill registration form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'E2ETest123!');
    await page.fill('input[name="username"]', testUsername);
    await page.fill('input[name="fullName"]', 'E2E Test User');

    // Step 4: Submit registration
    await page.click('button:has-text("Sign Up")');

    // Step 5: Verify redirect to dashboard
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Welcome')).toBeVisible();

    // Step 6: Navigate to profile
    await page.click('a:has-text("My Profile")');
    await expect(page).toHaveURL('/profile');

    // Step 7: Edit profile
    await page.click('button:has-text("Edit Profile")');

    // Step 8: Update bio
    await page.fill('textarea[name="bio"]', 'E2E test bio');
    await page.click('button:has-text("Save")');

    // Step 9: Verify update
    await expect(page.locator('text=E2E test bio')).toBeVisible();

    // Step 10: Create a post (when UI available)
    // await page.click('button:has-text("Create Post")');
    // await page.setInputFiles('input[type="file"]', 'test-image.jpg');
    // await page.fill('textarea[name="caption"]', 'My first post!');
    // await page.click('button:has-text("Post")');

    // Step 11: Logout
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL('/login');
  });

  test('should handle errors gracefully', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Try to access protected route without auth
    await page.goto('http://localhost:3000/profile');
    await expect(page).toHaveURL('/login');

    // Try invalid login
    await page.click('button:has-text("Sign In")');
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'WrongPass123!');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
});
```

### Visual Regression Testing

```typescript
// e2e/visual-regression.test.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('profile page appearance', async ({ page }) => {
    // Login first
    await loginAsTestUser(page);

    // Navigate to profile
    await page.goto('http://localhost:3000/profile');

    // Take screenshot
    await expect(page).toHaveScreenshot('profile-page.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('mobile responsive layout', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await loginAsTestUser(page);
    await page.goto('http://localhost:3000/profile');

    await expect(page).toHaveScreenshot('profile-mobile.png', {
      fullPage: true
    });
  });

  test('dark mode appearance', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });

    await loginAsTestUser(page);
    await page.goto('http://localhost:3000/profile');

    await expect(page).toHaveScreenshot('profile-dark.png', {
      fullPage: true
    });
  });
});
```

---

## Testing Tools and Libraries

### Core Testing Framework

#### Vitest
- **Purpose**: Fast unit test runner
- **Features**: ESM support, TypeScript, parallel execution
- **Configuration**: `vitest.config.ts`

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Frontend Testing Libraries

#### React Testing Library
- **Purpose**: Component testing
- **Philosophy**: Test user behavior, not implementation
- **Key APIs**: render, screen, fireEvent, waitFor

```typescript
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
```

#### MSW (Mock Service Worker)
- **Purpose**: API mocking
- **Benefits**: Intercepts real network requests
- **Setup**: `src/mocks/handlers.ts`

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.post('/api/login', (req, res, ctx) => {
    return res(ctx.json({ token: 'mock-token' }));
  })
);
```

### Backend Testing Libraries

#### AWS SDK Mocks
- **Purpose**: Mock AWS services
- **Library**: Custom mocks or aws-sdk-client-mock

```typescript
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const ddbMock = mockClient(DynamoDBDocumentClient);
```

### E2E Testing Tools

#### Playwright
- **Purpose**: Browser automation
- **Features**: Cross-browser, parallel execution, visual testing
- **Config**: `playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
});
```

---

## Writing Effective Tests

### Test Structure - AAA Pattern

```typescript
describe('Feature', () => {
  it('should behavior description', () => {
    // Arrange - Set up test data and conditions
    const input = { name: 'Test' };
    const expected = { id: 1, name: 'Test' };

    // Act - Execute the code being tested
    const result = createItem(input);

    // Assert - Verify the outcome
    expect(result).toEqual(expected);
  });
});
```

### Naming Conventions

```typescript
// Good test names
it('should return 401 when authentication token is missing')
it('should update user profile when valid data is provided')
it('should throw ValidationError for invalid email format')

// Bad test names
it('test login')
it('works')
it('profile update')
```

### Test Data Builders

```typescript
// test-utils/builders.ts
export class UserBuilder {
  private user = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    fullName: 'Test User'
  };

  withId(id: string) {
    this.user.id = id;
    return this;
  }

  withEmail(email: string) {
    this.user.email = email;
    return this;
  }

  build() {
    return { ...this.user };
  }
}

// Usage
const user = new UserBuilder()
  .withEmail('custom@example.com')
  .build();
```

### Parameterized Tests

```typescript
describe.each([
  { input: '', expected: 'Required' },
  { input: 'a', expected: 'Too short' },
  { input: 'a'.repeat(101), expected: 'Too long' },
  { input: 'valid input', expected: null }
])('validation with input: $input', ({ input, expected }) => {
  it(`should return "${expected}"`, () => {
    const result = validate(input);
    expect(result).toBe(expected);
  });
});
```

---

## Mocking Strategies

### Dependency Injection

```typescript
// Service with injected dependencies
export class ProfileService {
  constructor(
    private db: DynamoDBDocumentClient,
    private storage: S3Client,
    private config: Config
  ) {}

  async updateProfile(userId: string, data: UpdateData) {
    // Implementation
  }
}

// Test with mocks
const mockDb = createMockDb();
const mockStorage = createMockStorage();
const service = new ProfileService(mockDb, mockStorage, testConfig);
```

### Partial Mocking

```typescript
// Mock specific methods
vi.mock('../utils/jwt', () => ({
  ...vi.importActual('../utils/jwt'),
  verifyToken: vi.fn().mockResolvedValue({ userId: 'test-user' })
}));
```

### Spy vs Mock vs Stub

```typescript
// Spy - Observe calls without changing behavior
const consoleSpy = vi.spyOn(console, 'log');
functionUnderTest();
expect(consoleSpy).toHaveBeenCalledWith('Expected message');

// Mock - Replace with controllable behavior
const mockFn = vi.fn().mockReturnValue('mocked value');

// Stub - Simple replacement
const stub = () => 'stubbed value';
```

---

## Test Coverage

### Coverage Metrics

```yaml
# Coverage thresholds in vitest.config.ts
coverage:
  thresholds:
    branches: 80    # Decision paths
    functions: 80   # Function definitions
    lines: 80       # Executable lines
    statements: 80  # All statements
```

### Coverage Reports

```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open coverage/index.html
```

### What to Test

#### High Priority
- Business logic
- Data transformations
- Error handling
- Edge cases
- Security boundaries

#### Medium Priority
- Integration points
- UI interactions
- Configuration logic

#### Low Priority
- Simple getters/setters
- Framework boilerplate
- Third-party library calls

### Coverage Best Practices

1. **Quality over Quantity**: 100% coverage doesn't mean bug-free
2. **Test Behavior**: Focus on outcomes, not implementation
3. **Critical Paths**: Ensure high coverage for critical features
4. **Exclude Appropriately**: Don't test framework code

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20, 22]

    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build packages
        run: pnpm build:all

      - name: Run tests
        run: pnpm test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-artifacts
          path: |
            coverage/
            playwright-report/
            test-results/
```

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged && pnpm test:affected"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "vitest related --run"
    ]
  }
}
```

---

## Performance Testing

### Load Testing

```typescript
// performance/load-test.ts
import { check } from 'k6';
import http from 'k6/http';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    errors: ['rate<0.1'],           // Error rate under 10%
    http_req_duration: ['p(95)<500'] // 95% requests under 500ms
  }
};

export default function () {
  const res = http.post(
    'https://api.example.com/auth/login',
    JSON.stringify({
      email: 'test@example.com',
      password: 'TestPass123!'
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  errorRate.add(res.status !== 200);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has access token': (r) => JSON.parse(r.body).tokens?.accessToken
  });
}
```

### Benchmark Testing

```typescript
// benchmarks/profile-update.bench.ts
import { bench, describe } from 'vitest';
import { updateProfile } from '../src/services/profile';

describe('Profile Update Performance', () => {
  bench('update single field', async () => {
    await updateProfile('user-123', { bio: 'New bio' });
  });

  bench('update multiple fields', async () => {
    await updateProfile('user-123', {
      bio: 'New bio',
      fullName: 'New Name',
      handle: 'newhandle'
    });
  });

  bench('update with validation', async () => {
    await updateProfile('user-123', {
      bio: 'a'.repeat(500), // Max length
      handle: 'complex_handle-123'
    });
  });
});
```

---

## Testing Best Practices

### Do's

1. **Write Tests First**: Follow TDD cycle
2. **Test Behavior**: Focus on what, not how
3. **Keep Tests Simple**: One assertion per test when possible
4. **Use Descriptive Names**: Test names should document behavior
5. **Maintain Test Data**: Use builders and fixtures
6. **Run Tests Frequently**: Integrate into development workflow
7. **Mock External Dependencies**: Keep tests isolated
8. **Test Edge Cases**: Empty, null, boundary values

### Don'ts

1. **Don't Test Implementation**: Avoid testing private methods
2. **Don't Ignore Failing Tests**: Fix immediately or remove
3. **Don't Over-Mock**: Keep some integration points
4. **Don't Share State**: Each test should be independent
5. **Don't Test Framework Code**: Trust the framework
6. **Don't Sacrifice Clarity**: Readable over clever
7. **Don't Skip Difficult Tests**: They often find bugs

### Testing Checklist

- [ ] Unit tests for business logic
- [ ] Integration tests for service boundaries
- [ ] E2E tests for critical paths
- [ ] Error scenarios tested
- [ ] Edge cases covered
- [ ] Performance benchmarks for critical operations
- [ ] Visual regression tests for UI
- [ ] Accessibility tests included
- [ ] Security scenarios validated
- [ ] Documentation updated

---

*Testing Guide Version 1.0.0 - Emphasizing Test-Driven Development*