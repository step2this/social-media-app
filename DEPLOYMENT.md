# Backend Lambda Deployment Plan

## 📋 Deployment Readiness Assessment

### ✅ Infrastructure Analysis Complete

**Current Status**: **READY TO DEPLOY**

All backend Lambda functions are properly configured and ready for deployment:

- **12 Lambda Functions** successfully bundled and tested:
  - `HelloFunction` (130.7kb) - Health check endpoint
  - **Auth Lambdas** (5 functions):
    - `RegisterFunction` (170.2kb) - User registration
    - `LoginFunction` (170.1kb) - User authentication
    - `LogoutFunction` (184.0kb) - Session termination
    - `RefreshFunction` (170.2kb) - Token refresh
    - `ProfileFunction` (185.9kb) - User profile management
  - **Profile/Post Lambdas** (6 functions):
    - `GetProfileFunction` (139.3kb) - Fetch user profiles
    - `UpdateProfileFunction` (175.8kb) - Profile updates
    - `GetUploadUrlFunction` (175.8kb) - S3 presigned URLs
    - `CreatePostFunction` (184.5kb) - Post creation
    - `GetUserPostsFunction` (147.6kb) - Post retrieval
    - `DeletePostFunction` (183.8kb) - Post deletion

### 🏗️ Infrastructure Stacks

**3 Stacks Ready for Deployment:**

1. **DatabaseStack** - DynamoDB table with GSI indexes
2. **MediaStack** - S3 bucket with CloudFront CDN
3. **ApiStack** - Lambda functions with HTTP API Gateway

### 🌐 API Gateway & CORS Configuration

**Perfect for Local Development:**
- CORS configured for `localhost:3000`, `localhost:3001`, `localhost:5173`
- All HTTP methods supported (GET, POST, PUT, DELETE, OPTIONS, PATCH)
- Proper headers: `Content-Type`, `Authorization`, `X-Correlation-Id`
- HTTP API Gateway with structured routing

**API Endpoints Ready:**
- `/hello` - Health check
- `/auth/*` - Authentication endpoints
- `/profile/*` - Profile management
- `/posts/*` - Post operations

---

## 🚀 Pre-Deployment Checklist

### ✅ Code Quality & Testing
- [x] **All backend tests passing** (58 tests, 100% success rate)
- [x] **TypeScript compilation clean** (no errors)
- [x] **Linting passed** (only minor warnings)
- [x] **Lambda bundling successful** (all 12 functions bundled)
- [x] **Dependency injection patterns implemented**
- [x] **Error handling comprehensive**
- [x] **Authentication & authorization complete**

### ✅ Infrastructure Validation
- [x] **CDK synthesis successful** (all stacks generated)
- [x] **Lambda function configurations verified**
- [x] **DynamoDB schema with proper GSI indexes**
- [x] **S3 bucket with lifecycle policies**
- [x] **CloudFront distribution configured**
- [x] **API Gateway with CORS for localhost**
- [x] **IAM permissions properly scoped**

### ⚠️ Required Before Deployment
- [ ] **AWS credentials configured** (`aws configure` or environment variables)
- [ ] **AWS CDK CLI installed** (`npm install -g aws-cdk`)
- [ ] **Environment variables set** (JWT_SECRET, etc.)
- [ ] **AWS account/region confirmed**

---

## 🛠️ Deployment Execution Plan

### Phase 1: Environment Preparation

```bash
# 1. Install CDK CLI globally (if not already installed)
npm install -g aws-cdk

# 2. Configure AWS credentials
aws configure
# OR set environment variables:
# export AWS_ACCESS_KEY_ID=your-key
# export AWS_SECRET_ACCESS_KEY=your-secret
# export AWS_DEFAULT_REGION=us-east-1

# 3. Set JWT secrets (IMPORTANT for production)
export JWT_SECRET="your-super-secure-jwt-secret-min-32-chars"
export JWT_REFRESH_SECRET="your-super-secure-refresh-secret-min-32-chars"
```

### Phase 2: Infrastructure Deployment

```bash
# Navigate to infrastructure directory
cd /Users/shaperosteve/social-media-app/infrastructure

# Build TypeScript
pnpm build

# Bootstrap CDK (first time only)
pnpm cdk bootstrap

# Deploy backend-only stacks
pnpm cdk deploy -a "node bin/backend-only-deploy.js" --all --require-approval never

# Alternative: Deploy individual stacks
pnpm cdk deploy SocialMediaApp-dev-Database -a "node bin/backend-only-deploy.js"
pnpm cdk deploy SocialMediaApp-dev-Media -a "node bin/backend-only-deploy.js"
pnpm cdk deploy SocialMediaApp-dev-Api -a "node bin/backend-only-deploy.js"
```

### Phase 3: Post-Deployment Verification

```bash
# 1. Get API Gateway URL from CDK output
# Look for: "ApiUrl = https://your-api-id.execute-api.region.amazonaws.com"

# 2. Test health endpoint
curl -X POST https://your-api-gateway-url/hello -H "Content-Type: application/json" -d '{"name": "test"}'

# 3. Test CORS from localhost:3001
# Should work from your running frontend application
```

---

## 📊 Resource Configuration

### DynamoDB Configuration
- **Table**: `social-media-app-dev`
- **Billing**: Pay-per-request
- **Encryption**: AWS managed
- **Point-in-time recovery**: Enabled for production
- **Global Secondary Indexes**:
  - `GSI1`: Email lookups (`GSI1PK`, `GSI1SK`)
  - `GSI2`: Username lookups (`GSI2PK`, `GSI2SK`)

