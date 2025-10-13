import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand
} from '@aws-sdk/lib-dynamodb';
import type {
  Post,
  CreatePostRequest,
  UpdatePostRequest,
  GetUserPostsRequest,
  PostsListResponse,
  PostGridResponse,
  FeedResponse
} from '@social-media-app/shared';
import { randomUUID } from 'crypto';
import { ProfileService } from './profile.service.js';
import {
  mapEntityToPost,
  mapEntityToPostGridItem,
  mapEntityToFeedItemBase,
  enrichWithProfile,
  buildUserPostsQuery,
  buildUserPostsGSI4Query,
  buildPostByIdQuery,
  buildPostFeedQuery,
  buildUpdateExpressionFromObject,
  type PostEntity
} from '../utils/index.js';

/**
 * Post entity for DynamoDB
 * Re-exported from utils for backward compatibility
 */
export type { PostEntity };

/**
 * Post service for managing user posts
 */
export class PostService {
  private readonly tableName: string;
  private readonly profileService: ProfileService;

  constructor(
    private readonly dynamoClient: DynamoDBDocumentClient,
    tableName: string,
    profileService: ProfileService
  ) {
    this.tableName = tableName;
    this.profileService = profileService;
  }

  /**
   * Create a new post
   */
  async createPost(
    userId: string,
    userHandle: string,
    request: CreatePostRequest,
    imageUrl: string,
    thumbnailUrl: string
  ): Promise<Post> {
    const postId = randomUUID();
    const now = new Date().toISOString();

    const entity: PostEntity = {
      PK: `USER#${userId}`,
      SK: `POST#${now}#${postId}`,
      GSI1PK: `POST#${postId}`,
      GSI1SK: `USER#${userId}`,
      GSI4PK: `USER#${userId}`,  // GSI4 for efficient user post queries
      GSI4SK: `POST#${now}#${postId}`,  // Same as SK for chronological ordering
      id: postId,
      userId,
      userHandle,
      imageUrl,
      thumbnailUrl,
      caption: request.caption,
      tags: request.tags || [],
      likesCount: 0,
      commentsCount: 0,
      isPublic: request.isPublic !== false,
      createdAt: now,
      updatedAt: now,
      entityType: 'POST'
    };

    await this.dynamoClient.send(new PutCommand({
      TableName: this.tableName,
      Item: entity,
      ConditionExpression: 'attribute_not_exists(PK)'
    }));

    // Increment user's posts count
    await this.profileService.incrementPostsCount(userId);

    return mapEntityToPost(entity);
  }

  /**
   * Get a post by ID
   */
  async getPostById(postId: string): Promise<Post | null> {
    const queryParams = buildPostByIdQuery(postId, this.tableName);
    const result = await this.dynamoClient.send(new QueryCommand(queryParams));

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return mapEntityToPost(result.Items[0] as PostEntity);
  }

