import type { AsyncState } from '../../graphql/types';
import type {
  LikePostResponse,
  UnlikePostResponse,
  GetPostLikeStatusResponse,
} from '@social-media-app/shared';

/**
 * Defines the contract for like operations using REST API.
 * All methods return AsyncState for consistent state management.
 */
export interface ILikeService {
  /**
   * Like a post
   */
  likePost(postId: string): Promise<AsyncState<LikePostResponse>>;

  /**
   * Unlike a post
   */
  unlikePost(postId: string): Promise<AsyncState<UnlikePostResponse>>;

  /**
   * Get like status for a post
   */
  getLikeStatus(postId: string): Promise<AsyncState<GetPostLikeStatusResponse>>;
}
