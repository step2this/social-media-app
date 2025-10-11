/* eslint-disable max-lines-per-function */
import { describe, it, expect } from 'vitest';
import {
  mapBaseCommentFields,
  mapEntityToComment,
  type CommentEntity
} from './comment-mappers.js';
import type { Comment } from '@social-media-app/shared';

describe('comment-mappers', () => {
  // Sample CommentEntity for testing
  const createMockCommentEntity = (overrides?: Partial<CommentEntity>): CommentEntity => ({
    PK: 'POST#post123',
    SK: 'COMMENT#2025-01-01T10:00:00.000Z#comment123',
    GSI1PK: 'COMMENT#comment123',
    GSI1SK: 'POST#post123',
    GSI2PK: 'USER#user456',
    GSI2SK: 'COMMENT#2025-01-01T10:00:00.000Z#comment123',
    id: 'comment123',
    postId: 'post123',
    userId: 'user456',
    userHandle: 'testcommenter',
    content: 'This is a test comment',
    createdAt: '2025-01-01T10:00:00.000Z',
    updatedAt: '2025-01-01T10:00:00.000Z',
    entityType: 'COMMENT',
    ...overrides
  });

  describe('mapBaseCommentFields', () => {
    it('should map all base comment fields from entity', () => {
      const entity = createMockCommentEntity();
      const result = mapBaseCommentFields(entity);

      expect(result).toEqual({
        id: 'comment123',
        postId: 'post123',
        userId: 'user456',
        userHandle: 'testcommenter',
        content: 'This is a test comment',
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-01-01T10:00:00.000Z'
      });
    });

    it('should handle comment with single character content', () => {
      const entity = createMockCommentEntity({ content: '!' });
      const result = mapBaseCommentFields(entity);

      expect(result.content).toBe('!');
    });

    it('should handle comment with maximum length content (500 chars)', () => {
      const maxContent = 'a'.repeat(500);
      const entity = createMockCommentEntity({ content: maxContent });
      const result = mapBaseCommentFields(entity);

      expect(result.content).toBe(maxContent);
      expect(result.content.length).toBe(500);
    });

    it('should handle comment with special characters and emojis', () => {
      const specialContent = 'Great post! 👍 @user #tag <html> & "quotes"';
      const entity = createMockCommentEntity({ content: specialContent });
      const result = mapBaseCommentFields(entity);

      expect(result.content).toBe(specialContent);
    });

    it('should not include DynamoDB keys in result', () => {
      const entity = createMockCommentEntity();
      const result = mapBaseCommentFields(entity);

      expect(result).not.toHaveProperty('PK');
      expect(result).not.toHaveProperty('SK');
      expect(result).not.toHaveProperty('GSI1PK');
      expect(result).not.toHaveProperty('GSI1SK');
      expect(result).not.toHaveProperty('GSI2PK');
      expect(result).not.toHaveProperty('GSI2SK');
      expect(result).not.toHaveProperty('entityType');
    });

    it('should handle comment with different timestamps', () => {
      const createdAt = '2025-01-01T10:00:00.000Z';
      const updatedAt = '2025-01-01T12:00:00.000Z';
      const entity = createMockCommentEntity({ createdAt, updatedAt });
      const result = mapBaseCommentFields(entity);

      expect(result.createdAt).toBe(createdAt);
      expect(result.updatedAt).toBe(updatedAt);
    });
  });

  describe('mapEntityToComment', () => {
    it('should map CommentEntity to Comment type', () => {
      const entity = createMockCommentEntity();
      const result: Comment = mapEntityToComment(entity);

      expect(result).toEqual({
        id: 'comment123',
        postId: 'post123',
        userId: 'user456',
        userHandle: 'testcommenter',
        content: 'This is a test comment',
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-01-01T10:00:00.000Z'
      });
    });

    it('should handle comment with unicode characters', () => {
      const unicodeContent = 'Hello 世界 🌍 مرحبا';
      const entity = createMockCommentEntity({ content: unicodeContent });
      const result = mapEntityToComment(entity);

      expect(result.content).toBe(unicodeContent);
    });

    it('should handle comment with newlines and whitespace', () => {
      const multilineContent = 'Line 1\nLine 2\n\nLine 3';
      const entity = createMockCommentEntity({ content: multilineContent });
      const result = mapEntityToComment(entity);

      expect(result.content).toBe(multilineContent);
    });
  });

  describe('Edge cases and immutability', () => {
    it('should not mutate the input entity in mapBaseCommentFields', () => {
      const entity = createMockCommentEntity();
      const originalEntity = { ...entity };
      mapBaseCommentFields(entity);

      expect(entity).toEqual(originalEntity);
    });

    it('should not mutate the input entity in mapEntityToComment', () => {
      const entity = createMockCommentEntity();
      const originalEntity = { ...entity };
      mapEntityToComment(entity);

      expect(entity).toEqual(originalEntity);
    });

    it('should handle comment with very long userHandle', () => {
      const longHandle = 'a'.repeat(30);
      const entity = createMockCommentEntity({ userHandle: longHandle });
      const result = mapEntityToComment(entity);

      expect(result.userHandle).toBe(longHandle);
    });

    it('should create independent Comment objects', () => {
      const entity = createMockCommentEntity();
      const result1 = mapEntityToComment(entity);
      const result2 = mapEntityToComment(entity);

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2); // Different object references
    });
  });
});
