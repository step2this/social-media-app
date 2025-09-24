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