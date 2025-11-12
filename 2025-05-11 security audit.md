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
## 6. DATA PROTECTION

### 6.1 Password Hashing ✓ SECURE
**Status:** SECURE

**File:** `/packages/dal/src/services/auth.service.ts` (Lines 440-450)

**Implementation:**
```typescript
hashPassword: (password: string, salt: string): string =>
  pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex'),
generateSalt: (): string =>
  randomBytes(32).toString('hex'),
verifyPassword: (password: string, hash: string, salt: string): boolean => {
  const hashBuffer = Buffer.from(hash, 'hex');
  const verifyBuffer = pbkdf2Sync(password, salt, 100000, 64, 'sha256');
  return timingSafeEqual(hashBuffer, verifyBuffer);
}
```

**Strengths:**
- PBKDF2 with 100,000 iterations (industry standard)
- 32-byte salt (256 bits)
- 64-byte hash output (512 bits)
- Timing-safe comparison to prevent timing attacks
- Salt stored separately (good practice)

**No Issues Found** ✓

### 6.2 Sensitive Data Handling ✓ MOSTLY SECURE
**Status:** GOOD

**Strengths:**
- Passwords not logged (error handling redacts)
- Email in logs is redacted (line 47 in login.ts)
- No sensitive data in URLs
- No sensitive data in error messages

**Issues Found:**

#### Issue #18: JWT Tokens in Logs
**Severity:** MEDIUM
**File:** `/packages/graphql-server/src/standalone-server.ts` (Line 76)
```typescript
console.warn('JWT verification failed in GraphQL context:', error...);
```
**Problem:** Could log token details in error messages
**Remediation:**
```typescript
console.warn('JWT verification failed in GraphQL context: Invalid token');
// Don't log the token or specific failure details
```

#### Issue #19: Refresh Token Exposed in API Responses
**Severity:** MEDIUM
**Problem:** Refresh tokens returned in HTTP responses (not secure)
**Best Practice:** Use HttpOnly cookies for tokens
**Remediation:**
```typescript
res.cookie('refreshToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
  maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
});
```

### 6.3 S3 Bucket Security ✓ SECURE
**Status:** SECURE

**File:** `/infrastructure/lib/stacks/media-stack.ts`

**Strengths:**
- `blockPublicAccess: true` blocks all public access (line 25)
- CloudFront OAI (Origin Access Identity) for access (line 61-67)
- Proper bucket policy grants only CloudFront access (line 70-76)
- CORS configured appropriately (line 30-39)
- No public read/write permissions
- Lifecycle rules for cleanup (line 41-56)

**No Critical Issues Found** ✓

---

## 7. DEPENDENCIES SECURITY

### 7.1 Known Vulnerabilities Analysis
**Status:** Need to verify with `npm audit` or `pnpm audit`

**Key Dependencies Analyzed:**
- `jose` (JWT) - Well-maintained, no known issues
- `cors` - Standard, mature library
- `express` - v4.18.2 (recent)
- `graphql-depth-limit` - Simple, low risk
- `zod` - v3.25.76 (recent validation)

**Note:** Cannot determine exact vulnerability status without running:
```bash
pnpm audit --recursive
```

**Recommendation:** Run audit and check:
1. No critical vulnerabilities
2. High vulnerabilities have patches
3. Regular dependency updates (monthly)

### 7.2 Dependency Version Control ✓ GOOD
**Status:** GOOD

**File:** All `package.json` files use `^` caret notation
**Meaning:** Automatic patch updates but controlled major/minor versions

---

## 8. INFRASTRUCTURE SECURITY

### 8.1 IAM Roles and Policies ✓ MOSTLY SECURE
**Status:** GOOD WITH IMPROVEMENTS

**Findings:**
- Lambda functions use IAM roles (not hardcoded credentials)
- S3 permissions are specific and minimal
- DynamoDB permissions granted to Lambda only
- No wildcard permissions found in main code

**Issues Found:**

