/**
 * LocalStack Configuration Utilities
 *
 * Provides helper functions to detect LocalStack environment and configure
 * AWS SDK clients to work with LocalStack for local development.
 */

/**
 * Determines if the current environment is LocalStack
 *
 * @param environment - The environment name (e.g., 'local', 'dev', 'prod')
 * @returns true if running in LocalStack environment
 */
export function isLocalStackEnvironment(environment: string): boolean {
  return environment === 'local' || process.env.USE_LOCALSTACK === 'true';
}

/**
 * Gets the LocalStack endpoint URL
 *
 * @returns The LocalStack endpoint URL (defaults to http://localhost:4566)
 */
export function getLocalStackEndpoint(): string {
  return process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566';
}

/**
 * Gets Kinesis client configuration for the current environment
 *
 * When running in LocalStack, returns endpoint configuration pointing to LocalStack.
 * For AWS environments, returns undefined to use default AWS SDK configuration.
 *
 * @param environment - The environment name
 * @returns Client configuration object or undefined
 */
export function getKinesisEndpointConfig(environment: string): {
  endpoint: string;
  region: string;
} | undefined {
  if (isLocalStackEnvironment(environment)) {
    return {
      endpoint: getLocalStackEndpoint(),
      region: process.env.AWS_REGION || 'us-east-1'
    };
  }
  return undefined;
}

/**
 * Gets DynamoDB client configuration for the current environment
 *
 * When running in LocalStack, returns endpoint configuration pointing to LocalStack.
 * For AWS environments, returns undefined to use default AWS SDK configuration.
 *
 * @param environment - The environment name
 * @returns Client configuration object or undefined
 */
export function getDynamoDBEndpointConfig(environment: string): {
  endpoint: string;
  region: string;
} | undefined {
  if (isLocalStackEnvironment(environment)) {
    return {
      endpoint: getLocalStackEndpoint(),
      region: process.env.AWS_REGION || 'us-east-1'
    };
  }
  return undefined;
}

/**
 * Gets S3 client configuration for the current environment
 *
 * When running in LocalStack, returns endpoint configuration pointing to LocalStack
 * with path-style bucket access enabled.
 * For AWS environments, returns undefined to use default AWS SDK configuration.
 *
 * @param environment - The environment name
 * @returns Client configuration object or undefined
 */
export function getS3EndpointConfig(environment: string): {
  endpoint: string;
  region: string;
  forcePathStyle: boolean;
} | undefined {
  if (isLocalStackEnvironment(environment)) {
    return {
      endpoint: getLocalStackEndpoint(),
      region: process.env.AWS_REGION || 'us-east-1',
      forcePathStyle: true
    };
  }
  return undefined;
}
