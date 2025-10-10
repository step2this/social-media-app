/**
 * Pure helper functions for DynamoDB stream counter processors
 *
 * This module provides reusable, testable functions for:
 * - Parsing DynamoDB partition and sort keys
 * - Calculating counter deltas from stream events
 * - Creating DynamoDB update expressions
 * - Filtering stream records
 */

import type { DynamoDBRecord } from 'aws-lambda';
import type { AttributeValue } from '@aws-sdk/client-dynamodb';

/**
 * Parsed entity with type and ID extracted from a key
 */
export interface ParsedEntity {
  entityType: string;
  id: string;
}

/**
 * DynamoDB UpdateExpression with attribute values
 */
export interface UpdateExpressionResult {
  UpdateExpression: string;
  ExpressionAttributeValues: Record<string, number>;
}

/**
 * Parse an entity type and ID from a DynamoDB partition key
 *
 * @param pk - Partition key in format "ENTITY_TYPE#id" (e.g., "USER#123", "POST#456")
 * @returns Parsed entity with type and ID, or null if invalid format
 *
 * @example
 * parsePKEntity('USER#123') // { entityType: 'USER', id: '123' }
 * parsePKEntity('POST#abc-def-123') // { entityType: 'POST', id: 'abc-def-123' }
 * parsePKEntity('INVALID') // null
 */
export const parsePKEntity = (pk: string): ParsedEntity | null => {
  if (!pk || pk.trim() === '') {
    return null;
  }

  const delimiterIndex = pk.indexOf('#');

  // No delimiter found
  if (delimiterIndex === -1) {
    return null;
  }

  const entityType = pk.substring(0, delimiterIndex);
  const id = pk.substring(delimiterIndex + 1);

  // Missing ID after delimiter
  if (id === '') {
    return null;
  }

  return { entityType, id };
};

/**
 * Parse an entity type and ID from a DynamoDB sort key
 *
 * @param sk - Sort key in format "ENTITY_TYPE#id" or just "ENTITY_TYPE" (e.g., "FOLLOW#123", "POST", "PROFILE")
 * @returns Parsed entity with type and ID (empty string if no ID), or null if invalid format
 *
 * @example
 * parseSKEntity('FOLLOW#123') // { entityType: 'FOLLOW', id: '123' }
 * parseSKEntity('POST') // { entityType: 'POST', id: '' }
 * parseSKEntity('') // null
 */
export const parseSKEntity = (sk: string): ParsedEntity | null => {
  if (!sk || sk.trim() === '') {
    return null;
  }

  const delimiterIndex = sk.indexOf('#');

  // No delimiter - treat entire string as entity type
  if (delimiterIndex === -1) {
    return { entityType: sk, id: '' };
  }

  const entityType = sk.substring(0, delimiterIndex);
  const id = sk.substring(delimiterIndex + 1);

  return { entityType, id };
};

/**
 * Calculate the counter delta based on DynamoDB stream event type
 *
 * @param eventName - DynamoDB stream event type (INSERT, REMOVE, MODIFY)
 * @param newImage - New image from stream (for INSERT/MODIFY)
 * @param oldImage - Old image from stream (for REMOVE)
 * @returns Counter delta: +1 for INSERT, -1 for REMOVE, 0 for MODIFY or unknown
 *
 * @example
 * calculateCounterDelta('INSERT', {}, null) // 1
 * calculateCounterDelta('REMOVE', null, {}) // -1
 * calculateCounterDelta('MODIFY', {}, {}) // 0
 */
export const calculateCounterDelta = (
  eventName: string,
  _newImage: any,
  _oldImage: any
): number => {
  switch (eventName) {
    case 'INSERT':
      return 1;
    case 'REMOVE':
      return -1;
    default:
      return 0;
  }
};

/**
 * Create a DynamoDB UpdateExpression for atomic counter updates
 *
 * Uses the ADD operation which safely handles concurrent updates.
 * Works with both positive and negative deltas.
 *
 * @param counterField - Name of the counter field to update (e.g., 'likesCount', 'followersCount')
 * @param delta - Amount to add to the counter (positive or negative)
 * @returns UpdateExpression and ExpressionAttributeValues for DynamoDB update
 *
 * @example
 * createUpdateExpression('likesCount', 1)
 * // { UpdateExpression: 'ADD likesCount :delta', ExpressionAttributeValues: { ':delta': 1 } }
 *
 * createUpdateExpression('followersCount', -1)
 * // { UpdateExpression: 'ADD followersCount :delta', ExpressionAttributeValues: { ':delta': -1 } }
 */
export const createUpdateExpression = (
  counterField: string,
  delta: number
): UpdateExpressionResult => {
  return {
    UpdateExpression: `ADD ${counterField} :delta`,
    ExpressionAttributeValues: {
      ':delta': delta
    }
  };
};

/**
 * Get the appropriate image from a DynamoDB stream record based on event type
 *
 * @param record - DynamoDB stream record
 * @returns NewImage for INSERT/MODIFY, OldImage for REMOVE, or null if not available
 *
 * @example
 * getStreamRecordImage({ eventName: 'INSERT', dynamodb: { NewImage: {...} } })
 * // Returns NewImage
 *
 * getStreamRecordImage({ eventName: 'REMOVE', dynamodb: { OldImage: {...} } })
 * // Returns OldImage
 */
export const getStreamRecordImage = (
  record: DynamoDBRecord
): Record<string, AttributeValue> | null => {
  if (!record.dynamodb) {
    return null;
  }

  const { eventName } = record;

  if (eventName === 'REMOVE') {
    return (record.dynamodb.OldImage as Record<string, AttributeValue>) ?? null;
  }

  // INSERT or MODIFY - use NewImage
  return (record.dynamodb.NewImage as Record<string, AttributeValue>) ?? null;
};

/**
 * Check if a stream record should be processed (INSERT or REMOVE only)
 *
 * @param eventName - DynamoDB stream event type
 * @returns true if event should be processed, false otherwise
 *
 * @example
 * shouldProcessRecord('INSERT') // true
 * shouldProcessRecord('REMOVE') // true
 * shouldProcessRecord('MODIFY') // false
 */
export const shouldProcessRecord = (eventName: string | undefined): boolean => {
  return eventName === 'INSERT' || eventName === 'REMOVE';
};
