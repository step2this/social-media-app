/**
 * GraphQL Post Service Implementation
 *
 * Implements IPostService using GraphQL operations.
 * Uses dependency injection for easy testing and swapping.
 */

import type { IGraphQLClient } from '../../graphql/interfaces/IGraphQLClient';
import type { AsyncState } from '../../graphql/types';
import type {
  IPostService,
  Post,
  CreatePostInput,
  UpdatePostInput,
  CreatePostPayload,
  PostConnection,
} from '../interfaces/IPostService';
import {
  CREATE_POST_MUTATION,
  GET_POST_QUERY,
  GET_USER_POSTS_QUERY,
  UPDATE_POST_MUTATION,
  DELETE_POST_MUTATION,
} from '../../graphql/operations/posts';

/**
 * GraphQL response types
 */
interface CreatePostResponse {
  createPost: CreatePostPayload;
}

interface GetPostResponse {
  post: Post;
}

interface GetUserPostsResponse {
  userPosts: PostConnection;
}

interface UpdatePostResponse {
  updatePost: Post;
}

interface DeletePostResponse {
  deletePost: {
    success: boolean;
  };
}

/**
 * PostServiceGraphQL
 *
 * GraphQL implementation of the post service.
 * Handles all post-related operations via GraphQL API.
 */
export class PostServiceGraphQL implements IPostService {
  private readonly DEFAULT_LIMIT = 24;

  constructor(private readonly client: IGraphQLClient) {}

  async createPost(
    input: CreatePostInput
  ): Promise<AsyncState<CreatePostPayload>> {
    return this.client.mutate<CreatePostResponse>(CREATE_POST_MUTATION, {
      input,
    }).then((result) => {
      if (result.status === 'success') {
        return {
          status: 'success' as const,
          data: result.data.createPost,
        };
      }
      return result;
    });
  }

  async getPost(id: string): Promise<AsyncState<Post>> {
    return this.client.query<GetPostResponse>(GET_POST_QUERY, { id }).then((result) => {
      if (result.status === 'success') {
        return {
          status: 'success' as const,
          data: result.data.post,
        };
      }
      return result;
    });
  }

  async getUserPosts(
    handle: string,
    limit: number = this.DEFAULT_LIMIT,
    cursor?: string
  ): Promise<AsyncState<PostConnection>> {
    return this.client
      .query<GetUserPostsResponse>(GET_USER_POSTS_QUERY, {
        handle,
        limit,
        cursor,
      })
      .then((result) => {
        if (result.status === 'success') {
          return {
            status: 'success' as const,
            data: result.data.userPosts,
          };
        }
        return result;
      });
  }

  async updatePost(
    id: string,
    input: UpdatePostInput
  ): Promise<AsyncState<Post>> {
    return this.client
      .mutate<UpdatePostResponse>(UPDATE_POST_MUTATION, { id, input })
      .then((result) => {
        if (result.status === 'success') {
          return {
            status: 'success' as const,
            data: result.data.updatePost,
          };
        }
        return result;
      });
  }

  async deletePost(id: string): Promise<AsyncState<boolean>> {
    return this.client
      .mutate<DeletePostResponse>(DELETE_POST_MUTATION, { id })
      .then((result) => {
        if (result.status === 'success') {
          return {
            status: 'success' as const,
            data: result.data.deletePost.success,
          };
        }
        return result;
      });
  }
}
