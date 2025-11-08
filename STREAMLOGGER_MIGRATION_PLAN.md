# StreamLogger to AWS Lambda Powertools Migration Plan

## Overview

This plan provides step-by-step TDD implementation to migrate from custom `streamLogger.ts` to AWS Lambda Powertools. Each phase follows RED-GREEN-REFACTOR cycles with meaningful git commits.

## Guiding Principles

- ✅ **RED-GREEN-REFACTOR** - Write failing tests first, make them pass, then refactor
- ✅ **No Mocks** - Use real dependencies, dependency injection over mocking
- ✅ **Type Safety** - Generics, conditional types, no `any` types
- ✅ **SOLID** - Single Responsibility, clean separation of concerns
- ✅ **DRY Tests** - Reusable fixtures and utilities
- ✅ **Behavioral Testing** - Test what code does, not how it does it
- ✅ **Git Commits** - After each meaningful delivery
- ✅ **Big Bang OK** - Don't maintain parallel versions

---

## Phase 1: Setup & Infrastructure (Day 1)

### Step 1.1: Install Dependencies ✅

```bash
pnpm add @aws-lambda-powertools/batch
```

**Commit**: `chore: install @aws-lambda-powertools/batch for stream processing`

**Verify**:
```bash
pnpm list @aws-lambda-powertools/batch
pnpm list @aws-lambda-powertools/logger
```

### Step 1.2: Create Type-Safe Stream Processing Types

Create reusable types for stream processing with generics.

**File**: `packages/backend/src/infrastructure/middleware/stream-processing-types.ts`

```typescript
import type { DynamoDBRecord, KinesisStreamRecord, Context } from 'aws-lambda';
import type { Logger } from '@aws-lambda-powertools/logger';
import type { BatchProcessor } from '@aws-lambda-powertools/batch';

/**
 * Generic stream record that can be either DynamoDB or Kinesis
 */
export type StreamRecord = DynamoDBRecord | KinesisStreamRecord;

/**
 * Type guard to check if a record is a DynamoDB record
 */
export function isDynamoDBRecord(record: StreamRecord): record is DynamoDBRecord {
  return 'eventID' in record && 'dynamodb' in record;
}

/**
 * Type guard to check if a record is a Kinesis record
 */
export function isKinesisRecord(record: StreamRecord): record is KinesisStreamRecord {
  return 'kinesis' in record && 'eventID' in record;
}

/**
 * Extract record ID from any stream record type
 */
export function getRecordId(record: StreamRecord): string {
  if (isDynamoDBRecord(record)) {
    return record.eventID || 'unknown';
  }
  return record.kinesis.sequenceNumber;
}

/**
 * Configuration for a stream processor
 */
export interface StreamProcessorConfig<TRecord extends StreamRecord = StreamRecord> {
  serviceName: string;
  logger: Logger;
  processor: BatchProcessor<TRecord>;
}

/**
 * Generic record handler function type
 * - Takes a record of type TRecord
 * - Returns Promise<TResult>
 * - Can be used with any stream type (DynamoDB, Kinesis)
 */
export type RecordHandler<TRecord extends StreamRecord, TResult = void> = (
  record: TRecord
) => Promise<TResult>;

/**
 * Result of processing a batch of records
 */
export interface BatchProcessingResult {
  /**
   * Array of record IDs that failed processing
   * Used for partial batch responses
   */
  batchItemFailures?: Array<{ itemIdentifier: string }>;
}
```

**Test File**: `packages/backend/src/infrastructure/middleware/stream-processing-types.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import type { DynamoDBRecord, KinesisStreamRecord } from 'aws-lambda';
import {
  isDynamoDBRecord,
  isKinesisRecord,
  getRecordId
} from './stream-processing-types.js';

describe('stream-processing-types', () => {
  describe('isDynamoDBRecord', () => {
    it('should return true for DynamoDB record', () => {
      const record: DynamoDBRecord = {
        eventID: '1',
        eventName: 'INSERT',
        eventVersion: '1.1',
        eventSource: 'aws:dynamodb',
        awsRegion: 'us-east-1',
        dynamodb: {
          Keys: { PK: { S: 'USER#123' }, SK: { S: 'POST#456' } },
          NewImage: { PK: { S: 'USER#123' }, SK: { S: 'POST#456' } },
          SequenceNumber: '111',
          SizeBytes: 26,
          StreamViewType: 'NEW_AND_OLD_IMAGES'
        },
        eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789012:table/Table/stream/2024-01-01T00:00:00.000'
      };

      expect(isDynamoDBRecord(record)).toBe(true);
    });

    it('should return false for Kinesis record', () => {
      const record: KinesisStreamRecord = {
        eventID: 'shardId-000000000000:49590338271490256608559692538361571095921575989136588898',
        eventName: 'aws:kinesis:record',
        eventVersion: '1.0',
        eventSource: 'aws:kinesis',
        awsRegion: 'us-east-1',
        kinesis: {
          kinesisSchemaVersion: '1.0',
          partitionKey: 'partitionKey-01',
          sequenceNumber: '49590338271490256608559692538361571095921575989136588898',
          data: 'SGVsbG8gV29ybGQ=',
          approximateArrivalTimestamp: 1428537600
        },
        eventSourceARN: 'arn:aws:kinesis:us-east-1:123456789012:stream/stream-name'
      };

      expect(isDynamoDBRecord(record)).toBe(false);
    });
  });

  describe('isKinesisRecord', () => {
    it('should return true for Kinesis record', () => {
      const record: KinesisStreamRecord = {
        eventID: 'shardId-000000000000:49590338271490256608559692538361571095921575989136588898',
        eventName: 'aws:kinesis:record',
        eventVersion: '1.0',
        eventSource: 'aws:kinesis',
        awsRegion: 'us-east-1',
        kinesis: {
          kinesisSchemaVersion: '1.0',
          partitionKey: 'partitionKey-01',
          sequenceNumber: '49590338271490256608559692538361571095921575989136588898',
          data: 'SGVsbG8gV29ybGQ=',
          approximateArrivalTimestamp: 1428537600
        },
        eventSourceARN: 'arn:aws:kinesis:us-east-1:123456789012:stream/stream-name'
      };

      expect(isKinesisRecord(record)).toBe(true);
    });

    it('should return false for DynamoDB record', () => {
      const record: DynamoDBRecord = {
        eventID: '1',
        eventName: 'INSERT',
        eventVersion: '1.1',
        eventSource: 'aws:dynamodb',
        awsRegion: 'us-east-1',
        dynamodb: {
          Keys: { PK: { S: 'USER#123' }, SK: { S: 'POST#456' } },
          NewImage: { PK: { S: 'USER#123' }, SK: { S: 'POST#456' } },
          SequenceNumber: '111',
          SizeBytes: 26,
          StreamViewType: 'NEW_AND_OLD_IMAGES'
        },
        eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789012:table/Table/stream/2024-01-01T00:00:00.000'
      };

      expect(isKinesisRecord(record)).toBe(false);
    });
  });

  describe('getRecordId', () => {
    it('should return eventID for DynamoDB record', () => {
      const record: DynamoDBRecord = {
        eventID: 'dynamodb-event-123',
        eventName: 'INSERT',
        eventVersion: '1.1',
        eventSource: 'aws:dynamodb',
        awsRegion: 'us-east-1',
        dynamodb: {
          Keys: { PK: { S: 'USER#123' }, SK: { S: 'POST#456' } },
          NewImage: { PK: { S: 'USER#123' }, SK: { S: 'POST#456' } },
          SequenceNumber: '111',
          SizeBytes: 26,
          StreamViewType: 'NEW_AND_OLD_IMAGES'
        },
        eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789012:table/Table/stream/2024-01-01T00:00:00.000'
      };

      expect(getRecordId(record)).toBe('dynamodb-event-123');
    });

    it('should return sequenceNumber for Kinesis record', () => {
      const record: KinesisStreamRecord = {
        eventID: 'shardId-000000000000:49590338271490256608559692538361571095921575989136588898',
        eventName: 'aws:kinesis:record',
        eventVersion: '1.0',
        eventSource: 'aws:kinesis',
        awsRegion: 'us-east-1',
        kinesis: {
          kinesisSchemaVersion: '1.0',
          partitionKey: 'partitionKey-01',
          sequenceNumber: 'kinesis-seq-456',
          data: 'SGVsbG8gV29ybGQ=',
          approximateArrivalTimestamp: 1428537600
        },
        eventSourceARN: 'arn:aws:kinesis:us-east-1:123456789012:stream/stream-name'
      };

      expect(getRecordId(record)).toBe('kinesis-seq-456');
    });

    it('should return "unknown" for DynamoDB record without eventID', () => {
      const record: DynamoDBRecord = {
        eventName: 'INSERT',
        eventVersion: '1.1',
        eventSource: 'aws:dynamodb',
        awsRegion: 'us-east-1',
        dynamodb: {
          Keys: { PK: { S: 'USER#123' }, SK: { S: 'POST#456' } },
          NewImage: { PK: { S: 'USER#123' }, SK: { S: 'POST#456' } },
          SequenceNumber: '111',
          SizeBytes: 26,
          StreamViewType: 'NEW_AND_OLD_IMAGES'
        },
        eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789012:table/Table/stream/2024-01-01T00:00:00.000'
      };

      expect(getRecordId(record)).toBe('unknown');
    });
  });
});
```

