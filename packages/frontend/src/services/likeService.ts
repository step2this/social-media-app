import { apiClient } from './apiClient';
import type {
  LikePostRequest,
  LikePostResponse,
  UnlikePostRequest,
  UnlikePostResponse,
  GetPostLikeStatusResponse
} from '@social-media-app/shared';

/**
 * Like service for frontend API calls
 */
export const likeService = {
  /**
   * Like a post
   */
  async likePost(postId: string): Promise<LikePostResponse> {
    const request: LikePostRequest = { postId };
    return apiClient.post<LikePostResponse>('/likes', request);
  },

  /**
   * Unlike a post
   */
  async unlikePost(postId: string): Promise<UnlikePostResponse> {
    const request: UnlikePostRequest = { postId };
    return apiClient.delete<UnlikePostResponse>('/likes', request);
  },

  /**
   * Get like status for a post
   */
  async getLikeStatus(postId: string): Promise<GetPostLikeStatusResponse> {
    return apiClient.get<GetPostLikeStatusResponse>(`/likes/${postId}`);
  }
};
