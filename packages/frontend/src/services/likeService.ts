/**
 * Like Service Barrel Export
 * Re-exports the like service implementation for easy imports
 */

import { LikeServiceGraphQL } from './implementations/LikeService.graphql.js';
import { createGraphQLClient } from '../graphql/client.js';

// Create singleton instance with GraphQL client
export const likeService = new LikeServiceGraphQL(createGraphQLClient());
