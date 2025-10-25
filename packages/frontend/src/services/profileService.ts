/**
 * Profile Service Barrel Export
 * Re-exports the profile service implementation for easy imports
 */

import { ProfileServiceGraphQL } from './implementations/ProfileService.graphql.js';
import { createGraphQLClient } from '../graphql/client.js';

// Create singleton instance with GraphQL client
export const profileService = new ProfileServiceGraphQL(createGraphQLClient());
