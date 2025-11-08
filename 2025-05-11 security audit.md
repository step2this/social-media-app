# COMPREHENSIVE SECURITY AUDIT REPORT
## Social Media App Codebase

**Date:** November 5, 2025
**Thoroughness Level:** Very Thorough
**Status:** Complete Analysis

---

## EXECUTIVE SUMMARY

The social media application demonstrates **STRONG security fundamentals** with several best practices implemented correctly. However, there are **CRITICAL** and **HIGH** severity issues that require immediate remediation before production deployment.

**Overall Risk Rating: MEDIUM-HIGH** (Can be reduced to MEDIUM with critical fixes)

---

## 1. AUTHENTICATION SECURITY

### 1.1 JWT Implementation ✓ SECURE
**Status:** SECURE WITH MINOR CONCERNS
**Files:** `/packages/auth-utils/src/index.ts`

**Strengths:**
- Uses modern `jose` library for JWT operations
- Implements HSA256 algorithm with proper encoding
- Includes issuer and audience validation
- Sets appropriate expiry times (15 min access, 30 days refresh)
- Uses `TextEncoder` for secure key handling

**Issues Found:**

#### Issue #1: JWT_SECRET Default Too Short in Tests
**Severity:** MEDIUM
**File:** `.env.mocks`
```
JWT_SECRET=mock-jwt-secret (18 characters)
JWT_REFRESH_SECRET=mock-jwt-refresh-secret (24 characters)
```
**Problem:** These mock secrets are too short (minimum should be 32 characters for HMAC-SHA256)
**Remediation:**
```typescript
// In production, enforce minimum 32-character secrets
const MIN_SECRET_LENGTH = 32;
if (config.secret.length < MIN_SECRET_LENGTH) {
  throw new Error(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
}
```

#### Issue #2: No Token Blacklisting or Revocation
**Severity:** HIGH
**Problem:** JWTs can't be revoked before expiry. Compromised tokens remain valid.
**Impact:** If a user logs out or password is changed, old tokens still grant access
**Remediation Steps:**
1. Implement token blacklist using Redis (already available in infrastructure)
2. Add token revocation endpoint
3. Check blacklist during verification
4. Store revoked token hashes with TTL matching token expiry

#### Issue #3: Refresh Token Stored Unhashed
**Severity:** HIGH
**File:** `/packages/dal/src/services/auth.service.ts` (Line 201)
```typescript
// VULNERABLE: Refresh token stored in plain text
const tokenQuery = await deps.dynamoClient.send(
  new QueryCommand(buildRefreshTokenQuery(request.refreshToken, deps.tableName))
);
```
**Problem:** Refresh tokens are stored as plain text. If DB is compromised, all refresh tokens are exposed.
**Remediation:**
```typescript
// Hash refresh tokens before storage
const hashedToken = crypto.createHash('sha256')
  .update(refreshToken)
  .digest('hex');

// Store hashed token, query by hash
buildRefreshTokenQuery(hashedToken, deps.tableName)
```

### 1.2 Refresh Token Management ✓ MOSTLY SECURE
**Status:** SECURE WITH IMPROVEMENTS NEEDED

**Strengths:**
- 64-character random hex tokens (256 bits) via `randomBytes(32)`
- Separate from access tokens
- Stored with user context and expiry

**Issues Found:**

#### Issue #4: No Refresh Token Rotation
**Severity:** MEDIUM
**Problem:** Same refresh token can be reused indefinitely until expiry
**Attack:** If token is leaked, attacker can use it continuously
**Remediation:** Implement refresh token rotation - issue new refresh token with each use
```typescript
// After verifying old refresh token, invalidate it
await invalidateRefreshToken(oldToken);
// Issue new token
const newRefreshToken = generateRefreshToken();
```

#### Issue #5: Missing Device Fingerprinting
**Severity:** MEDIUM
**Files:** `/packages/dal/src/services/auth.service.ts` (Line 238)
**Problem:** `deviceInfo` is optional and not validated
**Impact:** Can't detect token theft from different devices
**Remediation:**
```typescript
// Require and validate device info
const deviceInfo = {
  userAgent: validateUserAgent(req.headers['user-agent']),
  platform: detectPlatform(req),
  ipAddress: req.ip,
  fingerprint: generateDeviceFingerprint()
};
```

---

## 2. AUTHORIZATION SECURITY

### 2.1 Access Control ✓ SECURE
**Status:** SECURE

