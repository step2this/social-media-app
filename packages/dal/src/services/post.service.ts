import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  type QueryCommandInput
} from '@aws-sdk/lib-dynamodb';
import type {
  Post,
  PostGridItem,
  CreatePostRequest,
  UpdatePostRequest,
  GetUserPostsRequest,
  PostsListResponse,
  PostGridResponse
} from '@social-media-app/shared';
import { randomUUID } from 'crypto';
import { ProfileService } from './profile.service.js';

/**
 * Post entity for DynamoDB
 */
export interface PostEntity {
  PK: string; // USER#<userId>
  SK: string; // POST#<timestamp>#<postId>
  GSI1PK: string; // POST#<postId>
  GSI1SK: string; // USER#<userId>
  id: string;
  userId: string;
  userHandle: string;
  imageUrl: string;
  thumbnailUrl: string;
  caption?: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  entityType: 'POST';
}

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

    return this.mapEntityToPost(entity);
  }

  /**
   * Get a post by ID
   */
  async getPostById(postId: string): Promise<Post | null> {
    const result = await this.dynamoClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `POST#${postId}`
      },
      Limit: 1
    }));

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return this.mapEntityToPost(result.Items[0] as PostEntity);
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
    const queryResult = await this.dynamoClient.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'id = :postId',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'POST#',
        ':postId': postId
      }
    }));

    if (!queryResult.Items || queryResult.Items.length === 0) {
      return null;
    }

    const entity = queryResult.Items[0] as PostEntity;

    const updateExpressions: string[] = ['#updatedAt = :updatedAt'];
    const expressionAttributeNames: Record<string, string> = {
      '#updatedAt': 'updatedAt'
    };
    const expressionAttributeValues: Record<string, any> = {
      ':updatedAt': new Date().toISOString()
    };

    if (updates.caption !== undefined) {
      updateExpressions.push('#caption = :caption');
      expressionAttributeNames['#caption'] = 'caption';
      expressionAttributeValues[':caption'] = updates.caption;
    }

    if (updates.tags !== undefined) {
      updateExpressions.push('#tags = :tags');
      expressionAttributeNames['#tags'] = 'tags';
      expressionAttributeValues[':tags'] = updates.tags;
    }

    if (updates.isPublic !== undefined) {
      updateExpressions.push('#isPublic = :isPublic');
      expressionAttributeNames['#isPublic'] = 'isPublic';
      expressionAttributeValues[':isPublic'] = updates.isPublic;
    }

    const result = await this.dynamoClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: entity.PK,
        SK: entity.SK
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }));

    if (!result.Attributes) {
      throw new Error('Failed to update post - no data returned');
    }
    return this.mapEntityToPost(result.Attributes as PostEntity);
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
    const queryResult = await this.dynamoClient.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'POST#',
        ':postId': postId
      },
      FilterExpression: 'id = :postId'
    }));

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

    const queryParams: QueryCommandInput = {
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${profile.id}`,
        ':skPrefix': 'POST#'
      },
      ScanIndexForward: false, // Sort by newest first
      Limit: request.limit || 24
    };

    if (request.cursor) {
      queryParams.ExclusiveStartKey = JSON.parse(
        Buffer.from(request.cursor, 'base64').toString()
      );
    }

    const result = await this.dynamoClient.send(new QueryCommand(queryParams));

    const posts = (result.Items || []).map(item =>
      this.mapEntityToGridItem(item as PostEntity)
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
    const queryParams: QueryCommandInput = {
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'POST#'
      },
      ScanIndexForward: false, // Sort by newest first
      Limit: limit
    };

    if (cursor) {
      queryParams.ExclusiveStartKey = JSON.parse(
        Buffer.from(cursor, 'base64').toString()
      );
    }

    const result = await this.dynamoClient.send(new QueryCommand(queryParams));

    const posts = (result.Items || []).map(item =>
      this.mapEntityToPost(item as PostEntity)
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
   * Map entity to Post
   */
  private mapEntityToPost(entity: PostEntity): Post {
    return {
      id: entity.id,
      userId: entity.userId,
      userHandle: entity.userHandle,
      imageUrl: entity.imageUrl,
      thumbnailUrl: entity.thumbnailUrl,
      caption: entity.caption,
      tags: entity.tags,
      likesCount: entity.likesCount,
      commentsCount: entity.commentsCount,
      isPublic: entity.isPublic,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }

  /**
   * Map entity to PostGridItem
   */
  private mapEntityToGridItem(entity: PostEntity): PostGridItem {
    return {
      id: entity.id,
      thumbnailUrl: entity.thumbnailUrl,
      caption: entity.caption,
      likesCount: entity.likesCount,
      commentsCount: entity.commentsCount,
      createdAt: entity.createdAt
    };
  }
}