**Run Tests** (should pass):
```bash
pnpm --filter @social-media-app/backend test stream-processing-types
```

**Commit**: `feat: add type-safe stream processing types with generics`

---

## Phase 2: Create Test Utilities (Day 1-2)

### Step 2.1: Create Stream Event Test Fixtures

**File**: `packages/backend/src/__tests__/fixtures/stream-events.ts`

```typescript
import type { DynamoDBRecord, DynamoDBStreamEvent, KinesisStreamRecord, KinesisStreamEvent, AttributeValue } from 'aws-lambda';

/**
 * Create a DynamoDB stream record with type-safe attribute values
 */
export function createDynamoDBRecord(
  options: {
    eventName?: 'INSERT' | 'MODIFY' | 'REMOVE';
    newImage?: Record<string, AttributeValue>;
    oldImage?: Record<string, AttributeValue>;
    keys?: Record<string, AttributeValue>;
    eventID?: string;
  } = {}
): DynamoDBRecord {
  const {
    eventName = 'INSERT',
    newImage,
    oldImage,
    keys = { PK: { S: 'USER#test' }, SK: { S: 'POST#test' } },
    eventID = `event-${Date.now()}-${Math.random()}`
  } = options;

  return {
    eventID,
    eventName,
    eventVersion: '1.1',
    eventSource: 'aws:dynamodb',
    awsRegion: 'us-east-1',
    dynamodb: {
      Keys: keys,
      NewImage: newImage,
      OldImage: oldImage,
      SequenceNumber: `${Date.now()}`,
      SizeBytes: 100,
      StreamViewType: 'NEW_AND_OLD_IMAGES'
    },
    eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789012:table/TestTable/stream/2024-01-01T00:00:00.000'
  };
}

/**
 * Create a DynamoDB stream event with multiple records
 */
export function createDynamoDBStreamEvent(
  records: DynamoDBRecord[] = []
): DynamoDBStreamEvent {
  return {
    Records: records.length > 0 ? records : [createDynamoDBRecord()]
  };
}

/**
 * Create a Kinesis stream record
 */
export function createKinesisRecord(
  options: {
    data?: string;
    sequenceNumber?: string;
    partitionKey?: string;
  } = {}
): KinesisStreamRecord {
  const {
    data = Buffer.from(JSON.stringify({ test: 'data' })).toString('base64'),
    sequenceNumber = `seq-${Date.now()}`,
    partitionKey = 'partition-01'
  } = options;

  return {
    eventID: `shardId-000000000000:${sequenceNumber}`,
    eventName: 'aws:kinesis:record',
    eventVersion: '1.0',
    eventSource: 'aws:kinesis',
    awsRegion: 'us-east-1',
    kinesis: {
      kinesisSchemaVersion: '1.0',
      partitionKey,
      sequenceNumber,
      data,
      approximateArrivalTimestamp: Math.floor(Date.now() / 1000)
    },
    eventSourceARN: 'arn:aws:kinesis:us-east-1:123456789012:stream/test-stream'
  };
}

/**
 * Create a Kinesis stream event with multiple records
 */
export function createKinesisStreamEvent(
  records: KinesisStreamRecord[] = []
): KinesisStreamEvent {
  return {
    Records: records.length > 0 ? records : [createKinesisRecord()]
  };
}

/**
 * Create a LIKE entity for DynamoDB stream testing
 */
export function createLikeEntity(options: {
  userId: string;
  postUserId: string;
  postSK: string;
  postId?: string;
  eventName?: 'INSERT' | 'REMOVE';
}): DynamoDBRecord {
  const { userId, postUserId, postSK, postId = 'post-123', eventName = 'INSERT' } = options;

  const image: Record<string, AttributeValue> = {
    PK: { S: `USER#${userId}` },
    SK: { S: `LIKE#${postId}` },
    entityType: { S: 'LIKE' },
    postUserId: { S: postUserId },
    postSK: { S: postSK },
    postId: { S: postId },
    createdAt: { S: new Date().toISOString() }
  };

  return createDynamoDBRecord({
    eventName,
    newImage: eventName === 'INSERT' ? image : undefined,
    oldImage: eventName === 'REMOVE' ? image : undefined,
    keys: { PK: { S: `USER#${userId}` }, SK: { S: `LIKE#${postId}` } }
  });
}

