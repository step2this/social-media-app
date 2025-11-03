/**
 * followingFeedResolver - Get Following Feed
 *
 * Returns paginated posts from users the authenticated user follows.
 * Requires authentication via withAuth HOC.
 */

import { withAuth } from '../../infrastructure/resolvers/withAuth.js';
import { Container } from '../../infrastructure/di/Container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { FeedAdapter } from '../../infrastructure/adapters/FeedAdapter';
import type { PostService, FollowService } from '@social-media-app/dal';

/**
 * Create the followingFeed resolver with DI container.
 *
 * @param container - DI container for resolving services
 * @returns GraphQL resolver for Query.followingFeed
 */
export const createFollowingFeedResolver = (container: Container): QueryResolvers['followingFeed'] => {
  return withAuth(async (_parent: any, args: { first?: number | null; after?: string | null }, context: any) => {
    const postService = container.resolve<PostService>('PostService');
    const followService = container.resolve<FollowService>('FollowService');
    const adapter = new FeedAdapter(postService, followService);

    return adapter.getFollowingFeed({
      userId: context.userId!,
      first: args.first ?? undefined,
      after: args.after ?? undefined,
    });
  });
};
