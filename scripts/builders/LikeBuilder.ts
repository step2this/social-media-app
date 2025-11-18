/**
 * LikeBuilder - Builder for creating test likes on posts
 * 
 * **CRITICAL:** Uses LikeService.likePost() to preserve business logic
 * that increments the post's likesCount. This fixes the original bug
 * where direct DB writes bypassed count incrementation.
 * 
 * @example
 * ```typescript
 * // Create a single like
 * const like = await new LikeBuilder()
 *   .byUser(userId)
 *   .onPost(postId)
 *   .build();
 * 
 * // Create multiple likes for a post
 * const likes = await LikeBuilder.createMany([userId1, userId2, userId3], postId);
 * ```
 */

import { BaseBuilder } from './base/BaseBuilder.js';
import { createBuilderContainer } from './base/BuilderContainer.js';
import type { ValidationResult, SeededLike, DeepPartial } from './types/index.js';
import type { LikeEntity } from '../../packages/dal/src/services/like.service.js';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for building a like
 */
export interface LikeConfig {
  userId?: string;
  postId?: string;
}

// ============================================================================
// LikeBuilder Class
// ============================================================================

/**
 * Builder for creating test likes
 * 
 * **CRITICAL FIX:** Uses LikeService.likePost() instead of direct DB writes.
 * This ensures the post's likesCount is properly incremented, fixing the
 * original bug where seeded posts showed 0 likes.
 */
export class LikeBuilder extends BaseBuilder<
  LikeEntity,
  LikeConfig,
  SeededLike
> {
  // ==========================================================================
  // Fluent Configuration Methods
  // ==========================================================================
  
  /**
   * Set the user who is liking the post
   */
  byUser(userId: string): this {
    this.config.userId = userId;
    return this;
  }
  
  /**
   * Set the post being liked
   */
  onPost(postId: string): this {
    this.config.postId = postId;
    return this;
  }
  
  // ==========================================================================
  // Validation
  // ==========================================================================
  
  /**
   * Validate like configuration
   * 
   * Requires both userId and postId to be present
   */
  protected async validate(): Promise<ValidationResult> {
    const errors = this.validateRequired({
      userId: this.config.userId,
      postId: this.config.postId,
    });
    
    return errors.length > 0
      ? this.validationFailure(errors)
      : this.validationSuccess();
  }
  
  // ==========================================================================
  // Build Implementation
  // ==========================================================================
  
  /**
   * Build the like entity
   * 
   * **CRITICAL:** Uses LikeService.likePost() which:
   * 1. Creates the LIKE entity in DynamoDB
   * 2. Atomically increments the post's likesCount
   * 3. Handles duplicate like attempts gracefully
   * 
   * This is the proper way to create likes and ensures data integrity.
   */
  protected async buildInternal(): Promise<SeededLike> {
    const container = createBuilderContainer();
    const likeService = container.resolve('likeService');
    const postService = container.resolve('postService');
    
    // Validate required fields are present
    if (!this.config.userId || !this.config.postId) {
      throw new Error('userId and postId are required for like creation');
    }
    
    // Get post details to obtain postUserId and postSK
    // These are required by LikeService.likePost()
    const post = await postService.getPostById(this.config.postId);
    
    if (!post) {
      throw new Error(`Post not found: ${this.config.postId}`);
    }
    
    // Construct postSK in the correct format
    // Format: POST#<timestamp>#<postId>
    const postSK = `POST#${post.id}`;
    
    // ✅ CRITICAL: Use LikeService.likePost() to ensure business logic is preserved
    // This creates the LIKE entity AND increments the post's likesCount atomically
    const result = await likeService.likePost(
      this.config.userId,
      this.config.postId,
      post.userId,    // postUserId (owner of the post)
      postSK          // postSK (sort key of the post entity)
    );
    
    this.log('info', `User ${this.config.userId} liked post ${this.config.postId}`);
    
    // Return SeededLike
    return {
      userId: this.config.userId,
      postId: this.config.postId,
      createdAt: new Date().toISOString(),
      likesCount: result.likesCount,  // Updated count from service
      isLiked: result.isLiked,        // Always true for successful like
    };
  }
  
  // ==========================================================================
  // Static Batch Methods
  // ==========================================================================
  
  /**
   * Create multiple likes for a post from different users
   * 
   * Optimized batch creation with concurrency control to avoid throttling.
   * Useful for creating engagement on test posts.
   * 
   * @param userIds - Array of user IDs who will like the post
   * @param postId - Post ID being liked
   * @param concurrency - Number of concurrent like operations (default: 5)
   * @returns Array of SeededLike results
   * 
   * @example
   * ```typescript
   * // Create 10 likes from different users
   * const users = await new UserBuilder().buildMany(10);
   * const likes = await LikeBuilder.createMany(
   *   users.map(u => u.id),
   *   postId
   * );
   * ```
   */
  static async createMany(
    userIds: string[],
    postId: string,
    concurrency: number = 5
  ): Promise<SeededLike[]> {
    const results: SeededLike[] = [];
    
    // Process in batches to control concurrency and avoid DynamoDB throttling
    for (let i = 0; i < userIds.length; i += concurrency) {
      const batch = userIds.slice(i, i + concurrency);
      
      const batchResults = await Promise.all(
        batch.map(userId =>
          new LikeBuilder()
            .byUser(userId)
            .onPost(postId)
            .build()
        )
      );
      
      results.push(...batchResults);
      
      // Log progress
      console.log(`Created ${results.length}/${userIds.length} likes for post ${postId}`);
    }
    
    return results;
  }
  
  /**
   * Create random likes for multiple posts
   * 
   * Distributes likes across posts with random selection of users.
   * Useful for creating realistic engagement patterns.
   * 
   * @param userIds - Pool of user IDs to randomly select from
   * @param postIds - Array of post IDs to create likes for
   * @param likesPerPost - Range or fixed number of likes per post
   * @returns Array of SeededLike results
   * 
   * @example
   * ```typescript
   * // Create 5-15 random likes on each post
   * const likes = await LikeBuilder.createRandomLikes(
   *   allUserIds,
   *   postIds,
   *   { min: 5, max: 15 }
   * );
   * ```
   */
  static async createRandomLikes(
    userIds: string[],
    postIds: string[],
    likesPerPost: number | { min: number; max: number }
  ): Promise<SeededLike[]> {
    const results: SeededLike[] = [];
    
    for (const postId of postIds) {
      // Determine number of likes for this post
      const count = typeof likesPerPost === 'number'
        ? likesPerPost
        : Math.floor(Math.random() * (likesPerPost.max - likesPerPost.min + 1)) + likesPerPost.min;
      
      // Randomly select users (without replacement)
      const shuffled = [...userIds].sort(() => Math.random() - 0.5);
      const selectedUsers = shuffled.slice(0, Math.min(count, userIds.length));
      
      // Create likes
      const postLikes = await LikeBuilder.createMany(selectedUsers, postId);
      results.push(...postLikes);
    }
    
    return results;
  }
}
