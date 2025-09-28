import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectEnvironment } from './environment.js';

describe('Environment Detection', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should detect local environment by default', () => {
    // Clear any environment-specific variables
    delete process.env.AWS_REGION;
    delete process.env.STACK_NAME;
    delete process.env.NODE_ENV;

    const env = detectEnvironment();
    expect(env.type).toBe('local');
    expect(env.baseUrl).toBe('http://localhost:3000');
    expect(env.region).toBe('us-east-1'); // default
  });

  it('should detect staging environment from environment variables', () => {
    process.env.NODE_ENV = 'staging';
    process.env.AWS_REGION = 'us-west-2';
    process.env.STACK_NAME = 'tamafriends-staging';

    const env = detectEnvironment();
    expect(env.type).toBe('staging');
    expect(env.region).toBe('us-west-2');
    expect(env.stackName).toBe('tamafriends-staging');
  });

  it('should detect production environment from environment variables', () => {
    process.env.NODE_ENV = 'production';
    process.env.AWS_REGION = 'us-east-1';
    process.env.STACK_NAME = 'tamafriends-prod';

    const env = detectEnvironment();
    expect(env.type).toBe('production');
    expect(env.region).toBe('us-east-1');
    expect(env.stackName).toBe('tamafriends-prod');
  });

  it('should provide sensible defaults for missing configuration', () => {
    process.env.NODE_ENV = 'test';

    const env = detectEnvironment();
    expect(env.type).toBe('local'); // fallback for unknown NODE_ENV
    expect(env.region).toBe('us-east-1');
    expect(env.baseUrl).toBe('http://localhost:3000');
  });

  it('should include all required properties', () => {
    const env = detectEnvironment();

    expect(env).toHaveProperty('type');
    expect(env).toHaveProperty('region');
    expect(env).toHaveProperty('baseUrl');
    expect(['local', 'staging', 'production']).toContain(env.type);
    expect(typeof env.region).toBe('string');
    expect(typeof env.baseUrl).toBe('string');
  });
});