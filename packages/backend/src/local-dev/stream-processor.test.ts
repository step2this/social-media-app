import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBStreamsClient,
  GetRecordsCommand,
  GetShardIteratorCommand,
  DescribeStreamCommand
} from '@aws-sdk/client-dynamodb-streams';
import { mockClient } from 'aws-sdk-client-mock';
import { StreamProcessor } from './stream-processor.js';

// Mock the clients
const dynamoMock = mockClient(DynamoDBClient);
const streamsMock = mockClient(DynamoDBStreamsClient);

describe('StreamProcessor - TDD Cycle 1: Stream Discovery', () => {
  beforeEach(() => {
    dynamoMock.reset();
  });

  it('should discover stream ARN from DynamoDB table', async () => {
    // Arrange
    const tableName = 'test-table';
    const expectedStreamArn = 'arn:aws:dynamodb:us-east-1:000000000000:table/test-table/stream/2024-01-01T00:00:00.000';

    dynamoMock.on(DescribeTableCommand).resolves({
      Table: {
        LatestStreamArn: expectedStreamArn,
        StreamSpecification: {
          StreamEnabled: true,
          StreamViewType: 'NEW_AND_OLD_IMAGES'
        }
      }
    });

    // Act
    const processor = new StreamProcessor({
      tableName,
      endpoint: 'http://localhost:4566',
      region: 'us-east-1'
    });

    const streamArn = await processor.discoverStreamArn();

    // Assert
    expect(streamArn).toBe(expectedStreamArn);
  });

  it('should throw error when stream is not enabled', async () => {
    // Arrange
    const tableName = 'test-table';

    dynamoMock.on(DescribeTableCommand).resolves({
      Table: {
        StreamSpecification: {
          StreamEnabled: false
        }
      }
    });

    // Act & Assert
    const processor = new StreamProcessor({
      tableName,
      endpoint: 'http://localhost:4566',
      region: 'us-east-1'
    });

    await expect(processor.discoverStreamArn()).rejects.toThrow('DynamoDB Stream is not enabled');
  });

  it('should throw error when stream ARN is not available', async () => {
    // Arrange
    const tableName = 'test-table';

    dynamoMock.on(DescribeTableCommand).resolves({
      Table: {
        StreamSpecification: {
          StreamEnabled: true,
          StreamViewType: 'NEW_AND_OLD_IMAGES'
        }
      }
    });

    // Act & Assert
    const processor = new StreamProcessor({
      tableName,
      endpoint: 'http://localhost:4566',
      region: 'us-east-1'
    });

    await expect(processor.discoverStreamArn()).rejects.toThrow('Stream ARN not found');
  });
});

