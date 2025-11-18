/**
 * FollowBuilder - Builder for creating test follow relationships
 * 
 * Uses FollowService to create follow relationships. Note: The follow service
 * creates the FOLLOW entity but the followersCount/followingCount on user
 * profiles is updated via DynamoDB streams, not directly by the service
 * (similar to CommentService).
 * 
 * @example
 * ```typescript
 * // Create a single follow relationship
 * const follow = await new FollowBuilder()
 *   .follower(userId1)
 *   .followee(userId2)
 *   .build();
 * 
 * // Create multiple follow relationships
 * const follows = await FollowBuilder.createMany(
 *   [user1.id, user2.id, user3.id],
 *   influencerId
 * );
 * ```
 */

import { BaseBuilder } from './base/BaseBuilder.js';
import { createBuilderContainer } from './base/BuilderContainer.js';
import type { ValidationResult, SeededFollow, DeepPartial } from './types/index.js';
import type { FollowEntity } from '../../packages/dal/src/services/follow.service.js';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for building a follow relationship
 */
export interface FollowConfig {
  followerId?: string;
  followeeId?: string;
}

// ============================================================================
// FollowBuilder Class
// ============================================================================

/**
 * Builder for creating test follow relationships
 * 
 * Uses FollowService.followUser() to ensure proper entity structure.
 * 
 * Note: Like CommentService, FollowService does NOT increment the user's
 * followersCount/followingCount directly. This is handled by DynamoDB streams
 * in production. For test data purposes, this means follower counts may not
 * immediately reflect in user entities (this is expected behavior matching
 * production architecture).
 */
export class FollowBuilder extends BaseBuilder<
  FollowEntity,
  FollowConfig,
  SeededFollow
