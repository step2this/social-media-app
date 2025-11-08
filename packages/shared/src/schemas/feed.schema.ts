import { z } from 'zod';
import {
  PaginationRequestSchema,
  PaginationResponseSchema
} from './base.schema.js';
import { PostWithAuthorSchema } from './post.schema.js';

/**
 * Feed request schema - for fetching the explore/feed page
 * Reuses pagination pattern from base schema
 */
export const FeedRequestSchema = PaginationRequestSchema.extend({
  // Could add filters here in the future (e.g., tags, user preferences)
});

/**
 * Feed response schema
 * Returns PostWithAuthor array (with full images and author info)
 * Includes pagination metadata and total count
 */
export const FeedResponseSchema = PaginationResponseSchema.extend({
  posts: z.array(PostWithAuthorSchema),
  totalCount: z.number().int().nonnegative().optional(),
  source: z.enum(['materialized', 'query-time', 'hybrid']).optional()
});

/**
 * Mark feed items as read request schema
 * Instagram-like behavior: posts marked as read never appear again
 */
export const MarkFeedItemsAsReadRequestSchema = z.object({
  postIds: z.array(z.string().uuid()).min(0).max(50) // Max 50 posts per request
});

/**
 * Mark feed items as read response schema
 */
export const MarkFeedItemsAsReadResponseSchema = z.object({
  success: z.boolean(),
  markedCount: z.number().int().nonnegative()
});

/**
 * Type exports
 */
export type FeedRequest = z.infer<typeof FeedRequestSchema>;
export type FeedResponse = z.infer<typeof FeedResponseSchema>;
export type MarkFeedItemsAsReadRequest = z.infer<typeof MarkFeedItemsAsReadRequestSchema>;
export type MarkFeedItemsAsReadResponse = z.infer<typeof MarkFeedItemsAsReadResponseSchema>;
