/**
 * Stream Record Test Helpers
 *
 * Utilities for creating test DynamoDB and Kinesis stream records.
 * Used for testing stream handler logging and processing behavior.
 *
 * Principles:
 * - No mocks - create real record structures
 * - Type-safe throughout
 * - Easy to customize for different test scenarios
 */

import type { DynamoDBRecord, KinesisStreamRecord } from 'aws-lambda';

/**
 * Create a test DynamoDB Stream record
 *
 * @param overrides - Partial record to override defaults
 * @returns Complete DynamoDB stream record
 */
export function createTestDynamoDBRecord(
  overrides: Partial<DynamoDBRecord> = {}
): DynamoDBRecord {
  return {
    eventID: `event-${crypto.randomUUID()}`,
    eventName: 'INSERT',
    eventVersion: '1.1',
    eventSource: 'aws:dynamodb',
    awsRegion: 'us-east-1',
    dynamodb: {
      Keys: {
        PK: { S: 'USER#123' },
        SK: { S: 'PROFILE' },
      },
      NewImage: {
        PK: { S: 'USER#123' },
        SK: { S: 'PROFILE' },
        handle: { S: '@testuser' },
        displayName: { S: 'Test User' },
      },
      SequenceNumber: '1000000000000000000000',
      SizeBytes: 256,
      StreamViewType: 'NEW_AND_OLD_IMAGES',
    },
    eventSourceARN:
      'arn:aws:dynamodb:us-east-1:123456789012:table/TestTable/stream/2024-01-01T00:00:00.000',
    ...overrides,
  };
}

/**
 * Create a test Kinesis Stream record
 *
 * @param overrides - Partial record to override defaults
 * @returns Complete Kinesis stream record
 */
export function createTestKinesisRecord(
  overrides: Partial<KinesisStreamRecord> = {}
): KinesisStreamRecord {
  const data = {
    eventType: 'POST_CREATED',
    postId: 'post-123',
    userId: 'user-456',
    timestamp: new Date().toISOString(),
  };

  return {
    eventID: `shardId-000000000000:${crypto.randomUUID()}`,
    eventName: 'aws:kinesis:record',
    eventVersion: '1.0',
    eventSource: 'aws:kinesis',
    awsRegion: 'us-east-1',
    kinesis: {
      kinesisSchemaVersion: '1.0',
      partitionKey: 'user-456',
      sequenceNumber: '49590338271490256608559692538361571095921575989136588898',
      data: Buffer.from(JSON.stringify(data)).toString('base64'),
      approximateArrivalTimestamp: Date.now() / 1000,
    },
    eventSourceARN:
      'arn:aws:kinesis:us-east-1:123456789012:stream/test-stream',
    ...overrides,
  };
}

/**
 * Create multiple DynamoDB records for batch testing
 *
 * @param count - Number of records to create
 * @param customizer - Optional function to customize each record
 */
export function createDynamoDBRecordBatch(
  count: number,
  customizer?: (index: number) => Partial<DynamoDBRecord>
): DynamoDBRecord[] {
  return Array.from({ length: count }, (_, index) =>
    createTestDynamoDBRecord(customizer ? customizer(index) : {})
  );
}

/**
 * Create multiple Kinesis records for batch testing
 *
 * @param count - Number of records to create
 * @param customizer - Optional function to customize each record
 */
export function createKinesisRecordBatch(
  count: number,
  customizer?: (index: number) => Partial<KinesisStreamRecord>
): KinesisStreamRecord[] {
  return Array.from({ length: count }, (_, index) =>
    createTestKinesisRecord(customizer ? customizer(index) : {})
  );
}

/**
 * Extract event ID from either record type
 */
export function getRecordId(
  record: DynamoDBRecord | KinesisStreamRecord
): string {
  if ('dynamodb' in record && record.dynamodb) {
    // DynamoDB record
    return record.eventID || 'unknown';
  } else if ('kinesis' in record && record.kinesis) {
    // Kinesis record
    return record.kinesis.sequenceNumber;
  }
  return 'unknown';
}

/**
 * Create a record that will fail processing (for error testing)
 *
 * This creates a valid structure but with data that might cause
 * processing logic to fail
 */
export function createFailingDynamoDBRecord(): DynamoDBRecord {
  return createTestDynamoDBRecord({
    dynamodb: {
      Keys: {
        PK: { S: 'INVALID' },
        SK: { S: 'INVALID' },
      },
      // Missing NewImage to trigger processing error
      SequenceNumber: '1000000000000000000000',
      SizeBytes: 0,
      StreamViewType: 'KEYS_ONLY',
    },
  });
}

/**
 * Create a Kinesis record with invalid data
 */
export function createFailingKinesisRecord(): KinesisStreamRecord {
  return createTestKinesisRecord({
    kinesis: {
      kinesisSchemaVersion: '1.0',
      partitionKey: 'test',
      sequenceNumber: '12345',
      // Invalid base64 data
      data: 'INVALID_BASE64!!!',
      approximateArrivalTimestamp: Date.now() / 1000,
    },
  });
}
