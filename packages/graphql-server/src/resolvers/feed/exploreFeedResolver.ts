/**
 * exploreFeedResolver - Get Explore Feed
 *
 * Returns paginated posts for discovery.
 * Supports both anonymous and authenticated users.
 * Public operation - no authentication required.
 */

import { Container } from '../../infrastructure/di/Container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { FeedAdapter } from '../../infrastructure/adapters/FeedAdapter';
import type { PostService, FollowService } from '@social-media-app/dal';

/**
 * Create the exploreFeed resolver with DI container.
 *
 * @param container - DI container for resolving services
 * @returns GraphQL resolver for Query.exploreFeed
 */
export const createExploreFeedResolver = (container: Container): QueryResolvers['exploreFeed'] => {
  return async (_parent: any, args: { first?: number | null; after?: string | null }) => {
    const postService = container.resolve<PostService>('PostService');
    const followService = container.resolve<FollowService>('FollowService');
    const adapter = new FeedAdapter(postService, followService);

    return adapter.getExploreFeed({
      first: args.first ?? undefined,
      after: args.after ?? undefined,
    });
  };
};
