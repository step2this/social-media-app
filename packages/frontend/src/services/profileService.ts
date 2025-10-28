/**
 * Profile Service Barrel Export
 * Re-exports the profile service implementation with lazy initialization
 */

import { ProfileServiceGraphQL } from './implementations/ProfileService.graphql.js';
import { createGraphQLClient } from '../graphql/client.js';

// Private singleton instance
let _profileService: ProfileServiceGraphQL | null = null;

/**
 * Get profile service instance (lazy initialization)
 * Creates instance on first access with GraphQL client
 */
export function getProfileService(): ProfileServiceGraphQL {
  if (!_profileService) {
    _profileService = new ProfileServiceGraphQL(createGraphQLClient());
  }
  return _profileService;
}

/**
 * Set profile service instance (for testing)
 * Allows injection of mock service
 */
export function setProfileService(service: ProfileServiceGraphQL): void {
  _profileService = service;
}

/**
 * Reset profile service instance (for testing)
 * Clears singleton for cleanup between tests
 */
export function resetProfileService(): void {
  _profileService = null;
}

/**
 * Profile service instance (backwards compatible)
 * Uses Proxy to delegate to lazy singleton
 */
export const profileService = new Proxy({} as ProfileServiceGraphQL, {
  get(_target, prop) {
    const instance = getProfileService();
    const value = instance[prop as keyof ProfileServiceGraphQL];
    // Bind methods to preserve 'this' context
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});
