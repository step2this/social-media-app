/**
 * GetPostById Use Case
 *
 * Retrieves a single post by its ID.
 * This is a public operation - no authentication required.
 */

import type { IPostRepository, Post } from '../../../domain/repositories/IPostRepository.js';
import { AsyncResult, PostId } from '../../../shared/types/index.js';

export interface GetPostByIdInput {
  postId: PostId;
}

export class GetPostById {
  constructor(private readonly postRepository: IPostRepository) {}

  async execute(input: GetPostByIdInput): AsyncResult<Post> {
    if (!input.postId) {
      return {
        success: false,
        error: new Error('Post ID is required'),
      };
    }

    const repositoryResult = await this.postRepository.findById(input.postId);

    if (!repositoryResult.success) {
      return repositoryResult;
    }

    if (!repositoryResult.data) {
      return {
        success: false,
        error: new Error(`Post not found: ${input.postId}`),
      };
    }

    return {
      success: true,
      data: repositoryResult.data,
    };
  }
}
