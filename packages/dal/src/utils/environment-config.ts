/**
 * Environment configuration utilities
 * Pure functions for environment detection and URL building
 */

/**
 * S3 URL configuration options
 */
export interface S3UrlConfig {
  readonly cloudFrontDomain?: string;
  readonly s3BucketName: string;
  readonly region?: string;
  readonly localStackEndpoint?: string;
}

/**
 * Determines if the current environment is LocalStack
 * Pure function - relies on process.env for environment detection
 *
 * @returns true if running in LocalStack environment
 *
 * @example
 * ```typescript
 * // In development with LocalStack
 * process.env.NODE_ENV = 'development';
 * process.env.USE_LOCALSTACK = 'true';
 * isLocalStackEnvironment(); // => true
 *
 * // In production
 * process.env.NODE_ENV = 'production';
 * isLocalStackEnvironment(); // => false
 * ```
 */
export const isLocalStackEnvironment = (): boolean => {
  const nodeEnv = process.env.NODE_ENV;
  const useLocalStack = process.env.USE_LOCALSTACK;

  const isDevelopmentOrTest = nodeEnv === 'development' || nodeEnv === 'test';
  const isLocalStackEnabled = useLocalStack === 'true';

  return isDevelopmentOrTest && isLocalStackEnabled;
};

/**
 * Builds CloudFront URL
 * Pure function - constructs HTTPS URL from CloudFront domain
 *
 * @param domain - CloudFront domain name
 * @returns HTTPS URL for CloudFront
 *
 * @example
 * ```typescript
 * buildCloudFrontUrl('cdn.example.com');
 * // => 'https://cdn.example.com'
 * ```
 */
export const buildCloudFrontUrl = (domain: string): string => {
  return `https://${domain}`;
};

/**
 * Builds LocalStack S3 URL
 * Pure function - constructs path-style S3 URL for LocalStack
 *
 * @param endpoint - LocalStack endpoint URL
 * @param bucket - S3 bucket name
 * @returns LocalStack S3 URL with bucket path
 *
 * @example
 * ```typescript
 * buildLocalStackS3Url('http://localhost:4566', 'my-bucket');
 * // => 'http://localhost:4566/my-bucket'
 * ```
 */
export const buildLocalStackS3Url = (endpoint: string, bucket: string): string => {
  return `${endpoint}/${bucket}`;
};

/**
 * Builds AWS S3 URL
 * Pure function - constructs virtual-hosted-style S3 URL
 *
 * @param bucket - S3 bucket name
 * @param region - AWS region
 * @returns AWS S3 URL with bucket subdomain
 *
 * @example
 * ```typescript
 * buildAwsS3Url('my-bucket', 'us-west-2');
 * // => 'https://my-bucket.s3.us-west-2.amazonaws.com'
 * ```
 */
export const buildAwsS3Url = (bucket: string, region: string): string => {
  return `https://${bucket}.s3.${region}.amazonaws.com`;
};

/**
 * Gets S3 base URL based on environment configuration
 * Determines appropriate URL based on priority:
 * 1. CloudFront domain (highest priority - production/staging)
 * 2. LocalStack endpoint (development/test with LocalStack)
 * 3. AWS S3 direct URL (fallback)
 *
 * @param config - S3 URL configuration
 * @returns Base URL for S3 file storage
 * @throws Error if S3 bucket is not configured and CloudFront is not available
 *
 * @example
 * ```typescript
 * // Production with CloudFront
 * getS3BaseUrl({
 *   cloudFrontDomain: 'cdn.example.com',
 *   s3BucketName: 'my-bucket'
 * });
 * // => 'https://cdn.example.com'
 *
 * // LocalStack development
 * process.env.NODE_ENV = 'development';
 * process.env.USE_LOCALSTACK = 'true';
 * getS3BaseUrl({
 *   s3BucketName: 'my-bucket',
 *   localStackEndpoint: 'http://localhost:4566'
 * });
 * // => 'http://localhost:4566/my-bucket'
 *
 * // AWS S3 fallback
 * getS3BaseUrl({
 *   s3BucketName: 'my-bucket',
 *   region: 'us-west-2'
 * });
 * // => 'https://my-bucket.s3.us-west-2.amazonaws.com'
 * ```
 */
export const getS3BaseUrl = (config: S3UrlConfig): string => {
  const { cloudFrontDomain, s3BucketName, region, localStackEndpoint } = config;

  // Priority 1: CloudFront (production/staging)
  if (cloudFrontDomain) {
    return buildCloudFrontUrl(cloudFrontDomain);
  }

  // Priority 2: LocalStack (development/test)
  if (isLocalStackEnvironment() && localStackEndpoint && s3BucketName) {
    return buildLocalStackS3Url(localStackEndpoint, s3BucketName);
  }

  // Priority 3: AWS S3 (fallback)
  if (s3BucketName) {
    const awsRegion = region || 'us-east-1';
    return buildAwsS3Url(s3BucketName, awsRegion);
  }

  throw new Error('S3 bucket not configured');
};
