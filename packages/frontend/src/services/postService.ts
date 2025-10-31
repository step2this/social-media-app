/**
 * Post Service Barrel Export
 * Re-exports the post service implementation with lazy initialization
 *
 * ⚠️ MIGRATION IN PROGRESS
 *
 * Status:
 * - ✅ PostDetailPage: Migrated to Relay (PostDetailPage.relay.tsx)
 * - ❌ CreatePost: Still uses this service (createPostAction.ts)
 *
 * TODO: Migrate createPostAction to Relay mutation, then delete this file
 *
 * See: GRAPHQL_SERVICES_DEPENDENCY_MAP.md
 */

import { PostServiceGraphQL } from './implementations/PostService.graphql.js';
import { createGraphQLClient } from '../graphql/client.js';

// Private singleton instance
let _postService: PostServiceGraphQL | null = null;

/**
 * Get post service instance (lazy initialization)
 * Creates instance on first access with GraphQL client
 */
export function getPostService(): PostServiceGraphQL {
  if (!_postService) {
    _postService = new PostServiceGraphQL(createGraphQLClient());
  }
  return _postService;
}

/**
 * Set post service instance (for testing)
 * Allows injection of mock service
 */
export function setPostService(service: PostServiceGraphQL): void {
  _postService = service;
}

/**
 * Reset post service instance (for testing)
 * Clears singleton for cleanup between tests
 */
export function resetPostService(): void {
  _postService = null;
}

/**
 * Post service instance (backwards compatible)
 * Uses Proxy to delegate to lazy singleton
 */
export const postService = new Proxy({} as PostServiceGraphQL, {
  get(_target, prop) {
    const instance = getPostService();
    const value = instance[prop as keyof PostServiceGraphQL];
    // Bind methods to preserve 'this' context
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});