/**
 * Create a POST entity for DynamoDB stream testing
 */
export function createPostEntity(options: {
  userId: string;
  postId: string;
  content?: string;
  likesCount?: number;
  eventName?: 'INSERT' | 'MODIFY' | 'REMOVE';
}): DynamoDBRecord {
  const {
    userId,
    postId,
    content = 'Test post content',
    likesCount = 0,
    eventName = 'INSERT'
  } = options;

  const image: Record<string, AttributeValue> = {
    PK: { S: `USER#${userId}` },
    SK: { S: `POST#${postId}` },
    entityType: { S: 'POST' },
    content: { S: content },
    likesCount: { N: String(likesCount) },
    createdAt: { S: new Date().toISOString() }
  };

  return createDynamoDBRecord({
    eventName,
    newImage: eventName !== 'REMOVE' ? image : undefined,
    oldImage: eventName === 'REMOVE' ? image : undefined,
    keys: { PK: { S: `USER#${userId}` }, SK: { S: `POST#${postId}` } }
  });
}
```

**Test File**: `packages/backend/src/__tests__/fixtures/stream-events.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  createDynamoDBRecord,
  createDynamoDBStreamEvent,
  createKinesisRecord,
  createKinesisStreamEvent,
  createLikeEntity,
  createPostEntity
} from './stream-events.js';

describe('stream-events fixtures', () => {
  describe('createDynamoDBRecord', () => {
    it('should create a DynamoDB record with defaults', () => {
      const record = createDynamoDBRecord();

      expect(record.eventName).toBe('INSERT');
      expect(record.eventSource).toBe('aws:dynamodb');
      expect(record.dynamodb?.Keys).toEqual({
        PK: { S: 'USER#test' },
        SK: { S: 'POST#test' }
      });
    });

    it('should create a DynamoDB record with custom values', () => {
      const record = createDynamoDBRecord({
        eventName: 'MODIFY',
        newImage: { PK: { S: 'USER#123' }, SK: { S: 'POST#456' } },
        eventID: 'custom-event-id'
      });

      expect(record.eventName).toBe('MODIFY');
      expect(record.eventID).toBe('custom-event-id');
      expect(record.dynamodb?.NewImage).toEqual({
        PK: { S: 'USER#123' },
        SK: { S: 'POST#456' }
      });
    });
  });

  describe('createDynamoDBStreamEvent', () => {
    it('should create an event with default record', () => {
      const event = createDynamoDBStreamEvent();

      expect(event.Records).toHaveLength(1);
      expect(event.Records[0].eventSource).toBe('aws:dynamodb');
    });

    it('should create an event with custom records', () => {
      const records = [
        createDynamoDBRecord({ eventName: 'INSERT' }),
        createDynamoDBRecord({ eventName: 'REMOVE' })
      ];
      const event = createDynamoDBStreamEvent(records);

      expect(event.Records).toHaveLength(2);
      expect(event.Records[0].eventName).toBe('INSERT');
      expect(event.Records[1].eventName).toBe('REMOVE');
    });
  });

  describe('createKinesisRecord', () => {
    it('should create a Kinesis record with defaults', () => {
      const record = createKinesisRecord();

      expect(record.eventSource).toBe('aws:kinesis');
      expect(record.kinesis.data).toBeDefined();
      expect(record.kinesis.partitionKey).toBe('partition-01');
    });

    it('should create a Kinesis record with custom values', () => {
      const customData = Buffer.from('custom data').toString('base64');
      const record = createKinesisRecord({
        data: customData,
        sequenceNumber: 'seq-123',
        partitionKey: 'custom-partition'
      });

      expect(record.kinesis.data).toBe(customData);
      expect(record.kinesis.sequenceNumber).toBe('seq-123');
      expect(record.kinesis.partitionKey).toBe('custom-partition');
    });
  });

  describe('createKinesisStreamEvent', () => {
    it('should create an event with default record', () => {
      const event = createKinesisStreamEvent();

      expect(event.Records).toHaveLength(1);
      expect(event.Records[0].eventSource).toBe('aws:kinesis');
    });

    it('should create an event with custom records', () => {
      const records = [
        createKinesisRecord({ sequenceNumber: 'seq-1' }),
        createKinesisRecord({ sequenceNumber: 'seq-2' })
      ];
      const event = createKinesisStreamEvent(records);

      expect(event.Records).toHaveLength(2);
      expect(event.Records[0].kinesis.sequenceNumber).toBe('seq-1');
      expect(event.Records[1].kinesis.sequenceNumber).toBe('seq-2');
    });
  });

  describe('createLikeEntity', () => {
    it('should create a LIKE entity INSERT record', () => {
      const record = createLikeEntity({
        userId: 'user-123',
        postUserId: 'user-456',
        postSK: 'POST#post-789',
        postId: 'post-789'
      });

      expect(record.eventName).toBe('INSERT');
      expect(record.dynamodb?.NewImage?.entityType).toEqual({ S: 'LIKE' });
      expect(record.dynamodb?.NewImage?.postUserId).toEqual({ S: 'user-456' });
      expect(record.dynamodb?.NewImage?.postSK).toEqual({ S: 'POST#post-789' });
    });

    it('should create a LIKE entity REMOVE record', () => {
      const record = createLikeEntity({
        userId: 'user-123',
        postUserId: 'user-456',
        postSK: 'POST#post-789',
        eventName: 'REMOVE'
      });

      expect(record.eventName).toBe('REMOVE');
      expect(record.dynamodb?.OldImage?.entityType).toEqual({ S: 'LIKE' });
      expect(record.dynamodb?.NewImage).toBeUndefined();
    });
  });

  describe('createPostEntity', () => {
    it('should create a POST entity INSERT record', () => {
      const record = createPostEntity({
        userId: 'user-123',
        postId: 'post-456',
        content: 'Test content',
        likesCount: 5
      });

      expect(record.eventName).toBe('INSERT');
      expect(record.dynamodb?.NewImage?.entityType).toEqual({ S: 'POST' });
      expect(record.dynamodb?.NewImage?.content).toEqual({ S: 'Test content' });
      expect(record.dynamodb?.NewImage?.likesCount).toEqual({ N: '5' });
    });

    it('should create a POST entity with default values', () => {
      const record = createPostEntity({
        userId: 'user-123',
        postId: 'post-456'
      });

      expect(record.dynamodb?.NewImage?.content).toEqual({ S: 'Test post content' });
      expect(record.dynamodb?.NewImage?.likesCount).toEqual({ N: '0' });
    });
  });
});
```

**Run Tests**:
```bash
pnpm --filter @social-media-app/backend test stream-events
```

**Commit**: `test: add stream event fixtures with type-safe builders`

### Step 2.2: Create Lambda Context Mock Utility

**File**: `packages/backend/src/__tests__/fixtures/lambda-context.ts`

```typescript
import type { Context } from 'aws-lambda';

