import { z } from 'zod';
import {
  UUIDField,
  URLField,
  OptionalCaptionField,
  TagsArrayField,
  OptionalTagsArrayField,
  CountField,
  TimestampField,
  ImageFileTypeField,
  PaginationRequestSchema,
  PaginationResponseSchema,
  SuccessResponseSchema
} from './base.schema.js';

/**
 * Post entity schema
 */
export const PostSchema = z.object({
  id: UUIDField,
  userId: UUIDField,
  userHandle: z.string(),
  imageUrl: URLField,
  thumbnailUrl: URLField,
  caption: OptionalCaptionField,
  tags: TagsArrayField,
  likesCount: CountField,
  commentsCount: CountField,
  isPublic: z.boolean().default(true),
  createdAt: TimestampField,
  updatedAt: TimestampField
});

/**
 * Request schemas
 */
export const CreatePostRequestSchema = z.object({
  caption: OptionalCaptionField,
  tags: OptionalTagsArrayField,
  isPublic: z.boolean().optional(),
  fileType: ImageFileTypeField
});

export const UpdatePostRequestSchema = z.object({
  caption: OptionalCaptionField,
  tags: OptionalTagsArrayField,
  isPublic: z.boolean().optional()
});

export const GetUserPostsRequestSchema = PaginationRequestSchema.extend({
  handle: z.string()
});

export const DeletePostRequestSchema = z.object({
  postId: UUIDField
});

/**
 * Response schemas
 */
export const PostResponseSchema = z.object({
  post: PostSchema
});

export const CreatePostResponseSchema = z.object({
  post: PostSchema,
  uploadUrl: URLField,
  thumbnailUploadUrl: URLField
});

export const PostsListResponseSchema = PaginationResponseSchema.extend({
  posts: z.array(PostSchema)
});

export const DeletePostResponseSchema = SuccessResponseSchema;

/**
 * Post grid item - minimal data for grid display
 */
export const PostGridItemSchema = PostSchema.pick({
  id: true,
  userId: true, // Needed for user diversity in explore page
  userHandle: true, // Needed for user diversity in explore page
  thumbnailUrl: true,
  caption: true,
  likesCount: true,
  commentsCount: true,
  createdAt: true
});

export const PostGridResponseSchema = PaginationResponseSchema.extend({
  posts: z.array(PostGridItemSchema),
  totalCount: z.number().int().nonnegative()
});

/**
 * Post with author information - optimized for feed display
 * Extends Post data with denormalized author fields to avoid N+1 queries
 * This is a view model that combines Post data with author information
 */
export const PostWithAuthorSchema = PostSchema.pick({
  id: true,
  userId: true,
  userHandle: true,
  imageUrl: true, // Full image for feed display (not thumbnail)
  caption: true,
  likesCount: true,
  commentsCount: true,
  createdAt: true
}).extend({
  // Denormalized author data for efficient feed rendering
  authorId: z.string().uuid(),
  authorHandle: z.string(),
  authorFullName: z.string().optional(), // matches profile.fullName
  authorProfilePictureUrl: z.string().url().optional(), // matches profile.profilePictureUrl
  // Feed-specific metadata
  isLiked: z.boolean().optional(),
  source: z.enum(['materialized', 'query-time']).optional(), // Feed item source type
  // Instagram-like read state
  isRead: z.boolean().optional(), // Default: false (unread)
  readAt: z.string().datetime().optional() // ISO timestamp when marked as read
});

/**
 * Type exports
 */
export type Post = z.infer<typeof PostSchema>;
export type PostGridItem = z.infer<typeof PostGridItemSchema>;
export type PostWithAuthor = z.infer<typeof PostWithAuthorSchema>;
export type CreatePostRequest = z.infer<typeof CreatePostRequestSchema>;
export type UpdatePostRequest = z.infer<typeof UpdatePostRequestSchema>;
export type GetUserPostsRequest = z.infer<typeof GetUserPostsRequestSchema>;
export type DeletePostRequest = z.infer<typeof DeletePostRequestSchema>;
export type PostResponse = z.infer<typeof PostResponseSchema>;
export type CreatePostResponse = z.infer<typeof CreatePostResponseSchema>;
export type PostsListResponse = z.infer<typeof PostsListResponseSchema>;
export type PostGridResponse = z.infer<typeof PostGridResponseSchema>;
export type DeletePostResponse = z.infer<typeof DeletePostResponseSchema>;
