# Local Development with LocalStack

This document explains how to set up and use LocalStack for local development of the TamaFriends social media application.

## Prerequisites

- Docker and Docker Compose
- Node.js 22+
- pnpm 8+

## Development Modes

You can run the application in two different development modes:

### 🔧 LocalStack Mode (Full Stack)
**Best for**: Backend development, database testing, API integration, file uploads

```bash
# Quick start LocalStack mode
pnpm dev:localstack

# Or manual steps:
pnpm switch:localstack  # Switch environment
pnpm local:start        # Start LocalStack services
pnpm dev               # Start all development servers
```

### 🎭 MSW Mock Mode (Frontend Only)
**Best for**: UI development, frontend testing, when backend is unavailable

```bash
# Quick start mock mode
pnpm dev:mocks

# Or manual steps:
pnpm switch:mocks      # Switch environment
cd packages/frontend   # Navigate to frontend
pnpm dev              # Start frontend with mocks
```

## Quick Environment Switching

```bash
# Switch to LocalStack mode
pnpm switch:localstack

# Switch to MSW mock mode
pnpm switch:mocks
```

## Mode Comparison

| Feature | LocalStack Mode | MSW Mock Mode |
|---------|----------------|---------------|
| **Backend API** | ✅ Real Express server | ❌ Mocked responses |
| **Database** | ✅ LocalStack DynamoDB | ❌ No database |
| **File Storage** | ✅ LocalStack S3 | ❌ No file storage |
| **Authentication** | ✅ Real JWT tokens | ✅ Mock auto-login |
| **API Validation** | ✅ Real validation | ⚠️ Mock validation |
| **Docker Required** | ✅ Yes (LocalStack) | ❌ No |
| **Startup Time** | 🐌 ~30 seconds | ⚡ ~5 seconds |
| **Best For** | Integration testing | UI development |

## Current Mode Detection

Check which mode you're in:

```bash
# Check current environment
cat .env | grep USE_LOCALSTACK

# If USE_LOCALSTACK=true → LocalStack mode
# If USE_LOCALSTACK=false → Mock mode
```

## LocalStack Mode Setup

1. **Start LocalStack services:**
   ```bash
   pnpm local:start
   ```

2. **Verify LocalStack is running:**
   ```bash
   pnpm local:status
   ```

3. **Build all packages:**
   ```bash
   pnpm build
   ```

4. **Start development servers:**
   ```bash
   pnpm dev
   ```

5. **Validate setup (optional):**
   ```bash
   node validate-localstack.js
   ```

## LocalStack Services

LocalStack provides local emulation of AWS services:

- **DynamoDB**: Local database at `http://localhost:4566`
- **S3**: Local file storage at `http://localhost:4566`
- **API Gateway**: Local API Gateway at `http://localhost:4566`
- **Lambda**: Local Lambda execution
- **IAM**: Local identity management
- **STS**: Local security token service
- **CloudWatch Logs**: Local logging

## Environment Configuration

The application automatically detects LocalStack when:
- `NODE_ENV=development`
- `USE_LOCALSTACK=true`

### Environment Variables

| Variable | LocalStack Value | Description |
|----------|------------------|-------------|
| `NODE_ENV` | `development` | Enables development mode |
| `USE_LOCALSTACK` | `true` | Enables LocalStack integration |
| `LOCALSTACK_ENDPOINT` | `http://localhost:4566` | LocalStack endpoint |
| `TABLE_NAME` | `tamafriends-local` | DynamoDB table name |
| `MEDIA_BUCKET_NAME` | `tamafriends-media-local` | S3 bucket name |
| `AWS_REGION` | `us-east-1` | AWS region |
| `AWS_ACCESS_KEY_ID` | `test` | Dummy access key for LocalStack |
| `AWS_SECRET_ACCESS_KEY` | `test` | Dummy secret key for LocalStack |

## Development Scripts

```bash
# LocalStack management
pnpm local:start     # Start LocalStack container
pnpm local:stop      # Stop LocalStack container
pnpm local:restart   # Restart LocalStack container
pnpm local:status    # Check LocalStack health
pnpm local:logs      # View LocalStack logs

# Development workflow
pnpm build           # Build all packages
pnpm dev             # Start all development servers
pnpm test            # Run all tests
pnpm lint            # Run linting
pnpm typecheck       # Run type checking
```