/**
 * Create a minimal Lambda context for testing
 * This is the ONLY acceptable use of a test double, as Context is an AWS type
 * we don't control and doesn't affect business logic
 */
export function createLambdaContext(overrides: Partial<Context> = {}): Context {
  return {
    functionName: 'test-function',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
    memoryLimitInMB: '128',
    awsRequestId: `test-request-${Date.now()}`,
    logGroupName: '/aws/lambda/test-function',
    logStreamName: '2024/01/01/[$LATEST]test',
    callbackWaitsForEmptyEventLoop: false,
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
    ...overrides
  };
}
```

**Commit**: `test: add Lambda context fixture utility`

---

## Phase 3: Pilot Migration - Comment Counter (Day 2-3)

We'll use **comment-counter** as our pilot because it's one of the simpler handlers.

### Step 3.1: Write Failing Test (RED)

First, let's examine the current handler:

```bash
cat packages/backend/src/handlers/streams/comment-counter.ts
```

**File**: `packages/backend/src/handlers/streams/comment-counter.powertools.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import type { DynamoDBStreamEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from './comment-counter.js';
import {
  createDynamoDBStreamEvent,
  createDynamoDBRecord
} from '../../__tests__/fixtures/stream-events.js';
import { createLambdaContext } from '../../__tests__/fixtures/lambda-context.js';

/**
 * Test Strategy:
 * - Use real AWS SDK clients with aws-sdk-client-mock for DynamoDB
 * - Test behavioral outcomes (what updates are sent to DynamoDB)
 * - No mocking of business logic, only infrastructure
 */

const dynamoMock = mockClient(DynamoDBDocumentClient);

describe('comment-counter stream handler (Powertools)', () => {
  beforeEach(() => {
    dynamoMock.reset();
    // Set env vars
    process.env.TABLE_NAME = 'test-table';
  });

  describe('Core functionality', () => {
    it('should increment commentsCount when COMMENT is inserted', async () => {
      // ARRANGE
      const event: DynamoDBStreamEvent = createDynamoDBStreamEvent([
        createDynamoDBRecord({
          eventName: 'INSERT',
          newImage: {
            PK: { S: 'USER#user-123' },
            SK: { S: 'COMMENT#POST#post-456#comment-789' },
            entityType: { S: 'COMMENT' },
            postUserId: { S: 'user-456' },
            postSK: { S: 'POST#post-456' },
            content: { S: 'Great post!' }
          }
        })
      ]);

      dynamoMock.on(UpdateCommand).resolves({});

      // ACT
      const result = await handler(event, createLambdaContext());

      // ASSERT
      // Powertools returns partial batch response
      expect(result).toEqual({ batchItemFailures: [] });

      // Verify DynamoDB update was called correctly
      const updateCalls = dynamoMock.commandCalls(UpdateCommand);
      expect(updateCalls).toHaveLength(1);

      const updateCommand = updateCalls[0].args[0].input;
      expect(updateCommand).toMatchObject({
        TableName: 'test-table',
        Key: {
          PK: 'USER#user-456',
          SK: 'POST#post-456'
        },
        UpdateExpression: 'ADD commentsCount :delta',
        ExpressionAttributeValues: {
          ':delta': 1
        }
      });
    });

    it('should decrement commentsCount when COMMENT is removed', async () => {
      // ARRANGE
      const event: DynamoDBStreamEvent = createDynamoDBStreamEvent([
        createDynamoDBRecord({
          eventName: 'REMOVE',
          oldImage: {
            PK: { S: 'USER#user-123' },
            SK: { S: 'COMMENT#POST#post-456#comment-789' },
            entityType: { S: 'COMMENT' },
            postUserId: { S: 'user-456' },
            postSK: { S: 'POST#post-456' },
            content: { S: 'Great post!' }
          }
        })
      ]);

      dynamoMock.on(UpdateCommand).resolves({});

      // ACT
      const result = await handler(event, createLambdaContext());

      // ASSERT
      expect(result).toEqual({ batchItemFailures: [] });

      const updateCalls = dynamoMock.commandCalls(UpdateCommand);
      expect(updateCalls).toHaveLength(1);

      const updateCommand = updateCalls[0].args[0].input;
      expect(updateCommand).toMatchObject({
        TableName: 'test-table',
        Key: {
          PK: 'USER#user-456',
          SK: 'POST#post-456'
        },
        UpdateExpression: 'ADD commentsCount :delta',
        ExpressionAttributeValues: {
          ':delta': -1
        }
      });
    });

    it('should process multiple records in batch', async () => {
      // ARRANGE
      const event: DynamoDBStreamEvent = createDynamoDBStreamEvent([
        createDynamoDBRecord({
          eventName: 'INSERT',
          newImage: {
            PK: { S: 'USER#user-1' },
            SK: { S: 'COMMENT#POST#post-1#comment-1' },
            entityType: { S: 'COMMENT' },
            postUserId: { S: 'user-100' },
            postSK: { S: 'POST#post-1' }
          }
        }),
        createDynamoDBRecord({
          eventName: 'INSERT',
          newImage: {
            PK: { S: 'USER#user-2' },
            SK: { S: 'COMMENT#POST#post-2#comment-2' },
            entityType: { S: 'COMMENT' },
            postUserId: { S: 'user-200' },
            postSK: { S: 'POST#post-2' }
          }
        })
      ]);

      dynamoMock.on(UpdateCommand).resolves({});

      // ACT
      const result = await handler(event, createLambdaContext());

      // ASSERT
      expect(result).toEqual({ batchItemFailures: [] });
      expect(dynamoMock.commandCalls(UpdateCommand)).toHaveLength(2);
    });
  });

  describe('Edge cases', () => {
    it('should skip non-COMMENT entities', async () => {
      // ARRANGE
      const event: DynamoDBStreamEvent = createDynamoDBStreamEvent([
        createDynamoDBRecord({
          eventName: 'INSERT',
          newImage: {
            PK: { S: 'USER#user-123' },
            SK: { S: 'LIKE#post-456' },
            entityType: { S: 'LIKE' },
            postUserId: { S: 'user-456' },
            postSK: { S: 'POST#post-456' }
          }
        })
      ]);

      // ACT
      const result = await handler(event, createLambdaContext());

      // ASSERT
      expect(result).toEqual({ batchItemFailures: [] });
      expect(dynamoMock.commandCalls(UpdateCommand)).toHaveLength(0);
    });

    it('should skip MODIFY events', async () => {
      // ARRANGE
      const event: DynamoDBStreamEvent = createDynamoDBStreamEvent([
        createDynamoDBRecord({
          eventName: 'MODIFY',
          newImage: {
            PK: { S: 'USER#user-123' },
            SK: { S: 'COMMENT#POST#post-456#comment-789' },
            entityType: { S: 'COMMENT' },
            postUserId: { S: 'user-456' },
            postSK: { S: 'POST#post-456' }
          }
        })
      ]);

      // ACT
      const result = await handler(event, createLambdaContext());

      // ASSERT
      expect(result).toEqual({ batchItemFailures: [] });
      expect(dynamoMock.commandCalls(UpdateCommand)).toHaveLength(0);
    });

    it('should handle partial failures and return failed record IDs', async () => {
      // ARRANGE
      const successRecord = createDynamoDBRecord({
        eventID: 'success-event-1',
        eventName: 'INSERT',
        newImage: {
          PK: { S: 'USER#user-1' },
          SK: { S: 'COMMENT#POST#post-1#comment-1' },
          entityType: { S: 'COMMENT' },
          postUserId: { S: 'user-100' },
          postSK: { S: 'POST#post-1' }
        }
      });

      const failRecord = createDynamoDBRecord({
        eventID: 'fail-event-2',
        eventName: 'INSERT',
        newImage: {
          PK: { S: 'USER#user-2' },
          SK: { S: 'COMMENT#POST#post-2#comment-2' },
          entityType: { S: 'COMMENT' },
          postUserId: { S: 'user-200' },
          postSK: { S: 'POST#post-2' }
        }
      });

      const event: DynamoDBStreamEvent = createDynamoDBStreamEvent([
        successRecord,
        failRecord
      ]);

      // First call succeeds, second fails
      dynamoMock
        .on(UpdateCommand)
        .resolvesOnce({})
        .rejectsOnce(new Error('DynamoDB update failed'));

      // ACT
      const result = await handler(event, createLambdaContext());

      // ASSERT
      // Powertools should return the failed record ID
      expect(result).toEqual({
        batchItemFailures: [{ itemIdentifier: 'fail-event-2' }]
      });
    });

    it('should skip records with missing post metadata', async () => {
      // ARRANGE
      const event: DynamoDBStreamEvent = createDynamoDBStreamEvent([
        createDynamoDBRecord({
          eventName: 'INSERT',
          newImage: {
            PK: { S: 'USER#user-123' },
            SK: { S: 'COMMENT#POST#post-456#comment-789' },
            entityType: { S: 'COMMENT' }
            // Missing postUserId and postSK
          }
        })
      ]);

      // ACT
      const result = await handler(event, createLambdaContext());

      // ASSERT
      expect(result).toEqual({ batchItemFailures: [] });
      expect(dynamoMock.commandCalls(UpdateCommand)).toHaveLength(0);
    });
  });
});
```

**Run Test** (should FAIL - handler not migrated yet):
```bash
pnpm --filter @social-media-app/backend test comment-counter.powertools
```

**Commit**: `test(RED): add Powertools tests for comment-counter migration`

### Step 3.2: Implement with Powertools (GREEN)

Now migrate the handler to use Powertools:

**File**: `packages/backend/src/handlers/streams/comment-counter.ts`

```typescript
import type { DynamoDBStreamHandler, DynamoDBRecord } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { BatchProcessor, EventType, processPartialResponse } from '@aws-lambda-powertools/batch';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import {
  shouldProcessRecord,
  getStreamRecordImage,
  calculateCounterDelta,
  createUpdateExpression
} from '../../utils/stream-counter-helpers.js';

// Initialize logger
const logger = new Logger({ serviceName: 'CommentCounter' });

// Initialize batch processor
const processor = new BatchProcessor(EventType.DynamoDBStreams);

// DynamoDB client (singleton)
const dynamoClient = createDynamoDBClient();
const tableName = getTableName();

/**
 * Process a single DynamoDB stream record
 * Updates post commentsCount when COMMENT entities are added/removed
 */
const recordHandler = async (record: DynamoDBRecord): Promise<void> => {
  // Only process INSERT and REMOVE events
  if (!shouldProcessRecord(record.eventName)) {
    logger.debug('Skipping non-INSERT/REMOVE event', { eventName: record.eventName });
    return;
  }

  // Get the appropriate image based on event type
  const image = getStreamRecordImage(record);
  if (!image) {
    logger.warn('No image in stream record');
    return;
  }

  // Only process COMMENT entities
  const entityType = image.entityType?.S;
  if (entityType !== 'COMMENT') {
    logger.debug('Skipping non-COMMENT entity', { entityType });
    return;
  }

  // Extract post metadata from COMMENT entity
  const postUserId = image.postUserId?.S;
  const postSK = image.postSK?.S;

  if (!postUserId || !postSK) {
    logger.error('Missing post metadata in COMMENT entity', {
      postUserId,
      postSK,
      commentSK: image.SK?.S,
      commentPK: image.PK?.S
    });
    return;
  }

  // Calculate counter delta
  const delta = calculateCounterDelta(
    record.eventName!,
    record.dynamodb?.NewImage,
    record.dynamodb?.OldImage
  );

  // Create update expression
  const { UpdateExpression, ExpressionAttributeValues } = createUpdateExpression(
    'commentsCount',
    delta
  );

  // Update the Post entity's commentsCount
  await dynamoClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `USER#${postUserId}`,
        SK: postSK
      },
      UpdateExpression,
      ExpressionAttributeValues
    })
  );

  logger.info('Successfully updated commentsCount', {
    postSK,
    delta,
    operation: delta > 0 ? 'comment-added' : 'comment-removed'
  });
};

