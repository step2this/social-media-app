# Social Media Application - Architecture Documentation

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Technology Stack](#technology-stack)
4. [Design Principles](#design-principles)
5. [Core Components](#core-components)
6. [Data Models](#data-models)
7. [API Architecture](#api-architecture)
8. [Security Model](#security-model)
9. [Frontend Architecture](#frontend-architecture)
10. [Infrastructure and Deployment](#infrastructure-and-deployment)
11. [Testing Strategy](#testing-strategy)
12. [Development Workflow](#development-workflow)

---

## Executive Summary

The Social Media Application is a modern, full-stack web application built with TypeScript, React, and AWS serverless infrastructure. The system follows a monorepo architecture with shared schemas ensuring type safety and consistency across all layers. The application implements a Test-Driven Development (TDD) approach with comprehensive testing at unit, integration, and end-to-end levels.

### Key Features
- **User Authentication**: JWT-based authentication with refresh tokens
- **Profile Management**: User profiles with customizable handles, bios, and avatars
- **Content Sharing**: Post creation with image uploads and tagging
- **Scalable Infrastructure**: Serverless architecture with AWS Lambda and DynamoDB
- **Type Safety**: End-to-end TypeScript with Zod schema validation
- **Modern Development**: ESM modules, Node.js 22, and pnpm workspace

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Components  │  Hooks  │  Services  │  Stores (Zustand)  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTPS
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway (AWS HTTP API)                   │
│                         CORS Configured                         │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                          ▼
┌─────────────────────────────┐  ┌─────────────────────────────┐
│     Auth Lambda Functions    │  │   Profile Lambda Functions  │
│  • Register                  │  │  • Get Profile              │
│  • Login                     │  │  • Update Profile           │
│  • Refresh                   │  │  • Upload URLs              │
│  • Logout                    │  │  • Posts Management         │
└─────────────────────────────┘  └─────────────────────────────┘
                    │                          │
                    └────────────┬────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Access Layer (DAL)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Auth Service  │  Profile Service  │  Post Service       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                          ▼
┌─────────────────────────────┐  ┌─────────────────────────────┐
│     DynamoDB Table           │  │       S3 Media Bucket       │
│  • Users                     │  │  • Profile Pictures         │
│  • Posts                     │  │  • Post Images              │
│  • Sessions                  │  │  • Thumbnails               │
└─────────────────────────────┘  └─────────────────────────────┘
```

### Architectural Decisions

1. **Monorepo Structure**: Enables code sharing and consistent versioning across packages
2. **Serverless First**: Eliminates server management overhead and provides automatic scaling
3. **Single Table Design**: DynamoDB single table pattern for efficient queries and cost optimization
4. **Shared Schemas**: Zod schemas in shared package ensure runtime validation and type safety
5. **JWT Authentication**: Stateless authentication with refresh token rotation
6. **CDN Distribution**: CloudFront for static assets and media delivery

---

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: React Router v6
- **State Management**: Zustand for global state
- **HTTP Client**: Native Fetch API with custom ApiClient wrapper
- **Testing**: Vitest + React Testing Library + MSW for mocking

### Backend
- **Runtime**: Node.js 22 with native ESM support
- **Language**: TypeScript 5.3+
- **Functions**: AWS Lambda with NodejsFunction construct
- **API**: AWS API Gateway HTTP API
- **Validation**: Zod for runtime schema validation
- **Testing**: Vitest with extensive mocking

### Infrastructure
- **IaC**: AWS CDK v2 with TypeScript
- **Database**: DynamoDB with single table design
- **Storage**: S3 for media storage
- **CDN**: CloudFront for content delivery
- **Deployment**: Multi-stack CDK application

### Shared
- **Schema Definition**: Zod schemas
- **Type Generation**: TypeScript inference from Zod
- **Package Management**: pnpm workspaces
- **Code Quality**: ESLint, Prettier, Husky

---

## Design Principles

### 1. Single Source of Truth
All data schemas, validation rules, and type definitions are maintained in the `@social-media-app/shared` package. This ensures:
- **No Schema Drift**: Client and server always use identical validation
- **Type Safety**: Full TypeScript support across the stack
- **Maintainability**: Changes propagate automatically to all consumers

### 2. Functional Programming
The codebase emphasizes functional programming patterns:
```typescript
// Preferred: Functional composition
const processedPosts = posts
  .filter(post => post.isPublic)
  .map(transformPost)
  .reduce(aggregateMetrics, initialMetrics);

// Avoided: Imperative loops
for (let i = 0; i < posts.length; i++) {
  if (posts[i].isPublic) {
    // Process...
  }
}
```

### 3. Test-Driven Development (TDD)
Every feature follows the TDD cycle:
1. **Red**: Write failing tests that define expected behavior
2. **Green**: Implement minimal code to pass tests
3. **Refactor**: Improve code quality while maintaining test coverage

### 4. Separation of Concerns
Clear boundaries between layers:
- **Presentation Layer**: React components handle UI only
- **Business Logic**: Services and DAL contain domain logic
- **Infrastructure**: CDK stacks manage AWS resources
- **Data Layer**: DynamoDB and S3 for persistence

### 5. Error Handling Strategy
Comprehensive error handling with context:
```typescript
try {
  const result = await operation();
  return result;
} catch (error) {
  throw new AppError({
    code: 'OPERATION_FAILED',
    message: 'Operation failed',
    context: { userId, operation: 'operationName' },
    cause: error
  });
}
```

---

## Core Components

### Authentication System

The authentication system implements JWT-based authentication with refresh token rotation:

#### Components
1. **Register Handler** (`packages/backend/src/handlers/auth/register.ts`)
   - Validates registration data against schema
   - Hashes passwords using bcrypt
   - Creates user record in DynamoDB
   - Returns success message (no automatic login)

2. **Login Handler** (`packages/backend/src/handlers/auth/login.ts`)
   - Validates credentials
   - Generates access token (15 min expiry)
   - Generates refresh token (30 days expiry)
   - Stores session in DynamoDB

3. **Refresh Handler** (`packages/backend/src/handlers/auth/refresh.ts`)
   - Validates refresh token
   - Issues new token pair
   - Implements token rotation for security

4. **JWT Provider** (`packages/backend/src/utils/jwt.ts`)
   - Centralized JWT operations
   - Configurable expiry times
   - RS256 algorithm for production

### Profile Management System

#### Components
1. **Profile Service** (`packages/dal/src/services/profile.service.ts`)
   - CRUD operations for user profiles
   - Handle uniqueness validation
   - Profile picture management

2. **Profile Handlers**
   - **Get Profile**: Public profile retrieval by handle
   - **Update Profile**: Authenticated profile updates
   - **Upload URL**: Presigned S3 URLs for media uploads

3. **Profile Components** (`packages/frontend/src/components/profile/`)
   - **ProfileDisplay**: Reusable profile view component
   - **MyProfilePage**: Authenticated user profile with edit capability
   - **ProfilePage**: Public profile view

### Content Management System

#### Post Creation Flow
1. User initiates post creation
2. Frontend requests presigned upload URLs
3. Backend generates S3 presigned URLs for image and thumbnail
4. Frontend uploads media directly to S3
5. Backend creates post record in DynamoDB
6. Post appears in user's profile grid

#### Components
1. **Post Service** (`packages/dal/src/services/post.service.ts`)
   - Post CRUD operations
   - User post queries with pagination
   - Access control validation

2. **Post Handlers**
   - **Create Post**: Generates upload URLs and creates post record
   - **Get User Posts**: Paginated post retrieval
   - **Delete Post**: Soft delete with ownership validation

---

## Data Models

### DynamoDB Single Table Design

The application uses a single DynamoDB table with composite keys:

```typescript
// Primary Key Structure
PK: string  // Partition Key
SK: string  // Sort Key

// Entity Patterns
USER#<userId>           USER#<userId>         // User entity
USER#<userId>           POST#<postId>         // User's posts
USER#<userId>           SESSION#<sessionId>   // User sessions
HANDLE#<handle>         HANDLE#<handle>       // Handle uniqueness
EMAIL#<email>           EMAIL#<email>         // Email uniqueness
```

### User Entity Schema
```typescript
{
  id: string;              // UUID v4
  email: string;           // Unique, validated email
  username: string;        // Unique username
  handle: string;          // Unique profile handle
  passwordHash: string;    // Bcrypt hash
  fullName?: string;       // Optional display name
  bio?: string;            // Profile description
  avatarUrl?: string;      // Profile picture URL
  profilePictureUrl?: string;      // Full-size profile image
  profilePictureThumbnailUrl?: string; // Thumbnail version
  emailVerified: boolean;  // Email verification status
  postsCount: number;      // Denormalized post count
  followersCount: number;  // Denormalized follower count
  followingCount: number;  // Denormalized following count
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
}
```

### Post Entity Schema
```typescript
{
  id: string;              // UUID v4
  userId: string;          // Post owner ID
  userHandle: string;      // Denormalized for queries
  imageUrl: string;        // S3 URL for full image
  thumbnailUrl: string;    // S3 URL for thumbnail
  caption?: string;        // Optional post description
  tags: string[];          // Array of hashtags
  likesCount: number;      // Denormalized like count
  commentsCount: number;   // Denormalized comment count
  isPublic: boolean;       // Visibility flag
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
}
```

### Session Entity Schema
```typescript
{
  sessionId: string;       // UUID v4
  userId: string;          // Session owner
  refreshToken: string;    // Hashed refresh token
  deviceInfo?: {           // Optional device metadata
    userAgent?: string;
    platform?: string;
  };
  expiresAt: string;       // ISO timestamp
  createdAt: string;       // ISO timestamp
}
```

---

## API Architecture

### RESTful Endpoints

#### Authentication Endpoints
```
POST   /auth/register     - User registration
POST   /auth/login        - User login
POST   /auth/logout       - User logout (requires auth)
POST   /auth/refresh      - Refresh access token
GET    /auth/profile      - Get authenticated user profile
PUT    /auth/profile      - Update authenticated user profile
```

#### Profile Endpoints
```
GET    /profile/{handle}  - Get public profile by handle
PUT    /profile           - Update authenticated user profile
POST   /profile/upload-url - Get presigned URLs for uploads
```

#### Post Endpoints
```
POST   /posts             - Create new post (requires auth)
GET    /profile/{handle}/posts - Get user's posts (paginated)
DELETE /posts/{postId}    - Delete post (requires auth, owner only)
```

### Request/Response Patterns

All API responses follow a consistent structure:

#### Success Response
```typescript
{
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'X-Correlation-Id': 'request-id'
  },
  body: {
    // Response data based on endpoint schema
  }
}
```

#### Error Response
```typescript
{
  statusCode: 400 | 401 | 403 | 404 | 500,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  },
  body: {
    error: {
      code: 'ERROR_CODE',
      message: 'Human-readable error message',
      details?: {} // Optional additional context
    }
  }
}
```

### CORS Configuration

The API Gateway is configured with comprehensive CORS support:

```typescript
corsPreflight: {
  allowOrigins: environment === 'prod'
    ? ['https://yourdomain.com']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'X-Amz-Date',
    'X-Api-Key',
    'X-Amz-Security-Token',
    'X-Correlation-Id'
  ],
  exposeHeaders: ['X-Correlation-Id'],
  allowCredentials: false,
  maxAge: Duration.seconds(3600)
}
```

---

## Security Model

### Authentication Flow

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│  Client  │      │   API    │      │  Lambda  │      │ DynamoDB │
└────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘
     │                  │                  │                  │
     │ POST /auth/login │                  │                  │
     │─────────────────>│                  │                  │
     │                  │ Invoke Lambda    │                  │
     │                  │─────────────────>│                  │
     │                  │                  │ Verify Password │
     │                  │                  │─────────────────>│
     │                  │                  │<─────────────────│
     │                  │                  │                  │
     │                  │                  │ Generate Tokens │
     │                  │                  │                  │
     │                  │                  │ Store Session   │
     │                  │                  │─────────────────>│
     │                  │                  │<─────────────────│
     │                  │<─────────────────│                  │
     │<─────────────────│                  │                  │
     │  Access Token +  │                  │                  │
     │  Refresh Token   │                  │                  │
```

### Token Management

1. **Access Token**
   - Short-lived (15 minutes)
   - Contains user ID and basic claims
   - Used for API authentication
   - Stored in memory/session storage

2. **Refresh Token**
   - Long-lived (30 days)
   - Stored securely (httpOnly cookie recommended)
   - Used only for token refresh
   - Rotated on each refresh

### Authorization

Authorization is handled at multiple levels:

1. **API Gateway Level**: Public vs authenticated routes
2. **Lambda Level**: Token validation and extraction
3. **Service Level**: Business logic authorization
4. **Database Level**: Row-level security through key design

### Security Best Practices

1. **Password Security**
   - Bcrypt with salt rounds of 10
   - Minimum 8 characters with complexity requirements
   - No password history or reuse checking (future enhancement)

2. **Token Security**
   - JWT with RS256 in production
   - Token rotation on refresh
   - Secure token storage recommendations

3. **Data Protection**
   - HTTPS only in production
   - Encryption at rest (DynamoDB, S3)
   - Sensitive data never logged

4. **Input Validation**
   - Zod schema validation on all inputs
   - SQL injection prevention (NoSQL database)
   - XSS prevention through React's default escaping

---

## Frontend Architecture

### Component Hierarchy

```
App.tsx
├── Router
│   ├── PublicRoutes
│   │   ├── LoginPage
│   │   └── ProfilePage (public view)
│   └── ProtectedRoutes
│       ├── HelloWorld
│       ├── MyProfilePage
│       └── DashboardPage
├── AuthModal
│   ├── LoginForm
│   └── RegisterForm
└── Common Components
    ├── LoadingStates
    ├── ErrorBoundary
    └── Navigation
```

### State Management

The application uses Zustand for global state management:

```typescript
// Auth Store
interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

// Profile Store (example)
interface ProfileState {
  profiles: Map<string, Profile>;
  currentProfile: Profile | null;
  fetchProfile: (handle: string) => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
}
```

### Service Layer

The frontend uses a centralized API client:

```typescript
class ApiClient {
  private baseUrl: string;
  private accessToken: string | null;

  auth = {
    login: (data: LoginRequest) => this.post('/auth/login', data),
    register: (data: RegisterRequest) => this.post('/auth/register', data),
    logout: () => this.post('/auth/logout'),
    getProfile: () => this.get('/auth/profile'),
    updateProfile: (data: UpdateProfileRequest) => this.put('/auth/profile', data)
  };

  profile = {
    getByHandle: (handle: string) => this.get(`/profile/${handle}`),
    update: (data: UpdateProfileRequest) => this.put('/profile', data),
    getUploadUrl: (data: UploadUrlRequest) => this.post('/profile/upload-url', data)
  };

  posts = {
    create: (data: CreatePostRequest) => this.post('/posts', data),
    getUserPosts: (handle: string, params?: PaginationParams) =>
      this.get(`/profile/${handle}/posts`, params),
    delete: (postId: string) => this.delete(`/posts/${postId}`)
  };
}
```

### Component Patterns

#### 1. Container/Presentational Pattern
```typescript
// Container Component (MyProfilePage.tsx)
export const MyProfilePage = () => {
  const { profile, loading, error } = useProfile();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} />;

  return <ProfileDisplay profile={profile} />;
};

// Presentational Component (ProfileDisplay.tsx)
export const ProfileDisplay: FC<{ profile: Profile }> = ({ profile }) => {
  return (
    <div className="profile-display">
      {/* Pure presentation logic */}
    </div>
  );
};
```

#### 2. Custom Hooks Pattern
```typescript
// useAuth hook
export const useAuth = () => {
  const store = useAuthStore();

  useEffect(() => {
    store.initializeAuth();
  }, []);

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    login: store.login,
    logout: store.logout
  };
};
```

#### 3. Protected Route Pattern
```typescript
export const ProtectedRoute: FC<{ children: ReactNode; requireAuth?: boolean }> = ({
  children,
  requireAuth = true
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
```

---

## Infrastructure and Deployment

### CDK Stack Architecture

The infrastructure is organized into multiple CDK stacks for separation of concerns:

```
infrastructure/
├── bin/
│   ├── app.ts                 # Main CDK app entry point
│   └── backend-only-deploy.ts # Backend-only deployment
├── lib/
│   ├── stacks/
│   │   ├── database-stack.ts  # DynamoDB table
│   │   ├── media-stack.ts     # S3 and CloudFront
│   │   ├── api-stack.ts       # API Gateway and Lambdas
│   │   └── frontend-stack.ts  # Frontend hosting (future)
│   └── constructs/
│       ├── auth-lambdas.ts    # Authentication functions
│       └── profile-lambdas.ts # Profile/post functions
```

### Stack Dependencies

```
DatabaseStack
     │
     ├──> MediaStack
     │         │
     └─────────┴──> ApiStack
                        │
                        └──> FrontendStack
```

### Environment Configuration

The application supports multiple environments:

```typescript
interface EnvironmentConfig {
  environment: 'dev' | 'staging' | 'prod';
  awsRegion: string;
  awsAccount: string;
  domainName?: string;
  certificateArn?: string;
}

// Development
{
  environment: 'dev',
  awsRegion: 'us-east-1',
  awsAccount: '123456789012'
}

// Production
{
  environment: 'prod',
  awsRegion: 'us-east-1',
  awsAccount: '987654321098',
  domainName: 'api.example.com',
  certificateArn: 'arn:aws:acm:...'
}
```

### Deployment Process

#### Development Deployment
```bash
# Install dependencies
pnpm install

# Build shared package
pnpm build:shared

# Deploy backend infrastructure
./deploy-backend.sh

# Run frontend locally
pnpm dev:frontend
```

#### Production Deployment
```bash
# Set production environment
export CDK_ENV=prod

# Deploy with production config
./deploy-backend.sh

# Deploy frontend to CloudFront
cdk deploy FrontendStack-prod
```

### Lambda Configuration

All Lambda functions use consistent configuration:

```typescript
{
  runtime: lambda.Runtime.NODEJS_20_X,
  timeout: Duration.seconds(30),
  memorySize: 512,
  environment: {
    NODE_ENV: props.environment,
    TABLE_NAME: props.table.tableName,
    BUCKET_NAME: props.mediaBucket?.bucketName,
    JWT_SECRET: secretValue,
    LOG_LEVEL: props.environment === 'prod' ? 'warn' : 'debug'
  },
  bundling: {
    format: OutputFormat.ESM,
    target: 'es2022',
    platform: 'node',
    mainFields: ['module', 'main'],
    externalModules: ['@aws-sdk/*']
  }
}
```

### Monitoring and Observability

#### CloudWatch Integration
- Lambda function logs automatically streamed
- Custom metrics for business events
- Alarms for error rates and latencies

#### Structured Logging
```typescript
logger.info('User login successful', {
  userId: user.id,
  correlationId: event.requestContext.requestId,
  duration: Date.now() - startTime
});
```

#### Distributed Tracing
- X-Ray integration for Lambda functions
- Correlation IDs passed through headers
- End-to-end request tracking

---

## Testing Strategy

### Test Pyramid

```
        ┌─────┐
       /  E2E  \      <- Few, high-value user journeys
      /─────────\
     /Integration\    <- API and service integration
    /─────────────\
   /     Unit      \  <- Extensive unit test coverage
  /─────────────────\
```

### Unit Testing

#### Backend Unit Tests
```typescript
// Example: Authentication handler test
describe('Register Handler', () => {
  it('should successfully register a new user', async () => {
    // Arrange
    const mockAuthService = { register: vi.fn() };
    const event = createMockEvent({
      email: 'test@example.com',
      password: 'TestPassword123!',
      username: 'testuser'
    });

    // Act
    const response = await handler(event);

    // Assert
    expect(response.statusCode).toBe(201);
    expect(mockAuthService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        username: 'testuser'
      })
    );
  });
});
```

#### Frontend Unit Tests
```typescript
// Example: Component test
describe('ProfileDisplay', () => {
  it('renders user profile information', () => {
    const profile = {
      handle: 'johndoe',
      fullName: 'John Doe',
      bio: 'Software Developer',
      postsCount: 42
    };

    render(<ProfileDisplay profile={profile} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('@johndoe')).toBeInTheDocument();
    expect(screen.getByText('42 posts')).toBeInTheDocument();
  });
});
```

### Integration Testing

#### API Integration Tests
```typescript
describe('Profile API Integration', () => {
  it('should update and retrieve profile', async () => {
    // Create user
    const user = await createTestUser();

    // Update profile
    const updateResponse = await apiClient.profile.update({
      handle: 'newhandle',
      bio: 'Updated bio'
    });

    expect(updateResponse.status).toBe(200);

    // Retrieve profile
    const getResponse = await apiClient.profile.getByHandle('newhandle');

    expect(getResponse.data.profile.bio).toBe('Updated bio');
  });
});
```

### End-to-End Testing

#### User Journey Tests
```typescript
describe('User Registration and Profile Setup', () => {
  it('completes full registration and profile setup flow', async () => {
    // Navigate to app
    await page.goto('http://localhost:3000');

    // Open auth modal
    await page.click('[data-testid="sign-in-button"]');

    // Switch to register
    await page.click('[data-testid="switch-to-register"]');

    // Fill registration form
    await page.fill('[name="email"]', 'newuser@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="username"]', 'newuser');

    // Submit
    await page.click('[data-testid="register-submit"]');

    // Verify redirect to profile
    await expect(page).toHaveURL('/profile');

    // Update profile
    await page.click('[data-testid="edit-profile"]');
    await page.fill('[name="bio"]', 'My bio');
    await page.click('[data-testid="save-profile"]');

    // Verify update
    await expect(page.locator('[data-testid="profile-bio"]')).toHaveText('My bio');
  });
});
```

### Test Coverage Requirements

- **Unit Tests**: Minimum 80% coverage
- **Integration Tests**: All critical paths covered
- **E2E Tests**: Key user journeys tested

### Mocking Strategy

#### Backend Mocks
- AWS SDK clients mocked with `vi.mock()`
- External services stubbed
- Database operations mocked at service level

#### Frontend Mocks
- API calls intercepted with MSW
- Browser APIs mocked with jsdom
- Component props tested with various states

---

## Development Workflow

### Local Development Setup

#### Prerequisites
```bash
# Required tools
node --version  # >= 22.0.0
pnpm --version  # >= 8.0.0
aws --version   # AWS CLI configured
cdk --version   # >= 2.0.0
```

#### Initial Setup
```bash
# Clone repository
git clone https://github.com/your-org/social-media-app.git
cd social-media-app

# Install dependencies
pnpm install

# Build shared package
pnpm build:shared

# Setup environment variables
cp .env.example .env.local

# Deploy local infrastructure
./deploy-backend.sh

# Start development
pnpm dev:frontend
```

### Development Commands

```bash
# Frontend development
pnpm dev:frontend       # Start Vite dev server

# Backend development
pnpm build:backend      # Build Lambda functions
pnpm test:backend       # Run backend tests

# Shared package
pnpm build:shared       # Build shared schemas
pnpm test:shared        # Test shared schemas

# Full stack
pnpm dev               # Run all in parallel
pnpm build             # Build all packages
pnpm test              # Run all tests

# Infrastructure
cdk synth              # Synthesize CloudFormation
cdk diff               # Show infrastructure changes
cdk deploy             # Deploy to AWS
```

### Git Workflow

#### Branch Strategy
```
main
├── develop
│   ├── feature/user-profile
│   ├── feature/post-creation
│   └── feature/notifications
├── release/v1.0.0
└── hotfix/critical-bug
```

#### Commit Convention
```bash
# Format: <type>(<scope>): <subject>

feat(auth): Add JWT refresh token rotation
fix(profile): Resolve handle validation issue
docs(api): Update endpoint documentation
test(posts): Add integration tests for post creation
refactor(dal): Extract common database operations
chore(deps): Update dependencies
```

### Code Review Process

1. **Feature Development**
   - Create feature branch from develop
   - Implement with TDD approach
   - Ensure all tests pass
   - Update documentation

2. **Pull Request**
   - Self-review changes
   - Run full test suite
   - Update changelog
   - Request review

3. **Review Checklist**
   - [ ] Tests cover new functionality
   - [ ] No hardcoded values
   - [ ] Error handling implemented
   - [ ] Documentation updated
   - [ ] Performance considerations addressed
   - [ ] Security best practices followed

### Release Process

1. **Version Bump**
```bash
pnpm version patch|minor|major
```

2. **Generate Changelog**
```bash
pnpm changelog
```

3. **Create Release Branch**
```bash
git checkout -b release/v1.0.0
```

4. **Deploy to Staging**
```bash
CDK_ENV=staging ./deploy-backend.sh
```

5. **Run E2E Tests**
```bash
pnpm test:e2e
```

6. **Merge to Main**
```bash
git checkout main
git merge release/v1.0.0
git tag v1.0.0
```

7. **Deploy to Production**
```bash
CDK_ENV=prod ./deploy-backend.sh
```

---

## Performance Optimization

### Backend Optimizations

1. **Lambda Cold Starts**
   - Provisioned concurrency for critical functions
   - Minimal bundle sizes with tree shaking
   - Lazy loading of heavy dependencies

2. **Database Performance**
   - Single table design for fewer requests
   - GSI for alternate access patterns
   - Batch operations where possible

3. **Caching Strategy**
   - CloudFront caching for static assets
   - API Gateway caching for read-heavy endpoints
   - In-memory caching in Lambda containers

### Frontend Optimizations

1. **Bundle Size**
   - Code splitting by route
   - Lazy loading of components
   - Tree shaking of unused code

2. **Runtime Performance**
   - React.memo for expensive components
   - useMemo/useCallback for computations
   - Virtual scrolling for long lists

3. **Network Optimization**
   - Prefetching critical resources
   - Image optimization with thumbnails
   - Progressive image loading

---

## Troubleshooting Guide

### Common Issues

#### Authentication Errors
```
Error: "Invalid or expired token"
Solution: Check token expiry, refresh token if needed
```

#### CORS Issues
```
Error: "CORS policy blocked request"
Solution: Verify API Gateway CORS configuration, check origin headers
```

#### Lambda Timeouts
```
Error: "Task timed out after 30.00 seconds"
Solution: Increase timeout, optimize database queries, add pagination
```

#### DynamoDB Throttling
```
Error: "ProvisionedThroughputExceededException"
Solution: Increase table capacity, implement exponential backoff
```

### Debug Tools

1. **CloudWatch Logs**
```bash
aws logs tail /aws/lambda/social-media-app-auth-dev --follow
```

2. **X-Ray Traces**
```bash
aws xray get-trace-summaries --time-range-type LastHour
```

3. **Local Testing**
```bash
# Test Lambda locally
sam local invoke AuthFunction -e event.json

# Test API locally
sam local start-api
```

---

## Future Enhancements

### Planned Features

1. **Social Features**
   - Follow/unfollow functionality
   - Like and comment system
   - Real-time notifications
   - Direct messaging

2. **Content Features**
   - Video upload support
   - Stories functionality
   - Content moderation
   - Advanced search

3. **Technical Improvements**
   - WebSocket support for real-time updates
   - GraphQL API option
   - Microservices architecture
   - Kubernetes deployment option

4. **Security Enhancements**
   - Multi-factor authentication
   - OAuth2 integration
   - Rate limiting
   - IP-based access control

### Scalability Roadmap

1. **Phase 1: Current (0-10K users)**
   - Single region deployment
   - Basic caching
   - Manual scaling

2. **Phase 2: Growth (10K-100K users)**
   - Multi-region deployment
   - Enhanced caching strategy
   - Auto-scaling policies

3. **Phase 3: Scale (100K+ users)**
   - Global distribution
   - Read replicas
   - Event-driven architecture
   - Microservices migration

---

## Appendices

### Glossary

- **DAL**: Data Access Layer - Abstraction for database operations
- **TDD**: Test-Driven Development - Development methodology
- **JWT**: JSON Web Token - Authentication token format
- **CDK**: Cloud Development Kit - Infrastructure as Code tool
- **ESM**: ECMAScript Modules - Modern JavaScript module system
- **GSI**: Global Secondary Index - DynamoDB index type
- **CORS**: Cross-Origin Resource Sharing - Browser security feature

### References

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zod Documentation](https://zod.dev/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

### Environment Variables

```bash
# Backend Environment Variables
NODE_ENV=development|production
TABLE_NAME=social-media-app-table-{env}
BUCKET_NAME=social-media-app-media-{env}
JWT_SECRET=<secret-value>
JWT_ACCESS_TOKEN_EXPIRY=900
JWT_REFRESH_TOKEN_EXPIRY=2592000
LOG_LEVEL=debug|info|warn|error
AWS_REGION=us-east-1

# Frontend Environment Variables
VITE_API_URL=https://api.example.com
VITE_APP_ENV=development|production
VITE_ENABLE_MSW=true|false
```

---

*This architecture documentation is version 1.0.0 and reflects the current state of the Social Media Application as of September 2024.*