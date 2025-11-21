/* eslint-disable max-lines-per-function */
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type {
  FollowUserResponse,
  UnfollowUserResponse,
  GetFollowStatusResponse
} from '@social-media-app/shared';
import { logDynamoDB, logServiceOp, logError, logger } from '../infrastructure/logger.js';

/**
 * Follow entity structure in DynamoDB
 */
export interface FollowEntity {
  readonly PK: string;           // USER#<followerId>
  readonly SK: string;           // FOLLOW#<followeeId>
  readonly GSI1PK: string;       // USER#<followeeId> (for followers list queries)
  readonly GSI1SK: string;       // FOLLOWER#<followerId>
  readonly GSI2PK: string;       // USER#<followeeId> (for stream processor)
  readonly GSI2SK: string;       // FOLLOW#<followerId>
  readonly followerId: string;
  readonly followeeId: string;
  readonly createdAt: string;
  readonly entityType: 'FOLLOW';
}

/**
 * Service for managing follow relationships
 * Uses DynamoDB with bidirectional storage for efficient queries
 */
export class FollowService {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string
  ) {}

  /**
   * Follow a user
   * Idempotent - returns success even if already following
   *
   * @param followerId - ID of user performing the follow
   * @param followeeId - ID of user being followed
   * @returns Follow response with success status and counts
   */
  async followUser(followerId: string, followeeId: string): Promise<FollowUserResponse> {
    const startTime = Date.now();
    const now = new Date().toISOString();

    const followEntity: FollowEntity = {
      PK: `USER#${followerId}`,
      SK: `FOLLOW#${followeeId}`,
      GSI1PK: `USER#${followeeId}`,
      GSI1SK: `FOLLOWER#${followerId}`,
      GSI2PK: `USER#${followeeId}`,
      GSI2SK: `FOLLOW#${followerId}`,
      followerId,
      followeeId,
      createdAt: now,
      entityType: 'FOLLOW'
    };

    try {
      logDynamoDB('put', { 
        table: this.tableName, 
        followerId, 
        followeeId,
        conditional: true 
      });
      await this.client.send(new PutCommand({
        TableName: this.tableName,
        Item: followEntity,
        ConditionExpression: 'attribute_not_exists(PK)'
      }));

      const duration = Date.now() - startTime;
      logServiceOp('FollowService', 'followUser', { followerId, followeeId }, duration);

      return {
        success: true,
        followersCount: 0,
        followingCount: 0,
        isFollowing: true
      };
    } catch (error: any) {
      // If conditional check fails, user already following
      if (error.name === 'ConditionalCheckFailedException' || error.__type === 'ConditionalCheckFailedException') {
        return {
          success: true,
          followersCount: 0,
          followingCount: 0,
          isFollowing: true
        };
      }
      logError('FollowService', 'followUser', error as Error, { followerId, followeeId });
      throw error;
    }
  }

  /**
   * Unfollow a user
   * Idempotent - returns success even if not following
   *
   * @param followerId - ID of user performing the unfollow
   * @param followeeId - ID of user being unfollowed
   * @returns Unfollow response with success status and counts
   */
  async unfollowUser(followerId: string, followeeId: string): Promise<UnfollowUserResponse> {
    const startTime = Date.now();

    logDynamoDB('delete', { table: this.tableName, followerId, followeeId });
    await this.client.send(new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${followerId}`,
        SK: `FOLLOW#${followeeId}`
      }
    }));

    const duration = Date.now() - startTime;
    logServiceOp('FollowService', 'unfollowUser', { followerId, followeeId }, duration);

    // Return hardcoded counts - stream processor will update them async
    return {
      success: true,
      followersCount: 0,
      followingCount: 0,
      isFollowing: false
    };
  }

  /**
   * Get follow status between two users
   *
   * @param followerId - ID of user who might be following
   * @param followeeId - ID of user who might be followed
   * @returns Follow status with counts
   */
  async getFollowStatus(followerId: string, followeeId: string): Promise<GetFollowStatusResponse> {
    const result = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${followerId}`,
        SK: `FOLLOW#${followeeId}`
      }
    }));

    const isFollowing = !!result.Item;

    // Return hardcoded counts - stream processor will update them async
    return {
      isFollowing,
      followersCount: 0,
      followingCount: 0
    };
  }

  /**
   * Get list of user IDs that this user is following
   * This is the foundation for the Following Feed (Query-Time approach)
   *
   * ARCHITECTURE NOTE: This method supports Phase 1 (Query-Time) feed pattern.
   * In Phase 2 (Hybrid), we'll add a materialized feed cache and use this as fallback.
   *
   * @param userId - ID of user whose following list to retrieve
   * @returns Array of followee user IDs
   */
  async getFollowingList(userId: string): Promise<string[]> {
    logDynamoDB('query', { table: this.tableName, userId });
    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'FOLLOW#'
      }
    }));

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    logger.debug({
      userId,
      followingCount: result.Items?.length || 0
    }, '[FollowService] Following list retrieved');

    // Extract followeeId from each follow entity
    return result.Items
      .map((item) => (item as FollowEntity).followeeId)
      .filter((id): id is string => !!id);
  }

  /**
   * Get the total number of followers for a user
   * Uses GSI2 to query all users following this user
   *
   * @param userId - ID of user to get follower count for
   * @returns Number of followers
   */
  async getFollowerCount(userId: string): Promise<number> {
    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk AND begins_with(GSI2SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'FOLLOW#'
      },
      Select: 'COUNT'
    }));

    return result.Count ?? 0;
  }

  /**
   * Get all follower user IDs for a user
   * Used by stream processor for feed fan-out
   * Uses GSI2 to efficiently query followers
   *
   * @param userId - ID of user to get followers for
   * @returns Array of follower user IDs
   */
  async getAllFollowers(userId: string): Promise<string[]> {
    logDynamoDB('query', { table: this.tableName, gsi: 'GSI2', userId });
    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk AND begins_with(GSI2SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'FOLLOW#'
      }
    }));

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    logger.debug({
      userId,
      followerCount: result.Items?.length || 0
    }, '[FollowService] Followers retrieved');

    // Extract followerId from each follow entity
    return result.Items
      .map((item) => (item as FollowEntity).followerId)
      .filter((id): id is string => !!id);
  }
}