describe('StreamProcessor - TDD Cycle 2: Polling Loop', () => {
  beforeEach(() => {
    dynamoMock.reset();
    streamsMock.reset();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start polling when start() is called', async () => {
    // Arrange
    const streamArn = 'arn:aws:dynamodb:us-east-1:000000000000:table/test-table/stream/2024-01-01T00:00:00.000';

    dynamoMock.on(DescribeTableCommand).resolves({
      Table: {
        LatestStreamArn: streamArn,
        StreamSpecification: {
          StreamEnabled: true,
          StreamViewType: 'NEW_AND_OLD_IMAGES'
        }
      }
    });

    streamsMock.on(DescribeStreamCommand).resolves({
      StreamDescription: {
        Shards: [
          {
            ShardId: 'shard-001'
          }
        ]
      }
    });

    streamsMock.on(GetShardIteratorCommand).resolves({
      ShardIterator: 'test-iterator'
    });

    streamsMock.on(GetRecordsCommand).resolves({
      Records: [],
      NextShardIterator: 'next-iterator'
    });

    // Act
    const processor = new StreamProcessor({
      tableName: 'test-table',
      endpoint: 'http://localhost:4566',
      region: 'us-east-1',
      pollInterval: 1000
    });

    await processor.start();

    // Fast-forward time to trigger multiple polls
    await vi.advanceTimersByTimeAsync(3000);

    // Assert - should have called GetRecords at least 3 times (initial + 2 intervals)
    expect(streamsMock.commandCalls(GetRecordsCommand).length).toBeGreaterThanOrEqual(3);

    await processor.stop();
  });

  it('should stop polling when stop() is called', async () => {
    // Arrange
    const streamArn = 'arn:aws:dynamodb:us-east-1:000000000000:table/test-table/stream/2024-01-01T00:00:00.000';

    dynamoMock.on(DescribeTableCommand).resolves({
      Table: {
        LatestStreamArn: streamArn,
        StreamSpecification: {
          StreamEnabled: true,
          StreamViewType: 'NEW_AND_OLD_IMAGES'
        }
      }
    });

    streamsMock.on(DescribeStreamCommand).resolves({
      StreamDescription: {
        Shards: [
          {
            ShardId: 'shard-001'
          }
        ]
      }
    });

    streamsMock.on(GetShardIteratorCommand).resolves({
      ShardIterator: 'test-iterator'
    });

    streamsMock.on(GetRecordsCommand).resolves({
      Records: [],
      NextShardIterator: 'next-iterator'
    });

    // Act
    const processor = new StreamProcessor({
      tableName: 'test-table',
      endpoint: 'http://localhost:4566',
      region: 'us-east-1',
      pollInterval: 1000
    });

    await processor.start();
    await vi.advanceTimersByTimeAsync(2000);
    const callsBeforeStop = streamsMock.commandCalls(GetRecordsCommand).length;

    await processor.stop();
    await vi.advanceTimersByTimeAsync(5000);
    const callsAfterStop = streamsMock.commandCalls(GetRecordsCommand).length;

    // Assert - no additional calls after stop
    expect(callsAfterStop).toBe(callsBeforeStop);
  });

  it('should use NextShardIterator for subsequent polls', async () => {
    // Arrange
    const streamArn = 'arn:aws:dynamodb:us-east-1:000000000000:table/test-table/stream/2024-01-01T00:00:00.000';

    dynamoMock.on(DescribeTableCommand).resolves({
      Table: {
        LatestStreamArn: streamArn,
        StreamSpecification: {
          StreamEnabled: true,
          StreamViewType: 'NEW_AND_OLD_IMAGES'
        }
      }
    });

    streamsMock.on(DescribeStreamCommand).resolves({
      StreamDescription: {
        Shards: [
          {
            ShardId: 'shard-001'
          }
        ]
      }
    });

    streamsMock.on(GetShardIteratorCommand).resolves({
      ShardIterator: 'initial-iterator'
    });

    streamsMock.on(GetRecordsCommand).resolves({
      Records: [],
      NextShardIterator: 'next-iterator'
    });

    // Act
    const processor = new StreamProcessor({
      tableName: 'test-table',
      endpoint: 'http://localhost:4566',
      region: 'us-east-1',
      pollInterval: 1000
    });

    await processor.start();
    await vi.advanceTimersByTimeAsync(2000);

    // Assert - verify GetRecords was called with the iterator
    const calls = streamsMock.commandCalls(GetRecordsCommand);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0].args[0].input.ShardIterator).toBe('initial-iterator');

    await processor.stop();
  });
});