/**
 * Stream processor for updating post comment counts
 *
 * Listens to DynamoDB Streams and:
 * - Increments commentsCount when a COMMENT entity is inserted
 * - Decrements commentsCount when a COMMENT entity is removed
 *
 * Uses AWS Lambda Powertools for:
 * - Structured logging with automatic context enrichment
 * - Batch processing with partial failure support
 * - Automatic error tracking and metrics
 */
export const handler: DynamoDBStreamHandler = async (event, context) => {
  return processPartialResponse(event, recordHandler, processor, { context });
};
```

**Run Test** (should PASS):
```bash
pnpm --filter @social-media-app/backend test comment-counter.powertools
```

**Commit**: `feat(GREEN): migrate comment-counter to AWS Lambda Powertools`

### Step 3.3: Refactor (REFACTOR)

Look for opportunities to improve code clarity without changing behavior.

1. Extract common validation logic if needed
2. Improve type safety
3. Add JSDoc comments

Since the code is already clean, we might not need much refactoring here.

**Commit** (if changes made): `refactor: improve comment-counter clarity`

### Step 3.4: Remove Old Test

Delete the old test file if it exists:

```bash
rm packages/backend/src/handlers/streams/comment-counter.test.ts 2>/dev/null || true
```

Rename the new test:
```bash
mv packages/backend/src/handlers/streams/comment-counter.powertools.test.ts \
   packages/backend/src/handlers/streams/comment-counter.test.ts
