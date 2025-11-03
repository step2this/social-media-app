/**
 * userPostsResolver - Get User Posts
 *
 * Returns paginated posts for a specific user identified by handle.
 * Public operation - no authentication required.
 */

import { Container } from '../../infrastructure/di/Container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { PostAdapter } from '../../infrastructure/adapters/PostAdapter';
import type { PostService } from '@social-media-app/dal';

/**
 * Create the userPosts resolver with DI container.
 *
 * @param container - DI container for resolving services
 * @returns GraphQL resolver for Query.userPosts
 */
export const createUserPostsResolver = (container: Container): QueryResolvers['userPosts'] => {
  return async (_parent: any, args: { handle: string; first?: number | null; after?: string | null }) => {
    const postService = container.resolve<PostService>('PostService');
    const adapter = new PostAdapter(postService);

    return adapter.getUserPosts({
      handle: args.handle,
      first: args.first ?? undefined,
      after: args.after ?? undefined,
    });
  };
};
