/**
 * Auth Mutations - Pothos Implementation
 *
 * This file defines all auth-related mutations using Pothos.
 *
 * Key Benefits over SDL:
 * - ✅ Inline type definitions with full autocomplete
 * - ✅ Built-in auth via authScopes (no manual HOC needed)
 * - ✅ Arguments are type-checked
 * - ✅ Resolver return types are validated
 */

import { builder } from '../builder.js';
import { AuthPayloadType, LogoutResponseType } from '../types/auth.js';
import { executeUseCase } from '../../../resolvers/helpers/resolverHelpers.js';
import { UserId } from '../../../shared/types/index.js';
import type { GraphQLContext } from '../../../context.js';

/**
 * Register Mutation
 *
 * Creates a new user account and returns authentication tokens.
 */
builder.mutationFields((t) => ({
  register: t.field({
    type: AuthPayloadType,
    description: 'Register a new user account',
    args: {
      email: t.arg.string({
        required: true,
        description: 'Email address for login',
      }),
      password: t.arg.string({
        required: true,
        description: 'Password (will be hashed)',
      }),
      username: t.arg.string({
        required: true,
        description: 'Unique username for login',
      }),
      handle: t.arg.string({
        required: true,
        description: 'Public handle (e.g., @johndoe)',
      }),
      fullName: t.arg.string({
        required: true,
        description: 'Full display name',
      }),
    },
    resolve: async (parent, args, context: GraphQLContext) => {
      const result = await executeUseCase(
        context.container,
        'register',
        {
          email: args.email,
          password: args.password,
          username: args.username,
          handle: args.handle,
          fullName: args.fullName,
        }
      );
      return result;
    },
  }),

  /**
   * Login Mutation
   *
   * Authenticates a user and returns authentication tokens.
   */
  login: t.field({
    type: AuthPayloadType,
    description: 'Authenticate and receive tokens',
    args: {
      email: t.arg.string({
        required: true,
        description: 'Email address',
      }),
      password: t.arg.string({
        required: true,
        description: 'Password',
      }),
    },
    resolve: async (parent, args, context: GraphQLContext) => {
      const result = await executeUseCase(
        context.container,
        'login',
        {
          email: args.email,
          password: args.password,
        }
      );
      return result;
    },
  }),

  /**
   * Refresh Token Mutation
   *
   * Exchanges a refresh token for new access and refresh tokens.
   */
  refreshToken: t.field({
    type: AuthPayloadType,
    description: 'Refresh access token using refresh token',
    args: {
      refreshToken: t.arg.string({
        required: true,
        description: 'Valid refresh token',
      }),
    },
    resolve: async (parent, args, context: GraphQLContext) => {
      const result = await executeUseCase(
        context.container,
        'refreshToken',
        {
          refreshToken: args.refreshToken,
        }
      );
      return result;
    },
  }),

  /**
   * Logout Mutation
   *
   * Logs out the current user (idempotent operation).
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   */
  logout: t.field({
    type: LogoutResponseType,
    description: 'Logout current user',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container,
        'logout',
        {
          userId: UserId(context.userId!),
        }
      );
      return result;
    },
  }),
}));
