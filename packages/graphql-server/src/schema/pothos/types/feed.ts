/**
 * Feed Types - Pothos Implementation
 *
 * This file defines all feed-related GraphQL types using Pothos.
 *
 * Key Benefits:
 * - ✅ Type-safe: TypeScript types flow into GraphQL schema
 * - ✅ No type adapters: Schema matches DAL types exactly
 * - ✅ Field resolvers co-located with type definition
 * - ✅ Refactoring: Rename a field = schema updates automatically
 */

import { builder } from '../builder.js';
import { PostType } from './posts.js';
import { PageInfoType } from './comments.js';

/**
 * FeedItem Type
 *
 * Represents an item in a user's personalized feed.
 * Contains a post reference and metadata about when it was seen.
 */
export const FeedItemType = builder.objectRef<any>('FeedItem');

FeedItemType.implement({
  fields: (t) => ({
    id: t.exposeID('id', {
      description: 'Unique identifier for the feed item',
    }),
    post: t.field({
      type: PostType,
      description: 'The post in this feed item',
      resolve: (parent: any) => parent.post,
    }),
    readAt: t.exposeString('readAt', {
      nullable: true,
      description: 'When the feed item was marked as read (ISO 8601)',
    }),
    createdAt: t.exposeString('createdAt', {
      description: 'When the feed item was added to the feed (ISO 8601)',
    }),
  }),
});

/**
 * FeedEdge Type
 *
 * Edge type for Relay-style cursor pagination.
 */
export const FeedEdgeType = builder.objectRef<any>('FeedEdge');

FeedEdgeType.implement({
  fields: (t) => ({
    cursor: t.exposeString('cursor', {
      description: 'Cursor for pagination',
    }),
    node: t.field({
      type: FeedItemType,
      description: 'The feed item node',
      resolve: (parent: any) => parent.node,
    }),
  }),
});

/**
 * FeedConnection Type
 *
 * Relay-style connection for paginated feed items.
 */
export const FeedConnectionType = builder.objectRef<any>('FeedConnection');

FeedConnectionType.implement({
  fields: (t) => ({
    edges: t.field({
      type: [FeedEdgeType],
      description: 'List of feed item edges',
      resolve: (parent: any) => parent.edges,
    }),
    pageInfo: t.field({
      type: PageInfoType,
      description: 'Pagination information',
      resolve: (parent: any) => parent.pageInfo,
    }),
  }),
});

/**
 * MarkFeedReadResponse Type
 *
 * Response type for markFeedItemsAsRead mutation.
 * Returns the number of feed items that were marked as read.
 */
export const MarkFeedReadResponseType = builder.objectRef<any>('MarkFeedReadResponse');

MarkFeedReadResponseType.implement({
  fields: (t) => ({
    updatedCount: t.exposeInt('updatedCount', {
      description: 'Number of feed items marked as read',
    }),
  }),
});
