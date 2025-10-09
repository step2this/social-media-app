import { z } from 'zod';
import {
  PaginationRequestSchema,
  PaginationResponseSchema
} from './base.schema.js';
import { PostGridItemSchema } from './post.schema.js';

/**
 * Feed request schema - for fetching the explore/feed page
 * Reuses pagination pattern from base schema
 */
export const FeedRequestSchema = PaginationRequestSchema.extend({
  // Could add filters here in the future (e.g., tags, user preferences)
});

/**
 * Feed response schema
 * Returns PostGridItem array (reusing existing schema)
 * Includes pagination metadata and total count
 */
export const FeedResponseSchema = PaginationResponseSchema.extend({
  posts: z.array(PostGridItemSchema),
  totalCount: z.number().int().nonnegative().optional()
});

/**
 * Type exports
 */
export type FeedRequest = z.infer<typeof FeedRequestSchema>;
export type FeedResponse = z.infer<typeof FeedResponseSchema>;
