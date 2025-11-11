import { useMutation, graphql } from 'react-relay';
import { useState, useCallback } from 'react';
import type { useCreatePostMutation } from './__generated__/useCreatePostMutation.graphql.js';

/**
 * Input for creating a post
 */
export interface CreatePostInput {
  fileType: string;
  caption: string | null;
}

/**
 * Result of creating a post
 */
export interface CreatePostResult {
  post: {
    id: string;
    imageUrl: string;
    caption: string | null;
    createdAt: string;
    author: {
      id: string;
      handle: string;
      username: string;
    };
  };
  uploadUrl: string;
  thumbnailUploadUrl: string;
}

/**
 * Hook to create a post using Relay mutation
 *
 * Provides a reusable mutation for creating posts with image upload URLs.
 * Extracted from CreatePostPageRelay to improve reusability and testability.
 *
 * @returns {object} Object containing createPost function, isInFlight state, and error state
 *
 * @example
 * ```tsx
 * const { createPost, isInFlight, error } = useCreatePost();
 *
 * const handleCreate = async () => {
 *   const result = await createPost({
 *     fileType: 'image/jpeg',
 *     caption: 'My new post'
 *   });
 *
 *   if (result) {
 *     await uploadToS3(result.uploadUrl, file);
 *     navigate(`/post/${result.post.id}`);
 *   }
 * };
 * ```
 */
export function useCreatePost() {
  const [error, setError] = useState<Error | null>(null);

  const [commit, isInFlight] = useMutation<useCreatePostMutation>(
    graphql`
      mutation useCreatePostMutation($input: CreatePostInput!) {
        createPost(input: $input) {
          post {
            id
            imageUrl
            caption
            createdAt
            author {
              id
              handle
              username
            }
          }
          uploadUrl
          thumbnailUploadUrl
        }
      }
    `
  );

  /**
   * Create a new post
   *
   * @param input - Post creation input (fileType, caption)
   * @returns Promise that resolves with post data and upload URLs, or null on error
   */
  const createPost = useCallback((input: CreatePostInput): Promise<CreatePostResult | null> => {
    setError(null);

    return new Promise((resolve) => {
      commit({
        variables: { input },
        onCompleted: (response) => {
          if (response.createPost) {
            resolve(response.createPost as CreatePostResult);
          } else {
            const err = new Error('Failed to create post');
            setError(err);
            resolve(null);
          }
        },
        onError: (err) => {
          setError(err);
          resolve(null);
        }
      });
    });
  }, [commit]);

  return {
    createPost,
    isInFlight,
    error
  };
}