**Strengths:**
- Proper ownership checks in post service (`/packages/dal/src/services/post.service.ts`)
  - Line 181: `if (!post || post.userId !== userId) return null;`
  - Line 231: `if (!post || post.userId !== userId) return false;`
- Auth guards implemented (`/packages/graphql-server/src/infrastructure/auth/AuthGuard.ts`)
- `withAuth` HOC for resolver protection
- Authentication checks in mutations (line 42-45 in Mutation.ts)

**Issues Found:**

#### Issue #6: Missing Authorization on Read Operations
**Severity:** MEDIUM
**File:** `/packages/graphql-server/src/schema/resolvers/Query.ts`
**Problem:** Some read operations may not verify user permissions
**Attack:** Information disclosure - users might access private profiles or posts
**Remediation:**
- Add permission checks for all user-specific queries
- Implement field-level authorization
- Verify user can only access their own private data

#### Issue #7: No Rate Limiting per User
**Severity:** MEDIUM
**Problem:** No per-user rate limiting found in the codebase
**Attack:** Brute force attacks on endpoints (auth, API calls)
**Remediation:**
```typescript
// Add rate limiting middleware
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  keyGenerator: (req) => req.context.userId || req.ip // Use userId if authenticated
}));
```

### 2.2 Ownership Verification ✓ SECURE
**Status:** SECURE

Post deletion and update properly verify ownership before allowing operations.

---

## 3. INPUT VALIDATION SECURITY

### 3.1 Validation Schemas ✓ SECURE
**Status:** MOSTLY SECURE

**Strengths:**
- Zod schema validation on all inputs
- Password policy enforced (`/packages/shared/src/schemas/auth.schema.ts`):
  - Minimum 8 characters
  - Maximum 128 characters
  - Requires uppercase, lowercase, number, special character
- Email format validation
- Request body validation with error handling

**Issues Found:**

#### Issue #8: Missing OWASP Input Validation Limits
**Severity:** MEDIUM
**File:** `/packages/shared/src/schemas/`
**Problem:** Some fields lack length/format constraints
**Examples:**
- Post captions: No max length specified
- Comment text: No validation on length or special chars
- User bio/handle: Limited validation

**Remediation:**
```typescript
export const CaptionSchema = z.string()
  .min(1, 'Caption cannot be empty')
  .max(2048, 'Caption must not exceed 2048 characters')
  .regex(/^[\p{L}\p{N}\p{P}\p{Z}]*$/u, 'Caption contains invalid characters');

export const CommentSchema = z.string()
  .min(1, 'Comment cannot be empty')
  .max(500, 'Comment must not exceed 500 characters');
```

#### Issue #9: No Request Size Validation at Gateway Level
**Severity:** MEDIUM
**File:** `/packages/graphql-server/src/standalone-server.ts` (Line 187)
```typescript
app.use(express.json({ limit: '10mb' })); // Good but no validation
```
**Problem:** 10MB limit is reasonable but needs enforcement at API Gateway
**Remediation:** Set API Gateway limits and add validation middleware

#### Issue #10: Missing SQL Injection Prevention Check
**Severity:** LOW (Well-mitigated)
**Status:** SECURE
**File:** `/packages/auction-dal/src/services/auction.service.ts`
- All queries use parameterized statements with `$1, $2, etc.`
- No string concatenation for dynamic values
- Example (Line 43-62): Proper parameterization

---

## 4. SECRETS MANAGEMENT

### 4.1 Environment Variables ✓ MOSTLY SECURE
**Status:** GOOD WITH CRITICAL FIXES NEEDED

**Strengths:**
- `.env` files in `.gitignore` (line 29-33)
- Environment-specific configs (local, staging, prod)
- Secrets loaded from environment, not hardcoded

**Issues Found:**

#### Issue #11: CRITICAL - Mock Secrets Exposed
**Severity:** CRITICAL
**File:** `.env.mocks`
```
JWT_SECRET=mock-jwt-secret
JWT_REFRESH_SECRET=mock-jwt-refresh-secret
```
**Problem:** These are in version control and could be accidentally used in production
**Attack:** If wrong env is loaded, predictable secrets allow token forgery
**Remediation:**
```bash
# Option 1: Remove from repo
git rm --cached .env.mocks
rm .env.mocks

# Option 2: If needed, use clearly fake values
JWT_SECRET=PLACEHOLDER_NEVER_USE_IN_PRODUCTION_USE_32_CHAR_MIN
JWT_REFRESH_SECRET=PLACEHOLDER_NEVER_USE_IN_PRODUCTION_USE_32_CHAR_MIN
```

