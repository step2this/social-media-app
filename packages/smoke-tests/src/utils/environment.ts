/**
 * Environment detection for smoke tests
 * Determines which environment (local/staging/prod) tests are running against
 */

export interface TestEnvironment {
  type: 'local' | 'staging' | 'production';
  region: string;
  baseUrl: string;
  stackName?: string;
}

/**
 * Detect the current test environment based on environment variables
 * Falls back to local development environment if no specific config found
 */
export function detectEnvironment(): TestEnvironment {
  const nodeEnv = process.env.NODE_ENV;
  const region = process.env.AWS_REGION || 'us-east-1';
  const stackName = process.env.STACK_NAME;

  // Determine environment type
  let type: TestEnvironment['type'] = 'local';
  if (nodeEnv === 'staging') {
    type = 'staging';
  } else if (nodeEnv === 'production') {
    type = 'production';
  }

  // Generate base URL based on environment
  let baseUrl: string;
  if (type === 'local') {
    baseUrl = 'http://localhost:3000';
  } else {
    // For deployed environments, we'll need to discover this from CDK outputs
    // For now, provide a placeholder that tests can validate
    baseUrl = `https://api-${type}.tamafriends.com`;
  }

  return {
    type,
    region,
    baseUrl,
    ...(stackName && { stackName })
  };
}