'use server';

/**
 * Server Actions for Posts
 *
 * These functions run on the server and can be called from Client Components.
 * They handle authentication automatically via cookies.
 */

import { revalidatePath } from 'next/cache';
import { getGraphQLClient } from '@/lib/graphql/client';
import { LIKE_POST, UNLIKE_POST, CREATE_POST } from '@/lib/graphql/queries';
import type { CreatePostResponse } from '@/lib/graphql/types';
import { logger, logServerAction } from '@/lib/logger';

interface LikeResponse {
  success: boolean;
  likesCount: number;
  isLiked: boolean;
}

interface LikePostResponse {
  likePost: LikeResponse;
}

interface UnlikePostResponse {
  unlikePost: LikeResponse;
}

/**
 * Like a post
 *
 * @param postId - ID of the post to like
 * @returns Success response with updated counts
 */
export async function likePost(postId: string): Promise<LikeResponse> {
  try {
    logger.info({ postId }, 'Liking post');

    const client = await getGraphQLClient();
    const data = await client.request<LikePostResponse>(LIKE_POST, { postId });

    logger.info({
      postId,
      response: data.likePost,
      success: data.likePost.success,
      likesCount: data.likePost.likesCount,
      isLiked: data.likePost.isLiked
    }, 'Like post response from GraphQL');

    // NOTE: We intentionally don't revalidate here to avoid race conditions
    // The optimistic UI + server response sync provides immediate feedback
    // The data will refresh on next page navigation or manual refresh
    // This prevents the feed from re-fetching stale data before the like count updates

    logServerAction('likePost', { postId, likesCount: data.likePost.likesCount }, 'success');
    return data.likePost;
  } catch (error) {
    logger.error({ postId, error }, 'Failed to like post');
    logServerAction('likePost', { postId }, 'error');
    return {
      success: false,
      likesCount: 0,
      isLiked: false,
    };
  }
}

/**
 * Unlike a post
 *
 * @param postId - ID of the post to unlike
 * @returns Success response with updated counts
 */
export async function unlikePost(postId: string): Promise<LikeResponse> {
  try {
    logger.info({ postId }, 'Unliking post');

    const client = await getGraphQLClient();
    const data = await client.request<UnlikePostResponse>(UNLIKE_POST, { postId });

    logger.info({
      postId,
      response: data.unlikePost,
      success: data.unlikePost.success,
      likesCount: data.unlikePost.likesCount,
      isLiked: data.unlikePost.isLiked
    }, 'Unlike post response from GraphQL');

    // NOTE: We intentionally don't revalidate here to avoid race conditions
    // The optimistic UI + server response sync provides immediate feedback
    // The data will refresh on next page navigation or manual refresh

    logServerAction('unlikePost', { postId, likesCount: data.unlikePost.likesCount }, 'success');
    return data.unlikePost;
  } catch (error) {
    logger.error({ postId, error }, 'Failed to unlike post');
    logServerAction('unlikePost', { postId }, 'error');
    return {
      success: false,
      likesCount: 0,
      isLiked: false,
    };
  }
}

interface CreatePostResult {
  success: boolean;
  postId?: string;
  error?: string;
}

/**
 * Upload file to S3 using presigned URL
 */
async function uploadToS3(file: File | Blob, presignedUrl: string): Promise<void> {
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  if (!response.ok) {
    throw new Error(`S3 upload failed: ${response.status} ${response.statusText}`);
  }
}

/**
 * Create a new post with image
 *
 * @param imageFile - The image file to upload
 * @param thumbnailBlob - The thumbnail blob to upload
 * @param caption - Optional caption for the post
 * @returns Success response with post ID or error
 */
export async function createPost(
  imageFile: File,
  thumbnailBlob: Blob,
  caption?: string
): Promise<CreatePostResult> {
  try {
    logger.info({
      fileType: imageFile.type,
      fileSize: imageFile.size,
      hasCaption: !!caption
    }, 'Creating post');

    // Step 1: Call GraphQL mutation to get presigned URLs
    const client = await getGraphQLClient();
    const data = await client.request<CreatePostResponse>(CREATE_POST, {
      fileType: imageFile.type,
      caption,
    });

    const { post, uploadUrl, thumbnailUploadUrl } = data.createPost;

    logger.info({
      postId: post.id,
      uploadUrl: uploadUrl.substring(0, 50) + '...',
      thumbnailUploadUrl: thumbnailUploadUrl.substring(0, 50) + '...'
    }, 'Received presigned URLs');

    // Step 2: Upload image and thumbnail to S3
    try {
      await Promise.all([
        uploadToS3(imageFile, uploadUrl),
        uploadToS3(thumbnailBlob, thumbnailUploadUrl),
      ]);

      logger.info({ postId: post.id }, 'Files uploaded successfully');
    } catch (uploadError) {
      logger.error({ postId: post.id, error: uploadError }, 'Failed to upload files to S3');
      return {
        success: false,
        error: 'Failed to upload image. Please try again.',
      };
    }

    // Step 3: Revalidate explore page to show new post
    revalidatePath('/explore', 'page');
    revalidatePath('/', 'page');

    logServerAction('createPost', { postId: post.id }, 'success');
    return {
      success: true,
      postId: post.id,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to create post');
    logServerAction('createPost', {}, 'error');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create post',
    };
  }
}
