/**
 * Feed Types - Pothos Implementation
 *
 * This file defines all feed-related GraphQL types using Pothos.
 *
 * Types Defined:
 * - FeedItem: Individual feed item with post and read status
 * - FeedEdge: Relay-style edge for pagination
 * - FeedConnection: Relay-style paginated feed items
 * - MarkFeedReadResponse: Response for marking feed items as read
 *
 * Note: Feed queries (exploreFeed, followingFeed) return PostConnection
 * which is already defined in posts.ts, so we reference it from there.
 */

import { builder } from '../builder.js';
import { PostType, PageInfoType } from './posts.js';

/**
 * FeedItem Type (DAL)
 *
 * Represents an item in a user's personalized feed.
 * Contains the post and metadata about when it was read.
 */
type FeedItemFromDAL = {
  id: string;
  post: {
    id: string;
    userId: string;
    caption?: string;
    imageUrl: string;
    thumbnailUrl: string;
    likesCount: number;
    commentsCount: number;
    createdAt: string;
    updatedAt: string;
  };
  readAt?: string;
  createdAt: string;
};

/**
 * FeedEdge Type (DAL)
 *
 * Relay-style edge for FeedItem pagination.
 */
type FeedEdgeFromDAL = {
  cursor: string;
  node: FeedItemFromDAL;
};

/**
 * FeedConnection Type (DAL)
 *
 * Relay-style paginated feed items.
 */
type FeedConnectionFromDAL = {
  edges: FeedEdgeFromDAL[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
};

/**
 * MarkFeedReadResponse Type (DAL)
 *
 * Response from markFeedItemsAsRead mutation.
 */
type MarkFeedReadResponseFromDAL = {
  updatedCount: number;
};

// ============================================================================
// GraphQL Type Definitions
// ============================================================================

/**
 * FeedItem GraphQL Type
 *
 * Individual feed item containing a post and read status.
 */
export const FeedItemType = builder.objectRef<FeedItemFromDAL>('FeedItem');

FeedItemType.implement({
  fields: (t) => ({
    id: t.exposeID('id', {
      description: 'Unique identifier for the feed item',
    }),
    post: t.field({
      type: PostType,
      description: 'The post in this feed item',
      resolve: (parent) => parent.post,
    }),
    readAt: t.exposeString('readAt', {
      nullable: true,
      description: 'Timestamp when the item was marked as read (ISO 8601)',
    }),
    createdAt: t.exposeString('createdAt', {
      description: 'Timestamp when the item was added to the feed (ISO 8601)',
    }),
  }),
});

/**
 * FeedEdge GraphQL Type
 *
 * Relay-style edge for FeedItem pagination.
 */
export const FeedEdgeType = builder.objectRef<FeedEdgeFromDAL>('FeedEdge');

FeedEdgeType.implement({
  fields: (t) => ({
    cursor: t.exposeString('cursor', {
      description: 'Cursor for pagination',
    }),
    node: t.field({
      type: FeedItemType,
      description: 'The feed item',
      resolve: (parent) => parent.node,
    }),
  }),
});

/**
 * FeedConnection GraphQL Type
 *
 * Relay-style paginated feed items.
 */
export const FeedConnectionType = builder.objectRef<FeedConnectionFromDAL>('FeedConnection');

FeedConnectionType.implement({
  fields: (t) => ({
    edges: t.field({
      type: [FeedEdgeType],
      description: 'List of feed item edges',
      resolve: (parent) => parent.edges,
    }),
    pageInfo: t.field({
      type: PageInfoType,
      description: 'Pagination information',
      resolve: (parent) => parent.pageInfo,
    }),
  }),
});

/**
 * MarkFeedReadResponse GraphQL Type
 *
 * Response from marking feed items as read.
 */
export const MarkFeedReadResponseType = builder.objectRef<MarkFeedReadResponseFromDAL>('MarkFeedReadResponse');

MarkFeedReadResponseType.implement({
  fields: (t) => ({
    updatedCount: t.exposeInt('updatedCount', {
      description: 'Number of feed items marked as read',
    }),
  }),
});
