/* eslint-disable max-lines-per-function */
import { describe, it, expect } from 'vitest';
import {
  buildUpdateExpression,
  createFieldUpdate,
  type FieldUpdate,
  type UpdateExpressionResult
} from './update-expression-builder.js';

describe('update-expression-builder', () => {
  describe('createFieldUpdate', () => {
    it('should create SET field update', () => {
      const update = createFieldUpdate('caption', 'New caption');

      expect(update).toEqual({
        field: 'caption',
        value: 'New caption',
        operation: 'SET'
      });
    });

    it('should create SET field update with explicit operation', () => {
      const update = createFieldUpdate('caption', 'New caption', 'SET');

      expect(update).toEqual({
        field: 'caption',
        value: 'New caption',
        operation: 'SET'
      });
    });

    it('should create ADD field update', () => {
      const update = createFieldUpdate('likesCount', 1, 'ADD');

      expect(update).toEqual({
        field: 'likesCount',
        value: 1,
        operation: 'ADD'
      });
    });

    it('should create REMOVE field update', () => {
      const update = createFieldUpdate('deletedAt', undefined, 'REMOVE');

      expect(update).toEqual({
        field: 'deletedAt',
        value: undefined,
        operation: 'REMOVE'
      });
    });
  });

  describe('buildUpdateExpression - Single field updates', () => {
    it('should build expression for single SET field', () => {
      const updates: FieldUpdate[] = [
        { field: 'caption', value: 'Updated caption', operation: 'SET' }
      ];

      const result = buildUpdateExpression(updates);

      expect(result).toEqual({
        UpdateExpression: 'SET #caption = :caption',
        ExpressionAttributeNames: {
          '#caption': 'caption'
        },
        ExpressionAttributeValues: {
          ':caption': 'Updated caption'
        }
      });
    });

    it('should build expression for single ADD field', () => {
      const updates: FieldUpdate[] = [
        { field: 'likesCount', value: 1, operation: 'ADD' }
      ];

      const result = buildUpdateExpression(updates);

      expect(result).toEqual({
        UpdateExpression: 'ADD #likesCount :likesCount',
        ExpressionAttributeNames: {
          '#likesCount': 'likesCount'
        },
        ExpressionAttributeValues: {
          ':likesCount': 1
        }
      });
    });

    it('should build expression for single REMOVE field', () => {
      const updates: FieldUpdate[] = [
        { field: 'deletedAt', value: undefined, operation: 'REMOVE' }
      ];

      const result = buildUpdateExpression(updates);

      expect(result).toEqual({
        UpdateExpression: 'REMOVE #deletedAt',
        ExpressionAttributeNames: {
          '#deletedAt': 'deletedAt'
        },
        ExpressionAttributeValues: {}
      });
    });
  });

  describe('buildUpdateExpression - Multiple field updates', () => {
    it('should build expression for multiple SET fields', () => {
      const updates: FieldUpdate[] = [
        { field: 'caption', value: 'New caption', operation: 'SET' },
        { field: 'isPublic', value: false, operation: 'SET' },
        { field: 'updatedAt', value: '2025-01-01T10:00:00.000Z', operation: 'SET' }
      ];

      const result = buildUpdateExpression(updates);

      expect(result.UpdateExpression).toBe('SET #caption = :caption, #isPublic = :isPublic, #updatedAt = :updatedAt');
      expect(result.ExpressionAttributeNames).toEqual({
        '#caption': 'caption',
        '#isPublic': 'isPublic',
        '#updatedAt': 'updatedAt'
      });
      expect(result.ExpressionAttributeValues).toEqual({
        ':caption': 'New caption',
        ':isPublic': false,
        ':updatedAt': '2025-01-01T10:00:00.000Z'
      });
    });

    it('should build expression with mixed operations', () => {
      const updates: FieldUpdate[] = [
        { field: 'caption', value: 'Updated', operation: 'SET' },
        { field: 'likesCount', value: 1, operation: 'ADD' },
        { field: 'deletedAt', value: undefined, operation: 'REMOVE' }
      ];

      const result = buildUpdateExpression(updates);

      expect(result.UpdateExpression).toBe('SET #caption = :caption ADD #likesCount :likesCount REMOVE #deletedAt');
      expect(result.ExpressionAttributeNames).toEqual({
        '#caption': 'caption',
        '#likesCount': 'likesCount',
        '#deletedAt': 'deletedAt'
      });
      expect(result.ExpressionAttributeValues).toEqual({
        ':caption': 'Updated',
        ':likesCount': 1
      });
    });

    it('should handle multiple ADD operations', () => {
      const updates: FieldUpdate[] = [
        { field: 'likesCount', value: 1, operation: 'ADD' },
        { field: 'commentsCount', value: 1, operation: 'ADD' }
      ];

      const result = buildUpdateExpression(updates);

      expect(result.UpdateExpression).toBe('ADD #likesCount :likesCount, #commentsCount :commentsCount');
      expect(result.ExpressionAttributeNames).toEqual({
        '#likesCount': 'likesCount',
        '#commentsCount': 'commentsCount'
      });
      expect(result.ExpressionAttributeValues).toEqual({
        ':likesCount': 1,
        ':commentsCount': 1
      });
    });

    it('should handle multiple REMOVE operations', () => {
      const updates: FieldUpdate[] = [
        { field: 'field1', value: undefined, operation: 'REMOVE' },
        { field: 'field2', value: undefined, operation: 'REMOVE' }
      ];

      const result = buildUpdateExpression(updates);

      expect(result.UpdateExpression).toBe('REMOVE #field1, #field2');
      expect(result.ExpressionAttributeNames).toEqual({
        '#field1': 'field1',
        '#field2': 'field2'
      });
      expect(result.ExpressionAttributeValues).toEqual({});
    });
  });

  describe('buildUpdateExpression - Reserved keywords', () => {
    it('should handle DynamoDB reserved keyword as field name', () => {
      const updates: FieldUpdate[] = [
        { field: 'status', value: 'active', operation: 'SET' }
      ];

      const result = buildUpdateExpression(updates);

      // All fields should use attribute names to avoid reserved words
      expect(result.UpdateExpression).toBe('SET #status = :status');
      expect(result.ExpressionAttributeNames).toEqual({
        '#status': 'status'
      });
    });

    it('should handle multiple reserved keywords', () => {
      const updates: FieldUpdate[] = [
        { field: 'status', value: 'active', operation: 'SET' },
        { field: 'data', value: { key: 'value' }, operation: 'SET' }
      ];

      const result = buildUpdateExpression(updates);

      expect(result.ExpressionAttributeNames).toEqual({
        '#status': 'status',
        '#data': 'data'
      });
    });
  });

  describe('buildUpdateExpression - Edge cases', () => {
    it('should handle empty updates array', () => {
      const updates: FieldUpdate[] = [];

      const result = buildUpdateExpression(updates);

      expect(result).toEqual({
        UpdateExpression: '',
        ExpressionAttributeNames: {},
        ExpressionAttributeValues: {}
      });
    });

    it('should handle null values', () => {
      const updates: FieldUpdate[] = [
        { field: 'caption', value: null, operation: 'SET' }
      ];

      const result = buildUpdateExpression(updates);

      expect(result.ExpressionAttributeValues[':caption']).toBeNull();
    });

    it('should handle array values', () => {
      const tags = ['tag1', 'tag2', 'tag3'];
      const updates: FieldUpdate[] = [
        { field: 'tags', value: tags, operation: 'SET' }
      ];

      const result = buildUpdateExpression(updates);

      expect(result.ExpressionAttributeValues[':tags']).toEqual(tags);
    });

    it('should handle object values', () => {
      const metadata = { views: 100, shares: 5 };
      const updates: FieldUpdate[] = [
        { field: 'metadata', value: metadata, operation: 'SET' }
      ];

      const result = buildUpdateExpression(updates);

      expect(result.ExpressionAttributeValues[':metadata']).toEqual(metadata);
    });

    it('should handle boolean false value', () => {
      const updates: FieldUpdate[] = [
        { field: 'isPublic', value: false, operation: 'SET' }
      ];

      const result = buildUpdateExpression(updates);

      expect(result.ExpressionAttributeValues[':isPublic']).toBe(false);
    });

    it('should handle zero numeric value', () => {
      const updates: FieldUpdate[] = [
        { field: 'likesCount', value: 0, operation: 'SET' }
      ];

      const result = buildUpdateExpression(updates);

      expect(result.ExpressionAttributeValues[':likesCount']).toBe(0);
    });

    it('should handle empty string value', () => {
      const updates: FieldUpdate[] = [
        { field: 'caption', value: '', operation: 'SET' }
      ];

      const result = buildUpdateExpression(updates);

      expect(result.ExpressionAttributeValues[':caption']).toBe('');
    });
  });

  describe('Immutability', () => {
    it('should not mutate input updates array', () => {
      const updates: FieldUpdate[] = [
        { field: 'caption', value: 'Test', operation: 'SET' }
      ];
      const originalUpdates = JSON.parse(JSON.stringify(updates));

      buildUpdateExpression(updates);

      expect(updates).toEqual(originalUpdates);
    });
  });
});
