# Migration Quick Start Guide

**Ready to begin the migration? Start here.**

---

## 🎯 Phase 1: Middy Migration (Week 1)

### Day 1: Setup & POC

#### Step 1: Create Feature Branch

```bash
git checkout master
git pull origin master
git checkout -b feat/library-migration-phase-1-middy
```

#### Step 2: Install Middy Dependencies

```bash
cd packages/backend

pnpm add @middy/core \
         @middy/http-error-handler \
         @middy/http-json-body-parser \
         @middy/http-header-normalizer \
         @middy/validator

pnpm add -D @types/aws-lambda
```

#### Step 3: Create Middleware Directory

```bash
mkdir -p packages/backend/src/infrastructure/middleware-v2
```

#### Step 4: Create Base Middleware

Create `packages/backend/src/infrastructure/middleware-v2/index.ts`:

```typescript
import middy from '@middy/core'
import httpErrorHandler from '@middy/http-error-handler'
import httpJsonBodyParser from '@middy/http-json-body-parser'
import httpHeaderNormalizer from '@middy/http-header-normalizer'
import { z } from 'zod'
import type { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda'

/**
 * Zod validation middleware for Middy
 */
export const zodValidator = <T>(schema: z.ZodSchema<T>) => {
  return {
    before: async (request: middy.Request) => {
      const body = request.event.body
        ? JSON.parse(request.event.body)
        : {}

      try {
        request.event.validatedBody = schema.parse(body)
      } catch (error) {
        if (error instanceof z.ZodError) {
          const httpError: any = new Error('Validation failed')
          httpError.statusCode = 400
          httpError.details = error.errors
          throw httpError
        }
        throw error
      }
    }
  }
}

/**
 * JWT authentication middleware for Middy
 */
export const jwtAuth = (options: { required?: boolean } = {}) => {
  const { required = true } = options

  return {
    before: async (request: middy.Request) => {
      const authHeader =
        request.event.headers?.authorization ||
        request.event.headers?.Authorization

      if (!authHeader) {
        if (required) {
          const error: any = new Error('Missing authorization header')
          error.statusCode = 401
          throw error
        }
        return
      }

      const token = authHeader.replace(/^Bearer\s+/i, '')

      // Import JWT utilities
      const { verifyAccessToken, getJWTConfigFromEnv } =
        await import('../../utils/jwt.js')

      const jwtConfig = getJWTConfigFromEnv()

      try {
        const payload = await verifyAccessToken(token, jwtConfig.secret)

        if (!payload) {
          if (required) {
            const error: any = new Error('Invalid token')
            error.statusCode = 401
            throw error
          }
          return
        }

        // Attach to event
        request.event.userId = payload.userId
        request.event.authPayload = payload
      } catch (error) {
        if (required) {
          const err: any = new Error(
            error instanceof Error ? error.message : 'Invalid token'
          )
          err.statusCode = 401
          throw err
        }
      }
    }
  }
}

/**
 * Handler creator with standard middleware
 */
export const createHandler = (
  handler: APIGatewayProxyHandlerV2,
  options: {
    validation?: z.ZodSchema
    auth?: boolean
  } = {}
) => {
  const middleware = middy(handler)
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())

  if (options.auth) {
    middleware.use(jwtAuth({ required: true }))
  }

  if (options.validation) {
    middleware.use(zodValidator(options.validation))
  }

  middleware.use(httpErrorHandler())

  return middleware
}
```

#### Step 5: Migrate First Handler (POC)

Choose a simple handler like `hello.ts`:

**Create:** `packages/backend/src/handlers/hello.v2.ts`

```typescript
import { createHandler } from '../infrastructure/middleware-v2/index.js'
import { HelloRequestSchema, type HelloRequest } from '@social-media-app/shared'
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'

const helloHandler: APIGatewayProxyHandlerV2 = async (event) => {
  const { name } = event.validatedBody as HelloRequest

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `Hello, ${name}!`,
      timestamp: new Date().toISOString()
    })
  }
}

export const handler = createHandler(helloHandler, {
  validation: HelloRequestSchema
})
```

#### Step 6: Test the Migration