describe('StreamProcessor - TDD Cycle 3: Record Processing', () => {
  beforeEach(() => {
    dynamoMock.reset();
    streamsMock.reset();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should transform and process stream records', async () => {
    // Arrange
    const streamArn = 'arn:aws:dynamodb:us-east-1:000000000000:table/test-table/stream/2024-01-01T00:00:00.000';
    const mockHandler = vi.fn().mockResolvedValue(undefined);

    dynamoMock.on(DescribeTableCommand).resolves({
      Table: {
        LatestStreamArn: streamArn,
        StreamSpecification: {
          StreamEnabled: true,
          StreamViewType: 'NEW_AND_OLD_IMAGES'
        }
      }
    });

    streamsMock.on(DescribeStreamCommand).resolves({
      StreamDescription: {
        Shards: [{ ShardId: 'shard-001' }]
      }
    });

    streamsMock.on(GetShardIteratorCommand).resolves({
      ShardIterator: 'test-iterator'
    });

    // Mock stream records
    streamsMock.on(GetRecordsCommand).resolvesOnce({
      Records: [
        {
          eventID: '1',
          eventName: 'INSERT',
          dynamodb: {
            Keys: {
              PK: { S: 'USER#123' },
              SK: { S: 'FOLLOW#456' }
            },
            NewImage: {
              PK: { S: 'USER#123' },
              SK: { S: 'FOLLOW#456' }
            }
          }
        }
      ],
      NextShardIterator: 'next-iterator'
    }).resolves({
      Records: [],
      NextShardIterator: 'next-iterator'
    });

    // Act
    const processor = new StreamProcessor({
      tableName: 'test-table',
      endpoint: 'http://localhost:4566',
      region: 'us-east-1',
      pollInterval: 100
    });

    processor.registerHandler(mockHandler);
    await processor.start();
    await vi.advanceTimersByTimeAsync(200);

    // Assert
    expect(mockHandler).toHaveBeenCalled();
    const callArg = mockHandler.mock.calls[0][0];
    expect(callArg.Records).toHaveLength(1);
    expect(callArg.Records[0].eventName).toBe('INSERT');

    await processor.stop();
  });

  it('should handle records without a registered handler gracefully', async () => {
    // Arrange
    const streamArn = 'arn:aws:dynamodb:us-east-1:000000000000:table/test-table/stream/2024-01-01T00:00:00.000';

    dynamoMock.on(DescribeTableCommand).resolves({
      Table: {
        LatestStreamArn: streamArn,
        StreamSpecification: {
          StreamEnabled: true,
          StreamViewType: 'NEW_AND_OLD_IMAGES'
        }
      }
    });

    streamsMock.on(DescribeStreamCommand).resolves({
      StreamDescription: {
        Shards: [{ ShardId: 'shard-001' }]
      }
    });

    streamsMock.on(GetShardIteratorCommand).resolves({
      ShardIterator: 'test-iterator'
    });

    streamsMock.on(GetRecordsCommand).resolves({
      Records: [
        {
          eventID: '1',
          eventName: 'INSERT',
          dynamodb: {
            NewImage: {
              PK: { S: 'USER#123' },
              SK: { S: 'FOLLOW#456' }
            }
          }
        }
      ],
      NextShardIterator: 'next-iterator'
    });

    // Act & Assert - should not throw
    const processor = new StreamProcessor({
      tableName: 'test-table',
      endpoint: 'http://localhost:4566',
      region: 'us-east-1',
      pollInterval: 100
    });

    await processor.start();
    await vi.advanceTimersByTimeAsync(200);
    await processor.stop();

    // If we get here without error, test passes
    expect(true).toBe(true);
  });

  it('should skip empty record batches', async () => {
    // Arrange
    const streamArn = 'arn:aws:dynamodb:us-east-1:000000000000:table/test-table/stream/2024-01-01T00:00:00.000';
    const mockHandler = vi.fn().mockResolvedValue(undefined);

    dynamoMock.on(DescribeTableCommand).resolves({
      Table: {
        LatestStreamArn: streamArn,
        StreamSpecification: {
          StreamEnabled: true,
          StreamViewType: 'NEW_AND_OLD_IMAGES'
        }
      }
    });

    streamsMock.on(DescribeStreamCommand).resolves({
      StreamDescription: {
        Shards: [{ ShardId: 'shard-001' }]
      }
    });

    streamsMock.on(GetShardIteratorCommand).resolves({
      ShardIterator: 'test-iterator'
    });

    streamsMock.on(GetRecordsCommand).resolves({
      Records: [],
      NextShardIterator: 'next-iterator'
    });

    // Act
    const processor = new StreamProcessor({
      tableName: 'test-table',
      endpoint: 'http://localhost:4566',
      region: 'us-east-1',
      pollInterval: 100
    });

    processor.registerHandler(mockHandler);
    await processor.start();
    await vi.advanceTimersByTimeAsync(200);

    // Assert - handler should not be called for empty batches
    expect(mockHandler).not.toHaveBeenCalled();

    await processor.stop();
  });
});

