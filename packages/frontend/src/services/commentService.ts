/**
 * Comment Service Barrel Export
 * Re-exports the comment service implementation with lazy initialization
 *
 * ⚠️ MIGRATION PENDING
 *
 * Status:
 * - ❌ CommentItem: Still uses this service (CommentItem.tsx)
 * - ❌ CommentForm: Still uses this service (CommentForm.tsx)
 * - ❌ CommentList: Still uses this service (CommentList.tsx)
 *
 * TODO: Migrate comment components to Relay, then delete this file
 *
 * See: GRAPHQL_SERVICES_DEPENDENCY_MAP.md
 */

import { CommentServiceGraphQL } from './implementations/CommentService.graphql.js';
import { createGraphQLClient } from '../graphql/client.js';

// Private singleton instance
let _commentService: CommentServiceGraphQL | null = null;

/**
 * Get comment service instance (lazy initialization)
 * Creates instance on first access with GraphQL client
 */
export function getCommentService(): CommentServiceGraphQL {
  if (!_commentService) {
    _commentService = new CommentServiceGraphQL(createGraphQLClient());
  }
  return _commentService;
}

/**
 * Set comment service instance (for testing)
 * Allows injection of mock service
 */
export function setCommentService(service: CommentServiceGraphQL): void {
  _commentService = service;
}

/**
 * Reset comment service instance (for testing)
 * Clears singleton for cleanup between tests
 */
export function resetCommentService(): void {
  _commentService = null;
}

/**
 * Comment service instance (backwards compatible)
 * Uses Proxy to delegate to lazy singleton
 */
export const commentService = new Proxy({} as CommentServiceGraphQL, {
  get(_target, prop) {
    const instance = getCommentService();
    const value = instance[prop as keyof CommentServiceGraphQL];
    // Bind methods to preserve 'this' context
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});
