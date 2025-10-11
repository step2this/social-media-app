import { describe, it, expect } from 'vitest';
import {
  CommentSchema,
  CreateCommentRequestSchema,
  DeleteCommentRequestSchema,
  GetCommentsRequestSchema,
  CreateCommentResponseSchema,
  DeleteCommentResponseSchema,
  CommentsListResponseSchema
} from './comment.schema.js';

describe('Comment Schemas', () => {
  describe('CommentSchema', () => {
    it('should validate a complete comment', () => {
      const validComment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        postId: '123e4567-e89b-12d3-a456-426614174001',
        userId: '123e4567-e89b-12d3-a456-426614174002',
        userHandle: 'johndoe',
        content: 'This is a great post!',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = CommentSchema.parse(validComment);
      expect(result).toMatchObject(validComment);
    });

    it('should reject comment with empty content', () => {
      const invalidComment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        postId: '123e4567-e89b-12d3-a456-426614174001',
        userId: '123e4567-e89b-12d3-a456-426614174002',
        userHandle: 'johndoe',
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(() => CommentSchema.parse(invalidComment)).toThrow();
    });

    it('should reject comment exceeding 500 characters', () => {
      const longContent = 'a'.repeat(501);
      const invalidComment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        postId: '123e4567-e89b-12d3-a456-426614174001',
        userId: '123e4567-e89b-12d3-a456-426614174002',
        userHandle: 'johndoe',
        content: longContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(() => CommentSchema.parse(invalidComment)).toThrow();
    });

    it('should accept comment with exactly 500 characters', () => {
      const maxContent = 'a'.repeat(500);
      const validComment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        postId: '123e4567-e89b-12d3-a456-426614174001',
        userId: '123e4567-e89b-12d3-a456-426614174002',
        userHandle: 'johndoe',
        content: maxContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = CommentSchema.parse(validComment);
      expect(result.content).toBe(maxContent);
    });

    it('should accept comment with special characters and emojis', () => {
      const specialContent = 'Great post! 👍 @user #tag <html> & "quotes"';
      const validComment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        postId: '123e4567-e89b-12d3-a456-426614174001',
        userId: '123e4567-e89b-12d3-a456-426614174002',
        userHandle: 'johndoe',
        content: specialContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = CommentSchema.parse(validComment);
      expect(result.content).toBe(specialContent);
    });

    it('should trim whitespace from content', () => {
      const contentWithWhitespace = '  Nice post!  ';
      const validComment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        postId: '123e4567-e89b-12d3-a456-426614174001',
        userId: '123e4567-e89b-12d3-a456-426614174002',
        userHandle: 'johndoe',
        content: contentWithWhitespace,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = CommentSchema.parse(validComment);
      expect(result.content).toBe('Nice post!');
    });
  });

  describe('CreateCommentRequestSchema', () => {
    it('should validate valid create request', () => {
      const validRequest = {
        postId: '123e4567-e89b-12d3-a456-426614174001',
        content: 'This is a great post!'
      };

      const result = CreateCommentRequestSchema.parse(validRequest);
      expect(result).toMatchObject(validRequest);
    });

    it('should reject request with invalid postId', () => {
      const invalidRequest = {
        postId: 'not-a-uuid',
        content: 'Great post!'
      };

      expect(() => CreateCommentRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject request with missing content', () => {
      const invalidRequest = {
        postId: '123e4567-e89b-12d3-a456-426614174001'
      };

      expect(() => CreateCommentRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject request with empty content', () => {
      const invalidRequest = {
        postId: '123e4567-e89b-12d3-a456-426614174001',
        content: ''
      };

      expect(() => CreateCommentRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject request with content too long', () => {
      const longContent = 'a'.repeat(501);
      const invalidRequest = {
        postId: '123e4567-e89b-12d3-a456-426614174001',
        content: longContent
      };

      expect(() => CreateCommentRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('DeleteCommentRequestSchema', () => {
    it('should validate valid delete request', () => {
      const validRequest = {
        commentId: '123e4567-e89b-12d3-a456-426614174000'
      };

      const result = DeleteCommentRequestSchema.parse(validRequest);
      expect(result).toMatchObject(validRequest);
    });

    it('should reject request with invalid commentId', () => {
      const invalidRequest = {
        commentId: 'not-a-uuid'
      };

      expect(() => DeleteCommentRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('GetCommentsRequestSchema', () => {
    it('should validate request with postId only', () => {
      const validRequest = {
        postId: '123e4567-e89b-12d3-a456-426614174001'
      };

      const result = GetCommentsRequestSchema.parse(validRequest);
      expect(result).toMatchObject(validRequest);
    });

    it('should validate request with pagination params', () => {
      const validRequest = {
        postId: '123e4567-e89b-12d3-a456-426614174001',
        limit: 20,
        cursor: 'some-cursor-token'
      };

      const result = GetCommentsRequestSchema.parse(validRequest);
      expect(result).toMatchObject(validRequest);
    });

    it('should reject request with invalid postId', () => {
      const invalidRequest = {
        postId: 'not-a-uuid'
      };

      expect(() => GetCommentsRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('CreateCommentResponseSchema', () => {
    it('should validate valid create response', () => {
      const validResponse = {
        comment: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          postId: '123e4567-e89b-12d3-a456-426614174001',
          userId: '123e4567-e89b-12d3-a456-426614174002',
          userHandle: 'johndoe',
          content: 'Great post!',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        commentsCount: 5
      };

      const result = CreateCommentResponseSchema.parse(validResponse);
      expect(result).toMatchObject(validResponse);
    });
  });

  describe('DeleteCommentResponseSchema', () => {
    it('should validate valid delete response', () => {
      const validResponse = {
        success: true,
        message: 'Comment deleted successfully'
      };

      const result = DeleteCommentResponseSchema.parse(validResponse);
      expect(result).toMatchObject(validResponse);
    });
  });

  describe('CommentsListResponseSchema', () => {
    it('should validate response with empty comments array', () => {
      const validResponse = {
        comments: [],
        totalCount: 0,
        hasMore: false
      };

      const result = CommentsListResponseSchema.parse(validResponse);
      expect(result).toMatchObject(validResponse);
    });

    it('should validate response with multiple comments', () => {
      const validResponse = {
        comments: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            postId: '123e4567-e89b-12d3-a456-426614174001',
            userId: '123e4567-e89b-12d3-a456-426614174002',
            userHandle: 'johndoe',
            content: 'First comment',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174003',
            postId: '123e4567-e89b-12d3-a456-426614174001',
            userId: '123e4567-e89b-12d3-a456-426614174004',
            userHandle: 'janedoe',
            content: 'Second comment',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        totalCount: 2,
        hasMore: false
      };

      const result = CommentsListResponseSchema.parse(validResponse);
      expect(result.comments).toHaveLength(2);
      expect(result.totalCount).toBe(2);
    });

    it('should validate response with pagination cursor', () => {
      const validResponse = {
        comments: [],
        totalCount: 100,
        hasMore: true,
        nextCursor: 'next-page-token'
      };

      const result = CommentsListResponseSchema.parse(validResponse);
      expect(result.nextCursor).toBe('next-page-token');
      expect(result.hasMore).toBe(true);
    });
  });
});
