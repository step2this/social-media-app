import { z } from 'zod';
import {
  PaginationRequestSchema,
  PaginationResponseSchema
} from './base.schema.js';
import { FeedPostItemSchema } from './post.schema.js';

/**
 * Feed request schema - for fetching the explore/feed page
 * Reuses pagination pattern from base schema
 */
export const FeedRequestSchema = PaginationRequestSchema.extend({
  // Could add filters here in the future (e.g., tags, user preferences)
});

/**
 * Feed response schema
 * Returns FeedPostItem array (with full images and author info)
 * Includes pagination metadata and total count
 */
export const FeedResponseSchema = PaginationResponseSchema.extend({
  posts: z.array(FeedPostItemSchema),
  totalCount: z.number().int().nonnegative().optional(),
  source: z.enum(['materialized', 'query-time', 'hybrid']).optional()
});

/**
 * Type exports
 */
export type FeedRequest = z.infer<typeof FeedRequestSchema>;
export type FeedResponse = z.infer<typeof FeedResponseSchema>;
