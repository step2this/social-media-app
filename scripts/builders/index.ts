/**
 * Entity Builders - Barrel Export
 * 
 * Centralized exports for all entity builders in the test data builder system.
 * Import builders from this file for clean, maintainable test data creation.
 * 
 * @example
 * ```typescript
 * import { UserBuilder, PostBuilder, LikeBuilder } from './scripts/builders';
 * 
 * // Create a user
 * const user = await new UserBuilder().build();
 * 
 * // Create a post for that user
 * const post = await new PostBuilder()
 *   .byUser(user.id, user.handle)
 *   .build();
 * 
 * // Add likes to the post
 * await LikeBuilder.createMany([userId1, userId2], post.id);
 * ```
 */

// Entity Builders
export { UserBuilder } from './UserBuilder.js';
export type { UserConfig } from './UserBuilder.js';

export { PostBuilder } from './PostBuilder.js';
export type { PostConfig } from './PostBuilder.js';

export { LikeBuilder } from './LikeBuilder.js';
export type { LikeConfig } from './LikeBuilder.js';

export { CommentBuilder } from './CommentBuilder.js';
export type { CommentConfig } from './CommentBuilder.js';

export { FollowBuilder } from './FollowBuilder.js';
export type { FollowConfig } from './FollowBuilder.js';

// Scenario Builders
export * from './scenarios/index.js';

// Base Infrastructure
export { BaseBuilder } from './base/BaseBuilder.js';
export { createBuilderContainer } from './base/BuilderContainer.js';
export type { BuilderContainer, BuilderContainerConfig } from './base/BuilderContainer.js';

// Types
export * from './types/index.js';
