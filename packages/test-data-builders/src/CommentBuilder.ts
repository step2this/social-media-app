/**
 * CommentBuilder - Builder for creating test comments on posts
 *
 * Uses CommentService to create comments. Note: The comment service creates
 * the COMMENT entity but the commentsCount on posts is updated via DynamoDB
 * streams, not directly by the service (unlike LikeService which increments
 * likesCount directly).
 *
 * @example
 * ```typescript
 * // Create a single comment
 * const comment = await new CommentBuilder()
 *   .byUser(userId, userHandle)
 *   .onPost(postId)
 *   .withContent('Great post!')
 *   .build();
 *
 * // Create multiple comments for a post
 * const comments = await CommentBuilder.createMany(
 *   [{ userId: user1.id, handle: user1.handle }, ...],
 *   postId
 * );
 * ```
 */

import { faker } from '@faker-js/faker';
import { BaseBuilder } from './base/BaseBuilder.js';
import { createBuilderContainer } from './base/BuilderContainer.js';
import type { ValidationResult, SeededComment, DeepPartial } from './types/index.js';
import { CommentConfigSchema, type CommentConfig } from './types/schemas.js';
import type { CommentEntity } from '../../packages/dal/src/utils/comment-mappers.js';

// ============================================================================
// CommentBuilder Class
// ============================================================================

/**
 * Builder for creating test comments on posts
 *
 * Uses CommentService to create comments. Note: The comment service creates
 * the COMMENT entity but the commentsCount on posts is updated via DynamoDB
 * streams, not directly by the service (unlike LikeService which increments
 * likesCount directly).
 *
 * **USES ZOD SCHEMA VALIDATION**
 */
export class CommentBuilder extends BaseBuilder<
  CommentEntity,
  CommentConfig,
  SeededComment
