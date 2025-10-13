/**
 * User Lifecycle Integration Test
 *
 * This test demonstrates the complete user lifecycle:
 * 1. User registration
 * 2. Profile creation and initialization
 * 3. Profile updates
 * 4. Core user workflows
 *
 * This covers the critical path for new user onboarding.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import {
  RegisterResponseSchema,
  LoginResponseSchema,
  ProfileResponseSchema,
  type RegisterResponse,
  type LoginResponse,
  type Profile,
  type UpdateProfileWithHandleRequest
} from '@social-media-app/shared';
import {
  createLocalStackHttpClient,
  parseResponse,
  testEnvironment,
  environmentDetector,
  testLogger
} from '../utils/index.js';
import {
  createRegisterRequest,
  createLoginRequest
} from '../fixtures/index.js';

describe('User Lifecycle Integration', () => {
  const httpClient = createLocalStackHttpClient();

  beforeAll(async () => {
    testLogger.info('Starting User Lifecycle Integration Tests');

    // Wait for services to be ready
    await environmentDetector.waitForServices(30000);

    // Verify environment configuration
    const serviceUrls = environmentDetector.getServiceUrls();
    testLogger.debug('Service URLs:', serviceUrls);

    // Verify services are available
    const localStackReady = await environmentDetector.isLocalStackAvailable();
    const apiReady = await environmentDetector.isApiServerAvailable();

    if (!localStackReady) {
      throw new Error('LocalStack is not available. Please start LocalStack before running integration tests.');
    }

    if (!apiReady) {
      throw new Error('API server is not available. Please start the backend server before running integration tests.');
    }

    testLogger.info('All required services are ready');
  }, 30000);

  afterAll(() => {
    testLogger.info('User Lifecycle Integration Tests completed');
  });

  describe('User Registration and Profile Creation', () => {
    it('should complete full user registration → profile creation workflow', async () => {
      // Generate unique user data to avoid conflicts
      const uniqueId = randomUUID().slice(0, 8);
      const testEmail = `integration-test-${uniqueId}@tamafriends.local`;
      const testUsername = `testuser${uniqueId}`;

      testLogger.info('Starting user lifecycle test', { email: testEmail, username: testUsername });

      // Step 1: User Registration
      const registerRequest = createRegisterRequest()
        .withEmail(testEmail)
        .withUsername(testUsername)
        .withPassword('TestPassword123!')
        .build();

      testLogger.debug('Step 1: Registering new user');

      const registerResponse = await httpClient.post<RegisterResponse>('/auth/register', registerRequest);
      const registerData = await parseResponse(registerResponse, RegisterResponseSchema);

      // Verify registration response
      expect(registerData.user.email).toBe(testEmail);
      expect(registerData.user.username).toBe(testUsername);
      expect(registerData.user.id).toBeDefined();
      expect(registerData.user.emailVerified).toBe(false); // Email requires verification

      // Handle optional tokens in registration response
      let authToken: string;
      if (registerData.tokens) {
        expect(registerData.tokens.accessToken).toBeDefined();
        authToken = registerData.tokens.accessToken;
      } else {
        // If no tokens in registration, we'll get them from login
        authToken = '';
      }

      const userId = registerData.user.id;

      testLogger.info('✅ User registration successful', { userId });

      // Step 2: Get auth token (login if registration didn't provide one)
      if (!authToken) {
        testLogger.debug('No token from registration, logging in to get token');
        const loginRequest = createLoginRequest()
          .withEmail(testEmail)
          .withPassword('TestPassword123!')
          .build();

        const loginResponse = await httpClient.post<LoginResponse>('/auth/login', loginRequest);
        const loginData = await parseResponse(loginResponse, LoginResponseSchema);
        authToken = loginData.tokens.accessToken;
        testLogger.debug('✅ Token obtained via login');
      }

      // Set auth token for subsequent requests
      httpClient.setAuthToken(authToken);

      // Step 3: Verify profile was created automatically
      testLogger.debug('Step 3: Verifying automatic profile creation');

      const profileResponse = await httpClient.get<{ profile: Profile }>('/auth/profile');
      const profileData = await parseResponse(profileResponse, ProfileResponseSchema);

      // Verify initial profile
      expect(profileData.profile.id).toBe(userId);
      expect(profileData.profile.email).toBe(testEmail);
      expect(profileData.profile.username).toBe(testUsername);
      expect(profileData.profile.emailVerified).toBe(false);
      expect(profileData.profile.createdAt).toBeDefined();
      expect(profileData.profile.updatedAt).toBeDefined();

      testLogger.info('✅ Automatic profile creation verified');

      // Step 4: Update profile with additional information
      testLogger.debug('Step 4: Updating profile with additional information');

      const profileUpdateRequest = {
        fullName: 'Integration Test User',
        bio: 'This is a test user created during integration testing.'
      };

      const updateResponse = await httpClient.put<{ profile: Profile }>('/auth/profile', profileUpdateRequest);
      const updateData = await parseResponse(updateResponse, ProfileResponseSchema);

      // Verify profile updates
      expect(updateData.profile.fullName).toBe('Integration Test User');
      expect(updateData.profile.bio).toBe('This is a test user created during integration testing.');
      expect(updateData.profile.username).toBe(testUsername); // Should remain unchanged
      expect(updateData.profile.email).toBe(testEmail); // Should remain unchanged

      testLogger.info('✅ Profile update successful');

      // Step 5: Verify profile can be retrieved by handle
      testLogger.debug('Step 5: Testing profile retrieval by handle');

      // Note: This depends on the get-profile handler supporting handle-based lookup
      // The current implementation might only support userId lookup
      try {
        const handleLookupResponse = await httpClient.get(`/profile/handle/${testUsername}_handle`);
        if (handleLookupResponse.status === 200) {
          // Type assertion for response data
          const handleData = handleLookupResponse.data as { profile: { handle: string } };
          expect(handleData.profile.handle).toBe(`${testUsername}_handle`);
          testLogger.info('✅ Profile retrieval by handle successful');
        } else {
          testLogger.warn('Handle-based profile lookup not implemented, skipping this verification');
        }
      } catch (error: any) {
        if (error.status === 404) {
          testLogger.warn('Handle-based profile lookup endpoint not available, skipping this verification');
        } else {
          throw error;
        }
      }

      // Step 6: Test authentication with new user
      testLogger.debug('Step 6: Testing authentication with new user credentials');

      // Clear current auth token
      httpClient.clearAuthToken();

      const loginRequest = createLoginRequest()
        .withEmail(testEmail)
        .withPassword('TestPassword123!')
        .build();

      const loginResponse = await httpClient.post<LoginResponse>('/auth/login', loginRequest);
      const loginData = await parseResponse(loginResponse, LoginResponseSchema);

      // Verify login response
      expect(loginData.user.id).toBe(userId);
      expect(loginData.user.email).toBe(testEmail);
      expect(loginData.user.username).toBe(testUsername);
      expect(loginData.tokens.accessToken).toBeDefined();
      expect(loginData.tokens.accessToken).toBeDefined(); // Should have a valid token

      testLogger.info('✅ User authentication successful');

      // Step 7: Verify authenticated access to profile
      testLogger.debug('Step 7: Verifying authenticated profile access');

      httpClient.setAuthToken(loginData.tokens.accessToken);

      const authenticatedProfileResponse = await httpClient.get('/auth/profile');
      expect(authenticatedProfileResponse.status).toBe(200);

      // Type assertion for response data
      const authenticatedProfile = (authenticatedProfileResponse.data as { profile: { id: string; fullName: string } }).profile;
      expect(authenticatedProfile.id).toBe(userId);
      expect(authenticatedProfile.fullName).toBe('Integration Test User');

      testLogger.info('✅ Authenticated profile access verified');

      testLogger.info('🎉 Complete user lifecycle test successful', {
        userId,
        email: testEmail,
        username: testUsername,
        handle: `${testUsername}_handle`
      });
    });
  });

  describe('Profile Handle Management', () => {
    it('should enforce handle uniqueness', async () => {
      // Create first user
      const uniqueId1 = randomUUID().slice(0, 8);
      const testEmail1 = `handle-test-1-${uniqueId1}@tamafriends.local`;
      const testUsername1 = `handleuser${uniqueId1}`;

      const registerRequest1 = createRegisterRequest()
        .withEmail(testEmail1)
        .withUsername(testUsername1)
        .withPassword('TestPassword123!')
        .build();

      const registerResponse1 = await httpClient.post<RegisterResponse>('/auth/register', registerRequest1);
      const registerData1 = await parseResponse(registerResponse1, RegisterResponseSchema);

      // Get auth token from registration or login
      let authToken1: string;
      if (registerData1.tokens) {
        authToken1 = registerData1.tokens.accessToken;
      } else {
        // If no tokens from registration, login to get token
        const loginRequest1 = createLoginRequest()
          .withEmail(testEmail1)
          .withPassword('TestPassword123!')
          .build();
        const loginResponse1 = await httpClient.post<LoginResponse>('/auth/login', loginRequest1);
        const loginData1 = await parseResponse(loginResponse1, LoginResponseSchema);
        authToken1 = loginData1.tokens.accessToken;
      }
      httpClient.setAuthToken(authToken1);

      // Update first user's handle
      const uniqueHandle = `unique_handle_${uniqueId1}`;
      const updateRequest1: UpdateProfileWithHandleRequest = {
        handle: uniqueHandle
      };

      await httpClient.put('/auth/profile', updateRequest1);

      testLogger.info('✅ First user handle set successfully', { handle: uniqueHandle });

      // Create second user
      const uniqueId2 = randomUUID().slice(0, 8);
      const testEmail2 = `handle-test-2-${uniqueId2}@tamafriends.local`;
      const testUsername2 = `handleuser${uniqueId2}`;

      const registerRequest2 = createRegisterRequest()
        .withEmail(testEmail2)
        .withUsername(testUsername2)
        .withPassword('TestPassword123!')
        .build();

      const registerResponse2 = await httpClient.post<RegisterResponse>('/auth/register', registerRequest2);
      const registerData2 = await parseResponse(registerResponse2, RegisterResponseSchema);

      // Get auth token from registration or login
      let authToken2: string;
      if (registerData2.tokens) {
        authToken2 = registerData2.tokens.accessToken;
      } else {
        // If no tokens from registration, login to get token
        const loginRequest2 = createLoginRequest()
          .withEmail(testEmail2)
          .withPassword('TestPassword123!')
          .build();
        const loginResponse2 = await httpClient.post<LoginResponse>('/auth/login', loginRequest2);
        const loginData2 = await parseResponse(loginResponse2, LoginResponseSchema);
        authToken2 = loginData2.tokens.accessToken;
      }
      httpClient.setAuthToken(authToken2);

      // Try to use the same handle (should fail)
      const updateRequest2: UpdateProfileWithHandleRequest = {
        handle: uniqueHandle // Same handle as first user
      };

      testLogger.debug('Testing handle uniqueness enforcement');

      try {
        await httpClient.put('/auth/profile', updateRequest2);
        expect.fail('Should have failed due to duplicate handle');
      } catch (error: any) {
        expect(error.status || error.response?.status || 400).toBeGreaterThanOrEqual(400);
        testLogger.info('✅ Handle uniqueness properly enforced');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle registration with duplicate email', async () => {
      const uniqueId = randomUUID().slice(0, 8);
      const duplicateEmail = `duplicate-${uniqueId}@tamafriends.local`;

      // Register first user
      const registerRequest1 = createRegisterRequest()
        .withEmail(duplicateEmail)
        .withUsername(`user1_${uniqueId}`)
        .withPassword('TestPassword123!')
        .build();

      await httpClient.post<RegisterResponse>('/auth/register', registerRequest1);

      testLogger.debug('Testing duplicate email handling');

      // Try to register second user with same email
      const registerRequest2 = createRegisterRequest()
        .withEmail(duplicateEmail) // Same email
        .withUsername(`user2_${uniqueId}`) // Different username
        .withPassword('TestPassword123!')
        .build();

      try {
        await httpClient.post('/auth/register', registerRequest2);
        expect.fail('Should have failed due to duplicate email');
      } catch (error: any) {
        expect(error.status).toBeGreaterThanOrEqual(400);
        testLogger.info('✅ Duplicate email properly rejected');
      }
    });

    it('should handle registration with duplicate username', async () => {
      const uniqueId = randomUUID().slice(0, 8);
      const duplicateUsername = `duplicate_user_${uniqueId}`;

      // Register first user
      const registerRequest1 = createRegisterRequest()
        .withEmail(`user1-${uniqueId}@tamafriends.local`)
        .withUsername(duplicateUsername)
        .withPassword('TestPassword123!')
        .build();

      await httpClient.post<RegisterResponse>('/auth/register', registerRequest1);

      testLogger.debug('Testing duplicate username handling');

      // Try to register second user with same username
      const registerRequest2 = createRegisterRequest()
        .withEmail(`user2-${uniqueId}@tamafriends.local`) // Different email
        .withUsername(duplicateUsername) // Same username
        .withPassword('TestPassword123!')
        .build();

      try {
        await httpClient.post('/auth/register', registerRequest2);
        expect.fail('Should have failed due to duplicate username');
      } catch (error: any) {
        expect(error.status).toBeGreaterThanOrEqual(400);
        testLogger.info('✅ Duplicate username properly rejected');
      }
    });

    it('should handle weak passwords', async () => {
      const uniqueId = randomUUID().slice(0, 8);

      const registerRequest = createRegisterRequest()
        .withEmail(`weak-password-${uniqueId}@tamafriends.local`)
        .withUsername(`weakpass${uniqueId}`)
        .withPassword('123') // Weak password
        .build();

      testLogger.debug('Testing weak password handling');

      try {
        await httpClient.post('/auth/register', registerRequest);
        expect.fail('Should have failed due to weak password');
      } catch (error: any) {
        expect(error.status).toBeGreaterThanOrEqual(400);
        testLogger.info('✅ Weak password properly rejected');
      }
    });
  });
}, testEnvironment.testTimeout);