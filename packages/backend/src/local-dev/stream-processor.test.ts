import { describe, it, expect, beforeEach } from 'vitest';
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { StreamProcessor } from './stream-processor.js';

// Mock the DynamoDB client
const dynamoMock = mockClient(DynamoDBClient);

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