  /**
   * Update a post
   */
  async updatePost(
    postId: string,
    userId: string,
    updates: UpdatePostRequest
  ): Promise<Post | null> {
    // First, get the post to verify ownership and get the SK
    const post = await this.getPostById(postId);
    if (!post || post.userId !== userId) {
      return null;
    }

    // Find the exact SK for the post
    const queryParams = buildUserPostsQuery(userId, this.tableName);
    queryParams.FilterExpression = 'id = :postId';
    queryParams.ExpressionAttributeValues = {
      ...queryParams.ExpressionAttributeValues,
      ':postId': postId
    };

    const queryResult = await this.dynamoClient.send(new QueryCommand(queryParams));

    if (!queryResult.Items || queryResult.Items.length === 0) {
      return null;
    }

    const entity = queryResult.Items[0] as PostEntity;

    // Build update expression using utility
    const updateData = {
      updatedAt: new Date().toISOString(),
      ...updates
    };

    const updateExpression = buildUpdateExpressionFromObject(updateData);

    const result = await this.dynamoClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: entity.PK,
        SK: entity.SK
      },
      ...updateExpression,
      ReturnValues: 'ALL_NEW'
    }));

    if (!result.Attributes) {
      throw new Error('Failed to update post - no data returned');
    }
    return mapEntityToPost(result.Attributes as PostEntity);
  }

  /**
   * Delete a post
   */
  async deletePost(postId: string, userId: string): Promise<boolean> {
    // First, get the post to verify ownership and get the SK
    const post = await this.getPostById(postId);
    if (!post || post.userId !== userId) {
      return false;
    }

    // Find the exact SK for the post
    const queryParams = buildUserPostsQuery(userId, this.tableName);
    queryParams.FilterExpression = 'id = :postId';
    queryParams.ExpressionAttributeValues = {
      ...queryParams.ExpressionAttributeValues,
      ':postId': postId
    };

    const queryResult = await this.dynamoClient.send(new QueryCommand(queryParams));

    if (!queryResult.Items || queryResult.Items.length === 0) {
      return false;
    }

    const entity = queryResult.Items[0] as PostEntity;

    await this.dynamoClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: entity.PK,
        SK: entity.SK
      }
    }));

    // Decrement user's posts count
    await this.profileService.decrementPostsCount(userId);

    return true;
  }

  /**
   * Get user posts by handle
   */
  async getUserPostsByHandle(request: GetUserPostsRequest): Promise<PostGridResponse> {
    // First, get user by handle
    const profile = await this.profileService.getProfileByHandle(request.handle);
    if (!profile) {
      return {
        posts: [],
        hasMore: false,
        totalCount: 0
      };
    }

    const queryParams = buildUserPostsQuery(profile.id, this.tableName, {
      limit: request.limit || 24,
      cursor: request.cursor
    });

    const result = await this.dynamoClient.send(new QueryCommand(queryParams));

    const posts = (result.Items || []).map(item =>
      mapEntityToPostGridItem(item as PostEntity)
    );

    const nextCursor = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined;

    return {
      posts,
      nextCursor,
      hasMore: !!result.LastEvaluatedKey,
      totalCount: profile.postsCount
    };
  }

  /**
   * Get user posts by userId (for authenticated user's own posts)
   */
  async getUserPosts(
    userId: string,
    limit: number = 24,
    cursor?: string
  ): Promise<PostsListResponse> {
    const queryParams = buildUserPostsQuery(userId, this.tableName, {
      limit,
      cursor
    });

    const result = await this.dynamoClient.send(new QueryCommand(queryParams));

    const posts = (result.Items || []).map(item =>
      mapEntityToPost(item as PostEntity)
    );

    const nextCursor = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined;

    return {
      posts,
      nextCursor,
      hasMore: !!result.LastEvaluatedKey
    };
  }

  /**
   * Get feed posts (all public posts from all users)
   * Uses scan operation to get posts across all users
   * Returns grid items for explore page
   */
  async getFeedPosts(
    limit: number = 24,
    cursor?: string
  ): Promise<PostGridResponse> {
    const scanParams = buildPostFeedQuery({
      tableName: this.tableName,
      limit,
      cursor
    });

    const result = await this.dynamoClient.send(new ScanCommand(scanParams));

    // Map to PostGridItem
    const posts = (result.Items || [])
      .map(item => mapEntityToPostGridItem(item as PostEntity))
      // Sort by createdAt descending (newest first)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const nextCursor = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined;

    return {
      posts,
      nextCursor,
      hasMore: !!result.LastEvaluatedKey,
      totalCount: result.Count || 0
    };
  }

  /**
   * Delete all posts for a user
   * Uses GSI4 for efficient query instead of expensive table scan
   * Cost reduction: $13 → $0.13 per operation (99% cost savings)
   *
   * @param userId - ID of user whose posts to delete
   * @returns Number of posts deleted
   *
   * @example
   * ```typescript
   * // When deleting a user account, efficiently remove all their posts
   * const deletedCount = await postService.deleteAllUserPosts('user123');
   * console.log(`Deleted ${deletedCount} posts`);
   * ```
   */
  async deleteAllUserPosts(userId: string): Promise<number> {
    let deletedCount = 0;
    let hasMore = true;
    let cursor: string | undefined;

    // Use GSI4 for efficient querying instead of expensive table scan
    // This reduces cost from $13 to $0.13 per delete operation
    while (hasMore) {
      const queryParams = buildUserPostsGSI4Query(userId, this.tableName, {
        limit: 25, // Process in batches
        cursor
      });

      const result = await this.dynamoClient.send(new QueryCommand(queryParams));

      if (!result.Items || result.Items.length === 0) {
        hasMore = false;
        break;
      }

      // Delete each post
      const deletePromises = result.Items.map(async (item) => {
        const entity = item as PostEntity;

        await this.dynamoClient.send(new DeleteCommand({
          TableName: this.tableName,
          Key: {
            PK: entity.PK,
            SK: entity.SK
          }
        }));

        return true;
      });

      const deleteResults = await Promise.all(deletePromises);
      deletedCount += deleteResults.filter(Boolean).length;

      // Check if there are more items
      if (result.LastEvaluatedKey) {
        cursor = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
      } else {
        hasMore = false;
      }
    }

    // Update user's post count to 0
    if (deletedCount > 0) {
      await this.profileService.resetPostsCount(userId);
    }

    return deletedCount;
  }

  /**
   * Get following feed posts (home page - posts from followed users only)
   * Phase 1: Query-Time approach - queries posts from each followed user
   *
   * ARCHITECTURE NOTE: This implements the Query-Time (Fan-Out on Read) pattern.
   * Future Phase 2 (Hybrid) will check materialized cache first, then fallback to this.
   *
   * @param userId - ID of user whose feed to retrieve
   * @param followService - FollowService instance for getting following list
   * @param limit - Maximum number of posts to return
   * @param cursor - Pagination cursor (not implemented in Phase 1)
   * @returns Feed response with posts from followed users
   */
  async getFollowingFeedPosts(
    userId: string,
    followService: { getFollowingList: (userId: string) => Promise<string[]> },
    limit: number = 24,
    _cursor?: string // Not implemented in Phase 1, will be used in Phase 2
  ): Promise<FeedResponse> {
    // Get list of users this user is following
    const followingUserIds = await followService.getFollowingList(userId);

    // If not following anyone, return empty feed
    if (followingUserIds.length === 0) {
      return {
        posts: [],
        nextCursor: undefined,
        hasMore: false
      };
    }

    // Query posts from all followed users using utility
    const allPosts: PostEntity[] = [];

    for (const followeeId of followingUserIds) {
      const queryParams = buildUserPostsQuery(followeeId, this.tableName, {
        limit: limit * 2
      });

      const result = await this.dynamoClient.send(new QueryCommand(queryParams));

      if (result.Items && result.Items.length > 0) {
        allPosts.push(...(result.Items as PostEntity[]));
      }
    }

    // Filter for public posts only
    const publicPosts = allPosts.filter(post => post.isPublic);

    // Sort by createdAt descending (newest first)
    const sortedPosts = publicPosts.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Apply limit
    const limitedPosts = sortedPosts.slice(0, limit);

    // Map to FeedPostItem (with full images and author info)
    const posts = await Promise.all(
      limitedPosts.map(async (entity) => {
        const baseFeedItem = mapEntityToFeedItemBase(entity);
        const profile = await this.profileService.getProfileById(entity.userId);
        return profile ? enrichWithProfile(baseFeedItem, profile) : { ...baseFeedItem, authorFullName: undefined, authorProfilePictureUrl: undefined };
      })
    );

    return {
      posts,
      nextCursor: undefined, // Pagination not implemented in Phase 1
      hasMore: sortedPosts.length > limit
    };
  }
}