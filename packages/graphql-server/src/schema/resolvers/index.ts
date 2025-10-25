/**
 * GraphQL Resolvers Index
 *
 * Combines all resolver modules into a single resolvers object
 * for the Apollo Server configuration.
 */

import { Query } from './Query.js';
import { Mutation } from './Mutation.js';
import { Profile, PublicProfile } from './Profile.js';
import { Post } from './Post.js';
import { Comment } from './Comment.js';
import { Auction } from './Auction.js';

/**
 * Combined resolvers object for Apollo Server
 *
 * Exports all Query, Mutation, and field resolvers for the GraphQL schema.
 * Field resolvers handle computed/relational fields that require additional data fetching:
 * - Profile: (authenticated user's own profile - no custom resolvers)
 * - PublicProfile: isFollowing (viewing other users)
 * - Post: author, isLiked
 * - Comment: author
 * - Auction: seller, winner
 */
export const resolvers = {
  Query,
  Mutation,
  Profile,
  PublicProfile,
  Post,
  Comment,
  Auction,
};
