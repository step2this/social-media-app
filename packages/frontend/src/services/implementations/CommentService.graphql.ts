/**
 * Comment Service GraphQL Implementation
 *
 * GraphQL-based implementation of ICommentService.
 * Uses dependency injection for GraphQL client.
 */

import type { ICommentService, CreateCommentResult, GetCommentsResult } from '../interfaces/ICommentService';
import type { IGraphQLClient } from '../../graphql/interfaces/IGraphQLClient';
import type { AsyncState } from '../../graphql/types';
import { isSuccess } from '../../graphql/types';
import {
  CREATE_COMMENT_MUTATION,
  GET_COMMENTS_QUERY,
  DELETE_COMMENT_MUTATION,
} from '../../graphql/operations/comments';

/**
 * GraphQL-based Comment Service implementation
 */
export class CommentServiceGraphQL implements ICommentService {
  private readonly DEFAULT_LIMIT = 50;

  constructor(private readonly client: IGraphQLClient) {}

  async createComment(
    postId: string,
    content: string
  ): Promise<AsyncState<CreateCommentResult>> {
    const result = await this.client.mutate<{
      createComment: CreateCommentResult;
    }>(CREATE_COMMENT_MUTATION, {
      input: { postId, content },
    });

    if (isSuccess(result)) {
      return {
        status: 'success',
        data: result.data.createComment,
      };
    }

    return result;
  }

  async getComments(
    postId: string,
    limit?: number,
    cursor?: string
  ): Promise<AsyncState<GetCommentsResult>> {
    const result = await this.client.query<{
      comments: GetCommentsResult;
    }>(GET_COMMENTS_QUERY, {
      postId,
      limit: limit ?? this.DEFAULT_LIMIT,
      cursor,
    });

    if (isSuccess(result)) {
      return {
        status: 'success',
        data: result.data.comments,
      };
    }

    return result;
  }

  async deleteComment(commentId: string): Promise<AsyncState<boolean>> {
    const result = await this.client.mutate<{
      deleteComment: { success: boolean };
    }>(DELETE_COMMENT_MUTATION, {
      commentId,
    });

    if (isSuccess(result)) {
      return {
        status: 'success',
        data: result.data.deleteComment.success,
      };
    }

    return result;
  }
}
