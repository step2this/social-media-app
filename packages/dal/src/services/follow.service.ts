/* eslint-disable max-lines-per-function */
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type {
  FollowUserResponse,
  UnfollowUserResponse,
  GetFollowStatusResponse
} from '@social-media-app/shared';

/**
 * Follow entity structure in DynamoDB
 */
export interface FollowEntity {
  readonly PK: string;           // USER#<followerId>
  readonly SK: string;           // FOLLOW#<followeeId>
  readonly GSI2PK: string;       // USER#<followeeId> (for followers list queries)
  readonly GSI2SK: string;       // FOLLOWER#<followerId>
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
    const now = new Date().toISOString();

    const followEntity: FollowEntity = {
      PK: `USER#${followerId}`,
      SK: `FOLLOW#${followeeId}`,
      GSI2PK: `USER#${followeeId}`,
      GSI2SK: `FOLLOWER#${followerId}`,
      followerId,
      followeeId,
      createdAt: now,
      entityType: 'FOLLOW'
    };

    try {
      await this.client.send(new PutCommand({
        TableName: this.tableName,
        Item: followEntity,
        ConditionExpression: 'attribute_not_exists(PK)'
      }));

      return {
        success: true,
        followersCount: 0,
        followingCount: 0,
        isFollowing: true
      };
    } catch (error: any) {
      // If conditional check fails, user already following
      if (error.message?.includes('ConditionalCheckFailedException')) {
        return {
          success: true,
          followersCount: 0,
          followingCount: 0,
          isFollowing: true
        };
      }
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
    await this.client.send(new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${followerId}`,
        SK: `FOLLOW#${followeeId}`
      }
    }));

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
}
