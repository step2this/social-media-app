/**
 * postResolver - Get Single Post
 *
 * Fetches a single post by ID.
 * Public operation - no authentication required.
 */

import { Container } from '../../infrastructure/di/Container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { PostAdapter } from '../../infrastructure/adapters/PostAdapter';
import type { PostService } from '@social-media-app/dal';

/**
 * Create the post resolver with DI container.
 *
 * @param container - DI container for resolving services
 * @returns GraphQL resolver for Query.post
 */
export const createPostResolver = (container: Container): QueryResolvers['post'] => {
  return async (_parent: any, args: { id: string }) => {
    const postService = container.resolve<PostService>('PostService');
    const adapter = new PostAdapter(postService);

    return adapter.getPostById(args.id);
  };
};
