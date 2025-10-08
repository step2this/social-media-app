import { apiClient } from './apiClient';
import type {
  Post,
  CreatePostRequest,
  UpdatePostRequest,
  PostResponse,
  CreatePostResponse,
  PostsListResponse,
  PostGridResponse,
  DeletePostResponse
} from '@social-media-app/shared';
import { ImageFileTypeField } from '@social-media-app/shared';

/**
 * Post service for frontend API calls
 */
export const postService = {
  /**
   * Create a new post
   */
  async createPost(data: CreatePostRequest, imageFile: File): Promise<Post> {
    // Validate file type
    const fileTypeValidation = ImageFileTypeField.safeParse(imageFile.type);
    if (!fileTypeValidation.success) {
      throw new Error(`Unsupported file type: ${imageFile.type}. Please use JPEG, PNG, GIF, or WebP.`);
    }

    // First create the post to get upload URLs
    const requestWithFileType = {
      ...data,
      fileType: fileTypeValidation.data
    };
    const response = await apiClient.post<CreatePostResponse>('/posts', requestWithFileType);

    // Upload the image to S3
    await fetch(response.uploadUrl, {
      method: 'PUT',
      body: imageFile,
      headers: {
        'Content-Type': imageFile.type
      }
    });

    return response.post;
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
      `/posts/${handle}?${params.toString()}`
    );
    return response;
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
    return response;
  },

  /**
   * Get a single post by ID
   */
  async getPost(postId: string): Promise<Post> {
    const response = await apiClient.get<PostResponse>(`/post/${postId}`);
    return response.post;
  },

  /**
   * Update a post
   */
  async updatePost(postId: string, data: UpdatePostRequest): Promise<Post> {
    const response = await apiClient.put<PostResponse>(`/posts/${postId}`, data);
    return response.post;
  },

  /**
   * Delete a post
   */
  async deletePost(postId: string): Promise<boolean> {
    const response = await apiClient.delete<DeletePostResponse>(`/posts/${postId}`);
    return response.success;
  },

  /**
   * Upload image for post
   */
  async uploadPostImage(file: File): Promise<{ imageUrl: string; thumbnailUrl: string }> {
    // Validate file type
    const fileTypeValidation = ImageFileTypeField.safeParse(file.type);
    if (!fileTypeValidation.success) {
      throw new Error(`Unsupported file type: ${file.type}. Please use JPEG, PNG, GIF, or WebP.`);
    }

    // Get presigned URL from profile service
    const { profileService } = await import('./profileService');
    const uploadData = await profileService.getUploadUrl({
      fileType: fileTypeValidation.data,
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