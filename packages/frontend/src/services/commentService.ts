import { apiClient } from './apiClient';
import type {
  CreateCommentRequest,
  CreateCommentResponse,
  DeleteCommentRequest,
  DeleteCommentResponse,
  CommentsListResponse
} from '@social-media-app/shared';

/**
 * Comment service for frontend API calls
 */
export const commentService = {
  /**
   * Create a comment on a post
   */
  async createComment(postId: string, content: string): Promise<CreateCommentResponse> {
    const request: CreateCommentRequest = { postId, content };
    return apiClient.post<CreateCommentResponse>('/comments', request);
  },

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<DeleteCommentResponse> {
    const request: DeleteCommentRequest = { commentId };
    return apiClient.delete<DeleteCommentResponse>('/comments', request);
  },

  /**
   * Get comments for a post
   */
  async getComments(
    postId: string,
    limit?: number,
    cursor?: string
  ): Promise<CommentsListResponse> {
    const params = new URLSearchParams({ postId });
    if (limit !== undefined) params.append('limit', String(limit));
    if (cursor) params.append('cursor', cursor);

    return apiClient.get<CommentsListResponse>(`/comments?${params.toString()}`);
  }
};
