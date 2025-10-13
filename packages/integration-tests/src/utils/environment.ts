/**
 * Environment utilities for integration tests
 * Handles configuration and environment detection
 */

import { z } from 'zod';

/**
 * Test environment configuration schema
 */
const TestEnvironmentSchema = z.object({
  // API configuration
  apiBaseUrl: z.string().url().default('http://localhost:3001'),

  // Database configuration
  dynamoDbEndpoint: z.string().url().default('http://localhost:4566'),
  tableName: z.string().default('tamafriends-local'),

  // S3 configuration
  s3Endpoint: z.string().url().default('http://localhost:4566'),
  s3BucketName: z.string().default('tamafriends-media-local'),

  // LocalStack configuration
  useLocalStack: z.boolean().default(true),
  localStackEndpoint: z.string().url().default('http://localhost:4566'),

  // Test configuration
  testTimeout: z.number().default(30000),
  enableCleanup: z.boolean().default(true),
  enableDebugLogging: z.boolean().default(false),

  // AWS configuration
  awsRegion: z.string().default('us-east-1'),
  awsAccessKeyId: z.string().default('test'),
  awsSecretAccessKey: z.string().default('test')
});

export type TestEnvironment = z.infer<typeof TestEnvironmentSchema>;

/**
 * Load and validate test environment configuration
 */
export function loadTestEnvironment(): TestEnvironment {
  const rawConfig = {
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
    dynamoDbEndpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:4566',
    tableName: process.env.TABLE_NAME || 'tamafriends-local',
    s3Endpoint: process.env.S3_ENDPOINT || 'http://localhost:4566',
    s3BucketName: process.env.MEDIA_BUCKET_NAME || 'tamafriends-media-local',
    useLocalStack: process.env.USE_LOCALSTACK === 'true',
    localStackEndpoint: process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566',
    testTimeout: process.env.TEST_TIMEOUT ? parseInt(process.env.TEST_TIMEOUT, 10) : 30000,
    enableCleanup: process.env.ENABLE_CLEANUP !== 'false',
    enableDebugLogging: process.env.DEBUG_LOGGING === 'true',
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test'
  };

  try {
    return TestEnvironmentSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      throw new Error(`Invalid test environment configuration: ${errorMessages}`);
    }
    throw error;
  }
}

/**
 * Environment detection utilities
 */
export class EnvironmentDetector {
  constructor(private config: TestEnvironment) {}

  /**
   * Check if LocalStack is available
   */
  async isLocalStackAvailable(): Promise<boolean> {
    if (!this.config.useLocalStack) {
      return false;
    }

    try {
      // Use AbortController for timeout since 'timeout' is not a standard RequestInit property
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(`${this.config.localStackEndpoint}/_localstack/health`, {
          method: 'GET',
          signal: controller.signal
        });
        return response.ok;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch {
      return false;
    }
  }

  /**
   * Check if API server is available
   */
  async isApiServerAvailable(): Promise<boolean> {
    try {
      // Use AbortController for timeout since 'timeout' is not a standard RequestInit property
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(`${this.config.apiBaseUrl}/health`, {
          method: 'GET',
          signal: controller.signal
        });
        return response.ok;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch {
      return false;
    }
  }

  /**
   * Wait for services to be ready
   */
  async waitForServices(timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const [localStackReady, apiReady] = await Promise.all([
        this.isLocalStackAvailable(),
        this.isApiServerAvailable()
      ]);

      if (localStackReady && apiReady) {
        return;
      }

      // Wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Services not ready after ${timeoutMs}ms timeout`);
  }

  /**
   * Get service URLs for debugging
   */
  getServiceUrls(): Record<string, string> {
    return {
      api: this.config.apiBaseUrl,
      localstack: this.config.localStackEndpoint,
      dynamodb: this.config.dynamoDbEndpoint,
      s3: this.config.s3Endpoint
    };
  }
}

/**
 * Debug utilities
 */
export class TestLogger {
  constructor(private enabled: boolean = false) {}

  debug(message: string, data?: any): void {
    if (this.enabled) {
      console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }

  info(message: string, data?: any): void {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  warn(message: string, data?: any): void {
    console.warn(`[WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  error(message: string, error?: Error | any): void {
    console.error(`[ERROR] ${message}`, error);
  }
}

/**
 * Create global test environment instance
 */
export const testEnvironment = loadTestEnvironment();
export const environmentDetector = new EnvironmentDetector(testEnvironment);
export const testLogger = new TestLogger(testEnvironment.enableDebugLogging);