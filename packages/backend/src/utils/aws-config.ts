/**
 * AWS configuration utilities
 * Re-exports from @social-media-app/aws-utils for backward compatibility
 */

export {
  isLocalStackEnvironment,
  getLocalStackEndpoint,
  getAWSConfig,
  createDynamoDBClient,
  createS3Client,
  createKinesisClient,
  getTableName,
  getS3BucketName,
  getCloudFrontDomain,
  getKinesisStreamName,
  getRedisEndpoint,
  getRedisReaderEndpoint,
  getRedisPort,
  getRedisConfig,
  createRedisClient,
  type AWSConfig
} from '@social-media-app/aws-utils';

// Load environment variables for local development
import { loadEnvironmentSync } from './env.js';
loadEnvironmentSync();
