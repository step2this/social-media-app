import { CreatePostRequestSchema, type CreatePostRequest } from '@social-media-app/shared';
import { PostServiceGraphQL } from '../../services/implementations/PostService.graphql';
import { createGraphQLClient } from '../../graphql/client';
import { unwrap } from '../../graphql/types';

// Initialize post service
const postService = new PostServiceGraphQL(createGraphQLClient());

/**
 * Result returned from create post function
 */
export interface CreatePostResult {
  postId: string;
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
 * Create a new post
 * Handles validation, GraphQL mutation, and S3 upload
 *
 * @param input - Post creation input (caption, tags, imageFile)
 * @returns Promise with postId on success
 * @throws Error on failure
 */
export async function createPost(
  input: CreatePostInput
): Promise<CreatePostResult> {
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

  // Return post ID
  return {
    postId: createPayload.post.id,
  };
}
