/**
 * Tests for environment configuration utilities
 * Tests written FIRST following TDD approach
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isLocalStackEnvironment,
  buildCloudFrontUrl,
  buildLocalStackS3Url,
  buildAwsS3Url,
  getS3BaseUrl,
  type S3UrlConfig
} from './environment-config.js';

describe('environment-config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('isLocalStackEnvironment', () => {
    it('should return true when NODE_ENV is development and USE_LOCALSTACK is true', () => {
      process.env.NODE_ENV = 'development';
      process.env.USE_LOCALSTACK = 'true';

      const result = isLocalStackEnvironment();

      expect(result).toBe(true);
    });

    it('should return true when NODE_ENV is test and USE_LOCALSTACK is true', () => {
      process.env.NODE_ENV = 'test';
      process.env.USE_LOCALSTACK = 'true';

      const result = isLocalStackEnvironment();

      expect(result).toBe(true);
    });

    it('should return false when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      process.env.USE_LOCALSTACK = 'true';

      const result = isLocalStackEnvironment();

      expect(result).toBe(false);
    });

    it('should return false when USE_LOCALSTACK is false', () => {
      process.env.NODE_ENV = 'development';
      process.env.USE_LOCALSTACK = 'false';

      const result = isLocalStackEnvironment();

      expect(result).toBe(false);
    });

    it('should return false when USE_LOCALSTACK is not set', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.USE_LOCALSTACK;

      const result = isLocalStackEnvironment();

      expect(result).toBe(false);
    });

    it('should return false when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      process.env.USE_LOCALSTACK = 'true';

      const result = isLocalStackEnvironment();

      expect(result).toBe(false);
    });
  });

  describe('buildCloudFrontUrl', () => {
    it('should build HTTPS URL with CloudFront domain', () => {
      const domain = 'cdn.example.com';

      const result = buildCloudFrontUrl(domain);

      expect(result).toBe('https://cdn.example.com');
    });

    it('should handle domain with trailing slash', () => {
      const domain = 'cdn.example.com/';

      const result = buildCloudFrontUrl(domain);

      expect(result).toBe('https://cdn.example.com/');
    });

    it('should handle empty string', () => {
      const domain = '';

      const result = buildCloudFrontUrl(domain);

      expect(result).toBe('https://');
    });
  });

  describe('buildLocalStackS3Url', () => {
    it('should build URL with endpoint and bucket', () => {
      const endpoint = 'http://localhost:4566';
      const bucket = 'test-bucket';

      const result = buildLocalStackS3Url(endpoint, bucket);

      expect(result).toBe('http://localhost:4566/test-bucket');
    });

    it('should handle endpoint with trailing slash', () => {
      const endpoint = 'http://localhost:4566/';
      const bucket = 'test-bucket';

      const result = buildLocalStackS3Url(endpoint, bucket);

      expect(result).toBe('http://localhost:4566//test-bucket');
    });

    it('should handle custom endpoint', () => {
      const endpoint = 'http://localstack.example.com:4567';
      const bucket = 'my-bucket';

      const result = buildLocalStackS3Url(endpoint, bucket);

      expect(result).toBe('http://localstack.example.com:4567/my-bucket');
    });

    it('should handle empty bucket', () => {
      const endpoint = 'http://localhost:4566';
      const bucket = '';

      const result = buildLocalStackS3Url(endpoint, bucket);

      expect(result).toBe('http://localhost:4566/');
    });
  });

  describe('buildAwsS3Url', () => {
    it('should build S3 URL with bucket and default region', () => {
      const bucket = 'test-bucket';
      const region = 'us-east-1';

      const result = buildAwsS3Url(bucket, region);

      expect(result).toBe('https://test-bucket.s3.us-east-1.amazonaws.com');
    });

    it('should build S3 URL with custom region', () => {
      const bucket = 'my-bucket';
      const region = 'eu-west-1';

      const result = buildAwsS3Url(bucket, region);

      expect(result).toBe('https://my-bucket.s3.eu-west-1.amazonaws.com');
    });

    it('should handle bucket with hyphens', () => {
      const bucket = 'my-test-bucket-123';
      const region = 'us-west-2';

      const result = buildAwsS3Url(bucket, region);

      expect(result).toBe('https://my-test-bucket-123.s3.us-west-2.amazonaws.com');
    });

    it('should handle empty bucket', () => {
      const bucket = '';
      const region = 'us-east-1';

      const result = buildAwsS3Url(bucket, region);

      expect(result).toBe('https://.s3.us-east-1.amazonaws.com');
    });
  });

  describe('getS3BaseUrl', () => {
    describe('CloudFront priority (highest)', () => {
      it('should return CloudFront URL when cloudFrontDomain is provided', () => {
        process.env.NODE_ENV = 'production';

        const config: S3UrlConfig = {
          cloudFrontDomain: 'cdn.example.com',
          s3BucketName: 'test-bucket',
          region: 'us-east-1'
        };

        const result = getS3BaseUrl(config);

        expect(result).toBe('https://cdn.example.com');
      });

      it('should prefer CloudFront over LocalStack when both are available', () => {
        process.env.NODE_ENV = 'development';
        process.env.USE_LOCALSTACK = 'true';

        const config: S3UrlConfig = {
          cloudFrontDomain: 'cdn.example.com',
          s3BucketName: 'test-bucket',
          localStackEndpoint: 'http://localhost:4566'
        };

        const result = getS3BaseUrl(config);

        expect(result).toBe('https://cdn.example.com');
      });
    });

    describe('LocalStack priority (second)', () => {
      it('should return LocalStack URL when environment is LocalStack', () => {
        process.env.NODE_ENV = 'development';
        process.env.USE_LOCALSTACK = 'true';

        const config: S3UrlConfig = {
          s3BucketName: 'test-bucket',
          localStackEndpoint: 'http://localhost:4566'
        };

        const result = getS3BaseUrl(config);

        expect(result).toBe('http://localhost:4566/test-bucket');
      });

      it('should return LocalStack URL with custom endpoint', () => {
        process.env.NODE_ENV = 'test';
        process.env.USE_LOCALSTACK = 'true';

        const config: S3UrlConfig = {
          s3BucketName: 'my-bucket',
          localStackEndpoint: 'http://localstack.example.com:4567'
        };

        const result = getS3BaseUrl(config);

        expect(result).toBe('http://localstack.example.com:4567/my-bucket');
      });

      it('should fall back to AWS S3 when LocalStack endpoint is missing', () => {
        process.env.NODE_ENV = 'development';
        process.env.USE_LOCALSTACK = 'true';

        const config: S3UrlConfig = {
          s3BucketName: 'test-bucket',
          region: 'us-east-1'
        };

        const result = getS3BaseUrl(config);

        expect(result).toBe('https://test-bucket.s3.us-east-1.amazonaws.com');
      });
    });

    describe('AWS S3 priority (fallback)', () => {
      it('should return AWS S3 URL when neither CloudFront nor LocalStack are configured', () => {
        process.env.NODE_ENV = 'production';

        const config: S3UrlConfig = {
          s3BucketName: 'test-bucket',
          region: 'us-east-1'
        };

        const result = getS3BaseUrl(config);

        expect(result).toBe('https://test-bucket.s3.us-east-1.amazonaws.com');
      });

      it('should use default region when not provided', () => {
        process.env.NODE_ENV = 'production';

        const config: S3UrlConfig = {
          s3BucketName: 'test-bucket'
        };

        const result = getS3BaseUrl(config);

        expect(result).toBe('https://test-bucket.s3.us-east-1.amazonaws.com');
      });

      it('should fall back to AWS S3 when USE_LOCALSTACK is false', () => {
        process.env.NODE_ENV = 'development';
        process.env.USE_LOCALSTACK = 'false';

        const config: S3UrlConfig = {
          s3BucketName: 'test-bucket',
          localStackEndpoint: 'http://localhost:4566',
          region: 'us-west-2'
        };

        const result = getS3BaseUrl(config);

        expect(result).toBe('https://test-bucket.s3.us-west-2.amazonaws.com');
      });
    });

    describe('Error cases', () => {
      it('should throw error when s3BucketName is empty and no CloudFront', () => {
        process.env.NODE_ENV = 'production';

        const config: S3UrlConfig = {
          s3BucketName: '',
          region: 'us-east-1'
        };

        expect(() => getS3BaseUrl(config)).toThrow('S3 bucket not configured');
      });

      it('should throw error when s3BucketName is missing and no CloudFront', () => {
        process.env.NODE_ENV = 'production';

        const config: S3UrlConfig = {
          s3BucketName: '',
          region: 'us-east-1'
        };

        expect(() => getS3BaseUrl(config)).toThrow('S3 bucket not configured');
      });
    });
  });
});
