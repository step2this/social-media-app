#!/bin/bash
set -e

echo "🔄 Rolling Back Backend Deployment..."

# Check prerequisites
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not installed"
    exit 1
fi

if ! command -v cdk &> /dev/null; then
    echo "❌ AWS CDK not installed"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Run 'aws configure'"
    exit 1
fi

echo "⚠️  WARNING: This will destroy all backend infrastructure!"
echo "📋 Environment: ${CDK_ENV:-dev}"
echo "🌎 Region: ${AWS_DEFAULT_REGION:-us-east-1}"
echo "👤 AWS Account: $(aws sts get-caller-identity --query Account --output text)"
echo ""

read -p "Are you sure you want to rollback/destroy the backend? (type 'yes' to confirm): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Rollback cancelled"
    exit 1
fi

cd infrastructure
pnpm install
pnpm build

echo "🗑️  Destroying infrastructure stacks..."
pnpm cdk destroy -a "node bin/backend-only-deploy.js" --all --force

echo "✅ Backend rollback complete!"
echo "🔄 All AWS resources have been destroyed"