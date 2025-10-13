/**
 * @fileoverview Kinesis event schemas for feed event streaming
 * @module schemas/kinesis-events
 */

import { z } from 'zod';
import { UUIDField } from './base.schema.js';

/**
 * Base event schema that all feed events extend
 */
const BaseEventSchema = z.object({
  /** Unique identifier for this event */
  eventId: UUIDField,
  /** ISO 8601 timestamp when event occurred */
  timestamp: z.string().datetime(),
  /** Discriminator field for event type */
  eventType: z.string(),
  /** Event schema version for backwards compatibility */
  version: z.literal('1.0')
});

/**
 * Event emitted when a new post is created
 */
export const PostCreatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('POST_CREATED'),
  /** ID of the created post */
  postId: UUIDField,
  /** ID of the post author */
  authorId: UUIDField,
  /** Username/handle of the post author */
  authorHandle: z.string().min(1),
  /** Optional post caption text */
  caption: z.string().optional(),
  /** Optional image URL for the post */
  imageUrl: z.string().url().optional(),
  /** Whether the post is publicly visible */
  isPublic: z.boolean(),
  /** ISO 8601 timestamp when post was created */
  createdAt: z.string().datetime()
});

/**
 * Event emitted when a user reads/views a post
 */
export const PostReadEventSchema = BaseEventSchema.extend({
  eventType: z.literal('POST_READ'),
  /** ID of the user who read the post */
  userId: UUIDField,
  /** ID of the post that was read */
  postId: UUIDField,
  /** Optional DynamoDB keys if read from feed */
  feedItemKey: z.object({
    PK: z.string(),
    SK: z.string()
  }).optional()
});

/**
 * Event emitted when a user likes or unlikes a post
 */
export const PostLikedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('POST_LIKED'),
  /** ID of the user who liked/unliked */
  userId: UUIDField,
  /** ID of the post that was liked/unliked */
  postId: UUIDField,
  /** true = liked, false = unliked */
  liked: z.boolean()
});

/**
 * Event emitted when a post is deleted
 */
export const PostDeletedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('POST_DELETED'),
  /** ID of the deleted post */
  postId: UUIDField,
  /** ID of the post author */
  authorId: UUIDField
});

/**
 * Discriminated union of all possible feed events
 */
export const FeedEventSchema = z.discriminatedUnion('eventType', [
  PostCreatedEventSchema,
  PostReadEventSchema,
  PostLikedEventSchema,
  PostDeletedEventSchema
]);

// TypeScript type exports
export type PostCreatedEvent = z.infer<typeof PostCreatedEventSchema>;
export type PostReadEvent = z.infer<typeof PostReadEventSchema>;
export type PostLikedEvent = z.infer<typeof PostLikedEventSchema>;
export type PostDeletedEvent = z.infer<typeof PostDeletedEventSchema>;
export type FeedEvent = z.infer<typeof FeedEventSchema>;

/**
 * Event type constants for type-safe event handling
 */
export const EventTypes = {
  POST_CREATED: 'POST_CREATED',
  POST_READ: 'POST_READ',
  POST_LIKED: 'POST_LIKED',
  POST_DELETED: 'POST_DELETED'
} as const;

export type EventType = keyof typeof EventTypes;