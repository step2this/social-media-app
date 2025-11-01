/**
 * postResolver - Get Post by ID
 *
 * Returns a single post by its ID.
 * Public operation - no authentication required.
 */

import { Container } from '../../infrastructure/di/Container.js';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';
import { PostId } from '../../shared/types/index.js';
import type { GetPostById } from '../../application/use-cases/post/GetPostById.js';
import type { QueryResolvers } from '../../../generated/types.js';

/**
 * Create the post resolver with DI container.
 *
 * @param container - DI container for resolving use cases
 * @returns GraphQL resolver for Query.post
 *
 * @example
 * ```typescript
 * const container = new Container();
 * registerServices(container, context);
 * const postResolver = createPostResolver(container);
 * ```
 */
export const createPostResolver = (container: Container): QueryResolvers['post'] =>
  async (_parent, args, _context) => {
    const useCase = container.resolve<GetPostById>('GetPostById');
    const result = await useCase.execute({ postId: PostId(args.id) });

    if (!result.success) {
      throw ErrorFactory.internalServerError(result.error.message);
    }

    if (!result.data) {
      throw ErrorFactory.notFound(`Post not found: ${args.id}`);
    }

    return result.data;
  };
