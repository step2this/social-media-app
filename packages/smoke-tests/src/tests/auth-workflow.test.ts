import { describe, it, expect, beforeEach } from 'vitest';
import { MockAuthService } from '../services/auth.js';
import { generateTestId, detectEnvironment } from '../utils/index.js';

describe('Authentication Workflow', () => {
  let authService: MockAuthService;
  let testId: string;
  let environment: ReturnType<typeof detectEnvironment>;

  beforeEach(() => {
    testId = generateTestId();
    authService = new MockAuthService();
    environment = detectEnvironment();
  });

  it('should complete full authentication workflow', async () => {
    const testEmail = `${testId}@example.com`;
    const testPassword = 'securePassword123!';

    // Step 1: Register/Create user
    const user = await authService.createTestUser(testEmail, testPassword);
    expect(user.email).toBe(testEmail);
    expect(user.id).toBeDefined();

    // Step 2: Login
    const loginResult = await authService.login(testEmail, testPassword);
    expect(loginResult.success).toBe(true);
    expect(loginResult.token).toBeDefined();
    expect(loginResult.user?.email).toBe(testEmail);

    const { token } = loginResult;

    // Step 3: Validate token (simulates authenticated requests)
    const validation = await authService.validateToken(token!);
    expect(validation.valid).toBe(true);
    expect(validation.user?.email).toBe(testEmail);

    // Step 4: Logout
    const logoutResult = await authService.logout(token!);
    expect(logoutResult.success).toBe(true);

    // Step 5: Verify token is invalidated
    const postLogoutValidation = await authService.validateToken(token!);
    expect(postLogoutValidation.valid).toBe(false);

    // Step 6: Cleanup
    const cleanupResult = await authService.cleanupTestUser(user.id);
    expect(cleanupResult.success).toBe(true);
  });

  it('should handle authentication errors gracefully', async () => {
    const testEmail = `${testId}@example.com`;
    const testPassword = 'securePassword123!';

    // Create user
    await authService.createTestUser(testEmail, testPassword);

    // Test wrong password
    const wrongPasswordLogin = await authService.login(testEmail, 'wrongPassword');
    expect(wrongPasswordLogin.success).toBe(false);
    expect(wrongPasswordLogin.error).toBeDefined();

    // Test non-existent user
    const nonExistentLogin = await authService.login('nonexistent@example.com', 'password');
    expect(nonExistentLogin.success).toBe(false);
    expect(nonExistentLogin.error).toBeDefined();

    // Test invalid token
    const invalidTokenValidation = await authService.validateToken('invalid-token');
    expect(invalidTokenValidation.valid).toBe(false);
  });

  it('should work across different environments', async () => {
    const testEmail = `${testId}-${environment.type}@example.com`;
    const testPassword = 'envTestPassword123!';

    // Authentication should work regardless of environment
    const user = await authService.createTestUser(testEmail, testPassword);
    const loginResult = await authService.login(testEmail, testPassword);

    expect(loginResult.success).toBe(true);
    expect(loginResult.user?.email).toBe(testEmail);

    // Environment context should be available
    expect(environment.type).toMatch(/^(local|staging|production)$/);
    expect(environment.baseUrl).toBeDefined();
    expect(environment.region).toBeDefined();

    // Cleanup
    await authService.cleanupTestUser(user.id);
  });

  it('should support multiple concurrent user sessions', async () => {
    const user1Email = `${testId}-user1@example.com`;
    const user2Email = `${testId}-user2@example.com`;
    const password = 'testPassword123!';

    // Create two users
    const user1 = await authService.createTestUser(user1Email, password);
    const user2 = await authService.createTestUser(user2Email, password);

    // Both users login
    const login1 = await authService.login(user1Email, password);
    const login2 = await authService.login(user2Email, password);

    expect(login1.success).toBe(true);
    expect(login2.success).toBe(true);
    expect(login1.token).not.toBe(login2.token);

    // Both tokens should be valid
    const validation1 = await authService.validateToken(login1.token!);
    const validation2 = await authService.validateToken(login2.token!);

    expect(validation1.valid).toBe(true);
    expect(validation2.valid).toBe(true);
    expect(validation1.user?.email).toBe(user1Email);
    expect(validation2.user?.email).toBe(user2Email);

    // Logout one user shouldn't affect the other
    await authService.logout(login1.token!);

    const postLogout1 = await authService.validateToken(login1.token!);
    const postLogout2 = await authService.validateToken(login2.token!);

    expect(postLogout1.valid).toBe(false);
    expect(postLogout2.valid).toBe(true);

    // Cleanup
    await authService.cleanupTestUser(user1.id);
    await authService.cleanupTestUser(user2.id);
  });

  it('should handle user isolation properly', async () => {
    const testEmail = `${testId}@example.com`;
    const testPassword = 'isolationTest123!';

    // Create user
    const user = await authService.createTestUser(testEmail, testPassword);
    const loginResult = await authService.login(testEmail, testPassword);

    expect(loginResult.success).toBe(true);

    // Cleanup should remove user completely
    await authService.cleanupTestUser(user.id);

    // After cleanup, login should fail
    const postCleanupLogin = await authService.login(testEmail, testPassword);
    expect(postCleanupLogin.success).toBe(false);
  });
});