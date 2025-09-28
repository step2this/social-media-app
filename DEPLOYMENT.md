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

---

## 🔄 CI/CD Pipeline Documentation

### Overview

The TamaFriends application now includes a comprehensive CI/CD pipeline with GitHub Actions for automated deployment, monitoring, and rollback capabilities.

### Workflows

#### 1. Deploy Workflow (`.github/workflows/deploy.yml`)
- **Triggers**:
  - Automatic: Push to `main` branch (deploys to dev)
  - Manual: Workflow dispatch (staging/production)
- **Features**:
  - Build and test all packages
  - Run unit tests and smoke tests
  - Deploy CDK stacks
  - Post-deployment validation with smoke tests
  - Environment-specific configurations

#### 2. Rollback Workflow (`.github/workflows/rollback.yml`)
- **Trigger**: Manual workflow dispatch
- **Features**:
  - Emergency rollback capabilities
  - Stack-specific or full rollback
  - Post-rollback validation
  - Automatic status reporting

#### 3. Monitoring Workflow (`.github/workflows/monitoring.yml`)
- **Triggers**:
  - Scheduled: Every 15 minutes (business hours)
  - Scheduled: Every hour (outside business hours)
  - Manual: On-demand health checks
- **Features**:
  - API health monitoring
  - CloudWatch metrics analysis
  - Error rate tracking
  - Automatic issue creation for production failures

### Environment Management

#### Development
- **Deployment**: Automatic on main branch push
- **Resources**: Minimal allocation
- **Monitoring**: Basic health checks
- **Access**: Public for testing

#### Staging
- **Deployment**: Manual trigger required
- **Resources**: Production-like sizing
- **Monitoring**: Enhanced metrics
- **Access**: Restricted to team

#### Production
- **Deployment**: Manual with approval required
- **Resources**: Full production sizing
- **Monitoring**: Comprehensive alerting
- **Access**: Highly restricted

### GitHub Secrets Configuration

#### Required Secrets
Set these in your GitHub repository settings:
- `AWS_ACCESS_KEY_ID`: AWS access key for deployment
- `AWS_SECRET_ACCESS_KEY`: AWS secret key for deployment

#### Optional Environment Variables
- `JWT_SECRET`: Production JWT signing secret
- `JWT_REFRESH_SECRET`: Production refresh token secret

### Deployment Commands

#### Via GitHub Actions
1. Navigate to GitHub Actions in your repository
2. Select the "Deploy" workflow
3. Click "Run workflow"
4. Choose your target environment
5. Monitor the deployment progress

#### Local Deployment
```bash
# Deploy to development
pnpm deploy:backend

# Deploy to production
pnpm deploy:backend:prod

# Check deployment status
pnpm status
pnpm status:dev
pnpm status:production
```

### Monitoring and Alerting

#### Automated Health Checks
- **API Availability**: Continuous endpoint monitoring
- **Error Rate Monitoring**: Lambda and API Gateway errors
- **Performance Tracking**: Response times and latency
- **Database Health**: DynamoDB connectivity and throttling

#### Alert Conditions
- High error rates (>5 Lambda errors, >10 API 5xx errors per hour)
- API response time degradation (>2 seconds)
- Health check failures
- Database throttling events

#### Incident Response
- **Automatic**: GitHub issues created for production failures
- **Manual**: Use rollback workflow for immediate recovery
- **Monitoring**: Real-time status dashboard via `pnpm status`

### Best Practices

#### Deployment
1. **Always test locally first**: Run full test suite before deployment
2. **Use feature flags**: For risky changes that need gradual rollout
3. **Monitor post-deployment**: Watch metrics for 30 minutes after deployment
4. **Deploy during low traffic**: Minimize user impact
5. **Have rollback ready**: Emergency procedures prepared

#### Security
1. **Rotate secrets regularly**: Update JWT secrets and AWS credentials
2. **Use least privilege**: IAM policies with minimal required permissions
3. **Enable audit trails**: CloudTrail logging in production
4. **Regular security scans**: Dependencies and infrastructure

#### Operations
1. **Status monitoring**: Regular health checks with `pnpm status`
2. **Log analysis**: CloudWatch logs for error investigation
3. **Performance baselines**: Track metrics over time
4. **Capacity planning**: Monitor resource utilization

### Troubleshooting Guide

#### Common CI/CD Issues

**1. Deployment Failures**
```bash
# Check GitHub Actions logs
# Verify AWS credentials in repository secrets
# Ensure CDK bootstrap is complete

# Local debugging
aws sts get-caller-identity
cd infrastructure && cdk synth
```

**2. Health Check Failures**
```bash
# Check API Gateway URL
aws cloudformation describe-stacks --stack-name SocialMediaApp-dev-Api

# Test manually
curl -X GET https://your-api-url/health

# Run smoke tests locally
SMOKE_TEST_URL=https://your-api-url pnpm --filter @social-media-app/smoke-tests test
```

**3. Smoke Test Failures**
```bash
# Check smoke test logs in GitHub Actions
# Verify environment variables
# Test connectivity to deployed API

# Local smoke test debugging
cd packages/smoke-tests
npm test
```

#### Emergency Procedures

**Complete Service Outage:**
1. Check status: `pnpm status:production`
2. Review GitHub Actions for failed deployments
3. Use rollback workflow via GitHub Actions
4. Monitor recovery: `pnpm status:production`

**High Error Rates:**
1. Check monitoring workflow results
2. Review CloudWatch alarms
3. Scale resources if needed (update CDK config)
4. Consider rollback if errors persist

### Performance Optimization

#### CI/CD Pipeline
- Parallel test execution
- Docker layer caching
- Dependency caching with pnpm
- Incremental builds where possible

#### Deployment Speed
- CDK stack dependencies optimized
- Lambda bundle sizes minimized
- Parallel stack deployment
- Health check optimization

### Cost Management

#### CI/CD Costs
- GitHub Actions: Free tier sufficient for most projects
- AWS resources: Pay-per-use pricing
- CloudWatch: Minimal costs for basic monitoring

#### Resource Optimization
- Development: Minimal DynamoDB capacity, no provisioned concurrency
- Staging: Moderate resources for testing
- Production: Optimized for performance and reliability

### Future Enhancements

#### Planned Improvements
1. **Blue-Green Deployments**: Zero-downtime production deployments
2. **Canary Releases**: Gradual feature rollout
3. **Automated Testing**: Integration and E2E tests in pipeline
4. **Security Scanning**: Dependency and infrastructure security checks
5. **Performance Testing**: Load testing in staging environment

---

## 🎯 Complete CI/CD Setup

Your TamaFriends application now has a production-ready CI/CD pipeline with:

✅ **Automated Development Deployments**
✅ **Manual Staging/Production Deployments**
✅ **Comprehensive Health Monitoring**
✅ **Emergency Rollback Procedures**
✅ **Smoke Test Integration**
✅ **Environment-Specific Configurations**
✅ **Real-time Status Dashboard**

**Ready for continuous deployment and reliable operations!**