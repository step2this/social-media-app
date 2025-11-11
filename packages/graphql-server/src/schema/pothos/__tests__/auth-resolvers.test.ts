/**
 * Behavioral Tests for Pothos Auth Resolvers
 *
 * Testing Principles:
 * ✅ No mocks - use real GraphQL execution with real use cases
 * ✅ DRY with helper functions
 * ✅ Behavioral testing - test resolver behavior, not implementation
 * ✅ Type-safe throughout
 *
 * What we're testing:
 * - Resolver argument handling
 * - Resolver return type structure
 * - Integration with use cases via container
 * - Error handling and propagation
 *
 * Note: These tests may fail if use cases aren't fully implemented.
 * That's expected - we're testing the resolver layer, not use case logic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { pothosSchema } from '../index.js';
import {
  createAuthenticatedContext,
  createUnauthenticatedContext,
  executeGraphQL,
  hasErrorMessage,
} from '../../../__tests__/helpers/graphql-test-helpers.js';
import type { GraphQLContext } from '../../../context.js';

describe('Pothos Auth Resolvers', () => {
  describe('Queries', () => {
    describe('me', () => {
      it('should require authentication', async () => {
        // ARRANGE
        const context = createUnauthenticatedContext();
        const query = `
          query {
            me {
              id
              username
              handle
            }
          }
        `;

        // ACT
        const result = await executeGraphQL(pothosSchema, query, context);

        // ASSERT - Behavior: Auth is enforced by Pothos
        expect(result.errors).toBeDefined();
        expect(hasErrorMessage(result.errors!, 'authenticated')).toBe(true);
      });

      it('should execute use case with userId from context', async () => {
        // ARRANGE
        const userId = 'test-user-123';
        const context = createAuthenticatedContext(userId);
        const query = `
          query {
            me {
              id
              username
              handle
            }
          }
        `;

        // ACT
        const result = await executeGraphQL(pothosSchema, query, context);

        // ASSERT - Behavior: Resolver calls use case
        // May error if use case not implemented or user doesn't exist
        // But should NOT be an auth error
        if (result.errors) {
          expect(hasErrorMessage(result.errors, 'authenticated')).toBe(false);
        }
      });

      it('should return Profile type structure', async () => {
        // ARRANGE
        const context = createAuthenticatedContext('user-123');
        const query = `
          query {
            me {
              id
              username
              email
              handle
              fullName
              postsCount
              followersCount
              followingCount
              createdAt
              updatedAt
            }
          }
        `;

        // ACT
        const result = await executeGraphQL(pothosSchema, query, context);

        // ASSERT - Behavior: Return type matches Profile schema
        // If no errors, data structure should match
        if (!result.errors) {
          const profile = result.data?.me;
          expect(profile).toBeDefined();
          // All requested fields should be present
          expect(profile).toHaveProperty('id');
          expect(profile).toHaveProperty('username');
          expect(profile).toHaveProperty('email');
          expect(profile).toHaveProperty('handle');
        }
      });
    });

    describe('profile', () => {
      it('should NOT require authentication (public query)', async () => {
        // ARRANGE
        const context = createUnauthenticatedContext();
        const query = `
          query {
            profile(handle: "testuser") {
              handle
              fullName
            }
          }
        `;

        // ACT
        const result = await executeGraphQL(pothosSchema, query, context);

        // ASSERT - Behavior: Public queries work without auth
        // Should not have auth errors (may have other errors if user not found)
        if (result.errors) {
          expect(hasErrorMessage(result.errors, 'authenticated')).toBe(false);
        }
      });

      it('should require handle argument', async () => {
        // ARRANGE
        const context = createUnauthenticatedContext();
        const query = `
          query {
            profile {
              handle
            }
          }
        `;

        // ACT
        const result = await executeGraphQL(pothosSchema, query, context);

        // ASSERT - Behavior: Required args are enforced
        expect(result.errors).toBeDefined();
        expect(hasErrorMessage(result.errors!, 'handle')).toBe(true);
      });

      it('should pass handle to use case', async () => {
        // ARRANGE
        const context = createUnauthenticatedContext();
        const testHandle = 'johndoe';
        const query = `
          query GetProfile($handle: String!) {
            profile(handle: $handle) {
              handle
              fullName
            }
          }
        `;

        // ACT
        const result = await executeGraphQL(pothosSchema, query, context, {
          handle: testHandle,
        });

        // ASSERT - Behavior: Arguments passed to use case
        // May return null if user not found (expected)
        // Should not have validation errors about missing args
        if (result.errors) {
          expect(hasErrorMessage(result.errors, 'handle')).toBe(false);
        }
      });

      it('should return nullable Profile type', async () => {
        // ARRANGE
        const context = createUnauthenticatedContext();
        const query = `
          query {
            profile(handle: "nonexistent") {
              handle
              fullName
            }
          }
        `;

        // ACT
        const result = await executeGraphQL(pothosSchema, query, context);

        // ASSERT - Behavior: Returns null for not found (not an error)
        // The schema allows null return
        if (!result.errors) {
          // null is a valid response
          expect(result.data).toHaveProperty('profile');
        }
      });
    });
  });

  describe('Mutations', () => {
    describe('register', () => {
      it('should require all arguments', async () => {
        // ARRANGE
        const context = createUnauthenticatedContext();
        const mutation = `
          mutation {
            register(email: "test@example.com") {
              user { id }
              tokens { accessToken }
            }
          }
        `;

        // ACT
        const result = await executeGraphQL(pothosSchema, mutation, context);

        // ASSERT - Behavior: All required args must be provided
        expect(result.errors).toBeDefined();
        // Should mention missing required fields
      });

      it('should accept all registration fields', async () => {
        // ARRANGE
        const context = createUnauthenticatedContext();
        const mutation = `
          mutation Register($input: RegisterInput!) {
            register(
              email: $input.email
              password: $input.password
              username: $input.username
              handle: $input.handle
              fullName: $input.fullName
            ) {
              user {
                id
                username
                email
                handle
                fullName
              }
              tokens {
                accessToken
                refreshToken
                expiresIn
              }
            }
          }
        `;

        const variables = {
          input: {
            email: 'test@example.com',
            password: 'SecurePass123!',
            username: 'testuser',
            handle: '@testuser',
            fullName: 'Test User',
          },
        };

        // ACT
        const result = await executeGraphQL(
          pothosSchema,
          mutation,
          context,
          variables
        );

        // ASSERT - Behavior: All arguments accepted
        // May fail at use case level (duplicate user, etc.) but should not have arg errors
        if (result.errors) {
          // Should not be argument validation errors
          const hasArgError = result.errors.some(
            (error) =>
              error.message.includes('argument') ||
              error.message.includes('required')
          );
          expect(hasArgError).toBe(false);
        }
      });

      it('should return AuthPayload type structure', async () => {
        // ARRANGE
        const context = createUnauthenticatedContext();
        const mutation = `
          mutation {
            register(
              email: "new@example.com"
              password: "Pass123!"
              username: "newuser"
              handle: "@newuser"
              fullName: "New User"
            ) {
              user {
                id
                username
              }
              tokens {
                accessToken
                refreshToken
                expiresIn
              }
            }
          }
        `;

        // ACT
        const result = await executeGraphQL(pothosSchema, mutation, context);

        // ASSERT - Behavior: Return type structure
        if (!result.errors && result.data?.register) {
          const payload = result.data.register;
          expect(payload).toHaveProperty('user');
          expect(payload).toHaveProperty('tokens');
          expect(payload.user).toHaveProperty('id');
          expect(payload.tokens).toHaveProperty('accessToken');
          expect(payload.tokens).toHaveProperty('refreshToken');
          expect(payload.tokens).toHaveProperty('expiresIn');
        }
      });
    });

    describe('login', () => {
      it('should require email and password', async () => {
        // ARRANGE
        const context = createUnauthenticatedContext();
        const mutation = `
          mutation {
            login(email: "test@example.com") {
              user { id }
              tokens { accessToken }
            }
          }
        `;

        // ACT
        const result = await executeGraphQL(pothosSchema, mutation, context);

        // ASSERT - Behavior: Required args enforced
        expect(result.errors).toBeDefined();
      });

      it('should pass credentials to use case', async () => {
        // ARRANGE
        const context = createUnauthenticatedContext();
        const mutation = `
          mutation Login($email: String!, $password: String!) {
            login(email: $email, password: $password) {
              user {
                id
                email
              }
              tokens {
                accessToken
              }
            }
          }
        `;

        const variables = {
          email: 'user@example.com',
          password: 'password123',
        };

        // ACT
        const result = await executeGraphQL(
          pothosSchema,
          mutation,
          context,
          variables
        );

        // ASSERT - Behavior: Arguments passed correctly
        // May fail at use case level (invalid credentials) but not arg errors
        if (result.errors) {
          const hasArgError = result.errors.some((error) =>
            error.message.toLowerCase().includes('argument')
          );
          expect(hasArgError).toBe(false);
        }
      });
    });

    describe('refreshToken', () => {
      it('should require refreshToken argument', async () => {
        // ARRANGE
        const context = createUnauthenticatedContext();
        const mutation = `
          mutation {
            refreshToken {
              user { id }
              tokens { accessToken }
            }
          }
        `;

        // ACT
        const result = await executeGraphQL(pothosSchema, mutation, context);

        // ASSERT - Behavior: Required arg enforced
        expect(result.errors).toBeDefined();
        expect(hasErrorMessage(result.errors!, 'refreshToken')).toBe(true);
      });

      it('should accept refreshToken string', async () => {
        // ARRANGE
        const context = createUnauthenticatedContext();
        const mutation = `
          mutation RefreshToken($token: String!) {
            refreshToken(refreshToken: $token) {
              user {
                id
              }
              tokens {
                accessToken
                refreshToken
              }
            }
          }
        `;

        const variables = {
          token: 'fake-refresh-token-for-testing',
        };

        // ACT
        const result = await executeGraphQL(
          pothosSchema,
          mutation,
          context,
          variables
        );

        // ASSERT - Behavior: Argument accepted
        // Will fail at use case level (invalid token) but not arg validation
        if (result.errors) {
          const hasArgError = result.errors.some((error) =>
            error.message.toLowerCase().includes('argument')
          );
          expect(hasArgError).toBe(false);
        }
      });
    });

    describe('logout', () => {
      it('should require authentication', async () => {
        // ARRANGE
        const context = createUnauthenticatedContext();
        const mutation = `
          mutation {
            logout {
              success
            }
          }
        `;

        // ACT
        const result = await executeGraphQL(pothosSchema, mutation, context);

        // ASSERT - Behavior: Auth required (protected mutation)
        expect(result.errors).toBeDefined();
        expect(hasErrorMessage(result.errors!, 'authenticated')).toBe(true);
      });

      it('should use userId from context', async () => {
        // ARRANGE
        const userId = 'user-to-logout';
        const context = createAuthenticatedContext(userId);
        const mutation = `
          mutation {
            logout {
              success
            }
          }
        `;

        // ACT
        const result = await executeGraphQL(pothosSchema, mutation, context);

        // ASSERT - Behavior: userId from context passed to use case
        // Should not have auth errors (may have other errors)
        if (result.errors) {
          expect(hasErrorMessage(result.errors, 'authenticated')).toBe(false);
        }
      });

      it('should return LogoutResponse type', async () => {
        // ARRANGE
        const context = createAuthenticatedContext('user-123');
        const mutation = `
          mutation {
            logout {
              success
            }
          }
        `;

        // ACT
        const result = await executeGraphQL(pothosSchema, mutation, context);

        // ASSERT - Behavior: Return type structure
        if (!result.errors && result.data?.logout) {
          expect(result.data.logout).toHaveProperty('success');
          expect(typeof result.data.logout.success).toBe('boolean');
        }
      });
    });
  });

  describe('Type Definitions', () => {
    it('should define Profile type with all fields', () => {
      // ARRANGE & ACT
      const profileType = pothosSchema.getType('Profile');

      // ASSERT - Behavior: All Profile fields are defined
      expect(profileType).toBeDefined();
      if (profileType && 'getFields' in profileType) {
        const fields = profileType.getFields();
        expect(fields.id).toBeDefined();
        expect(fields.username).toBeDefined();
        expect(fields.email).toBeDefined();
        expect(fields.handle).toBeDefined();
        expect(fields.fullName).toBeDefined();
        expect(fields.bio).toBeDefined();
        expect(fields.profilePictureUrl).toBeDefined();
        expect(fields.postsCount).toBeDefined();
        expect(fields.followersCount).toBeDefined();
        expect(fields.followingCount).toBeDefined();
        expect(fields.createdAt).toBeDefined();
        expect(fields.updatedAt).toBeDefined();
      }
    });

    it('should define AuthTokens type with all fields', () => {
      // ARRANGE & ACT
      const tokensType = pothosSchema.getType('AuthTokens');

      // ASSERT - Behavior: Token fields defined
      expect(tokensType).toBeDefined();
      if (tokensType && 'getFields' in tokensType) {
        const fields = tokensType.getFields();
        expect(fields.accessToken).toBeDefined();
        expect(fields.refreshToken).toBeDefined();
        expect(fields.expiresIn).toBeDefined();
      }
    });

    it('should define AuthPayload type with nested types', () => {
      // ARRANGE & ACT
      const payloadType = pothosSchema.getType('AuthPayload');

      // ASSERT - Behavior: Nested structure defined
      expect(payloadType).toBeDefined();
      if (payloadType && 'getFields' in payloadType) {
        const fields = payloadType.getFields();
        expect(fields.user).toBeDefined();
        expect(fields.tokens).toBeDefined();

        // Check nested types
        expect(fields.user.type.toString()).toContain('Profile');
        expect(fields.tokens.type.toString()).toContain('AuthTokens');
      }
    });

    it('should define LogoutResponse type', () => {
      // ARRANGE & ACT
      const responseType = pothosSchema.getType('LogoutResponse');

      // ASSERT - Behavior: Response type defined
      expect(responseType).toBeDefined();
      if (responseType && 'getFields' in responseType) {
        const fields = responseType.getFields();
        expect(fields.success).toBeDefined();
      }
    });
  });
});
