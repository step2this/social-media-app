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
// PageInfo is automatically created by Relay plugin via builder.connectionObject()

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
 * FeedConnection Type - Using Relay Plugin
 *
 * Replaces manual FeedEdge and FeedConnection definitions.
 * The Relay plugin automatically creates both Connection and Edge types
 * with proper Relay spec compliance.
 *
 * Benefits over manual implementation:
 * - ✅ Eliminates ~40 lines of boilerplate
 * - ✅ Automatic cursor encoding/decoding
 * - ✅ Standardized PageInfo structure
 * - ✅ Relay spec compliance
 * - ✅ Type-safe connection handling
 */
export const FeedConnectionType = builder.connectionObject({
  type: FeedItemType,
  name: 'FeedConnection',
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
