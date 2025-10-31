/**
 * Feed Service Barrel Export
 * Re-exports the feed service implementation with lazy initialization
 *
 * ⚠️ MIGRATION IN PROGRESS
 *
 * Status:
 * - ✅ HomePage: Migrated to Relay (HomePage.relay.tsx)
 * - ✅ ExplorePage: Migrated to Relay (ExplorePage.relay.tsx)
 * - ❌ DevManualMarkButton: Still uses this service (DevManualMarkButton.tsx) - dev tool
 * - ❌ useFeedItemAutoRead: Still uses this service (useFeedItemAutoRead.ts) - auto-read feature
 *
 * TODO: Migrate remaining components to Relay mutations, then delete this file
 *
 * See: GRAPHQL_SERVICES_DEPENDENCY_MAP.md
 */

import { FeedServiceGraphQL } from './implementations/FeedService.graphql.js';
import { getGraphQLClient } from '../graphql/clientManager.js';

// Private singleton instance
let _feedService: FeedServiceGraphQL | null = null;

/**
 * Get feed service instance (lazy initialization)
 * Creates instance on first access with GraphQL client
 */
export function getFeedService(): FeedServiceGraphQL {
    if (!_feedService) {
        _feedService = new FeedServiceGraphQL(getGraphQLClient());
    }
    return _feedService;
}

/**
 * Set feed service instance (for testing)
 * Allows injection of mock service
 */
export function setFeedService(service: FeedServiceGraphQL): void {
    _feedService = service;
}

/**
 * Reset feed service instance (for testing)
 * Clears singleton for cleanup between tests
 */
export function resetFeedService(): void {
    _feedService = null;
}

/**
 * Feed service instance (backwards compatible)
 * Uses Proxy to delegate to lazy singleton
 */
export const feedService = new Proxy({} as FeedServiceGraphQL, {
    get(_target, prop) {
        const instance = getFeedService();
        const value = instance[prop as keyof FeedServiceGraphQL];
        // Bind methods to preserve 'this' context
        if (typeof value === 'function') {
            return value.bind(instance);
        }
        return value;
    }
});
