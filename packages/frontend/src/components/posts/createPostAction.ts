import { z } from 'zod';
import { CreatePostRequestSchema, type CreatePostRequest } from '@social-media-app/shared';
import { PostServiceGraphQL } from '../../services/implementations/PostService.graphql';
import { createGraphQLClient } from '../../graphql/client';
import { unwrap } from '../../graphql/types';

// Initialize post service
const postService = new PostServiceGraphQL(createGraphQLClient());

/**
 * State returned from create post action
 */
export interface CreatePostActionState {
  success: boolean;
  error: string | null;
  postId?: string;
}

/**
 * Input data for creating a post
 */
export interface CreatePostInput {
  caption: string;
  tags: string[];
  imageFile: File;
}

/**
 * Server action for creating a post
 * Handles validation, GraphQL mutation, and S3 upload
 *
 * @param prevState - Previous action state (unused but required by useActionState)
 * @param input - Post creation input (caption, tags, imageFile)
 * @returns Action state with success/error status and postId
 */
export async function createPostAction(
  prevState: CreatePostActionState,
  input: CreatePostInput
): Promise<CreatePostActionState> {
  try {
    // Validate request data
    const requestData: CreatePostRequest = {
      fileType: input.imageFile.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
      caption: input.caption.trim(),
      tags: input.tags,
    };

    const validatedData = CreatePostRequestSchema.parse(requestData);

    // Create post via GraphQL - returns CreatePostPayload with upload URLs
    const createPayload = unwrap(await postService.createPost(validatedData));

    // Upload image to S3 using the pre-signed URL
    const uploadResponse = await fetch(createPayload.uploadUrl, {
      method: 'PUT',
      body: input.imageFile,
      headers: {
        'Content-Type': input.imageFile.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload image to S3');
    }

    // Return success with post ID
    return {
      success: true,
      error: null,
      postId: createPayload.post.id,
    };
  } catch (error) {
    console.error('Error creating post:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return {
        success: false,
        error: `${firstError.path.join('.')}: ${firstError.message}`,
      };
    }

    // Handle other errors
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create post',
    };
  }
}
