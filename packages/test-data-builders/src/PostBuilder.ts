/**
 * PostBuilder - Builder for creating test posts
 *
 * Uses PostService to create posts, which ensures business logic is preserved:
 * - Posts count is incremented on the user's profile
 * - All GSI indexes are properly set
 * - Timestamps and IDs are generated correctly
 *
 * @example
 * ```typescript
 * // Create a single post
 * const post = await new PostBuilder()
 *   .byUser(userId, userHandle)
 *   .withCaption('Amazing sunset!')
 *   .withImage('https://example.com/sunset.jpg')
 *   .build();
 *
 * // Create a viral post with engagement
 * const viralPost = await new PostBuilder()
 *   .byUser(userId, userHandle)
 *   .viral()
 *   .build();
 *
 * // Create multiple posts for a user
 * const posts = await new PostBuilder()
 *   .byUser(userId, userHandle)
 *   .buildMany(10);
 * ```
 */

import { faker } from '@faker-js/faker';
import { BaseBuilder } from './base/BaseBuilder.js';
import { createBuilderContainer } from './base/BuilderContainer.js';
import type { ValidationResult, SeededPost, DeepPartial, Range, isRange } from './types/index.js';
import { PostConfigSchema, type PostConfig } from './types/schemas.js';
import type { PostEntity } from '../../packages/dal/src/utils/index.js';
import type { Post } from '@social-media-app/shared';

// ============================================================================
// PostBuilder Class
// ============================================================================

/**
 * Builder for creating test posts
 *
 * Uses PostService.createPost() to ensure business logic is preserved,
 * particularly the automatic incrementing of the user's posts count.
 *
 * **USES ZOD SCHEMA VALIDATION**
 */
export class PostBuilder extends BaseBuilder<
  PostEntity,
  PostConfig,
  SeededPost