```

**Run all tests**:
```bash
pnpm --filter @social-media-app/backend test comment-counter
```

**Commit**: `test: finalize comment-counter Powertools migration`

---

## Phase 4: Extract Reusable Patterns (Day 3)

After the pilot, extract common patterns into reusable utilities.

### Step 4.1: Create Generic Counter Stream Handler

**File**: `packages/backend/src/infrastructure/middleware/create-counter-stream-handler.ts`

```typescript
import type { DynamoDBStreamHandler, DynamoDBRecord } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { BatchProcessor, EventType, processPartialResponse } from '@aws-lambda-powertools/batch';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  shouldProcessRecord,
  getStreamRecordImage,
  calculateCounterDelta,
  createUpdateExpression
} from '../../utils/stream-counter-helpers.js';

/**
 * Configuration for counter stream handler
 */
export interface CounterStreamHandlerConfig {
  /**
   * Service name for logging (e.g., 'LikeCounter', 'CommentCounter')
   */
  serviceName: string;

  /**
   * Entity type to process (e.g., 'LIKE', 'COMMENT', 'FOLLOW')
   */
  entityType: string;

  /**
   * Counter field name to update (e.g., 'likesCount', 'commentsCount')
   */
  counterField: string;

  /**
   * DynamoDB client instance
   */
  dynamoClient: DynamoDBDocumentClient;

  /**
   * Table name
   */
  tableName: string;

  /**
   * Optional custom validation logic
   * Return false to skip processing this record
   */
  shouldProcess?: (image: Record<string, any>) => boolean;
}

/**
 * Create a type-safe DynamoDB stream handler for counter updates
 *
 * This factory function creates handlers that:
 * - Listen to DynamoDB streams for specific entity types
 * - Update counter fields on related entities
 * - Use AWS Lambda Powertools for logging and batch processing
 * - Handle partial failures gracefully
 *
 * @param config - Handler configuration
 * @returns DynamoDB stream handler function
 *
 * @example
 * ```typescript
 * const handler = createCounterStreamHandler({
 *   serviceName: 'LikeCounter',
 *   entityType: 'LIKE',
 *   counterField: 'likesCount',
 *   dynamoClient: createDynamoDBClient(),
 *   tableName: getTableName()
 * });
 * ```
 */
export function createCounterStreamHandler(
  config: CounterStreamHandlerConfig
): DynamoDBStreamHandler {
  const {
    serviceName,
    entityType,
    counterField,
    dynamoClient,
    tableName,
    shouldProcess: customValidation
  } = config;

  // Initialize logger
  const logger = new Logger({ serviceName });

  // Initialize batch processor
  const processor = new BatchProcessor(EventType.DynamoDBStreams);

  /**
   * Process a single DynamoDB stream record
   */
  const recordHandler = async (record: DynamoDBRecord): Promise<void> => {
    // Only process INSERT and REMOVE events
    if (!shouldProcessRecord(record.eventName)) {
      logger.debug('Skipping non-INSERT/REMOVE event', { eventName: record.eventName });
      return;
    }

    // Get the appropriate image based on event type
    const image = getStreamRecordImage(record);
    if (!image) {
      logger.warn('No image in stream record');
      return;
    }

    // Only process specified entity type
    const recordEntityType = image.entityType?.S;
    if (recordEntityType !== entityType) {
      logger.debug(`Skipping non-${entityType} entity`, { entityType: recordEntityType });
      return;
    }

    // Run custom validation if provided
    if (customValidation && !customValidation(image)) {
      logger.debug('Custom validation failed', { image });
      return;
    }

    // Extract post metadata from entity
    const postUserId = image.postUserId?.S;
    const postSK = image.postSK?.S;

    if (!postUserId || !postSK) {
      logger.error(`Missing post metadata in ${entityType} entity`, {
        postUserId,
        postSK,
        entitySK: image.SK?.S,
        entityPK: image.PK?.S
      });
      return;
    }

    // Calculate counter delta
    const delta = calculateCounterDelta(
      record.eventName!,
      record.dynamodb?.NewImage,
      record.dynamodb?.OldImage
    );

    // Create update expression
    const { UpdateExpression, ExpressionAttributeValues } = createUpdateExpression(
      counterField,
      delta
    );

    // Update the Post entity's counter
    await dynamoClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: `USER#${postUserId}`,
          SK: postSK
        },
        UpdateExpression,
        ExpressionAttributeValues
      })
    );

    logger.info(`Successfully updated ${counterField}`, {
      postSK,
      delta,
      operation: delta > 0 ? `${entityType.toLowerCase()}-added` : `${entityType.toLowerCase()}-removed`
    });
  };

  /**
   * Return the handler function
   */
  return async (event, context) => {
    return processPartialResponse(event, recordHandler, processor, { context });
  };
}
```

**Test File**: `packages/backend/src/infrastructure/middleware/create-counter-stream-handler.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import type { DynamoDBStreamEvent } from 'aws-lambda';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { createCounterStreamHandler } from './create-counter-stream-handler.js';
import { createDynamoDBClient } from '../../utils/dynamodb.js';
import {
  createDynamoDBStreamEvent,
  createDynamoDBRecord
} from '../../__tests__/fixtures/stream-events.js';
import { createLambdaContext } from '../../__tests__/fixtures/lambda-context.js';

const dynamoMock = mockClient(DynamoDBDocumentClient);

