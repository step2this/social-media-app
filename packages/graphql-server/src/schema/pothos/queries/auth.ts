/**
 * Auth Queries - Pothos Implementation
 *
 * This file defines all auth-related queries using Pothos.
 */

import { builder } from '../builder.js';
import { ProfileType } from '../types/auth.js';
import { executeUseCase } from '../../../resolvers/helpers/resolverHelpers.js';
import { UserId } from '../../../shared/types/index.js';
import type { GraphQLContext } from '../../../context.js';

builder.queryFields((t) => ({
  /**
   * Me Query
   *
   * Returns the currently authenticated user's profile.
   */
  me: t.field({
    type: ProfileType,
    description: 'Get current authenticated user profile',

    // ✨ Built-in auth requirement
    authScopes: {
      authenticated: true,
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist (non-null)
      const result = await executeUseCase(
        context.container,
        'getCurrentUserProfile',
        {
          userId: UserId(context.userId!),
        }
      );
      return result as any;
    },
  }),

  /**
   * Profile Query
   *
   * Returns a user's public profile by handle.
   */
  profile: t.field({
    type: ProfileType,
    nullable: true,
    description: 'Get user profile by handle',
    args: {
      handle: t.arg.string({
        required: true,
        description: 'User handle (e.g., "johndoe")',
      }),
    },
    resolve: async (parent, args, context: GraphQLContext) => {
      const result = await executeUseCase(
        context.container,
        'getProfileByHandle',
        {
          handle: args.handle,
          viewerId: context.userId ? UserId(context.userId) : undefined,
        }
      );
      return result as any;
    },
  }),
}));
