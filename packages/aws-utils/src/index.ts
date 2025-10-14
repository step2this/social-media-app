/**
 * AWS utilities for client creation and configuration
 * Moved from backend/src/utils/aws-config.ts to be shared across packages
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { KinesisClient } from '@aws-sdk/client-kinesis';
import Redis from 'ioredis';

/**
 * Environment detection for LocalStack
 */
export const isLocalStackEnvironment = (): boolean => {
  return (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') &&
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

/**
 * Create Kinesis client with environment-aware configuration
 */
export const createKinesisClient = (): KinesisClient => {
  const config = getAWSConfig();

  return new KinesisClient({
    ...config,
    maxAttempts: 3
  });
};

/**
 * Get Kinesis stream name based on environment
 */
export const getKinesisStreamName = (): string => {
  const env = process.env.NODE_ENV || 'development';
  const useLocalStack = process.env.USE_LOCALSTACK === 'true';

  if (useLocalStack) {
    return 'feed-events-local';
  }

  return process.env.KINESIS_STREAM_NAME || `feed-events-${env}`;
};

/**
 * Get Redis endpoint based on environment
 *
 * For Multi-AZ deployments, this returns the primary endpoint which automatically
 * handles failover. The endpoint remains constant even during failover events.
 *
 * @returns Redis endpoint string - primary endpoint for replication groups
 */
export const getRedisEndpoint = (): string => {
  if (isLocalStackEnvironment()) {
    return process.env.REDIS_ENDPOINT || 'localhost';
  }

  // For production/staging, this will be the replication group's primary endpoint
  // Format: feed-cache-{env}.{id}.cache.amazonaws.com
  // This endpoint automatically redirects to the current primary node
  return process.env.REDIS_ENDPOINT || 'feed-cache-prod.redis.amazonaws.com';
};

/**
 * Get Redis reader endpoint for read-heavy workloads (Multi-AZ only)
 *
 * For Multi-AZ deployments, this returns the reader endpoint which load-balances
 * across all read replicas. Use this for read-only operations to distribute load.
 *
 * @returns Redis reader endpoint string or primary endpoint if not Multi-AZ
 */
export const getRedisReaderEndpoint = (): string => {
  if (isLocalStackEnvironment()) {
    return process.env.REDIS_READER_ENDPOINT || process.env.REDIS_ENDPOINT || 'localhost';
  }

  // For production/staging with Multi-AZ, use reader endpoint for load distribution
  // Falls back to primary endpoint if reader endpoint not available
  return process.env.REDIS_READER_ENDPOINT || getRedisEndpoint();
};

/**
 * Get Redis port
 */
export const getRedisPort = (): number => {
  return parseInt(process.env.REDIS_PORT || '6379', 10);
};

/**
 * Get Redis configuration for ioredis with Multi-AZ support
 *
 * Configured for high availability with automatic failover handling:
 * - Aggressive reconnection during failover events
 * - Appropriate timeouts for Multi-AZ deployments
 * - Connection pooling optimized for Lambda
 */
export const getRedisConfig = () => {
  const isProduction = process.env.ENVIRONMENT === 'prod' || process.env.ENVIRONMENT === 'staging';

  return {
    host: getRedisEndpoint(),
    port: getRedisPort(),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS_ENABLED === 'true' ? {} : undefined,

    // Connection pool settings optimized for Lambda
    maxRetriesPerRequest: isProduction ? 5 : 3, // More retries in production for failover
    enableOfflineQueue: false, // Fail fast in Lambda environment
    connectTimeout: isProduction ? 20000 : 10000, // Longer timeout for Multi-AZ failover
    commandTimeout: 5000, // Command timeout to prevent hanging

    // Enhanced reconnection strategy for Multi-AZ failover
    retryStrategy: (times: number) => {
      // During failover, ElastiCache takes up to 60 seconds
      if (isProduction) {
        if (times > 10) {
          // After 10 retries (~30 seconds), give up
          console.error('[Redis] Max reconnection attempts reached');
          return null;
        }
        // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms, 3000ms...
        const delay = Math.min(times * times * 100, 3000);
        console.warn(`[Redis] Reconnection attempt ${times}, delay: ${delay}ms`);
        return delay;
      } else {
        // Development: simpler retry strategy
        if (times > 3) {
          return null;
        }
        return Math.min(times * 100, 3000);
      }
    },

    // Multi-AZ specific settings
    enableReadyCheck: true, // Verify connection is ready before use
    lazyConnect: false, // Connect immediately to detect issues early
    keepAlive: 30000, // Keep connection alive in Lambda

    // Sentinel/Cluster settings (for future enhancement)
    sentinelRetryStrategy: isProduction ? (times: number) => Math.min(times * 100, 3000) : undefined
  };
};

/**
 * Create Redis client with environment-aware configuration
 *
 * @returns Redis client instance configured for the current environment
 * @throws Error if Redis configuration is invalid
 *
 * @example
 * ```typescript
 * try {
 *   const redisClient = createRedisClient();
 *   const cacheService = new RedisCacheService(redisClient);
 * } catch (error) {
 *   console.warn('Redis initialization failed, cache disabled', error);
 * }
 * ```
 */
export const createRedisClient = (): Redis => {
  const config = getRedisConfig();
  return new Redis(config);
};
