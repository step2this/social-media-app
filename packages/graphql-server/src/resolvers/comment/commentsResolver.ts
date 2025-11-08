/**
 * Comments Resolver
 *
 * GraphQL resolver for fetching paginated comments on a post using hexagonal architecture.
 * Requires authentication via withAuth HOC.
 */

import { withAuth } from '../../infrastructure/resolvers/withAuth.js';
import type { AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../../infrastructure/di/awilix-container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';

/**
 * Create the comments resolver with Awilix DI container.
 *
 * @param container - Awilix container for resolving services
 * @returns GraphQL resolver for Query.comments
 */
export const createCommentsResolver = (
  container: AwilixContainer<GraphQLContainer>
): QueryResolvers['comments'] => {
  return withAuth(async (_parent: any, args: { postId: string; limit?: number | null; cursor?: string | null }, _context: any) => {
    // Validate required args
    if (!args.postId) {
      throw ErrorFactory.badRequest('postId is required');
    }

    // Resolve use case from Awilix container using camelCase key
    const useCase = container.resolve('getCommentsByPost');

    // Execute use case
    const result = await useCase.execute(
      args.postId,
      args.limit ?? 20,
      args.cursor ?? undefined
    );

    // Handle result
    if (!result.success) {
      throw ErrorFactory.internalServerError(result.error.message);
    }

    return result.data as any;
  });
};
