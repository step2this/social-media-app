/**
 * Comments Resolver
 *
 * GraphQL resolver for fetching paginated comments on a post using hexagonal architecture.
 * Requires authentication via withAuth HOC.
 */

import { withAuth } from '../../infrastructure/resolvers/withAuth.js';
import { Container } from '../../infrastructure/di/Container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { GetCommentsByPost } from '../../application/use-cases/comment/GetCommentsByPost.js';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';

/**
 * Create the comments resolver with DI container.
 *
 * @param container - DI container for resolving services
 * @returns GraphQL resolver for Query.comments
 */
export const createCommentsResolver = (container: Container): QueryResolvers['comments'] => {
  return withAuth(async (_parent: any, args: { postId: string; limit?: number | null; cursor?: string | null }, _context: any) => {
    // Validate required args
    if (!args.postId) {
      throw ErrorFactory.badRequest('postId is required');
    }

    // Resolve use case from container
    const useCase = container.resolve<GetCommentsByPost>('GetCommentsByPost');

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
