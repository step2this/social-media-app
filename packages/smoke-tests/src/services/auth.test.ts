import { describe, it, expect, beforeEach } from 'vitest';
import { MockAuthService } from './auth.js';
import { generateTestId } from '../utils/index.js';

describe('Mock Authentication Service', () => {
  let authService: MockAuthService;
  let testId: string;

  beforeEach(() => {
    testId = generateTestId();
    authService = new MockAuthService();
  });

  it('should create a test user successfully', async () => {
    const testEmail = `${testId}@example.com`;
    const testPassword = 'testPassword123';

    const user = await authService.createTestUser(testEmail, testPassword);

    expect(user).toBeDefined();
    expect(user.email).toBe(testEmail);
    expect(user.id).toBeDefined();
    expect(typeof user.id).toBe('string');
    expect(user.id.length).toBeGreaterThan(0);
  });

  it('should login with valid credentials', async () => {
    const testEmail = `${testId}@example.com`;
    const testPassword = 'testPassword123';

    // Create user first
    await authService.createTestUser(testEmail, testPassword);

    // Then login
    const loginResult = await authService.login(testEmail, testPassword);

    expect(loginResult.success).toBe(true);
    expect(loginResult.token).toBeDefined();
    expect(typeof loginResult.token).toBe('string');
    expect(loginResult.user?.email).toBe(testEmail);
  });

  it('should fail login with invalid credentials', async () => {
    const testEmail = `${testId}@example.com`;
    const testPassword = 'testPassword123';

    // Create user first
    await authService.createTestUser(testEmail, testPassword);

    // Try login with wrong password
    const loginResult = await authService.login(testEmail, 'wrongPassword');

    expect(loginResult.success).toBe(false);
    expect(loginResult.token).toBeUndefined();
    expect(loginResult.error).toBeDefined();
  });

  it('should logout successfully', async () => {
    const testEmail = `${testId}@example.com`;
    const testPassword = 'testPassword123';

    // Create user and login
    await authService.createTestUser(testEmail, testPassword);
    const loginResult = await authService.login(testEmail, testPassword);

    // Logout
    const logoutResult = await authService.logout(loginResult.token!);

    expect(logoutResult.success).toBe(true);
  });

  it('should validate token correctly', async () => {
    const testEmail = `${testId}@example.com`;
    const testPassword = 'testPassword123';

    // Create user and login
    await authService.createTestUser(testEmail, testPassword);
    const loginResult = await authService.login(testEmail, testPassword);

    // Validate token
    const validation = await authService.validateToken(loginResult.token!);

    expect(validation.valid).toBe(true);
    expect(validation.user?.email).toBe(testEmail);
  });

  it('should reject invalid token', async () => {
    const invalidToken = 'invalid-token-123';

    const validation = await authService.validateToken(invalidToken);

    expect(validation.valid).toBe(false);
    expect(validation.user).toBeUndefined();
  });

  it('should cleanup test users', async () => {
    const testEmail = `${testId}@example.com`;
    const testPassword = 'testPassword123';

    // Create user
    const user = await authService.createTestUser(testEmail, testPassword);

    // Cleanup
    const cleanupResult = await authService.cleanupTestUser(user.id);

    expect(cleanupResult.success).toBe(true);

    // Verify user is gone (login should fail)
    const loginResult = await authService.login(testEmail, testPassword);
    expect(loginResult.success).toBe(false);
  });
});