/**
 * Like Service Barrel Export
 * Re-exports the like service implementation with lazy initialization
 *
 * ⚠️ MIGRATION PENDING
 *
 * Status:
 * - ❌ useLike: Still uses this service (useLike.ts hook)
 *
 * TODO: Migrate useLike to Relay mutations, then delete this file
 *
 * See: GRAPHQL_SERVICES_DEPENDENCY_MAP.md
 */

import { LikeServiceGraphQL } from './implementations/LikeService.graphql.js';
import { createGraphQLClient } from '../graphql/client.js';

// Private singleton instance
let _likeService: LikeServiceGraphQL | null = null;

/**
 * Get like service instance (lazy initialization)
 * Creates instance on first access with GraphQL client
 */
export function getLikeService(): LikeServiceGraphQL {
  if (!_likeService) {
    _likeService = new LikeServiceGraphQL(createGraphQLClient());
  }
  return _likeService;
}

/**
 * Set like service instance (for testing)
 * Allows injection of mock service
 */
export function setLikeService(service: LikeServiceGraphQL): void {
  _likeService = service;
}

/**
 * Reset like service instance (for testing)
 * Clears singleton for cleanup between tests
 */
export function resetLikeService(): void {
  _likeService = null;
}

/**
 * Like service instance (backwards compatible)
 * Uses Proxy to delegate to lazy singleton
 */
export const likeService = new Proxy({} as LikeServiceGraphQL, {
  get(_target, prop) {
    const instance = getLikeService();
    const value = instance[prop as keyof LikeServiceGraphQL];
    // Bind methods to preserve 'this' context
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});
