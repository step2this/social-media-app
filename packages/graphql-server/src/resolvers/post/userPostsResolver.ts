/**
 * userPostsResolver - Get User Posts
 *
 * Returns paginated posts for a specific user identified by handle using hexagonal architecture.
 * Public operation - no authentication required.
 *
 * Pattern: Composes two use cases:
 * 1. GetProfileByHandle - Converts handle to userId
 * 2. GetUserPosts - Fetches posts for that userId
 */

import type { AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../../infrastructure/di/awilix-container.js';
import type { QueryResolvers, PostConnection } from '../../schema/generated/types';
import { Handle, UserId, Cursor } from '../../shared/types/index.js';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';

/**
 * Create the userPosts resolver with DI container.
 *
 * @param container - DI container for resolving services
 * @returns GraphQL resolver for Query.userPosts
 */
export const createUserPostsResolver = (container: AwilixContainer<GraphQLContainer>): QueryResolvers['userPosts'] => {
  return async (_parent: any, args: { handle?: string | null; first?: number | null; after?: string | null; limit?: number | null; cursor?: string | null }) => {
    try {
      // Resolve use cases from container
      const getProfileUseCase = container.resolve('getProfileByHandle');
      const getPostsUseCase = container.resolve('getUserPosts');

      // Step 1: Look up profile by handle to get userId
      const profileResult = await getProfileUseCase.execute({ handle: Handle(args.handle!) });

      if (!profileResult.success) {
        throw ErrorFactory.internalServerError(profileResult.error.message);
      }

      if (!profileResult.data) {
        throw ErrorFactory.notFound('Profile', args.handle!);
      }

      // Step 2: Fetch posts for that user with pagination
      // Support both new (first/after) and legacy (limit/cursor) pagination args
      const first = args.first ?? args.limit ?? 20;
      const after = args.after ?? args.cursor ?? undefined;

      // Validate pagination parameters
      if (first <= 0) {
        throw ErrorFactory.badRequest('first must be greater than 0');
      }

      const postsResult = await getPostsUseCase.execute({
        userId: UserId(profileResult.data.id),
        pagination: {
          first,
          after: after ? Cursor(after) : undefined,
        },
      });

      if (!postsResult.success) {
        throw ErrorFactory.internalServerError(postsResult.error.message);
      }

      // Return domain Connection<Post> - field resolvers in Post.ts will add author/thumbnailUrl to individual posts
      // Type assertion required because TypeScript doesn't understand field resolver pattern
      return postsResult.data as unknown as PostConnection;
    } catch (error) {
      // Re-throw GraphQL errors as-is
      if (error instanceof Error && error.constructor.name === 'GraphQLError') {
        throw error;
      }
      // Convert other errors to GraphQL errors, preserving the message
      if (error instanceof Error) {
        throw ErrorFactory.badRequest(error.message);
      }
      throw error;
    }
  };
};
