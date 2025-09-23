import { apiClient } from './apiClient';
import type {
  Post,
  PostGridItem,
  CreatePostRequest,
  UpdatePostRequest,
  PostResponse,
  CreatePostResponse,
  PostsListResponse,
  PostGridResponse,
  DeletePostResponse
} from '@social-media-app/shared';

/**
 * Post service for frontend API calls
 */
export const postService = {
  /**
   * Create a new post
   */
  async createPost(data: CreatePostRequest, imageFile: File): Promise<Post> {
    // First create the post to get upload URLs
    const response = await apiClient.post<CreatePostResponse>('/posts', data);

    // Upload the image to S3
    await fetch(response.data.uploadUrl, {
      method: 'PUT',
      body: imageFile,
      headers: {
        'Content-Type': imageFile.type
      }
    });

    return response.data.post;
  },

  /**
   * Get posts by user handle
   */
  async getUserPosts(
    handle: string,
    limit: number = 24,
    cursor?: string
  ): Promise<PostGridResponse> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (cursor) {
      params.append('cursor', cursor);
    }

    const response = await apiClient.get<PostGridResponse>(
      `/profile/${handle}/posts?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get current user's posts
   */
  async getMyPosts(limit: number = 24, cursor?: string): Promise<PostsListResponse> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (cursor) {
      params.append('cursor', cursor);
    }

    const response = await apiClient.get<PostsListResponse>(
      `/posts/my?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get a single post by ID
   */
  async getPost(postId: string): Promise<Post> {
    const response = await apiClient.get<PostResponse>(`/posts/${postId}`);
    return response.data.post;
  },

  /**
   * Update a post
   */
  async updatePost(postId: string, data: UpdatePostRequest): Promise<Post> {
    const response = await apiClient.put<PostResponse>(`/posts/${postId}`, data);
    return response.data.post;
  },

  /**
   * Delete a post
   */
  async deletePost(postId: string): Promise<boolean> {
    const response = await apiClient.delete<DeletePostResponse>(`/posts/${postId}`);
    return response.data.success;
  },

  /**
   * Upload image for post
   */
  async uploadPostImage(file: File): Promise<{ imageUrl: string; thumbnailUrl: string }> {
    // Get presigned URL from profile service
    const { profileService } = await import('./profileService');
    const uploadData = await profileService.getUploadUrl({
      fileType: file.type as any,
      purpose: 'post-image'
    });

    // Upload file to S3
    await fetch(uploadData.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });

    return {
      imageUrl: uploadData.publicUrl,
      thumbnailUrl: uploadData.thumbnailUrl || uploadData.publicUrl
    };
  }
};