> {
  /**
   * Set Zod schema for validation
   */
  protected schema = PostConfigSchema;
  // ==========================================================================
  // Fluent Configuration Methods
  // ==========================================================================

  /**
   * Set the post author (user ID and handle)
   */
  byUser(userId: string, userHandle: string): this {
    this.config.userId = userId;
    this.config.userHandle = userHandle;
    return this;
  }

  /**
   * Set the post caption
   */
  withCaption(caption: string): this {
    this.config.caption = caption;
    return this;
  }

  /**
   * Set the post image URL
   */
  withImage(imageUrl: string, thumbnailUrl?: string): this {
    this.config.imageUrl = imageUrl;
    this.config.thumbnailUrl = thumbnailUrl || imageUrl;
    return this;
  }

  /**
   * Set the post tags
   */
  withTags(tags: string[]): this {
    this.config.tags = tags;
    return this;
  }

  /**
   * Set post visibility
   */
  public(isPublic: boolean = true): this {
    this.config.isPublic = isPublic;
    return this;
  }

  /**
   * Set likes count (will be created after post using LikeBuilder)
   * Accepts either a specific number or a range for random generation
   */
  withLikes(count: number | Range): this {
    this.config.likesCount = count;
    return this;
  }

  /**
   * Set comments count (will be created after post using CommentBuilder)
   * Accepts either a specific number or a range for random generation
   */
  withComments(count: number | Range): this {
    this.config.commentsCount = count;
    return this;
  }

  // ==========================================================================
  // Preset Methods
  // ==========================================================================

  /**
   * Configure as a viral post with high engagement
   */
  viral(): this {
    this.config.isViral = true;
    this.config.likesCount = { min: 100, max: 500 };
    this.config.commentsCount = { min: 20, max: 50 };
    this.config.caption = this.generateViralCaption();
    this.config.tags = this.generateTrendingTags();
    return this;
  }

  /**
   * Configure as a trending post (recent + popular)
   */
  trending(): this {
    this.config.isTrending = true;
    this.config.likesCount = { min: 50, max: 150 };
    this.config.commentsCount = { min: 10, max: 30 };
    this.config.tags = this.generateTrendingTags();
    return this;
  }

  // ==========================================================================
  // Validation
  // ==========================================================================

  /**
   * Validate post configuration
   *
   * Requires userId and userHandle to be present.
   * imageUrl is optional since it can be auto-generated.
   */
  protected async validate(): Promise<ValidationResult> {
    const errors = this.validateRequired({
      userId: this.config.userId,
      userHandle: this.config.userHandle,
    });

    // Validate image URL format if provided
    if (this.config.imageUrl && !this.isValidUrl(this.config.imageUrl)) {
      errors.push(this.validationError(
        'imageUrl',
        'Invalid image URL format',
        this.config.imageUrl
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
   * Build the post entity
   *
   * Uses PostService.createPost() to ensure business logic is preserved:
   * - User's postsCount is incremented
   * - All DynamoDB keys and indexes are set correctly
   * - Timestamps are generated
   */
  protected async buildInternal(): Promise<SeededPost> {
    const container = await createBuilderContainer();
    const postService = container.resolve('postService');

    // Validate required fields are present
    if (!this.config.userId || !this.config.userHandle) {
      throw new Error('userId and userHandle are required for post creation');
    }

    // Generate defaults for missing fields
    const caption = this.config.caption ?? this.generateCaption();
    const imageUrl = this.config.imageUrl || this.generateImageUrl();
    const thumbnailUrl = this.config.thumbnailUrl || imageUrl;
    const tags = this.config.tags ?? this.generateTags();
    const isPublic = this.config.isPublic ?? true;

    // Create post via PostService (preserves business logic!)
    const post: Post = await postService.createPost(
      this.config.userId,
      this.config.userHandle,
      {
        fileType: 'image/jpeg', // Default to JPEG for test data
        caption,
        tags,
        isPublic,
      },
      imageUrl,
      thumbnailUrl
    );

    this.log('info', `Created post: ${post.id} by ${this.config.userHandle}`);

    // Note: Engagement (likes/comments) will be created in Phase 3
    // using LikeBuilder and CommentBuilder after the post is created
    // This is deferred to avoid circular dependencies

    // Return SeededPost
    return {
      id: post.id,
      userId: post.userId,
      userHandle: post.userHandle,
      caption: post.caption ?? '',
      imageUrl: post.imageUrl,
      thumbnailUrl: post.thumbnailUrl,
      tags: post.tags,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      isPublic: post.isPublic,
      createdAt: post.createdAt,
    };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a random caption
   */
  private generateCaption(): string {
    const captionTypes = [
      () => faker.lorem.sentence(),
      () => `${faker.lorem.sentence()} ${this.generateHashtags(3).join(' ')}`,
      () => faker.lorem.paragraph(1),
    ];

    const generator = faker.helpers.arrayElement(captionTypes);
    return generator();
  }

  /**
   * Generate a viral-style caption
   */
  private generateViralCaption(): string {
    const viralPhrases = [
      "You won't believe this! 😱",
      "This changed everything... 🤯",
      "Wait for it... 🔥",
      "Best day ever! ✨",
      "I can't even... 💯",
      "Mind. Blown. 🚀",
    ];

    const phrase = faker.helpers.arrayElement(viralPhrases);
    const hashtags = this.generateTrendingTags().map(t => `#${t}`).join(' ');
    return `${phrase} ${hashtags}`;
  }

  /**
   * Generate hashtags
   */
  private generateHashtags(count: number): string[] {
    return Array.from({ length: count }, () =>
      '#' + faker.word.adjective().toLowerCase()
    );
  }

  /**
   * Generate random tags (without # prefix, as stored in DB)
   */
  private generateTags(): string[] {
    const count = faker.number.int({ min: 0, max: 5 });
    return Array.from({ length: count }, () =>
      faker.word.adjective().toLowerCase()
    );
  }

  /**
   * Generate trending tags
   */
  private generateTrendingTags(): string[] {
    const trending = [
      'viral',
      'trending',
      'instagood',
      'photooftheday',
      'amazing',
      'beautiful',
      'instadaily',
      'lifestyle',
      'travel',
      'photography',
    ];

    const count = faker.number.int({ min: 3, max: 5 });
    return faker.helpers.shuffle(trending).slice(0, count);
  }

  /**
   * Generate a random image URL
   */
  private generateImageUrl(): string {
    // Use Lorem Picsum for realistic placeholder images
    const width = 800;
    const height = 800;
    const imageId = faker.number.int({ min: 1, max: 1000 });
    return `https://picsum.photos/id/${imageId}/${width}/${height}`;
  }

  /**
   * Resolve a count value (could be a number or a Range)
   */
  private resolveCount(count: number | Range | undefined): number {
    if (count === undefined) return 0;
    if (typeof count === 'number') return count;
    // It's a Range
    return faker.number.int({ min: count.min, max: count.max });
  }
}
