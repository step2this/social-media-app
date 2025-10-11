/* eslint-disable max-lines-per-function */
import { describe, it, expect } from 'vitest';
import {
  mapBasePostFields,
  createPostMapper,
  enrichWithProfile,
  type PostEntity,
  type MapperConfig
} from './post-mappers.js';
import type { Post, PostGridItem, FeedPostItem, Profile } from '@social-media-app/shared';

describe('post-mappers', () => {
  // Sample PostEntity for testing
  const createMockPostEntity = (overrides?: Partial<PostEntity>): PostEntity => ({
    PK: 'USER#user123',
    SK: 'POST#2025-01-01T10:00:00.000Z#post123',
    GSI1PK: 'POST#post123',
    GSI1SK: 'USER#user123',
    id: 'post123',
    userId: 'user123',
    userHandle: 'testuser',
    imageUrl: 'https://example.com/image.jpg',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    caption: 'Test caption',
    tags: ['test', 'photo'],
    likesCount: 10,
    commentsCount: 5,
    isPublic: true,
    createdAt: '2025-01-01T10:00:00.000Z',
    updatedAt: '2025-01-01T10:00:00.000Z',
    entityType: 'POST',
    ...overrides
  });

  const createMockProfile = (overrides?: Partial<Profile>): Profile => ({
    id: 'user123',
    handle: 'testuser',
    email: 'test@example.com',
    fullName: 'Test User',
    bio: 'Test bio',
    profilePictureUrl: 'https://example.com/profile.jpg',
    followersCount: 100,
    followingCount: 50,
    postsCount: 25,
    isPublic: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides
  });

  describe('mapBasePostFields', () => {
    it('should map all base post fields from entity', () => {
      const entity = createMockPostEntity();
      const result = mapBasePostFields(entity);

      expect(result).toEqual({
        id: 'post123',
        userId: 'user123',
        userHandle: 'testuser',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        caption: 'Test caption',
        tags: ['test', 'photo'],
        likesCount: 10,
        commentsCount: 5,
        isPublic: true,
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-01-01T10:00:00.000Z'
      });
    });

    it('should handle entity with undefined caption', () => {
      const entity = createMockPostEntity({ caption: undefined });
      const result = mapBasePostFields(entity);

      expect(result.caption).toBeUndefined();
    });

    it('should handle entity with empty tags array', () => {
      const entity = createMockPostEntity({ tags: [] });
      const result = mapBasePostFields(entity);

      expect(result.tags).toEqual([]);
    });

    it('should handle private posts', () => {
      const entity = createMockPostEntity({ isPublic: false });
      const result = mapBasePostFields(entity);

      expect(result.isPublic).toBe(false);
    });

    it('should handle posts with zero likes and comments', () => {
      const entity = createMockPostEntity({ likesCount: 0, commentsCount: 0 });
      const result = mapBasePostFields(entity);

      expect(result.likesCount).toBe(0);
      expect(result.commentsCount).toBe(0);
    });

    it('should not include DynamoDB keys in result', () => {
      const entity = createMockPostEntity();
      const result = mapBasePostFields(entity);

      expect(result).not.toHaveProperty('PK');
      expect(result).not.toHaveProperty('SK');
      expect(result).not.toHaveProperty('GSI1PK');
      expect(result).not.toHaveProperty('GSI1SK');
      expect(result).not.toHaveProperty('entityType');
    });
  });

  describe('createPostMapper - Post mapping', () => {
    it('should create a mapper that returns Post type', () => {
      const config: MapperConfig = {
        type: 'post',
        additionalFields: []
      };
      const mapper = createPostMapper(config);
      const entity = createMockPostEntity();
      const result = mapper(entity);

      expect(result).toEqual({
        id: 'post123',
        userId: 'user123',
        userHandle: 'testuser',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        caption: 'Test caption',
        tags: ['test', 'photo'],
        likesCount: 10,
        commentsCount: 5,
        isPublic: true,
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-01-01T10:00:00.000Z'
      });
    });
  });

  describe('createPostMapper - PostGridItem mapping', () => {
    it('should create a mapper that returns PostGridItem type', () => {
      const config: MapperConfig = {
        type: 'grid',
        additionalFields: []
      };
      const mapper = createPostMapper(config);
      const entity = createMockPostEntity();
      const result = mapper(entity);

      // PostGridItem should only include specific fields
      expect(result).toEqual({
        id: 'post123',
        userId: 'user123',
        userHandle: 'testuser',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        caption: 'Test caption',
        likesCount: 10,
        commentsCount: 5,
        createdAt: '2025-01-01T10:00:00.000Z'
      });

      // Should not include these fields
      expect(result).not.toHaveProperty('imageUrl');
      expect(result).not.toHaveProperty('isPublic');
      expect(result).not.toHaveProperty('updatedAt');
      expect(result).not.toHaveProperty('tags');
    });

    it('should handle grid item with undefined caption', () => {
      const config: MapperConfig = {
        type: 'grid',
        additionalFields: []
      };
      const mapper = createPostMapper(config);
      const entity = createMockPostEntity({ caption: undefined });
      const result = mapper(entity);

      expect(result.caption).toBeUndefined();
    });
  });

  describe('createPostMapper - FeedPostItem base mapping', () => {
    it('should create a mapper that includes feed item fields', () => {
      const config: MapperConfig = {
        type: 'feed',
        additionalFields: []
      };
      const mapper = createPostMapper(config);
      const entity = createMockPostEntity();
      const result = mapper(entity);

      // FeedPostItem should include full imageUrl, not thumbnail
      expect(result).toMatchObject({
        id: 'post123',
        userId: 'user123',
        userHandle: 'testuser',
        imageUrl: 'https://example.com/image.jpg',
        caption: 'Test caption',
        likesCount: 10,
        commentsCount: 5,
        createdAt: '2025-01-01T10:00:00.000Z',
        authorId: 'user123',
        authorHandle: 'testuser',
        isLiked: false
      });

      // Should not include these fields
      expect(result).not.toHaveProperty('thumbnailUrl');
      expect(result).not.toHaveProperty('isPublic');
      expect(result).not.toHaveProperty('updatedAt');
      expect(result).not.toHaveProperty('tags');
    });
  });

  describe('enrichWithProfile', () => {
    it('should add profile information to feed post item', () => {
      const baseFeedItem: Omit<FeedPostItem, 'authorFullName' | 'authorProfilePictureUrl'> = {
        id: 'post123',
        userId: 'user123',
        userHandle: 'testuser',
        imageUrl: 'https://example.com/image.jpg',
        caption: 'Test caption',
        likesCount: 10,
        commentsCount: 5,
        createdAt: '2025-01-01T10:00:00.000Z',
        authorId: 'user123',
        authorHandle: 'testuser',
        isLiked: false
      };
      const profile = createMockProfile();
      const result = enrichWithProfile(baseFeedItem, profile);

      expect(result).toEqual({
        ...baseFeedItem,
        authorFullName: 'Test User',
        authorProfilePictureUrl: 'https://example.com/profile.jpg'
      });
    });

    it('should handle profile with undefined fullName', () => {
      const baseFeedItem: Omit<FeedPostItem, 'authorFullName' | 'authorProfilePictureUrl'> = {
        id: 'post123',
        userId: 'user123',
        userHandle: 'testuser',
        imageUrl: 'https://example.com/image.jpg',
        caption: 'Test caption',
        likesCount: 10,
        commentsCount: 5,
        createdAt: '2025-01-01T10:00:00.000Z',
        authorId: 'user123',
        authorHandle: 'testuser',
        isLiked: false
      };
      const profile = createMockProfile({ fullName: undefined });
      const result = enrichWithProfile(baseFeedItem, profile);

      expect(result.authorFullName).toBeUndefined();
    });

    it('should handle profile with undefined profilePictureUrl', () => {
      const baseFeedItem: Omit<FeedPostItem, 'authorFullName' | 'authorProfilePictureUrl'> = {
        id: 'post123',
        userId: 'user123',
        userHandle: 'testuser',
        imageUrl: 'https://example.com/image.jpg',
        caption: 'Test caption',
        likesCount: 10,
        commentsCount: 5,
        createdAt: '2025-01-01T10:00:00.000Z',
        authorId: 'user123',
        authorHandle: 'testuser',
        isLiked: false
      };
      const profile = createMockProfile({ profilePictureUrl: undefined });
      const result = enrichWithProfile(baseFeedItem, profile);

      expect(result.authorProfilePictureUrl).toBeUndefined();
    });

    it('should not mutate the original feed item', () => {
      const baseFeedItem: Omit<FeedPostItem, 'authorFullName' | 'authorProfilePictureUrl'> = {
        id: 'post123',
        userId: 'user123',
        userHandle: 'testuser',
        imageUrl: 'https://example.com/image.jpg',
        caption: 'Test caption',
        likesCount: 10,
        commentsCount: 5,
        createdAt: '2025-01-01T10:00:00.000Z',
        authorId: 'user123',
        authorHandle: 'testuser',
        isLiked: false
      };
      const originalItem = { ...baseFeedItem };
      const profile = createMockProfile();
      enrichWithProfile(baseFeedItem, profile);

      expect(baseFeedItem).toEqual(originalItem);
    });
  });

  describe('Edge cases and immutability', () => {
    it('should not mutate the input entity in mapBasePostFields', () => {
      const entity = createMockPostEntity();
      const originalEntity = { ...entity };
      mapBasePostFields(entity);

      expect(entity).toEqual(originalEntity);
    });

    it('should handle entity with large numbers for likesCount', () => {
      const entity = createMockPostEntity({ likesCount: 999999 });
      const result = mapBasePostFields(entity);

      expect(result.likesCount).toBe(999999);
    });

    it('should handle entity with many tags', () => {
      const manyTags = Array.from({ length: 20 }, (_, i) => `tag${i}`);
      const entity = createMockPostEntity({ tags: manyTags });
      const result = mapBasePostFields(entity);

      expect(result.tags).toEqual(manyTags);
      expect(result.tags.length).toBe(20);
    });
  });
});