**Create:** `packages/backend/src/handlers/hello.v2.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { handler } from './hello.v2.js'

describe('Hello Handler (Middy)', () => {
  it('should return greeting with valid input', async () => {
    const event = {
      body: JSON.stringify({ name: 'World' }),
      headers: {},
      requestContext: {} as any
    } as any

    const result = await handler(event, {} as any)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body)
    expect(body.message).toBe('Hello, World!')
  })

  it('should return 400 with invalid input', async () => {
    const event = {
      body: JSON.stringify({ invalidField: 'test' }),
      headers: {},
      requestContext: {} as any
    } as any

    const result = await handler(event, {} as any)

    expect(result.statusCode).toBe(400)
  })
})
```

Run tests:

```bash
cd packages/backend
pnpm test hello.v2.test.ts
```

#### Step 7: Update Infrastructure Config

Add to CDK if deploying:

```typescript
// infrastructure/lib/lambda-stack.ts
const helloFunction = new lambda.Function(this, 'HelloFunction', {
  runtime: lambda.Runtime.NODEJS_22_X,
  handler: 'hello.v2.handler', // Note: .v2
  code: lambda.Code.fromAsset('packages/backend/dist'),
  environment: {
    USE_MIDDY: 'true' // Feature flag
  }
})
```

---

## Day 2: Migrate Auth Handlers

### Login Handler

**Create:** `packages/backend/src/handlers/auth/login.v2.ts`

```typescript
import { createHandler } from '../../infrastructure/middleware-v2/index.js'
import { LoginRequestSchema, type LoginRequest } from '@social-media-app/shared'
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { createDefaultAuthService } from '@social-media-app/dal'
import { createDynamoClient } from '../../utils/dynamodb.js'
import { createJWTProvider, getJWTConfigFromEnv } from '../../utils/jwt.js'

const loginHandler: APIGatewayProxyHandlerV2 = async (event) => {
  const { email, password } = event.validatedBody as LoginRequest

  // Setup services (will be replaced by Awilix in Phase 2)
  const dynamoClient = createDynamoClient()
  const tableName = process.env.TABLE_NAME!
  const jwtProvider = createJWTProvider(getJWTConfigFromEnv())
  const authService = createDefaultAuthService(dynamoClient, tableName, jwtProvider)

  const result = await authService.login({ email, password })

  return {
    statusCode: 200,
    body: JSON.stringify(result)
  }
}

export const handler = createHandler(loginHandler, {
  validation: LoginRequestSchema
})
```

### Register Handler

**Create:** `packages/backend/src/handlers/auth/register.v2.ts`

```typescript
import { createHandler } from '../../infrastructure/middleware-v2/index.js'
import { RegisterRequestSchema, type RegisterRequest } from '@social-media-app/shared'
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { createDefaultAuthService } from '@social-media-app/dal'
import { createDynamoClient } from '../../utils/dynamodb.js'
import { createJWTProvider, getJWTConfigFromEnv } from '../../utils/jwt.js'

const registerHandler: APIGatewayProxyHandlerV2 = async (event) => {
  const data = event.validatedBody as RegisterRequest

  const dynamoClient = createDynamoClient()
  const tableName = process.env.TABLE_NAME!
  const jwtProvider = createJWTProvider(getJWTConfigFromEnv())
  const authService = createDefaultAuthService(dynamoClient, tableName, jwtProvider)

  const result = await authService.register(data)

  return {
    statusCode: 201,
    body: JSON.stringify(result)
  }
}

export const handler = createHandler(registerHandler, {
  validation: RegisterRequestSchema
})
```

---

## Day 3-4: Bulk Migration Script

Create an automated migration script to speed up remaining handlers.

**Create:** `scripts/migrate-handler-to-middy.ts`

```typescript
#!/usr/bin/env tsx
import fs from 'fs'
import path from 'path'

const handlerPath = process.argv[2]

if (!handlerPath) {
  console.error('Usage: tsx scripts/migrate-handler-to-middy.ts <handler-path>')
  process.exit(1)
}

const content = fs.readFileSync(handlerPath, 'utf-8')

// Detect patterns
const hasValidation = content.includes('withValidation')
const hasAuth = content.includes('withAuth')
const validationSchema = content.match(/withValidation\((\w+Schema)\)/)?.[1]

console.log('Detected patterns:')
console.log('- Validation:', hasValidation, validationSchema)
console.log('- Auth:', hasAuth)

// Generate new handler
const template = `
import { createHandler } from '../../infrastructure/middleware-v2/index.js'
${validationSchema ? `import { ${validationSchema} } from '@social-media-app/shared'` : ''}
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'

