/**
 * GraphQL Resolvers Index
 *
 * Combines all resolver modules into a single resolvers object
 * for the Apollo Server configuration.
 */

import { Query } from './Query.js';
import { Mutation } from './Mutation.js';
import { Profile } from './Profile.js';
import { Post } from './Post.js';
import { Comment } from './Comment.js';

/**
 * Combined resolvers object for Apollo Server
 *
 * Exports all Query, Mutation, and field resolvers for the GraphQL schema.
 * Field resolvers handle computed/relational fields that require additional data fetching:
 * - Profile: isFollowing
 * - Post: author, isLiked
 * - Comment: author
 */
export const resolvers = {
  Query,
  Mutation,
  Profile,
  Post,
  Comment,
};
