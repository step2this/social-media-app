/**
 * Follow Service Barrel Export
 * Re-exports the follow service implementation for easy imports
 */

import { FollowServiceGraphQL } from './implementations/FollowService.graphql.js';
import { createGraphQLClient } from '../graphql/client.js';

// Create singleton instance with GraphQL client
export const followService = new FollowServiceGraphQL(createGraphQLClient());