> {
  /**
   * Set Zod schema for validation
   */
  protected schema = CommentConfigSchema;
  // ==========================================================================
  // Fluent Configuration Methods
  // ==========================================================================

  /**
   * Set the user who is commenting
   */
  byUser(userId: string, userHandle: string): this {
    this.config.userId = userId;
    this.config.userHandle = userHandle;
    return this;
  }

  /**
   * Set the post being commented on
   */
  onPost(postId: string): this {
    this.config.postId = postId;
    return this;
  }

  /**
   * Set the comment content
   */
  withContent(content: string): this {
    this.config.content = content;
    return this;
  }

  // ==========================================================================
  // Validation
  // ==========================================================================

  /**
   * Validate comment configuration
   *
   * Requires userId, userHandle, postId, and content to be present
   */
  protected async validate(): Promise<ValidationResult> {
    const errors = this.validateRequired({
      userId: this.config.userId,
      userHandle: this.config.userHandle,
      postId: this.config.postId,
    });

    // Content can be auto-generated, so it's not required in validation
    // But if provided, validate length (1-500 characters per CommentContentField)
    if (this.config.content) {
      if (this.config.content.length < 1 || this.config.content.length > 500) {
        errors.push(this.validationError(
          'content',
          'Comment content must be between 1 and 500 characters',
          this.config.content
        ));
      }
    }

    return errors.length > 0
      ? this.validationFailure(errors)
      : this.validationSuccess();
  }

  // ==========================================================================
  // Build Implementation
  // ==========================================================================

  /**
   * Build the comment entity
   *
   * Uses CommentService.createComment() which:
   * 1. Validates content using Zod schema
   * 2. Creates the COMMENT entity in DynamoDB
   * 3. Returns commentsCount as 0 (will be updated by stream processor)
   *
   * Note: The post's commentsCount is NOT incremented directly by the service.
   * This matches production architecture where DynamoDB streams handle count updates.
   */
  protected async buildInternal(): Promise<SeededComment> {
    const container = await createBuilderContainer();
    const commentService = container.resolve('commentService');
    const postService = container.resolve('postService');

    // Validate required fields are present
    if (!this.config.userId || !this.config.userHandle || !this.config.postId) {
      throw new Error('userId, userHandle, and postId are required for comment creation');
    }

    // Get post details to obtain postUserId and construct postSK
    const post = await postService.getPostById(this.config.postId);

    if (!post) {
      throw new Error(`Post not found: ${this.config.postId}`);
    }

    // Generate content if not provided
    const content = this.config.content || this.generateComment();

    // Construct postSK in the correct format
    const postSK = `POST#${post.id}`;

    // ✅ Use CommentService.createComment() to ensure proper entity structure
    const result = await commentService.createComment(
      this.config.userId,
      this.config.postId,
      this.config.userHandle,
      content,
      post.userId,    // postUserId (owner of the post)
      postSK          // postSK (sort key of the post entity)
    );

    this.log('info', `User ${this.config.userHandle} commented on post ${this.config.postId}`);

    // Return SeededComment
    return {
      id: result.comment.id,
      userId: this.config.userId,
      userHandle: this.config.userHandle,
      postId: this.config.postId,
      content: result.comment.content,
      createdAt: result.comment.createdAt,
    };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Generate a random comment
   */
  private generateComment(): string {
    const commentTypes = [
      () => faker.lorem.sentence(),
      () => `${faker.lorem.words(3)}! ${faker.lorem.sentence()}`,
      () => faker.word.adjective() + '! ' + faker.lorem.sentences(2),
      () => faker.helpers.arrayElement([
        'Amazing!',
        'Love this!',
        'Great content!',
        'This is awesome!',
        'Well done!',
        'Incredible!',
        'So cool!',
        'Nice work!',
      ]) + ' ' + faker.lorem.sentence(),
    ];

    const generator = faker.helpers.arrayElement(commentTypes);
    let comment = generator();

    // Ensure length is within bounds (1-500 characters)
    if (comment.length > 500) {
      comment = comment.substring(0, 497) + '...';
    }

    return comment;
  }

  // ==========================================================================
  // Static Batch Methods
  // ==========================================================================

  /**
   * Create multiple comments for a post from different users
   *
   * @param users - Array of { userId, handle } objects
   * @param postId - Post ID being commented on
   * @param concurrency - Number of concurrent comment operations (default: 5)
   * @returns Array of SeededComment results
   */
  static async createMany(
    users: Array<{ userId: string; handle: string }>,
    postId: string,
    concurrency: number = 5
  ): Promise<SeededComment[]> {
    const results: SeededComment[] = [];

    // Process in batches to control concurrency
    for (let i = 0; i < users.length; i += concurrency) {
      const batch = users.slice(i, i + concurrency);

      const batchResults = await Promise.all(
        batch.map(user =>
          new CommentBuilder()
            .byUser(user.userId, user.handle)
            .onPost(postId)
            .build()
        )
      );

      results.push(...batchResults);

      console.log(`Created ${results.length}/${users.length} comments for post ${postId}`);
    }

    return results;
  }

  /**
   * Create random comments for multiple posts
   *
   * @param users - Pool of users to randomly select from
   * @param postIds - Array of post IDs to create comments for
   * @param commentsPerPost - Range or fixed number of comments per post
   * @returns Array of SeededComment results
   */
  static async createRandomComments(
    users: Array<{ userId: string; handle: string }>,
    postIds: string[],
    commentsPerPost: number | { min: number; max: number }
  ): Promise<SeededComment[]> {
    const results: SeededComment[] = [];

    for (const postId of postIds) {
      // Determine number of comments for this post
      const count = typeof commentsPerPost === 'number'
        ? commentsPerPost
        : Math.floor(Math.random() * (commentsPerPost.max - commentsPerPost.min + 1)) + commentsPerPost.min;

      // Randomly select users (without replacement)
      const shuffled = [...users].sort(() => Math.random() - 0.5);
      const selectedUsers = shuffled.slice(0, Math.min(count, users.length));

      // Create comments
      const postComments = await CommentBuilder.createMany(selectedUsers, postId);
      results.push(...postComments);
    }

    return results;
  }
}
