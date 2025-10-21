import type { AsyncState } from '@/graphql/types';
import type { LikeResponse, LikeStatus } from '../__tests__/fixtures/likeFixtures';

/**
 * Like Service Interface
 *
 * Defines the contract for like operations using GraphQL.
 * All methods return AsyncState for consistent state management.
 */
export interface ILikeService {
  /**
   * Like a post
   */
  likePost(postId: string): Promise<AsyncState<LikeResponse>>;

  /**
   * Unlike a post
   */
  unlikePost(postId: string): Promise<AsyncState<LikeResponse>>;

  /**
   * Get like status for a post
   */
  getLikeStatus(postId: string): Promise<AsyncState<LikeStatus>>;
}
