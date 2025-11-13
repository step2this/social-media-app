'use server';

/**
 * Server Actions for Posts
 *
 * These functions run on the server and can be called from Client Components.
 * They handle authentication automatically via cookies.
 */

import { revalidatePath } from 'next/cache';
import { getGraphQLClient } from '@/lib/graphql/client';
import { LIKE_POST, UNLIKE_POST } from '@/lib/graphql/queries';
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