describe('StreamProcessor - TDD Cycle 5: Error Handling', () => {
  beforeEach(() => {
    dynamoMock.reset();
    streamsMock.reset();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should continue processing if handler throws error', async () => {
    // Arrange
    const streamArn = 'arn:aws:dynamodb:us-east-1:000000000000:table/test-table/stream/2024-01-01T00:00:00.000';
    const failingHandler = vi.fn().mockRejectedValue(new Error('Handler failed'));
    const successHandler = vi.fn().mockResolvedValue(undefined);

    dynamoMock.on(DescribeTableCommand).resolves({
      Table: {
        LatestStreamArn: streamArn,
        StreamSpecification: {
          StreamEnabled: true,
          StreamViewType: 'NEW_AND_OLD_IMAGES'
        }
      }
    });

    streamsMock.on(DescribeStreamCommand).resolves({
      StreamDescription: {
        Shards: [{ ShardId: 'shard-001' }]
      }
    });

    streamsMock.on(GetShardIteratorCommand).resolves({
      ShardIterator: 'test-iterator'
    });

    streamsMock.on(GetRecordsCommand).resolvesOnce({
      Records: [
        {
          eventID: '1',
          eventName: 'INSERT',
          dynamodb: {
            NewImage: {
              PK: { S: 'USER#123' },
              SK: { S: 'FOLLOW#456' }
            }
          }
        }
      ],
      NextShardIterator: 'next-iterator'
    }).resolves({
      Records: [],
      NextShardIterator: 'next-iterator'
    });

    // Act
    const processor = new StreamProcessor({
      tableName: 'test-table',
      endpoint: 'http://localhost:4566',
      region: 'us-east-1',
      pollInterval: 100
    });

    processor.registerHandler(failingHandler);
    processor.registerHandler(successHandler);

    await processor.start();
    await vi.advanceTimersByTimeAsync(200);

    // Assert - both handlers should be called despite first one failing
    expect(failingHandler).toHaveBeenCalled();
    expect(successHandler).toHaveBeenCalled();

    await processor.stop();
  });

  it('should continue polling after handler error', async () => {
    // Arrange
    const streamArn = 'arn:aws:dynamodb:us-east-1:000000000000:table/test-table/stream/2024-01-01T00:00:00.000';
    const failingHandler = vi.fn()
      .mockRejectedValueOnce(new Error('First fail'))
      .mockResolvedValue(undefined);

    dynamoMock.on(DescribeTableCommand).resolves({
      Table: {
        LatestStreamArn: streamArn,
        StreamSpecification: {
          StreamEnabled: true,
          StreamViewType: 'NEW_AND_OLD_IMAGES'
        }
      }
    });

    streamsMock.on(DescribeStreamCommand).resolves({
      StreamDescription: {
        Shards: [{ ShardId: 'shard-001' }]
      }
    });

    streamsMock.on(GetShardIteratorCommand).resolves({
      ShardIterator: 'test-iterator'
    });

    streamsMock.on(GetRecordsCommand).resolves({
      Records: [
        {
          eventID: '1',
          eventName: 'INSERT',
          dynamodb: {
            NewImage: {
              PK: { S: 'USER#123' },
              SK: { S: 'FOLLOW#456' }
            }
          }
        }
      ],
      NextShardIterator: 'next-iterator'
    });

    // Act
    const processor = new StreamProcessor({
      tableName: 'test-table',
      endpoint: 'http://localhost:4566',
      region: 'us-east-1',
      pollInterval: 100
    });

    processor.registerHandler(failingHandler);

    await processor.start();
    await vi.advanceTimersByTimeAsync(300);

    // Assert - handler should be called multiple times (continues polling)
    expect(failingHandler.mock.calls.length).toBeGreaterThanOrEqual(2);

    await processor.stop();
  });
});
