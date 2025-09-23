import { z } from 'zod';

/**
 * Post entity schema
 */
export const PostSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  userHandle: z.string(),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url(),
  caption: z.string().max(2200).optional(),
  tags: z.array(z.string().max(50)).max(30).default([]),
  likesCount: z.number().int().nonnegative().default(0),
  commentsCount: z.number().int().nonnegative().default(0),
  isPublic: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

/**
 * Request schemas
 */
export const CreatePostRequestSchema = z.object({
  caption: z.string().max(2200).trim().optional(),
  tags: z.array(z.string().max(50).trim()).max(30).optional(),
  isPublic: z.boolean().optional()
});

export const UpdatePostRequestSchema = z.object({
  caption: z.string().max(2200).trim().optional(),
  tags: z.array(z.string().max(50).trim()).max(30).optional(),
  isPublic: z.boolean().optional()
});

export const GetUserPostsRequestSchema = z.object({
  handle: z.string(),
  limit: z.number().int().positive().max(100).default(24),
  cursor: z.string().optional()
});

export const DeletePostRequestSchema = z.object({
  postId: z.string().uuid()
});

/**
 * Response schemas
 */
export const PostResponseSchema = z.object({
  post: PostSchema
});

export const CreatePostResponseSchema = z.object({
  post: PostSchema,
  uploadUrl: z.string().url(),
  thumbnailUploadUrl: z.string().url()
});

export const PostsListResponseSchema = z.object({
  posts: z.array(PostSchema),
  nextCursor: z.string().optional(),
  hasMore: z.boolean()
});

export const DeletePostResponseSchema = z.object({
  success: z.boolean(),
  message: z.string()
});

/**
 * Post grid item - minimal data for grid display
 */
export const PostGridItemSchema = PostSchema.pick({
  id: true,
  thumbnailUrl: true,
  caption: true,
  likesCount: true,
  commentsCount: true,
  createdAt: true
});

export const PostGridResponseSchema = z.object({
  posts: z.array(PostGridItemSchema),
  nextCursor: z.string().optional(),
  hasMore: z.boolean(),
  totalCount: z.number().int().nonnegative()
});

/**
 * Type exports
 */
export type Post = z.infer<typeof PostSchema>;
export type PostGridItem = z.infer<typeof PostGridItemSchema>;
export type CreatePostRequest = z.infer<typeof CreatePostRequestSchema>;
export type UpdatePostRequest = z.infer<typeof UpdatePostRequestSchema>;
export type GetUserPostsRequest = z.infer<typeof GetUserPostsRequestSchema>;
export type DeletePostRequest = z.infer<typeof DeletePostRequestSchema>;
export type PostResponse = z.infer<typeof PostResponseSchema>;
export type CreatePostResponse = z.infer<typeof CreatePostResponseSchema>;
export type PostsListResponse = z.infer<typeof PostsListResponseSchema>;
export type PostGridResponse = z.infer<typeof PostGridResponseSchema>;
export type DeletePostResponse = z.infer<typeof DeletePostResponseSchema>;