describe('createCounterStreamHandler', () => {
  beforeEach(() => {
    dynamoMock.reset();
  });

  it('should create a handler that increments counter on INSERT', async () => {
    // ARRANGE
    const handler = createCounterStreamHandler({
      serviceName: 'TestCounter',
      entityType: 'LIKE',
      counterField: 'likesCount',
      dynamoClient: createDynamoDBClient(),
      tableName: 'test-table'
    });

    const event: DynamoDBStreamEvent = createDynamoDBStreamEvent([
      createDynamoDBRecord({
        eventName: 'INSERT',
        newImage: {
          PK: { S: 'USER#user-1' },
          SK: { S: 'LIKE#post-1' },
          entityType: { S: 'LIKE' },
          postUserId: { S: 'user-100' },
          postSK: { S: 'POST#post-1' }
        }
      })
    ]);

    dynamoMock.on(UpdateCommand).resolves({});

    // ACT
    const result = await handler(event, createLambdaContext());

    // ASSERT
    expect(result).toEqual({ batchItemFailures: [] });

    const updateCalls = dynamoMock.commandCalls(UpdateCommand);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].args[0].input).toMatchObject({
      TableName: 'test-table',
      Key: { PK: 'USER#user-100', SK: 'POST#post-1' },
      UpdateExpression: 'ADD likesCount :delta',
      ExpressionAttributeValues: { ':delta': 1 }
    });
  });

  it('should create a handler that decrements counter on REMOVE', async () => {
    // ARRANGE
    const handler = createCounterStreamHandler({
      serviceName: 'TestCounter',
      entityType: 'COMMENT',
      counterField: 'commentsCount',
      dynamoClient: createDynamoDBClient(),
      tableName: 'test-table'
    });

    const event: DynamoDBStreamEvent = createDynamoDBStreamEvent([
      createDynamoDBRecord({
        eventName: 'REMOVE',
        oldImage: {
          PK: { S: 'USER#user-1' },
          SK: { S: 'COMMENT#post-1' },
          entityType: { S: 'COMMENT' },
          postUserId: { S: 'user-100' },
          postSK: { S: 'POST#post-1' }
        }
      })
    ]);

    dynamoMock.on(UpdateCommand).resolves({});

    // ACT
    const result = await handler(event, createLambdaContext());

    // ASSERT
    expect(result).toEqual({ batchItemFailures: [] });

    const updateCalls = dynamoMock.commandCalls(UpdateCommand);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].args[0].input).toMatchObject({
      ExpressionAttributeValues: { ':delta': -1 }
    });
  });

  it('should support custom validation logic', async () => {
    // ARRANGE
    const handler = createCounterStreamHandler({
      serviceName: 'TestCounter',
      entityType: 'LIKE',
      counterField: 'likesCount',
      dynamoClient: createDynamoDBClient(),
      tableName: 'test-table',
      shouldProcess: (image) => {
        // Only process if likeType is 'heart'
        return image.likeType?.S === 'heart';
      }
    });

    const event: DynamoDBStreamEvent = createDynamoDBStreamEvent([
      createDynamoDBRecord({
        eventName: 'INSERT',
        newImage: {
          PK: { S: 'USER#user-1' },
          SK: { S: 'LIKE#post-1' },
          entityType: { S: 'LIKE' },
          likeType: { S: 'thumbs-up' }, // Should be skipped
          postUserId: { S: 'user-100' },
          postSK: { S: 'POST#post-1' }
        }
      })
    ]);

    // ACT
    const result = await handler(event, createLambdaContext());

    // ASSERT
    expect(result).toEqual({ batchItemFailures: [] });
    expect(dynamoMock.commandCalls(UpdateCommand)).toHaveLength(0);
  });

  it('should skip non-matching entity types', async () => {
    // ARRANGE
    const handler = createCounterStreamHandler({
      serviceName: 'LikeCounter',
      entityType: 'LIKE',
      counterField: 'likesCount',
      dynamoClient: createDynamoDBClient(),
      tableName: 'test-table'
    });

    const event: DynamoDBStreamEvent = createDynamoDBStreamEvent([
      createDynamoDBRecord({
        eventName: 'INSERT',
        newImage: {
          PK: { S: 'USER#user-1' },
          SK: { S: 'COMMENT#post-1' },
          entityType: { S: 'COMMENT' }, // Different entity type
          postUserId: { S: 'user-100' },
          postSK: { S: 'POST#post-1' }
        }
      })
    ]);

    // ACT
    const result = await handler(event, createLambdaContext());

    // ASSERT
    expect(result).toEqual({ batchItemFailures: [] });
    expect(dynamoMock.commandCalls(UpdateCommand)).toHaveLength(0);
  });
});
```

**Run Tests**:
```bash
pnpm --filter @social-media-app/backend test create-counter-stream-handler
```

**Commit**: `feat: add generic counter stream handler factory with Powertools`

### Step 4.2: Refactor Comment Counter to Use Generic Handler

**File**: `packages/backend/src/handlers/streams/comment-counter.ts`

```typescript
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { createCounterStreamHandler } from '../../infrastructure/middleware/create-counter-stream-handler.js';

/**
 * Stream processor for updating post comment counts
 *
 * Listens to DynamoDB Streams and:
 * - Increments commentsCount when a COMMENT entity is inserted
 * - Decrements commentsCount when a COMMENT entity is removed
 *
 * Uses AWS Lambda Powertools via createCounterStreamHandler for:
 * - Structured logging with automatic context enrichment
 * - Batch processing with partial failure support
 * - Automatic error tracking and metrics
 */
export const handler = createCounterStreamHandler({
  serviceName: 'CommentCounter',
  entityType: 'COMMENT',
  counterField: 'commentsCount',
  dynamoClient: createDynamoDBClient(),
  tableName: getTableName()
});
```

**Run Tests** (should still pass):
```bash
pnpm --filter @social-media-app/backend test comment-counter
```

**Commit**: `refactor: simplify comment-counter using generic handler factory`

---

## Phase 5: Migrate Remaining Handlers (Day 4-6)

Now we use the pattern for the remaining 7 handlers.

### Step 5.1: Migrate Like Counter

**Test File**: `packages/backend/src/handlers/streams/like-counter.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import type { DynamoDBStreamEvent } from 'aws-lambda';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from './like-counter.js';
import { createLikeEntity } from '../../__tests__/fixtures/stream-events.js';
import { createDynamoDBStreamEvent } from '../../__tests__/fixtures/stream-events.js';
import { createLambdaContext } from '../../__tests__/fixtures/lambda-context.js';

const dynamoMock = mockClient(DynamoDBDocumentClient);

describe('like-counter stream handler', () => {
  beforeEach(() => {
    dynamoMock.reset();
    process.env.TABLE_NAME = 'test-table';
  });

  it('should increment likesCount when LIKE is inserted', async () => {
    const event: DynamoDBStreamEvent = createDynamoDBStreamEvent([
      createLikeEntity({
        userId: 'user-1',
        postUserId: 'user-100',
        postSK: 'POST#post-1',
        postId: 'post-1',
        eventName: 'INSERT'
      })
    ]);

    dynamoMock.on(UpdateCommand).resolves({});

    const result = await handler(event, createLambdaContext());

    expect(result).toEqual({ batchItemFailures: [] });

    const updateCalls = dynamoMock.commandCalls(UpdateCommand);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].args[0].input).toMatchObject({
      TableName: 'test-table',
      Key: { PK: 'USER#user-100', SK: 'POST#post-1' },
      UpdateExpression: 'ADD likesCount :delta',
      ExpressionAttributeValues: { ':delta': 1 }
    });
  });

  it('should decrement likesCount when LIKE is removed', async () => {
    const event: DynamoDBStreamEvent = createDynamoDBStreamEvent([
      createLikeEntity({
        userId: 'user-1',
        postUserId: 'user-100',
        postSK: 'POST#post-1',
        postId: 'post-1',
        eventName: 'REMOVE'
      })
    ]);

    dynamoMock.on(UpdateCommand).resolves({});

    const result = await handler(event, createLambdaContext());

    expect(result).toEqual({ batchItemFailures: [] });

    const updateCalls = dynamoMock.commandCalls(UpdateCommand);
    expect(updateCalls[0].args[0].input).toMatchObject({
      ExpressionAttributeValues: { ':delta': -1 }
    });
  });
});
```

**Implementation**: `packages/backend/src/handlers/streams/like-counter.ts`

```typescript
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { createCounterStreamHandler } from '../../infrastructure/middleware/create-counter-stream-handler.js';