## AWS CLI with LocalStack

You can use the AWS CLI to interact with LocalStack:

```bash
# List DynamoDB tables
aws --endpoint-url=http://localhost:4566 dynamodb list-tables

# List S3 buckets
aws --endpoint-url=http://localhost:4566 s3 ls

# Create test data in DynamoDB
aws --endpoint-url=http://localhost:4566 dynamodb put-item \
  --table-name tamafriends-local \
  --item '{"PK":{"S":"USER#test"},"SK":{"S":"PROFILE"},"email":{"S":"test@example.com"}}'
```

## Data Persistence

LocalStack data is persisted in the `./volume` directory. To reset all data:

```bash
pnpm local:stop
rm -rf ./volume
pnpm local:start
```

## Troubleshooting

### LocalStack not starting
- Check Docker is running
- Ensure ports 4566 and 4510-4559 are available
- Check logs: `pnpm local:logs`

### Services not connecting to LocalStack
- Verify `.env.local` is copied to `.env`
- Check `USE_LOCALSTACK=true` is set
- Ensure `NODE_ENV=development`
- Verify LocalStack health: `pnpm local:status`

### Build failures
- Ensure all packages build: `pnpm build`
- Check TypeScript errors: `pnpm typecheck`
- Verify imports are correct

### Database/S3 errors
- Check table exists: `aws --endpoint-url=http://localhost:4566 dynamodb list-tables`
- Check bucket exists: `aws --endpoint-url=http://localhost:4566 s3 ls`
- Reset LocalStack data if needed

## Architecture

The application automatically switches between AWS and LocalStack based on environment variables:

- **Production**: Uses real AWS services (DynamoDB, S3, Lambda, etc.)
- **Development**: Uses LocalStack emulation when `USE_LOCALSTACK=true`

This is handled by the centralized AWS configuration in `packages/backend/src/utils/aws-config.ts`.

## Implementation Summary

**Phase 2: Environment Configuration** has been completed with the following features:

### ✅ Centralized AWS Configuration
- **`packages/backend/src/utils/aws-config.ts`**: Centralized configuration for all AWS services
- **Environment Detection**: Automatically switches between LocalStack and AWS based on `NODE_ENV` and `USE_LOCALSTACK`
- **Consistent Endpoints**: All services (DynamoDB, S3) use the same endpoint detection logic

### ✅ Environment Variable Loading
- **`packages/backend/src/utils/env.ts`**: Environment loading utilities for local development
- **Automatic Loading**: Backend services automatically load `.env` when in development mode
- **Lambda Compatible**: No environment loading in production (AWS Lambda runtime provides variables)

### ✅ Service Integration
- **All Handlers Updated**: Profile and post handlers use centralized AWS configuration
- **ProfileService Enhanced**: S3Client creation supports LocalStack endpoints
- **Consistent Patterns**: Eliminated direct `process.env` access in favor of centralized config

### ✅ Development Workflow
- **`.env` File**: Pre-configured for LocalStack development
- **NPM Scripts**: Complete local development workflow (`local:start`, `local:status`, etc.)
- **Validation**: Optional validation script to verify setup
- **Documentation**: Complete setup and troubleshooting guide

### 🔧 How It Works

1. **Environment Detection**:
   ```typescript
   const isLocalStack = process.env.NODE_ENV === 'development' &&
                       process.env.USE_LOCALSTACK === 'true';
   ```

2. **Automatic Endpoint Configuration**:
   ```typescript
   if (isLocalStack) {
     config.endpoint = 'http://localhost:4566';
     config.forcePathStyle = true; // Required for S3
   }
   ```

3. **Service Initialization**:
   ```typescript
   const dynamoClient = createDynamoDBClient(); // Auto-detects LocalStack
   const s3Client = createS3Client();           // Auto-detects LocalStack
   const tableName = getTableName();            // Uses LocalStack table name
   ```

### 🎯 Result
- **Zero Configuration**: Developers just run `pnpm local:start` and `pnpm dev`
- **Automatic Switching**: Same code works in LocalStack and AWS without changes
- **Type Safety**: Full TypeScript support with centralized configuration
- **Maintainable**: Single source of truth for all AWS configuration