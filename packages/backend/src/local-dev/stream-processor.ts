import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBStreamsClient,
  GetRecordsCommand,
  GetShardIteratorCommand,
  DescribeStreamCommand,
  ListShardsCommand
} from '@aws-sdk/client-dynamodb-streams';

/**
 * Configuration for the stream processor
 */
export interface StreamProcessorConfig {
  tableName: string;
  endpoint: string;
  region: string;
  pollInterval?: number;
}

/**
 * Local development stream processor that polls DynamoDB Streams
 * and invokes Lambda handlers to maintain dev/prod parity
 */
export class StreamProcessor {
  private tableName: string;
  private endpoint: string;
  private region: string;
  private pollInterval: number;
  private dynamoClient: DynamoDBClient;
  private streamsClient: DynamoDBStreamsClient;
  private intervalId: NodeJS.Timeout | null = null;
  private shardIterator: string | null = null;
  private isRunning: boolean = false;

  constructor(config: StreamProcessorConfig) {
    this.tableName = config.tableName;
    this.endpoint = config.endpoint;
    this.region = config.region;
    this.pollInterval = config.pollInterval || 2000; // 2 seconds default

    this.dynamoClient = new DynamoDBClient({
      endpoint: this.endpoint,
      region: this.region,
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test'
      }
    });

    this.streamsClient = new DynamoDBStreamsClient({
      endpoint: this.endpoint,
      region: this.region,
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test'
      }
    });
  }

  /**
   * Discover the stream ARN from the DynamoDB table
   */
  async discoverStreamArn(): Promise<string> {
    const command = new DescribeTableCommand({
      TableName: this.tableName
    });

    const response = await this.dynamoClient.send(command);

    // Check if stream is enabled
    if (!response.Table?.StreamSpecification?.StreamEnabled) {
      throw new Error('DynamoDB Stream is not enabled on table');
    }

    // Check if stream ARN is available
    const streamArn = response.Table.LatestStreamArn;
    if (!streamArn) {
      throw new Error('Stream ARN not found on table');
    }

    return streamArn;
  }

  /**
   * Initialize shard iterator for the stream
   */
  private async initializeShardIterator(streamArn: string): Promise<void> {
    // Describe stream to get shard information
    const describeResponse = await this.streamsClient.send(
      new DescribeStreamCommand({ StreamArn: streamArn })
    );

    const shards = describeResponse.StreamDescription?.Shards || [];
    if (shards.length === 0) {
      throw new Error('No shards found in stream');
    }

    // Get iterator for first shard (simplified for local dev)
    const shardId = shards[0].ShardId;
    if (!shardId) {
      throw new Error('Shard ID not found');
    }

    const iteratorResponse = await this.streamsClient.send(
      new GetShardIteratorCommand({
        StreamArn: streamArn,
        ShardId: shardId,
        ShardIteratorType: 'LATEST' // Start from latest records
      })
    );

    this.shardIterator = iteratorResponse.ShardIterator || null;
  }

  /**
   * Poll for new records from the stream
   */
  private async poll(): Promise<void> {
    if (!this.shardIterator) {
      return;
    }

    try {
      const response = await this.streamsClient.send(
        new GetRecordsCommand({
          ShardIterator: this.shardIterator
        })
      );

      // Update iterator for next poll
      this.shardIterator = response.NextShardIterator || null;

      // TODO: Process records (will be implemented in Cycle 3)
    } catch (error) {
      console.error('Error polling stream:', error);
    }
  }

  /**
   * Start polling the DynamoDB Stream
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    // Discover stream ARN
    const streamArn = await this.discoverStreamArn();

    // Initialize shard iterator
    await this.initializeShardIterator(streamArn);

    // Start polling loop
    this.isRunning = true;
    this.intervalId = setInterval(async () => {
      if (this.isRunning) {
        await this.poll();
      }
    }, this.pollInterval);

    // Initial poll
    await this.poll();
  }

  /**
   * Stop polling the DynamoDB Stream
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
