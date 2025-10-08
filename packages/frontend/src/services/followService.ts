import { apiClient } from './apiClient';
import type {
  FollowUserRequest,
  FollowUserResponse,
  UnfollowUserRequest,
  UnfollowUserResponse,
  GetFollowStatusResponse
} from '@social-media-app/shared';

/**
 * Follow service for frontend API calls
 */
export const followService = {
  /**
   * Follow a user
   */
  async followUser(userId: string): Promise<FollowUserResponse> {
    const request: FollowUserRequest = { userId };
    return apiClient.post<FollowUserResponse>('/follows', request);
  },

  /**
   * Unfollow a user
   */
  async unfollowUser(userId: string): Promise<UnfollowUserResponse> {
    const request: UnfollowUserRequest = { userId };
    return apiClient.delete<UnfollowUserResponse>('/follows', request);
  },

  /**
   * Get follow status for a user
   */
  async getFollowStatus(userId: string): Promise<GetFollowStatusResponse> {
    return apiClient.get<GetFollowStatusResponse>(`/follows/${userId}/status`);
  }
};
