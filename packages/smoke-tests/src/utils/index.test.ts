import { describe, it, expect } from 'vitest';

describe('Smoke Tests Framework', () => {
  it('should export test ID generation utilities', async () => {
    const { generateTestId } = await import('./index.js');

    expect(generateTestId).toBeDefined();
    expect(typeof generateTestId).toBe('function');

    const testId = generateTestId();
    expect(testId).toMatch(/^smoke-test-\d+-[a-z0-9]+$/);
  });

  it('should export environment detection utilities', async () => {
    const { detectEnvironment } = await import('./index.js');

    expect(detectEnvironment).toBeDefined();
    expect(typeof detectEnvironment).toBe('function');

    const env = detectEnvironment();
    expect(env).toHaveProperty('type');
    expect(env).toHaveProperty('region');
    expect(env).toHaveProperty('baseUrl');
  });

  it('should export all utility types', async () => {
    const utils = await import('./index.js');

    // Should have both functions available
    expect(utils.generateTestId).toBeDefined();
    expect(utils.detectEnvironment).toBeDefined();
  });

  it('should provide clean barrel export interface', async () => {
    // Test that we can destructure all expected exports
    const {
      generateTestId,
      detectEnvironment
    } = await import('./index.js');

    expect(generateTestId).toBeTypeOf('function');
    expect(detectEnvironment).toBeTypeOf('function');
  });
});