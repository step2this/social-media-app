import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { loadEnvironmentSync } from './env.js';

// Load environment variables for local development
loadEnvironmentSync();

/**
 * Environment detection for LocalStack
 */
export const isLocalStackEnvironment = (): boolean => {
  return process.env.NODE_ENV === 'development' &&
         process.env.USE_LOCALSTACK === 'true';
};

/**
 * Get LocalStack endpoint URL
 */
export const getLocalStackEndpoint = (): string => {
  return process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566';
};

/**
 * AWS configuration for LocalStack compatibility
 */
export interface AWSConfig {
  region: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

/**
 * Get AWS configuration based on environment
 */
export const getAWSConfig = (): AWSConfig => {
  const region = process.env.AWS_REGION || 'us-east-1';

  if (isLocalStackEnvironment()) {
    return {
      region,
      endpoint: getLocalStackEndpoint(),
      forcePathStyle: true, // Required for S3 with LocalStack
    };
  }

  return { region };
};

/**
 * Create DynamoDB document client with environment-aware configuration
 */
export const createDynamoDBClient = (): DynamoDBDocumentClient => {
  const config = getAWSConfig();

  const client = new DynamoDBClient(config);

  return DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertEmptyValues: false
    },
    unmarshallOptions: {
      wrapNumbers: false
    }
  });
};

/**
 * Create S3 client with environment-aware configuration
 */
export const createS3Client = (): S3Client => {
  const config = getAWSConfig();

  // For LocalStack compatibility, disable automatic checksum calculation
  if (isLocalStackEnvironment()) {
    return new S3Client({
      ...config,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED'
    });
  }

  return new S3Client(config);
};

/**
 * Get table name from environment with LocalStack fallback
 */
export const getTableName = (): string => {
  if (isLocalStackEnvironment()) {
    return process.env.TABLE_NAME || 'tamafriends-local';
  }

  const tableName = process.env.TABLE_NAME;
  if (!tableName) {
    throw new Error('TABLE_NAME environment variable is required');
  }
  return tableName;
};

/**
 * Get S3 bucket name with LocalStack fallback
 */
export const getS3BucketName = (): string => {
  if (isLocalStackEnvironment()) {
    return process.env.MEDIA_BUCKET_NAME || 'tamafriends-media-local';
  }

  return process.env.MEDIA_BUCKET_NAME || '';
};

/**
 * Get CloudFront domain (not used in LocalStack)
 */
export const getCloudFrontDomain = (): string | undefined => {
  if (isLocalStackEnvironment()) {
    return undefined; // CloudFront not available in LocalStack
  }

  return process.env.CLOUDFRONT_DOMAIN;
};