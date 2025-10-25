/**
 * Post Service Barrel Export
 * Re-exports the post service implementation for easy imports
 */

import { PostServiceGraphQL } from './implementations/PostService.graphql.js';
import { createGraphQLClient } from '../graphql/client.js';

// Create singleton instance with GraphQL client
export const postService = new PostServiceGraphQL(createGraphQLClient());
