#!/bin/bash

# TamaFriends LocalStack Initialization Script
# This script runs when LocalStack starts to set up basic services

set -e

echo "🚀 Initializing TamaFriends LocalStack services..."

# Wait for LocalStack to be ready
echo "⏳ Waiting for LocalStack to be ready..."
while ! curl -s http://localhost:4566/_localstack/health > /dev/null; do
  sleep 2
done

echo "✅ LocalStack is ready!"

# Create S3 bucket for media storage
echo "📦 Creating S3 media bucket..."
aws --endpoint-url=http://localhost:4566 s3 mb s3://tamafriends-media-local || echo "Bucket already exists"

# Enable S3 CORS for frontend uploads
echo "🔧 Configuring S3 CORS..."
aws --endpoint-url=http://localhost:4566 s3api put-bucket-cors --bucket tamafriends-media-local --cors-configuration '{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedOrigins": ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}' || echo "CORS already configured"

# Create DynamoDB table (basic structure - will be enhanced in Phase 3)
echo "🗄️  Creating DynamoDB table..."
aws --endpoint-url=http://localhost:4566 --region us-east-1 dynamodb create-table \
    --table-name tamafriends-local \
    --attribute-definitions \
        AttributeName=PK,AttributeType=S \
        AttributeName=SK,AttributeType=S \
        AttributeName=GSI1PK,AttributeType=S \
        AttributeName=GSI1SK,AttributeType=S \
        AttributeName=GSI2PK,AttributeType=S \
        AttributeName=GSI2SK,AttributeType=S \
    --key-schema \
        AttributeName=PK,KeyType=HASH \
        AttributeName=SK,KeyType=RANGE \
    --global-secondary-indexes \
        'IndexName=GSI1,KeySchema=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL}' \
        'IndexName=GSI2,KeySchema=[{AttributeName=GSI2PK,KeyType=HASH},{AttributeName=GSI2SK,KeyType=RANGE}],Projection={ProjectionType=ALL}' \
    --billing-mode PAY_PER_REQUEST \
    || echo "Table already exists"

# Enable DynamoDB Streams for event-sourced materialized views
echo "🔄 Enabling DynamoDB Streams..."
aws --endpoint-url=http://localhost:4566 --region us-east-1 dynamodb update-table \
    --table-name tamafriends-local \
    --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
    || echo "Streams already enabled"

echo "✅ TamaFriends LocalStack initialization complete!"
echo "🌐 LocalStack Dashboard: http://localhost:4566"
echo "📊 Health Check: http://localhost:4566/_localstack/health"
echo "📦 S3 Bucket: tamafriends-media-local"
echo "🗄️  DynamoDB Table: tamafriends-local"