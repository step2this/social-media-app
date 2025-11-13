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

interface MutationResponse {
  success: boolean;
  message?: string;
}

interface LikePostResponse {
  likePost: MutationResponse;
}

interface UnlikePostResponse {
  unlikePost: MutationResponse;
}

/**
 * Like a post
 *
 * @param postId - ID of the post to like
 * @returns Success response
 */
export async function likePost(postId: string): Promise<MutationResponse> {
  try {
    const client = await getGraphQLClient();
    const data = await client.request<LikePostResponse>(LIKE_POST, { postId });

    // Revalidate the feed page to show updated like count
    revalidatePath('/(app)', 'layout');

    return data.likePost;
  } catch (error) {
    console.error('Failed to like post:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to like post',
    };
  }
}

/**
 * Unlike a post
 *
 * @param postId - ID of the post to unlike
 * @returns Success response
 */
export async function unlikePost(postId: string): Promise<MutationResponse> {
  try {
    const client = await getGraphQLClient();
    const data = await client.request<UnlikePostResponse>(UNLIKE_POST, { postId });

    // Revalidate the feed page to show updated like count
    revalidatePath('/(app)', 'layout');

    return data.unlikePost;
  } catch (error) {
    console.error('Failed to unlike post:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to unlike post',
    };
  }
}