#### Issue #20: Over-Permissive IAM Policies
**Severity:** MEDIUM
**File:** `/infrastructure/lib/constructs/graphql-lambda.ts`
```typescript
this.function.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    's3:GetObject',
    's3:PutObject',
    's3:GetObjectAttributes'
  ],
  resources: [`${props.mediaBucket.bucketArn}/*`] // ISSUE: Wildcard on objects
}));
```
**Problem:** Allows access to all objects in bucket
**Remediation:**
```typescript
// Restrict to specific prefixes
resources: [
  `${props.mediaBucket.bucketArn}/uploads/*`,
  `${props.mediaBucket.bucketArn}/thumbnails/*`
]
```

#### Issue #21: No Resource Tagging Strategy
**Severity:** MEDIUM
**Problem:** No tags for cost tracking, security classification
**Impact:** Can't easily identify or control resources
**Remediation:** Add tags to all resources:
```typescript
Tags.of(this).add('Environment', props.environment);
Tags.of(this).add('Project', 'social-media-app');
Tags.of(this).add('SecurityClassification', 'internal');
Tags.of(this).add('Owner', 'security@company.com');
```

### 8.2 Network Security ✓ SECURE
**Status:** SECURE

**Strengths:**
- VPC created for production (line 41 in api-stack.ts)
- Private subnets with NAT gateway
- Lambda functions in private subnets
- No direct internet exposure of databases
- Proper security group isolation

### 8.3 Data Encryption ⚠ INCOMPLETE
**Severity:** HIGH
**Issue:** No evidence of encryption at rest or in transit

**Problems:**
1. DynamoDB encryption at rest not explicitly configured
2. Database password not enforced strong policy
3. S3 server-side encryption not visible in code
4. Redis not shown with encryption configuration

**Remediation:**
```typescript
// DynamoDB encryption
const table = new dynamodb.Table(this, 'Table', {
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  // or AWS_MANAGED with Customer Managed Keys
  encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
  encryptionKey: kmsKey,
});

// S3 encryption
this.mediaBucket = new s3.Bucket(this, 'MediaBucket', {
  encryption: s3.BucketEncryption.S3_MANAGED,
  // or use KMS:
  encryption: s3.BucketEncryption.KMS,
  encryptionKey: kmsKey,
});
```

---

## 9. CSRF PROTECTION

### 9.1 CSRF Status ✓ SECURE
**Status:** SECURE (GraphQL-specific)

**Why GraphQL is Safe:**
- No form-based submissions (uses JSON POST)
- Requires Authorization header (not browser cookies)
- Custom header requirement prevents browser CSRF

**Note:** If REST API added, CSRF tokens would be required

---

## 10. ERROR HANDLING & INFO DISCLOSURE

### 10.1 Error Messages ✓ MOSTLY SECURE
**Status:** GOOD

**Issues Found:**

#### Issue #22: Stack Traces Enabled in Development
**Severity:** LOW (Development), MEDIUM (Staging)
**File:** `/packages/graphql-server/src/server.ts` (Line 50)
```typescript
includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
```
**Problem:** Stack traces leaked in non-production environments
**Risk:** If staging is accessible to internet, stack traces visible
**Remediation:**
```typescript
includeStacktraceInErrorResponses: process.env.NODE_ENV === 'development' && process.env.DEBUG_MODE === 'true',
```

#### Issue #23: Detailed Error Messages
**Severity:** MEDIUM
**File:** `/packages/dal/src/services/auth.service.ts` (Line 206, 219)
```typescript
throw new Error('Invalid email or password');
```
**Problem:** Same message for both invalid email and invalid password (Good!)
**Issue:** Difference between "Email already registered" (allows enumeration)
**Remediation:**
```typescript
// Already good - uses same message for both cases
if (error.message === 'Invalid email or password') {
  // Generic response to client
  return unauthorizedResponse('Invalid credentials');
}
```

---

## SUMMARY OF FINDINGS

### CRITICAL ISSUES (Fix Immediately)
1. ✓ Mock secrets exposed in `.env.mocks` → **REMOVE OR SECURE**
2. ✓ Refresh tokens stored in plain text → **HASH BEFORE STORAGE**
3. ✓ No token revocation mechanism → **IMPLEMENT WITH REDIS**
4. ✓ Missing security headers → **ADD HELMET.JS OR MANUAL HEADERS**

### HIGH PRIORITY ISSUES (Fix Before Production)
1. ✓ No rate limiting → **IMPLEMENT EXPRESS-RATE-LIMIT**
2. ✓ Refresh token not rotated → **IMPLEMENT ROTATION**
3. ✓ Missing complexity validation for GraphQL → **ADD COMPLEXITY VALIDATOR**
4. ✓ No encryption at rest configured → **ENABLE KMS ENCRYPTION**
5. ✓ CORS potentially misconfigured for dev/prod mixes → **AUDIT AND FIX**

### MEDIUM PRIORITY ISSUES (Fix Before Staging)
1. ✓ Over-permissive S3 IAM policies → **RESTRICT TO PREFIXES**
2. ✓ JWT secret length not validated → **ADD MIN LENGTH CHECK**
3. ✓ No device fingerprinting → **IMPLEMENT FOR FRAUD DETECTION**
4. ✓ Refresh token not stored hashed → **HASH ON STORAGE**
5. ✓ Missing input validation on some fields → **ADD LENGTH/FORMAT CHECKS**
6. ✓ No secrets rotation strategy → **DOCUMENT AND IMPLEMENT**
7. ✓ Stack traces in staging/production → **DISABLE**

### LOW PRIORITY ISSUES (Nice to Have)
1. ✓ Token details in error logs → **SCRUB FROM LOGS**
2. ✓ No authorization on some read operations → **ADD CHECKS**
3. ✓ No resource tagging → **ADD TAGS FOR ORGANIZATION**

---

## REMEDIATION PRIORITY ROADMAP

### PHASE 1: CRITICAL (Week 1)
- [ ] Remove or secure `.env.mocks`
- [ ] Implement token revocation with Redis
- [ ] Add security headers middleware
- [ ] Hash refresh tokens before storage

### PHASE 2: HIGH (Week 2-3)
- [ ] Implement rate limiting
- [ ] Add GraphQL complexity validation
- [ ] Implement refresh token rotation
- [ ] Enable encryption at rest for all storage

### PHASE 3: MEDIUM (Week 4)
- [ ] Restrict IAM policies to specific resources
- [ ] Add JWT secret validation
- [ ] Implement device fingerprinting
- [ ] Complete input validation on all fields
- [ ] Document secrets rotation procedure

### PHASE 4: VERIFICATION (Week 5)
- [ ] Security testing: Penetration testing
- [ ] Dependency audit: `pnpm audit --recursive`
- [ ] Code review focusing on security
- [ ] Compliance check (GDPR, etc.)

---

## TESTING RECOMMENDATIONS

```bash
# Run dependency audit
pnpm audit --recursive

# Type checking
pnpm run typecheck

# Linting
pnpm run lint

# Tests with coverage
pnpm run test:coverage

# Security scanning (if available)
npm install -g snyk
snyk test
```

---

## CONCLUSION

The application has **strong security foundations** with proper:
- JWT implementation with reasonable expiry
- Password hashing with PBKDF2
- Input validation with Zod
- Ownership verification on resources
- S3 bucket protection with CloudFront

However, **critical issues must be addressed**:
1. Token revocation mechanism needed
2. Security headers missing
3. Rate limiting absent
4. Encryption at rest not verified
5. Token storage needs improvement

With the remediation roadmap above, the application can move to production-ready security posture within 4-5 weeks.

---

## APPENDIX: SECURE CODE EXAMPLES

### Example 1: Token Revocation Implementation
```typescript
// In Redis-backed service
export async function revokeToken(token: string, userId: string, ttl: number) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await redis.setex(
    `revoked_token:${tokenHash}`,
    ttl,
    userId
  );
}

export async function isTokenRevoked(token: string): Promise<boolean> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const revoked = await redis.get(`revoked_token:${tokenHash}`);
  return !!revoked;
}

// In verifyAccessToken
const decoded = await verifyToken(token);
const isRevoked = await isTokenRevoked(token);
if (isRevoked) return null;
return decoded;
```

### Example 2: Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, try again later',
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.ip
});

app.post('/auth/login', authLimiter, loginHandler);
```

### Example 3: Security Headers
```typescript
app.use((req, res, next) => {
  res.header('Strict-Transport-Security', 'max-age=31536000');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Content-Security-Policy', "default-src 'self'");
  next();
});
```
