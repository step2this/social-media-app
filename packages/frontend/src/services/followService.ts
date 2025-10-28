/**
 * Follow Service Barrel Export
 * Re-exports the follow service implementation with lazy initialization
 */

import { FollowServiceGraphQL } from './implementations/FollowService.graphql.js';
import { createGraphQLClient } from '../graphql/client.js';

// Private singleton instance
let _followService: FollowServiceGraphQL | null = null;

/**
 * Get follow service instance (lazy initialization)
 * Creates instance on first access with GraphQL client
 */
export function getFollowService(): FollowServiceGraphQL {
  if (!_followService) {
    _followService = new FollowServiceGraphQL(createGraphQLClient());
  }
  return _followService;
}

/**
 * Set follow service instance (for testing)
 * Allows injection of mock service
 */
export function setFollowService(service: FollowServiceGraphQL): void {
  _followService = service;
}

/**
 * Reset follow service instance (for testing)
 * Clears singleton for cleanup between tests
 */
export function resetFollowService(): void {
  _followService = null;
}

/**
 * Follow service instance (backwards compatible)
 * Uses Proxy to delegate to lazy singleton
 */
export const followService = new Proxy({} as FollowServiceGraphQL, {
  get(_target, prop) {
    const instance = getFollowService();
    const value = instance[prop as keyof FollowServiceGraphQL];
    // Bind methods to preserve 'this' context
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});
