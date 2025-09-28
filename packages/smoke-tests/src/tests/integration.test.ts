import { describe, it, expect, beforeEach } from 'vitest';

describe('Package Integration', () => {
  it('should export all utilities from main package index', async () => {
    const utils = await import('../utils/index.js');

    expect(utils.generateTestId).toBeDefined();
    expect(utils.detectEnvironment).toBeDefined();
    expect(utils.greet).toBeDefined();
  });

  it('should export all services from services index', async () => {
    const services = await import('../services/index.js');

    expect(services.MockAuthService).toBeDefined();
  });

  it('should provide clean integration for full workflow', async () => {
    const { generateTestId } = await import('../utils/index.js');
    const { MockAuthService } = await import('../services/index.js');

    // Should be able to use utilities and services together
    const testId = generateTestId();
    const authService = new MockAuthService();

    expect(testId).toMatch(/^smoke-test-\d+-[a-z0-9]+$/);
    expect(authService).toBeInstanceOf(MockAuthService);

    // Quick integration test
    const testEmail = `${testId}@integration.com`;
    const user = await authService.createTestUser(testEmail, 'password123');

    expect(user.email).toBe(testEmail);
    expect(user.id).toBeDefined();
  });

  it('should support importing from either utils or services directly', async () => {
    // Direct utility imports
    const { generateTestId } = await import('../utils/test-id.js');
    const { detectEnvironment } = await import('../utils/environment.js');

    // Direct service imports
    const { MockAuthService } = await import('../services/auth.js');

    expect(generateTestId).toBeDefined();
    expect(detectEnvironment).toBeDefined();
    expect(MockAuthService).toBeDefined();
  });

  it('should maintain type safety across all exports', async () => {
    const utils = await import('../utils/index.js');
    const services = await import('../services/index.js');

    // Test that functions return expected types
    const testId = utils.generateTestId();
    const environment = utils.detectEnvironment();
    const authService = new services.MockAuthService();

    expect(typeof testId).toBe('string');
    expect(typeof environment).toBe('object');
    expect(environment).toHaveProperty('type');
    expect(environment).toHaveProperty('region');
    expect(environment).toHaveProperty('baseUrl');
    expect(authService).toBeInstanceOf(services.MockAuthService);
  });
});