#### Issue #12: Missing Environment Variable Validation
**Severity:** HIGH
**File:** `/packages/graphql-server/src/standalone-server.ts` (Line 118-130)
**Problem:** Only checks if vars exist, doesn't validate values
**Example:** Accepts any JWT_SECRET, no length check
**Remediation:**
```typescript
function validateJWTSecret(secret: string) {
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  if (secret.includes(' ')) {
    throw new Error('JWT_SECRET cannot contain spaces');
  }
}

const jwtConfig = getJWTConfigFromEnv();
validateJWTSecret(jwtConfig.secret);
```

#### Issue #13: No Secrets Rotation Strategy
**Severity:** MEDIUM
**Problem:** No documented or implemented key rotation process
**Impact:** Compromised secrets remain valid indefinitely
**Remediation:** Document and implement:
1. Key rotation schedule (30-90 days)
2. Support for multiple active keys
3. Graceful deprecation process

### 4.2 AWS Credentials ✓ SECURE
**Status:** SECURE

- Uses IAM roles (not exposed in code)
- Test credentials use `test` (appropriate for LocalStack)
- Lambda functions get temporary credentials via IAM role

---

## 5. API SECURITY

### 5.1 CORS Configuration ✓ MOSTLY SECURE
**Status:** GOOD WITH PRODUCTION CONCERNS

**File:** `/infrastructure/lib/stacks/api-stack.ts` (Line 200-223)

**Strengths:**
- CORS properly configured at API Gateway
- Hardcoded localhost for development
- Production uses `['https://yourdomain.com']` (placeholder)
- Credentials explicitly set to `false`
- Reasonable max age (3600 seconds)

**Issues Found:**

#### Issue #14: Over-Permissive CORS Headers
**Severity:** MEDIUM
**File:** `/packages/graphql-server/src/standalone-server.ts` (Line 182-185)
```typescript
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true, // ISSUE: credentials true with multiple origins
}));
```
**Problem:** `credentials: true` with wildcard-like origins
**Attack:** Potential CORS misconfiguration vulnerability
**Remediation:**
```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: process.env.NODE_ENV === 'production' ? false : true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### Issue #15: Missing Security Headers
**Severity:** HIGH
**Problem:** No HSTS, X-Frame-Options, X-Content-Type-Options, etc.
**Impact:** Exposed to clickjacking, MIME-type attacks, XSS
**Remediation:**
```typescript
app.use((req, res, next) => {
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Content-Security-Policy', "default-src 'self'");
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

### 5.2 Rate Limiting ✓ NOT IMPLEMENTED
**Severity:** MEDIUM (Development), HIGH (Production)
**Problem:** No rate limiting found in codebase
**Attacks Possible:**
- Brute force on login endpoint
- DDoS on expensive operations
- Resource exhaustion

**Remediation:**
```typescript
import rateLimit from 'express-rate-limit';

// General API limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later'
});

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true
});

app.use('/auth/', authLimiter);
app.use('/api/', limiter);
```

### 5.3 GraphQL-Specific Security ✓ MOSTLY SECURE
**Status:** GOOD

**Strengths:**
- Depth limit of 7 prevents deeply nested queries (line 43, 149 in server.ts)
- Introspection disabled in production (line 48)
- Stack traces disabled in production (line 50)

**Issues Found:**

#### Issue #16: Missing Complexity Limit
**Severity:** MEDIUM
**Problem:** Only depth is limited, not query complexity
**Attack:** Complex but shallow queries can still cause DoS
**Code Location:** `/packages/graphql-server/src/server.ts`
**Remediation:**
```typescript
import ComplexityValidator from 'graphql-validation-complexity';

validationRules: [
  depthLimit(7),
  ComplexityValidator(
    {
      variables: variables,
      estimators: [simpleEstimator],
    },
    ({ estimatedComplexity }) => {
      if (estimatedComplexity > 1000) {
        throw new Error('Query too complex');
      }
    }
  )
]
```

#### Issue #17: No Operation Type Restrictions
**Severity:** MEDIUM
**Problem:** GraphQL mutations/queries not restricted
**Attack:** Unauthorized operations could be attempted
**Remediation:** Whitelist operations or implement operation type checks
