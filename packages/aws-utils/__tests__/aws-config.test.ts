import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isLocalStackEnvironment,
  getLocalStackEndpoint,
  getAWSConfig,
  createDynamoDBClient,
  createS3Client,
  createKinesisClient,
  getTableName,
  getS3BucketName,
  getKinesisStreamName
} from '../src/index.js';

describe('AWS Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Environment Detection', () => {
    it('should detect LocalStack environment when NODE_ENV is development and USE_LOCALSTACK is true', () => {
      process.env.NODE_ENV = 'development';
      process.env.USE_LOCALSTACK = 'true';

      expect(isLocalStackEnvironment()).toBe(true);
    });

    it('should detect LocalStack environment when NODE_ENV is test and USE_LOCALSTACK is true', () => {
      process.env.NODE_ENV = 'test';
      process.env.USE_LOCALSTACK = 'true';

      expect(isLocalStackEnvironment()).toBe(true);
    });

    it('should not detect LocalStack in production environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.USE_LOCALSTACK = 'false';

      expect(isLocalStackEnvironment()).toBe(false);
    });
  });

  describe('LocalStack Endpoint', () => {
    it('should return LocalStack endpoint from environment', () => {
      process.env.LOCALSTACK_ENDPOINT = 'http://localhost:4566';

      expect(getLocalStackEndpoint()).toBe('http://localhost:4566');
    });

    it('should return default LocalStack endpoint when not specified', () => {
      delete process.env.LOCALSTACK_ENDPOINT;

      expect(getLocalStackEndpoint()).toBe('http://localhost:4566');
    });
  });

  describe('AWS Config', () => {
    it('should return LocalStack config in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.USE_LOCALSTACK = 'true';
      process.env.AWS_REGION = 'us-east-1';

      const config = getAWSConfig();

      expect(config).toHaveProperty('region', 'us-east-1');
      expect(config).toHaveProperty('endpoint');
      expect(config).toHaveProperty('forcePathStyle', true);
    });

    it('should return AWS config in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.AWS_REGION = 'us-west-2';

      const config = getAWSConfig();

      expect(config).toEqual({ region: 'us-west-2' });
    });
  });

  describe('DynamoDB Client', () => {
    it('should create DynamoDB client successfully', () => {
      process.env.AWS_REGION = 'us-east-1';

      const client = createDynamoDBClient();

      expect(client).toBeDefined();
      expect(client.send).toBeDefined(); // DynamoDBDocumentClient has send method
    });
  });

  describe('S3 Client', () => {
    it('should create S3 client successfully', () => {
      process.env.AWS_REGION = 'us-east-1';

      const client = createS3Client();

      expect(client).toBeDefined();
      expect(client.send).toBeDefined(); // S3Client has send method
    });
  });

  describe('Kinesis Client', () => {
    it('should create Kinesis client successfully', () => {
      process.env.AWS_REGION = 'us-east-1';

      const client = createKinesisClient();

      expect(client).toBeDefined();
      expect(client.send).toBeDefined(); // KinesisClient has send method
    });
  });

  describe('Resource Name Helpers', () => {
    it('should get table name from environment in LocalStack', () => {
      process.env.NODE_ENV = 'development';
      process.env.USE_LOCALSTACK = 'true';
      process.env.TABLE_NAME = 'tamafriends-local';

      expect(getTableName()).toBe('tamafriends-local');
    });

    it('should use default table name in LocalStack when not specified', () => {
      process.env.NODE_ENV = 'development';
      process.env.USE_LOCALSTACK = 'true';
      delete process.env.TABLE_NAME;

      expect(getTableName()).toBe('tamafriends-local');
    });

    it('should throw error in production when TABLE_NAME not specified', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.TABLE_NAME;

      expect(() => getTableName()).toThrow('TABLE_NAME environment variable is required');
    });

    it('should get S3 bucket name from environment', () => {
      process.env.MEDIA_BUCKET_NAME = 'my-bucket';

      expect(getS3BucketName()).toBe('my-bucket');
    });

    it('should get Kinesis stream name from environment', () => {
      process.env.NODE_ENV = 'development';
      process.env.USE_LOCALSTACK = 'true';

      expect(getKinesisStreamName()).toBe('feed-events-local');
    });
  });
});
