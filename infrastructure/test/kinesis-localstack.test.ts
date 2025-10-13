import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { KinesisClient, CreateStreamCommand, DescribeStreamCommand, DeleteStreamCommand } from '@aws-sdk/client-kinesis';

/**
 * Waits for a Kinesis stream to become ACTIVE
 *
 * @param client - Kinesis client
 * @param streamName - Name of the stream to wait for
 * @param maxAttempts - Maximum number of polling attempts
 * @param delayMs - Delay between attempts in milliseconds
 */
async function waitForStreamActive(
  client: KinesisClient,
  streamName: string,
  maxAttempts = 10,
  delayMs = 1000
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await client.send(new DescribeStreamCommand({
      StreamName: streamName
    }));

    if (response.StreamDescription?.StreamStatus === 'ACTIVE') {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  throw new Error(`Stream ${streamName} did not become ACTIVE after ${maxAttempts} attempts`);
}

/**
 * Integration tests for Kinesis with LocalStack
 * These tests verify that Kinesis operations work correctly with LocalStack
 *
 * Prerequisites:
 * - LocalStack must be running on localhost:4566
 * - Run with: pnpm test kinesis-localstack.test.ts
 */
describe('Kinesis LocalStack Integration', () => {
  const kinesisClient = new KinesisClient({
    endpoint: 'http://localhost:4566',
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test'
    }
  });

  let testStreamName: string;

  beforeAll(() => {
    testStreamName = `test-stream-${Date.now()}`;
  });

  afterAll(async () => {
    // Clean up test stream - wait a bit for it to be deletable
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await kinesisClient.send(new DeleteStreamCommand({
        StreamName: testStreamName,
        EnforceConsumerDeletion: true
      }));
    } catch (error) {
      // Ignore cleanup errors - stream might not exist or be in wrong state
    }
  });

  it('can create Kinesis stream in LocalStack', async () => {
    await kinesisClient.send(new CreateStreamCommand({
      StreamName: testStreamName,
      ShardCount: 1
    }));

    // Wait for stream to become active
    await waitForStreamActive(kinesisClient, testStreamName);

    const response = await kinesisClient.send(new DescribeStreamCommand({
      StreamName: testStreamName
    }));

    expect(response.StreamDescription?.StreamStatus).toBe('ACTIVE');
    expect(response.StreamDescription?.Shards).toHaveLength(1);
    expect(response.StreamDescription?.StreamName).toBe(testStreamName);
  }, 30000);

  it('can create stream with multiple shards', async () => {
    const multiShardStreamName = `multi-shard-${Date.now()}`;

    await kinesisClient.send(new CreateStreamCommand({
      StreamName: multiShardStreamName,
      ShardCount: 5
    }));

    // Wait for stream to become active
    await waitForStreamActive(kinesisClient, multiShardStreamName);

    const response = await kinesisClient.send(new DescribeStreamCommand({
      StreamName: multiShardStreamName
    }));

    expect(response.StreamDescription?.StreamStatus).toBe('ACTIVE');
    expect(response.StreamDescription?.Shards).toHaveLength(5);

    // Clean up - wait a bit before deletion
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
      await kinesisClient.send(new DeleteStreamCommand({
        StreamName: multiShardStreamName,
        EnforceConsumerDeletion: true
      }));
    } catch (error) {
      // Ignore cleanup errors
    }
  }, 30000);

  it('validates LocalStack endpoint is reachable', async () => {
    // This test validates the LocalStack connection
    const testName = `connectivity-test-${Date.now()}`;

    await kinesisClient.send(new CreateStreamCommand({
      StreamName: testName,
      ShardCount: 1
    }));

    // Wait for stream to become active
    await waitForStreamActive(kinesisClient, testName);

    // Verify stream exists
    const response = await kinesisClient.send(new DescribeStreamCommand({
      StreamName: testName
    }));

    expect(response.StreamDescription?.StreamStatus).toBe('ACTIVE');

    // Clean up - wait a bit before deletion
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
      await kinesisClient.send(new DeleteStreamCommand({
        StreamName: testName,
        EnforceConsumerDeletion: true
      }));
    } catch (error) {
      // Ignore cleanup errors
    }
  }, 30000);
});
