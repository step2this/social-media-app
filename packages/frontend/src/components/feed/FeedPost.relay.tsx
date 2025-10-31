/**
 * FeedPost Relay Fragment
 *
 * This file defines a Relay fragment for a single post in the feed.
 * Fragments are reusable data requirements that can be composed into queries.
 *
 * Benefits of Relay Fragments:
 * - Colocation: Data requirements live next to components that use them
 * - Reusability: Same fragment used by HomePage and ExplorePage
 * - Type Safety: Auto-generated TypeScript types from schema
 * - Automatic Updates: When fragment changes, all queries update
 *
 * Pattern from Phase 2 of Relay Migration Plan
 */

import { graphql } from 'react-relay';

/**
 * Fragment for a single post in the feed
 *
 * This fragment declares all the data needed to render a post.
 * It's used by both the home feed (following) and explore feed queries.
 *
 * The fragment includes:
 * - Post metadata (id, caption, timestamps)
 * - Media (imageUrl, thumbnailUrl)
 * - Engagement metrics (likes, comments, isLiked)
 * - Author information (nested fragment)
 */
export const FeedPostFragment = graphql`
  fragment FeedPost_post on Post {
    id
    userId
    caption
    imageUrl
    thumbnailUrl
    likesCount
    commentsCount
    isLiked
    createdAt
    updatedAt
    author {
      id
      handle
      username
      fullName
      profilePictureUrl
    }
  }
`;