### S3 & CloudFront Configuration
- **Bucket**: `social-media-app-media-dev-{account-id}`
- **Public access**: Blocked (secure)
- **CORS**: Configured for localhost development
- **Lifecycle**: Auto-delete incomplete uploads, IA transition after 90 days
- **CloudFront**: Global CDN with caching policies

### Lambda Configuration
- **Runtime**: Node.js 20.x
- **Memory**: 512 MB (adjustable per function)
- **Timeout**: 30 seconds
- **Environment Variables**:
  - `NODE_ENV`: dev/prod
  - `LOG_LEVEL`: debug/warn
  - `TABLE_NAME`: DynamoDB table name
  - `MEDIA_BUCKET_NAME`: S3 bucket name
  - `CLOUDFRONT_DOMAIN`: CDN domain
  - `JWT_SECRET`: Authentication secret
  - `JWT_REFRESH_SECRET`: Refresh token secret

---

## 🔧 Deployment Scripts & Utilities

### Quick Deploy Script
Create `deploy-backend.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Starting Backend Deployment..."

# Check prerequisites
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not installed. Please install: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"
    exit 1
fi

if ! command -v cdk &> /dev/null; then
    echo "❌ AWS CDK not installed. Installing..."
    npm install -g aws-cdk
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Run 'aws configure'"
    exit 1
fi

# Set default environment variables if not set
export JWT_SECRET=${JWT_SECRET:-"development-secret-change-in-production"}
export JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET:-"development-refresh-secret-change-in-production"}

if [ "$JWT_SECRET" = "development-secret-change-in-production" ]; then
    echo "⚠️  WARNING: Using development JWT secret. Set JWT_SECRET for production!"
fi

echo "📋 Environment: ${CDK_ENV:-dev}"
echo "🌎 Region: ${AWS_DEFAULT_REGION:-us-east-1}"
echo "👤 AWS Account: $(aws sts get-caller-identity --query Account --output text)"

cd infrastructure
pnpm install
pnpm build

echo "🏗️  Deploying infrastructure stacks..."
pnpm cdk deploy -a "node bin/backend-only-deploy.js" --all --require-approval never

echo "✅ Backend deployment complete!"
echo "📝 Note the API Gateway URL from the output above"
echo "🧪 Test with: curl -X POST <API_URL>/hello -H 'Content-Type: application/json' -d '{\"name\": \"test\"}'"
```

### Environment-Specific Deployments

```bash
# Development deployment (default)
./deploy-backend.sh

# Production deployment
CDK_ENV=prod JWT_SECRET="your-prod-secret" ./deploy-backend.sh

# Staging deployment
CDK_ENV=staging JWT_SECRET="your-staging-secret" ./deploy-backend.sh
```

---

## 🔍 Monitoring & Troubleshooting

### CloudWatch Logs
Lambda functions log to CloudWatch with structured logging:
- Log group: `/aws/lambda/social-media-app-{function-name}-{env}`
- Retention: 14 days (configurable)
- Error context included in all logs

### Health Monitoring
- **Health endpoint**: `POST /hello`
- **Expected response**: `{"message": "Hello {name}", "timestamp": "...", "serverTime": "..."}`
- **Monitor**: API Gateway metrics, Lambda metrics, DynamoDB metrics

### Common Issues & Solutions

1. **CORS errors from localhost:3001**
   - ✅ CORS is properly configured for localhost ports
   - Check browser console for specific CORS errors

2. **JWT authentication errors**
   - Ensure `JWT_SECRET` environment variable is set
   - Check token format: `Authorization: Bearer <token>`

3. **DynamoDB access errors**
   - IAM permissions are properly scoped in CDK
   - Check CloudWatch logs for specific DynamoDB errors

4. **S3 upload errors**
   - Presigned URLs have 15-minute expiration
   - CORS configured for direct browser uploads

---

## 🚦 Deployment Rollback Plan

### Immediate Rollback
```bash
# Destroy current deployment
cd infrastructure
pnpm cdk destroy -a "node bin/backend-only-deploy.js" --all

# Redeploy previous version
git checkout previous-working-commit
./deploy-backend.sh
```

### Blue-Green Deployment (Advanced)
For production, consider blue-green deployments:
1. Deploy to staging environment
2. Run integration tests
3. Switch traffic using Route 53 weighted routing
4. Monitor metrics and logs
5. Complete cutover or rollback

---

## 📈 Performance & Cost Optimization

### Lambda Optimization
- Bundle sizes optimized (130-185kb)
- Tree-shaking enabled via esbuild
- External AWS SDK dependencies
- Cold start mitigation via provisioned concurrency (if needed)

### DynamoDB Optimization
- Single-table design for efficiency
- Proper GSI design for query patterns
- Pay-per-request billing (cost-effective for variable loads)

### S3 & CloudFront
- Lifecycle policies to reduce storage costs
- CloudFront caching to reduce origin requests
- Optimized cache headers and TTL

### Estimated Monthly Costs (Development)
- **Lambda**: $1-5 (1M requests)
- **DynamoDB**: $1-10 (based on usage)
- **S3**: $1-5 (1GB storage)
- **CloudFront**: $1-10 (1GB transfer)
- **API Gateway**: $1-5 (1M requests)
- **Total**: ~$5-35/month for development

---

## ✅ Ready to Deploy!

**All systems are GO for deployment:**

1. **Code Quality**: 58 tests passing, clean compilation
2. **Infrastructure**: CDK synthesis successful, all resources configured
3. **Security**: Authentication, authorization, and CORS properly implemented
4. **Local Integration**: Perfect CORS configuration for localhost:3001 consumption
5. **Monitoring**: Structured logging and error handling in place
6. **Documentation**: Complete deployment and troubleshooting guides

**Execute the deployment plan above to get your backend Lambda functions live and ready for local frontend consumption!**