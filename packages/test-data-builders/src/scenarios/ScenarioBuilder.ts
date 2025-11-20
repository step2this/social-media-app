/**
 * ScenarioBuilder - Abstract base class for high-level test scenarios
 *
 * Scenario builders compose multiple entity builders to create realistic
 * test scenarios. They provide helper methods and common patterns for
 * building complex test data graphs.
 *
 * @example
 * ```typescript
 * class MyScenario extends ScenarioBuilder<MyResult> {
 *   async build(): Promise<MyResult> {
 *     const users = await this.createUsers(10);
 *     const posts = await this.createPosts(users, 5);
 *     return { users, posts };
 *   }
 * }
 * ```
 */

import type { AwilixContainer } from 'awilix';
import { createBuilderContainer } from '../base/BuilderContainer.js';
import type { BuilderContainer } from '../base/BuilderContainer.js';
import type { SeededUser, SeededPost, Range } from '../types/index.js';
import { UserBuilder } from '../UserBuilder.js';
import { PostBuilder } from '../PostBuilder.js';
import { LikeBuilder } from '../LikeBuilder.js';
import { CommentBuilder } from '../CommentBuilder.js';

// ============================================================================
// Base ScenarioBuilder Class
// ============================================================================

/**
 * Abstract base class for scenario builders
 *
 * Provides common functionality and helper methods for composing
 * entity builders into complex test scenarios.
 */
export abstract class ScenarioBuilder<TResult> {
  /**
   * Awilix container for accessing services (initialized lazily)
   */
  protected container?: AwilixContainer<BuilderContainer>;

  /**
   * Constructor - container will be initialized lazily on first use
   */
  constructor() {
    // Container will be initialized when first needed
  }

  /**
   * Get or initialize the container
   */
  protected async getContainer(): Promise<AwilixContainer<BuilderContainer>> {
    if (!this.container) {
      this.container = await createBuilderContainer();
    }
    return this.container;
  }

  /**
   * Abstract build method that subclasses must implement
   *
   * This is where the scenario logic lives.
   */
  abstract build(): Promise<TResult>;

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Create multiple users
   *
   * @param count - Number of users to create
   * @param options - Optional user configuration
   * @returns Array of created users
   */
  protected async createUsers(
    count: number,
    options?: {
      influencers?: number;
      verified?: boolean;
    }
  ): Promise<SeededUser[]> {
    const users: SeededUser[] = [];

    // Create regular users
    const regularCount = count - (options?.influencers || 0);
    if (regularCount > 0) {
      const builder = new UserBuilder();

      if (options?.verified !== undefined) {
        builder.verified(options.verified);
      }

      const regularUsers = await builder.buildMany(regularCount);
      users.push(...regularUsers);
    }

    // Create influencers
    if (options?.influencers && options.influencers > 0) {
      const influencers = await new UserBuilder()
        .asInfluencer()
        .buildMany(options.influencers);
      users.push(...influencers);
    }

    return users;
  }

  /**
   * Create posts for multiple users
   *
   * @param users - Array of users who will create posts
   * @param postsPerUser - Number of posts per user (can be Range for random)
   * @returns Array of created posts
   */
  protected async createPosts(
    users: SeededUser[],
    postsPerUser: number | Range
  ): Promise<SeededPost[]> {
    const posts: SeededPost[] = [];

    for (const user of users) {
      // Determine number of posts for this user
      const count = typeof postsPerUser === 'number'
        ? postsPerUser
        : Math.floor(Math.random() * (postsPerUser.max - postsPerUser.min + 1)) + postsPerUser.min;

      // Create posts for this user
      const userPosts = await Promise.all(
        Array.from({ length: count }, () =>
          new PostBuilder()
            .byUser(user.id, user.handle)
            .build()
        )
      );

      posts.push(...userPosts);
    }

    return posts;
  }

  /**
   * Create likes for posts
   *
   * @param users - Pool of users who can like posts
   * @param posts - Posts to add likes to
   * @param likesPerPost - Number of likes per post (can be Range for random)
   * @returns Total number of likes created
   */
  protected async createLikes(
    users: SeededUser[],
    posts: SeededPost[],
    likesPerPost: number | Range
  ): Promise<number> {
    let totalLikes = 0;

    for (const post of posts) {
      // Determine number of likes for this post
      const count = typeof likesPerPost === 'number'
        ? likesPerPost
        : Math.floor(Math.random() * (likesPerPost.max - likesPerPost.min + 1)) + likesPerPost.min;

      // Randomly select users (without replacement)
      const shuffled = [...users].sort(() => Math.random() - 0.5);
      const selectedUsers = shuffled.slice(0, Math.min(count, users.length));

      // Create likes
      await LikeBuilder.createMany(
        selectedUsers.map(u => u.id),
        post.id
      );

      totalLikes += selectedUsers.length;
    }

    return totalLikes;
  }

  /**
   * Create comments for posts
   *
   * @param users - Pool of users who can comment
   * @param posts - Posts to add comments to
   * @param commentsPerPost - Number of comments per post (can be Range for random)
   * @returns Total number of comments created
   */
  protected async createComments(
    users: SeededUser[],
    posts: SeededPost[],
    commentsPerPost: number | Range
  ): Promise<number> {
    let totalComments = 0;

    for (const post of posts) {
      // Determine number of comments for this post
      const count = typeof commentsPerPost === 'number'
        ? commentsPerPost
        : Math.floor(Math.random() * (commentsPerPost.max - commentsPerPost.min + 1)) + commentsPerPost.min;

      // Randomly select users (without replacement)
      const shuffled = [...users].sort(() => Math.random() - 0.5);
      const selectedUsers = shuffled.slice(0, Math.min(count, users.length));

      // Create comments
      await CommentBuilder.createMany(
        selectedUsers.map(u => ({ userId: u.id, handle: u.handle })),
        post.id
      );

      totalComments += selectedUsers.length;
    }

    return totalComments;
  }

  /**
   * Create a random subset from an array
   *
   * @param items - Source array
   * @param count - Number of items to select
   * @returns Random subset of items
   */
  protected randomSubset<T>(items: T[], count: number): T[] {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, items.length));
  }

  /**
   * Logging helper
   */
  protected log(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.constructor.name}] ${message}`);
  }
}
