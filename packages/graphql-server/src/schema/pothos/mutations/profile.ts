/**
 * Profile Mutations - Pothos Implementation
 *
 * This file defines all profile-related mutations using Pothos.
 *
 * Key Benefits over SDL:
 * - ✅ Inline type definitions with full autocomplete
 * - ✅ Built-in auth via authScopes (no manual HOC needed)
 * - ✅ Arguments are type-checked
 * - ✅ Resolver return types are validated
 */

import { builder } from '../builder.js';
import { ProfileType } from '../types/auth.js';
import { executeUseCase } from '../../../resolvers/helpers/resolverHelpers.js';
import { UserId } from '../../../shared/types/index.js';
import type { GraphQLContext } from '../../../context.js';

/**
 * PresignedUrlResponse Type
 *
 * Response type for getting presigned upload URLs.
 */
export const PresignedUrlResponseType = builder.objectRef<any>('PresignedUrlResponse');

PresignedUrlResponseType.implement({
  fields: (t) => ({
    uploadUrl: t.exposeString('uploadUrl', {
      description: 'Presigned S3 URL for uploading a file',
    }),
  }),
});

/**
 * Profile Mutations
 */
builder.mutationFields((t) => ({
  /**
   * Update Profile Mutation
   *
   * Updates the current user's profile information.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   */
  updateProfile: t.field({
    type: ProfileType,
    description: 'Update current user profile',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      handle: t.arg.string({
        required: false,
        description: 'Updated handle (e.g., @johndoe)',
      }),
      fullName: t.arg.string({
        required: false,
        description: 'Updated full name',
      }),
      bio: t.arg.string({
        required: false,
        description: 'Updated biography',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container,
        'updateProfile',
        {
          userId: UserId(context.userId!),
          handle: args.handle ?? undefined,
          fullName: args.fullName ?? undefined,
          bio: args.bio ?? undefined,
        }
      );

      return result;
    },
  }),

  /**
   * Get Profile Picture Upload URL Mutation
   *
   * Generates a presigned URL for uploading a profile picture.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   */
  getProfilePictureUploadUrl: t.field({
    type: PresignedUrlResponseType,
    description: 'Get presigned URL for profile picture upload',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      fileType: t.arg.string({
        required: false,
        description: 'MIME type of the image (default: image/jpeg)',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container,
        'getProfilePictureUploadUrl',
        {
          userId: UserId(context.userId!),
          fileType: (args.fileType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
        }
      );

      return result;
    },
  }),
}));
