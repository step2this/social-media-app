/**
 * Comment Service Barrel Export
 * Re-exports the comment service implementation for easy imports
 */

import { CommentServiceGraphQL } from './implementations/CommentService.graphql.js';
import { createGraphQLClient } from '../graphql/client.js';

// Create singleton instance with GraphQL client
export const commentService = new CommentServiceGraphQL(createGraphQLClient());
