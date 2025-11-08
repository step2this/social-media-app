/**
 * postResolver - Get Single Post
 *
 * Fetches a single post by ID using hexagonal architecture.
 * Public operation - no authentication required.
 */

import type { AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../../infrastructure/di/awilix-container.js';
import type { QueryResolvers, Post } from '../../schema/generated/types';
import { PostId } from '../../shared/types/index.js';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';

/**
 * Create the post resolver with DI container.
 *
 * @param container - DI container for resolving services
 * @returns GraphQL resolver for Query.post
 */
export const createPostResolver = (container: AwilixContainer<GraphQLContainer>): QueryResolvers['post'] => {
  return async (_parent: any, args: { id: string }) => {
    // Resolve use case from container
    const useCase = container.resolve('getPostById');

    // Execute use case
    const result = await useCase.execute({ postId: PostId(args.id) });

    // Handle result
    if (!result.success) {
      throw ErrorFactory.internalServerError(result.error.message);
    }

    // Throw NOT_FOUND if post doesn't exist
    if (!result.data) {
      throw ErrorFactory.notFound('Post', args.id);
    }

    // Return domain Post - field resolvers in Post.ts will add author/thumbnailUrl
    // Type assertion required because TypeScript doesn't understand field resolver pattern
    return result.data as unknown as Post;
  };
};
