/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect } from 'vitest';
import {
  parsePKEntity,
  parseSKEntity,
  calculateCounterDelta,
  createUpdateExpression,
  getStreamRecordImage,
  shouldProcessRecord,
  type ParsedEntity,
  type UpdateExpressionResult
} from './stream-counter-helpers.js';
import type { DynamoDBRecord } from 'aws-lambda';

describe('stream-counter-helpers', () => {
  describe('parsePKEntity', () => {
    it('should parse USER entity from PK', () => {
      const result = parsePKEntity('USER#123');
      expect(result).toEqual({
        entityType: 'USER',
        id: '123'
      });
    });

    it('should parse POST entity from PK', () => {
      const result = parsePKEntity('POST#456');
      expect(result).toEqual({
        entityType: 'POST',
        id: '456'
      });
    });

    it('should parse entity with complex ID containing hyphens', () => {
      const result = parsePKEntity('USER#abc-123-def-456');
      expect(result).toEqual({
        entityType: 'USER',
        id: 'abc-123-def-456'
      });
    });

    it('should handle entity with UUID ID', () => {
      const result = parsePKEntity('POST#550e8400-e29b-41d4-a716-446655440000');
      expect(result).toEqual({
        entityType: 'POST',
        id: '550e8400-e29b-41d4-a716-446655440000'
      });
    });

    it('should return null for invalid PK format (no delimiter)', () => {
      const result = parsePKEntity('INVALIDPK');
      expect(result).toBeNull();
    });

    it('should return null for PK with missing ID', () => {
      const result = parsePKEntity('USER#');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parsePKEntity('');
      expect(result).toBeNull();
    });
  });

  describe('parseSKEntity', () => {
    it('should parse FOLLOW entity from SK', () => {
      const result = parseSKEntity('FOLLOW#123');
      expect(result).toEqual({
        entityType: 'FOLLOW',
        id: '123'
      });
    });

    it('should parse LIKE entity from SK', () => {
      const result = parseSKEntity('LIKE#456');
      expect(result).toEqual({
        entityType: 'LIKE',
        id: '456'
      });
    });

    it('should parse POST entity from SK', () => {
      const result = parseSKEntity('POST');
      expect(result).toEqual({
        entityType: 'POST',
        id: ''
      });
    });

    it('should parse PROFILE entity from SK', () => {
      const result = parseSKEntity('PROFILE');
      expect(result).toEqual({
        entityType: 'PROFILE',
        id: ''
      });
    });

    it('should handle entity with complex ID', () => {
      const result = parseSKEntity('FOLLOW#user-xyz-789');
      expect(result).toEqual({
        entityType: 'FOLLOW',
        id: 'user-xyz-789'
      });
    });

    it('should return null for empty string', () => {
      const result = parseSKEntity('');
      expect(result).toBeNull();
    });
  });

  describe('calculateCounterDelta', () => {
    it('should return 1 for INSERT event', () => {
      const delta = calculateCounterDelta('INSERT', {}, null);
      expect(delta).toBe(1);
    });

    it('should return -1 for REMOVE event', () => {
      const delta = calculateCounterDelta('REMOVE', null, {});
      expect(delta).toBe(-1);
    });

    it('should return 0 for MODIFY event', () => {
      const delta = calculateCounterDelta('MODIFY', {}, {});
      expect(delta).toBe(0);
    });

    it('should return 0 for unknown event type', () => {
      const delta = calculateCounterDelta('UNKNOWN' as any, {}, {});
      expect(delta).toBe(0);
    });

    it('should return 1 for INSERT even with null newImage', () => {
      const delta = calculateCounterDelta('INSERT', null, null);
      expect(delta).toBe(1);
    });

    it('should return -1 for REMOVE even with null oldImage', () => {
      const delta = calculateCounterDelta('REMOVE', null, null);
      expect(delta).toBe(-1);
    });
  });

  describe('createUpdateExpression', () => {
    it('should create ADD expression for positive delta', () => {
      const result = createUpdateExpression('likesCount', 1);
      expect(result).toEqual({
        UpdateExpression: 'ADD likesCount :delta',
        ExpressionAttributeValues: {
          ':delta': 1
        }
      });
    });

    it('should create ADD expression for negative delta', () => {
      const result = createUpdateExpression('followersCount', -1);
      expect(result).toEqual({
        UpdateExpression: 'ADD followersCount :delta',
        ExpressionAttributeValues: {
          ':delta': -1
        }
      });
    });

    it('should create ADD expression for zero delta', () => {
      const result = createUpdateExpression('count', 0);
      expect(result).toEqual({
        UpdateExpression: 'ADD count :delta',
        ExpressionAttributeValues: {
          ':delta': 0
        }
      });
    });

    it('should handle different counter field names', () => {
      const result = createUpdateExpression('followingCount', 1);
      expect(result).toEqual({
        UpdateExpression: 'ADD followingCount :delta',
        ExpressionAttributeValues: {
          ':delta': 1
        }
      });
    });

    it('should handle large positive deltas', () => {
      const result = createUpdateExpression('count', 100);
      expect(result).toEqual({
        UpdateExpression: 'ADD count :delta',
        ExpressionAttributeValues: {
          ':delta': 100
        }
      });
    });

    it('should handle large negative deltas', () => {
      const result = createUpdateExpression('count', -100);
      expect(result).toEqual({
        UpdateExpression: 'ADD count :delta',
        ExpressionAttributeValues: {
          ':delta': -100
        }
      });
    });
  });

  describe('getStreamRecordImage', () => {
    const mockRecord: DynamoDBRecord = {
      eventID: 'test-id',
      eventName: 'INSERT',
      eventVersion: '1.1',
      eventSource: 'aws:dynamodb',
      awsRegion: 'us-east-1',
      dynamodb: {
        Keys: { PK: { S: 'TEST#123' } },
        NewImage: {
          PK: { S: 'USER#123' },
          SK: { S: 'FOLLOW#456' }
        },
        OldImage: {
          PK: { S: 'USER#123' },
          SK: { S: 'FOLLOW#456' }
        },
        SequenceNumber: '123',
        SizeBytes: 100,
        StreamViewType: 'NEW_AND_OLD_IMAGES'
      }
    };

    it('should return NewImage for INSERT event', () => {
      const image = getStreamRecordImage(mockRecord);
      expect(image).toBe(mockRecord.dynamodb?.NewImage);
    });

    it('should return OldImage for REMOVE event', () => {
      const removeRecord = { ...mockRecord, eventName: 'REMOVE' as const };
      const image = getStreamRecordImage(removeRecord);
      expect(image).toBe(mockRecord.dynamodb?.OldImage);
    });

    it('should return NewImage for MODIFY event', () => {
      const modifyRecord = { ...mockRecord, eventName: 'MODIFY' as const };
      const image = getStreamRecordImage(modifyRecord);
      expect(image).toBe(mockRecord.dynamodb?.NewImage);
    });

    it('should return null when dynamodb is undefined', () => {
      const noDbRecord = { ...mockRecord, dynamodb: undefined };
      const image = getStreamRecordImage(noDbRecord);
      expect(image).toBeNull();
    });

    it('should return null when NewImage is missing for INSERT', () => {
      const noImageRecord: DynamoDBRecord = {
        ...mockRecord,
        dynamodb: {
          ...mockRecord.dynamodb!,
          NewImage: undefined
        }
      };
      const image = getStreamRecordImage(noImageRecord);
      expect(image).toBeNull();
    });

    it('should return null when OldImage is missing for REMOVE', () => {
      const noImageRecord: DynamoDBRecord = {
        ...mockRecord,
        eventName: 'REMOVE',
        dynamodb: {
          ...mockRecord.dynamodb!,
          OldImage: undefined
        }
      };
      const image = getStreamRecordImage(noImageRecord);
      expect(image).toBeNull();
    });
  });

  describe('shouldProcessRecord', () => {
    it('should process INSERT event', () => {
      const result = shouldProcessRecord('INSERT');
      expect(result).toBe(true);
    });

    it('should process REMOVE event', () => {
      const result = shouldProcessRecord('REMOVE');
      expect(result).toBe(true);
    });

    it('should not process MODIFY event', () => {
      const result = shouldProcessRecord('MODIFY');
      expect(result).toBe(false);
    });

    it('should not process undefined event', () => {
      const result = shouldProcessRecord(undefined as any);
      expect(result).toBe(false);
    });

    it('should not process null event', () => {
      const result = shouldProcessRecord(null as any);
      expect(result).toBe(false);
    });

    it('should not process unknown event type', () => {
      const result = shouldProcessRecord('UNKNOWN' as any);
      expect(result).toBe(false);
    });
  });

  describe('type exports', () => {
    it('should export ParsedEntity type', () => {
      const entity: ParsedEntity = {
        entityType: 'USER',
        id: '123'
      };
      expect(entity.entityType).toBe('USER');
      expect(entity.id).toBe('123');
    });

    it('should export UpdateExpressionResult type', () => {
      const result: UpdateExpressionResult = {
        UpdateExpression: 'ADD count :delta',
        ExpressionAttributeValues: {
          ':delta': 1
        }
      };
      expect(result.UpdateExpression).toBe('ADD count :delta');
      expect(result.ExpressionAttributeValues).toEqual({ ':delta': 1 });
    });
  });
});