export const handler = createCounterStreamHandler({
  serviceName: 'LikeCounter',
  entityType: 'LIKE',
  counterField: 'likesCount',
  dynamoClient: createDynamoDBClient(),
  tableName: getTableName()
});
```

**Run Tests**:
```bash
pnpm --filter @social-media-app/backend test like-counter
```

**Commit**: `feat: migrate like-counter to Powertools`

### Step 5.2: Migrate Follow Counter

Similar pattern - create test, implement, commit.

**Commit**: `feat: migrate follow-counter to Powertools`

### Step 5.3-5.7: Migrate Remaining Handlers

For each remaining handler:
1. Write tests (RED)
2. Implement with Powertools (GREEN)
3. Refactor if needed (REFACTOR)
4. Commit

**Handlers to migrate**:
- `notification-processor.ts` (might need custom implementation)
- `kinesis-feed-consumer.ts` (Kinesis, not DynamoDB)
- `feed-fanout.ts`
- `feed-cleanup-unfollow.ts`
- `feed-cleanup-post-delete.ts`

**Commits**:
- `feat: migrate notification-processor to Powertools`
- `feat: migrate kinesis-feed-consumer to Powertools`
- `feat: migrate feed-fanout to Powertools`
- `feat: migrate feed-cleanup-unfollow to Powertools`
- `feat: migrate feed-cleanup-post-delete to Powertools`

---

## Phase 6: Cleanup (Day 7)

### Step 6.1: Remove Old streamLogger

```bash
git rm packages/backend/src/infrastructure/middleware/streamLogger.ts
```

**Run all tests** to ensure nothing breaks:
```bash
pnpm --filter @social-media-app/backend test
```

**Commit**: `refactor: remove deprecated streamLogger middleware`

### Step 6.2: Update Documentation

Update any docs that reference streamLogger.

**Commit**: `docs: update stream handler documentation for Powertools`

### Step 6.3: Type Check

```bash
pnpm --filter @social-media-app/backend typecheck
```

Fix any type errors if found.

**Commit** (if needed): `fix: resolve type errors after streamLogger removal`

---

## Testing Strategy Summary

### Unit Tests
- ✅ Test fixtures for stream events (DynamoDB, Kinesis)
- ✅ Test type guards and utility functions
- ✅ Test handler behavior with mocked AWS SDK
- ✅ Test partial failure scenarios
- ✅ Test edge cases (missing data, wrong entity types)

### Integration Tests
Consider adding integration tests with LocalStack if not already present:

```typescript
// Run against real DynamoDB Streams in LocalStack
describe('like-counter integration', () => {
  it('should process real DynamoDB stream events', async () => {
    // Insert LIKE entity into DynamoDB
    // Trigger stream
    // Verify counter updated
  });
});
```

### Manual Testing Checklist
- [ ] Deploy to dev environment
- [ ] Trigger stream events manually
- [ ] Verify CloudWatch Logs show Powertools structured logs
- [ ] Verify partial failures return correct batchItemFailures
- [ ] Check X-Ray traces (if Tracer enabled)
- [ ] Monitor for 24-48 hours

---

## Rollback Plan

If issues are discovered:

```bash
# Revert specific handler
git revert <commit-hash>

# Or revert entire migration
git revert <first-commit>..<last-commit>
```

Keep old streamLogger in git history - can reference if needed.

---

## Success Criteria

- [ ] All 8 stream handlers migrated to Powertools
- [ ] All tests passing (100% coverage maintained)
- [ ] No type errors
- [ ] streamLogger.ts removed
- [ ] CloudWatch Logs show Powertools-formatted structured logs
- [ ] Partial failure handling working (batchItemFailures returned)
- [ ] No production incidents for 1 week post-deployment
- [ ] Team trained on Powertools patterns

---

## Timeline

| Day | Phase | Tasks |
|-----|-------|-------|
| 1 | 1 & 2 | Install deps, create types, create fixtures |
| 2-3 | 3 | Pilot migration (comment-counter) with full TDD |
| 3 | 4 | Extract generic patterns, refactor pilot |
| 4-6 | 5 | Migrate remaining 7 handlers |
| 7 | 6 | Cleanup, documentation, final testing |

**Total**: ~7 days (1 developer, full-time)

---

## Additional Notes

### TypeScript Best Practices Used

1. **Generics** - `RecordHandler<TRecord, TResult>` for type-flexible handlers
2. **Type Guards** - `isDynamoDBRecord()`, `isKinesisRecord()` for runtime type safety
3. **Mapped Types** - Leverage AWS SDK types without `any`
4. **Conditional Types** - Future: could add `TEventType extends 'DynamoDB' | 'Kinesis'`
5. **No `any`** - All types explicit (except Lambda Context which is unavoidable)

### SOLID Principles Applied

1. **Single Responsibility** - Each handler does one thing (update one counter)
2. **Open/Closed** - `createCounterStreamHandler` is open for extension (custom validation)
3. **Liskov Substitution** - All handlers implement `DynamoDBStreamHandler`
4. **Interface Segregation** - Small, focused interfaces (`CounterStreamHandlerConfig`)
5. **Dependency Injection** - DynamoDB client injected, not hardcoded

### Testing Principles Followed

1. **No Mocks** - Only mock AWS SDK (infrastructure), not business logic
2. **DRY** - Reusable fixtures (`createLikeEntity`, etc.)
3. **Behavioral** - Test outcomes (DynamoDB updates), not implementation
4. **Type-Safe** - No `any` in tests
5. **RED-GREEN-REFACTOR** - Write failing test, make it pass, refactor

---

## Next Steps After Migration

1. **Enable Metrics** - Add `@aws-lambda-powertools/metrics` to track custom metrics
2. **Enable Tracer** - Add `@aws-lambda-powertools/tracer` for X-Ray integration
3. **Log Sampling** - Enable to reduce CloudWatch costs in production
4. **CloudWatch Insights** - Create dashboards using structured log fields
5. **Alerting** - Set up alarms on `errorCount` metric

---

## Questions?

- Review [AWS Powertools Docs](https://docs.powertools.aws.dev/lambda/typescript/latest/)
- Check [Batch Processing Guide](https://docs.powertools.aws.dev/lambda/typescript/latest/utilities/batch/)
- See `STREAMLOGGER_REPLACEMENT_ANALYSIS.md` for detailed feature comparison