const handler: APIGatewayProxyHandlerV2 = async (event) => {
  // TODO: Migrate handler logic
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  }
}

export const handler = createHandler(handler, {
  ${validationSchema ? `validation: ${validationSchema},` : ''}
  ${hasAuth ? 'auth: true,' : ''}
})
`

const newPath = handlerPath.replace('.ts', '.v2.ts')
fs.writeFileSync(newPath, template)

console.log(`✅ Created ${newPath}`)
console.log('⚠️  Review and complete the migration manually')
```

Run it:

```bash
chmod +x scripts/migrate-handler-to-middy.ts
tsx scripts/migrate-handler-to-middy.ts packages/backend/src/handlers/auth/profile.ts
```

---

## Day 5: Testing & Deployment

### Run All Tests

```bash
cd packages/backend
pnpm test
pnpm typecheck
pnpm lint
```

### Deploy to Staging

```bash
# Build
pnpm build

# Deploy with feature flag
CDK_ENV=staging USE_MIDDY=true cdk deploy

# Or use deployment script
USE_MIDDY=true ./deploy-backend.sh
```

### Monitor

```bash
# Watch CloudWatch logs
aws logs tail /aws/lambda/social-media-app-staging-HelloFunction --follow

# Check metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=social-media-app-staging-HelloFunction \
  --start-time 2025-11-08T00:00:00Z \
  --end-time 2025-11-08T23:59:59Z \
  --period 3600 \
  --statistics Average,Maximum
```

### Rollback if Needed

```bash
# Quick rollback
git revert HEAD
git push
./deploy-backend.sh

# Or toggle feature flag
USE_MIDDY=false ./deploy-backend.sh
```

---

## Week 2: Production Rollout

### Gradual Traffic Shift

Use Lambda aliases and weighted routing:

```typescript
// CDK
const alias = new lambda.Alias(this, 'LiveAlias', {
  aliasName: 'live',
  version: newVersion,
  additionalVersions: [
    { version: oldVersion, weight: 0.9 },  // 90% old
    { version: newVersion, weight: 0.1 }   // 10% new
  ]
})
```

Gradually increase new version weight:
- Day 1: 10%
- Day 2: 25%
- Day 3: 50%
- Day 4: 75%
- Day 5: 100%

### Success Metrics

Monitor these metrics:
- ✅ Error rate < 0.1%
- ✅ P95 latency unchanged or improved
- ✅ Memory usage stable
- ✅ Cold start time < 1s

---

## Common Issues & Solutions

### Issue: "Cannot find module @middy/core"

**Solution:**
```bash
cd packages/backend
rm -rf node_modules
pnpm install
```

### Issue: Validation errors not showing properly

**Solution:** Ensure error handler is last:

```typescript
middleware
  .use(validator)
  .use(auth)
  .use(httpErrorHandler()) // Must be last!
```

### Issue: TypeScript errors with event types

**Solution:** Extend event type:

```typescript
declare module 'aws-lambda' {
  interface APIGatewayProxyEventV2 {
    validatedBody?: any
    userId?: string
    authPayload?: any
  }
}
```

---

## Phase 2 Preview: Awilix (Week 2-3)

Once Phase 1 is complete, start Phase 2:

```bash
git checkout -b feat/library-migration-phase-2-awilix
cd packages/backend
pnpm add awilix
```

Setup container:

```typescript
// packages/backend/src/infrastructure/di-v2/container.ts
import { createContainer, asClass, asFunction } from 'awilix'

export function setupContainer() {
  const container = createContainer()

  container.register({
    dynamoClient: asFunction(createDynamoClient).singleton(),
    authService: asClass(AuthService).scoped(),
    profileService: asClass(ProfileService).scoped()
  })

  return container
}
```

---

## Getting Help

- **Middy Issues:** https://github.com/middyjs/middy/issues
- **Project Issues:** Create issue in this repo
- **Team Slack:** #backend-migration

---

## Next Steps

1. ✅ Complete Phase 1 (Middy)
2. 📋 Review Phase 2 plan (Awilix)
3. 🔄 Continue with remaining phases

**Good luck! 🚀**

