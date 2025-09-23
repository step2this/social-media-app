import { describe, it, expect } from 'vitest';
import {
  PostSchema,
  CreatePostRequestSchema,
  UpdatePostRequestSchema,
  GetUserPostsRequestSchema,
  DeletePostRequestSchema,
  PostGridItemSchema
} from './post.schema.js';

describe('Post Schemas', () => {
  describe('PostSchema', () => {
    it('should validate a complete post', () => {
      const validPost = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        userHandle: 'johndoe',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        caption: 'My first post',
        tags: ['photo', 'nature'],
        likesCount: 10,
        commentsCount: 5,
        isPublic: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = PostSchema.parse(validPost);
      expect(result).toMatchObject(validPost);
    });

    it('should set default values', () => {
      const minimalPost = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        userHandle: 'johndoe',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = PostSchema.parse(minimalPost);
      expect(result.tags).toEqual([]);
      expect(result.likesCount).toBe(0);
      expect(result.commentsCount).toBe(0);
      expect(result.isPublic).toBe(true);
    });

    it('should reject invalid URLs', () => {
      const invalidPost = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        userHandle: 'johndoe',
        imageUrl: 'not-a-url',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(() => PostSchema.parse(invalidPost)).toThrow();
    });
  });

  describe('CreatePostRequestSchema', () => {
    it('should validate valid create request', () => {
      const validRequest = {
        caption: 'My new post',
        tags: ['photo', 'sunset'],
        isPublic: true
      };

      const result = CreatePostRequestSchema.parse(validRequest);
      expect(result).toMatchObject(validRequest);
    });

    it('should accept empty request', () => {
      const emptyRequest = {};
      const result = CreatePostRequestSchema.parse(emptyRequest);
      expect(result).toEqual({});
    });

    it('should reject caption that is too long', () => {
      const request = {
        caption: 'a'.repeat(2201)
      };
      expect(() => CreatePostRequestSchema.parse(request)).toThrow();
    });

    it('should reject too many tags', () => {
      const request = {
        tags: Array(31).fill('tag')
      };
      expect(() => CreatePostRequestSchema.parse(request)).toThrow();
    });

    it('should reject tags that are too long', () => {
      const request = {
        tags: ['a'.repeat(51)]
      };
      expect(() => CreatePostRequestSchema.parse(request)).toThrow();
    });

    it('should trim caption and tags', () => {
      const request = {
        caption: '  My post  ',
        tags: ['  photo  ', '  nature  ']
      };
      const result = CreatePostRequestSchema.parse(request);
      expect(result.caption).toBe('My post');
      expect(result.tags).toEqual(['photo', 'nature']);
    });
  });

  describe('UpdatePostRequestSchema', () => {
    it('should validate valid update request', () => {
      const validRequest = {
        caption: 'Updated caption',
        tags: ['updated', 'tags'],
        isPublic: false
      };

      const result = UpdatePostRequestSchema.parse(validRequest);
      expect(result).toMatchObject(validRequest);
    });

    it('should accept partial updates', () => {
      const partialRequest = { caption: 'New caption' };
      const result = UpdatePostRequestSchema.parse(partialRequest);
      expect(result).toMatchObject({ caption: 'New caption' });
    });

    it('should accept empty object for no updates', () => {
      const emptyRequest = {};
      const result = UpdatePostRequestSchema.parse(emptyRequest);
      expect(result).toEqual({});
    });
  });

  describe('GetUserPostsRequestSchema', () => {
    it('should validate valid request', () => {
      const validRequest = {
        handle: 'johndoe',
        limit: 50,
        cursor: 'abc123'
      };

      const result = GetUserPostsRequestSchema.parse(validRequest);
      expect(result).toMatchObject(validRequest);
    });

    it('should set default limit', () => {
      const request = { handle: 'johndoe' };
      const result = GetUserPostsRequestSchema.parse(request);
      expect(result.limit).toBe(24);
    });

    it('should reject limit that is too high', () => {
      const request = {
        handle: 'johndoe',
        limit: 101
      };
      expect(() => GetUserPostsRequestSchema.parse(request)).toThrow();
    });

    it('should reject negative limit', () => {
      const request = {
        handle: 'johndoe',
        limit: -1
      };
      expect(() => GetUserPostsRequestSchema.parse(request)).toThrow();
    });
  });

  describe('DeletePostRequestSchema', () => {
    it('should validate valid delete request', () => {
      const validRequest = {
        postId: '123e4567-e89b-12d3-a456-426614174000'
      };

      const result = DeletePostRequestSchema.parse(validRequest);
      expect(result).toMatchObject(validRequest);
    });

    it('should reject invalid UUID', () => {
      const request = { postId: 'not-a-uuid' };
      expect(() => DeletePostRequestSchema.parse(request)).toThrow();
    });
  });

  describe('PostGridItemSchema', () => {
    it('should pick only grid-relevant fields', () => {
      const fullPost = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        userHandle: 'johndoe',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        caption: 'My post',
        tags: ['photo'],
        likesCount: 10,
        commentsCount: 5,
        isPublic: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const gridItem = PostGridItemSchema.parse(fullPost);

      // Should include grid fields
      expect(gridItem).toHaveProperty('id');
      expect(gridItem).toHaveProperty('thumbnailUrl');
      expect(gridItem).toHaveProperty('caption');
      expect(gridItem).toHaveProperty('likesCount');
      expect(gridItem).toHaveProperty('commentsCount');
      expect(gridItem).toHaveProperty('createdAt');

      // Should NOT include other fields
      expect(gridItem).not.toHaveProperty('userId');
      expect(gridItem).not.toHaveProperty('userHandle');
      expect(gridItem).not.toHaveProperty('imageUrl');
      expect(gridItem).not.toHaveProperty('tags');
      expect(gridItem).not.toHaveProperty('isPublic');
      expect(gridItem).not.toHaveProperty('updatedAt');
    });
  });
});