> {
  // ==========================================================================
  // Fluent Configuration Methods
  // ==========================================================================
  
  /**
   * Set the user who is following (the follower)
   */
  follower(userId: string): this {
    this.config.followerId = userId;
    return this;
  }
  
  /**
   * Set the user being followed (the followee)
   */
  followee(userId: string): this {
    this.config.followeeId = userId;
    return this;
  }
  
  // ==========================================================================
  // Validation
  // ==========================================================================
  
  /**
   * Validate follow configuration
   * 
   * Requires both followerId and followeeId to be present
   */
  protected async validate(): Promise<ValidationResult> {
    const errors = this.validateRequired({
      followerId: this.config.followerId,
      followeeId: this.config.followeeId,
    });
    
    // Prevent self-follow
    if (this.config.followerId && this.config.followeeId &&
        this.config.followerId === this.config.followeeId) {
      errors.push(this.validationError(
        'followerId',
        'Users cannot follow themselves',
        this.config.followerId
      ));
    }
    
    return errors.length > 0
      ? this.validationFailure(errors)
      : this.validationSuccess();
  }
  
  // ==========================================================================
  // Build Implementation
  // ==========================================================================
  
  /**
   * Build the follow relationship
   * 
   * Uses FollowService.followUser() which:
   * 1. Creates the FOLLOW entity in DynamoDB
   * 2. Returns hardcoded counts (will be updated by stream processor)
   * 3. Is idempotent (returns success even if already following)
   * 
   * Note: The user's followersCount/followingCount is NOT incremented directly.
   * This matches production architecture where DynamoDB streams handle count updates.
   */
  protected async buildInternal(): Promise<SeededFollow> {
    const container = createBuilderContainer();
    const followService = container.resolve('followService');
    
    // Validate required fields are present
    if (!this.config.followerId || !this.config.followeeId) {
      throw new Error('followerId and followeeId are required for follow creation');
    }
    
    // ✅ Use FollowService.followUser() to ensure proper entity structure
    const result = await followService.followUser(
      this.config.followerId,
      this.config.followeeId
    );
    
    this.log('info', `User ${this.config.followerId} followed user ${this.config.followeeId}`);
    
    // Return SeededFollow
    return {
      followerId: this.config.followerId,
      followeeId: this.config.followeeId,
      createdAt: new Date().toISOString(),
      isFollowing: result.isFollowing,
    };
  }
  
  // ==========================================================================
  // Static Batch Methods
  // ==========================================================================
  
  /**
   * Create multiple follow relationships from followers to a single followee
   * 
   * Useful for giving influencers many followers quickly.
   * 
   * @param followerIds - Array of user IDs who will follow
   * @param followeeId - User ID being followed
   * @param concurrency - Number of concurrent follow operations (default: 10)
   * @returns Array of SeededFollow results
   * 
   * @example
   * ```typescript
   * // Give influencer 100 followers
   * const follows = await FollowBuilder.createMany(
   *   regularUserIds,
   *   influencer.id
   * );
   * ```
   */
  static async createMany(
    followerIds: string[],
    followeeId: string,
    concurrency: number = 10
  ): Promise<SeededFollow[]> {
    const results: SeededFollow[] = [];
    
    // Process in batches to control concurrency
    for (let i = 0; i < followerIds.length; i += concurrency) {
      const batch = followerIds.slice(i, i + concurrency);
      
      const batchResults = await Promise.all(
        batch.map(followerId =>
          new FollowBuilder()
            .follower(followerId)
            .followee(followeeId)
            .build()
        )
      );
      
      results.push(...batchResults);
      
      console.log(`Created ${results.length}/${followerIds.length} follow relationships`);
    }
    
    return results;
  }
  
  /**
   * Create a complete follow graph (everyone follows everyone)
   * 
   * Creates a fully connected social graph where every user follows every
   * other user. Useful for testing feed algorithms with maximum connectivity.
   * 
   * @param userIds - Array of user IDs
   * @param concurrency - Number of concurrent follow operations (default: 10)
   * @returns Array of SeededFollow results
   * 
   * @example
   * ```typescript
   * // Create complete graph for 10 users = 90 relationships
   * const follows = await FollowBuilder.createCompleteGraph([...userIds]);
   * ```
   */
  static async createCompleteGraph(
    userIds: string[],
    concurrency: number = 10
  ): Promise<SeededFollow[]> {
    const results: SeededFollow[] = [];
    const totalRelationships = userIds.length * (userIds.length - 1);
    
    console.log(`Creating complete follow graph for ${userIds.length} users (${totalRelationships} relationships)...`);
    
    // Create all possible follow combinations
    const followPairs: Array<{ followerId: string; followeeId: string }> = [];
    
    for (const followerId of userIds) {
      for (const followeeId of userIds) {
        if (followerId !== followeeId) {
          followPairs.push({ followerId, followeeId });
        }
      }
    }
    
    // Process in batches
    for (let i = 0; i < followPairs.length; i += concurrency) {
      const batch = followPairs.slice(i, i + concurrency);
      
      const batchResults = await Promise.all(
        batch.map(pair =>
          new FollowBuilder()
            .follower(pair.followerId)
            .followee(pair.followeeId)
            .build()
        )
      );
      
      results.push(...batchResults);
      
      if (results.length % 100 === 0 || results.length === followPairs.length) {
        console.log(`Created ${results.length}/${followPairs.length} follow relationships`);
      }
    }
    
    return results;
  }
  
  /**
   * Create random follow relationships
   * 
   * Each user follows a random subset of other users. Creates realistic
   * follow patterns with varying connectivity.
   * 
   * @param userIds - Array of user IDs
   * @param followsPerUser - Range or fixed number of users to follow
   * @returns Array of SeededFollow results
   * 
   * @example
   * ```typescript
   * // Each user follows 5-15 random other users
   * const follows = await FollowBuilder.createRandomFollows(
   *   userIds,
   *   { min: 5, max: 15 }
   * );
   * ```
   */
  static async createRandomFollows(
    userIds: string[],
    followsPerUser: number | { min: number; max: number }
  ): Promise<SeededFollow[]> {
    const results: SeededFollow[] = [];
    
    for (const followerId of userIds) {
      // Determine number of users to follow
      const count = typeof followsPerUser === 'number'
        ? followsPerUser
        : Math.floor(Math.random() * (followsPerUser.max - followsPerUser.min + 1)) + followsPerUser.min;
      
      // Get potential followees (everyone except self)
      const potentialFollowees = userIds.filter(id => id !== followerId);
      
      // Randomly select followees
      const shuffled = [...potentialFollowees].sort(() => Math.random() - 0.5);
      const selectedFollowees = shuffled.slice(0, Math.min(count, potentialFollowees.length));
      
      // Create follow relationships
      const userFollows = await FollowBuilder.createMany(
        [followerId],
        selectedFollowees[0], // Just creating one at a time for simplicity
        10
      );
      
      // Create remaining follows
      for (let i = 1; i < selectedFollowees.length; i++) {
        const follow = await new FollowBuilder()
          .follower(followerId)
          .followee(selectedFollowees[i])
          .build();
        userFollows.push(follow);
      }
      
      results.push(...userFollows);
    }
    
    return results;
  }
}
