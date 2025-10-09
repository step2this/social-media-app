import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBStreamsClient,
  GetRecordsCommand,
  GetShardIteratorCommand,
  DescribeStreamCommand
} from '@aws-sdk/client-dynamodb-streams';
import type { DynamoDBStreamEvent, DynamoDBStreamHandler, Context } from 'aws-lambda';

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
  private handlers: DynamoDBStreamHandler[] = [];

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
        ShardIteratorType: 'TRIM_HORIZON' // Start from beginning to process all records
      })
    );

    this.shardIterator = iteratorResponse.ShardIterator || null;
  }

  /**
   * Register a Lambda handler to process stream records
   */
  registerHandler(handler: DynamoDBStreamHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Transform DynamoDB Streams records to Lambda event format
   */
  private transformRecordsToEvent(records: any[]): DynamoDBStreamEvent {
    return {
      Records: records.map(record => ({
        eventID: record.eventID || '',
        eventName: record.eventName as any,
        eventVersion: record.eventVersion || '1.1',
        eventSource: 'aws:dynamodb',
        awsRegion: this.region,
        dynamodb: record.dynamodb,
        eventSourceARN: record.eventSourceARN || ''
      }))
    };
  }

  /**
   * Process records by calling registered handlers
   * Errors in individual handlers are logged but don't stop processing
   */
  private async processRecords(records: any[]): Promise<void> {
    if (records.length === 0 || this.handlers.length === 0) {
      return;
    }

    const event = this.transformRecordsToEvent(records);

    // Create minimal Lambda context for local invocation
    const context: Context = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'stream-processor',
      functionVersion: '$LATEST',
      invokedFunctionArn: 'local',
      memoryLimitInMB: '512',
      awsRequestId: Math.random().toString(36).substring(7),
      logGroupName: '/aws/lambda/stream-processor',
      logStreamName: new Date().toISOString(),
      getRemainingTimeInMillis: () => 30000,
      done: () => {},
      fail: () => {},
      succeed: () => {}
    };

    // Call all registered handlers with individual error handling
    await Promise.all(
      this.handlers.map(async handler => {
        try {
          await handler(event, context, () => {});
        } catch (error) {
          console.error('Handler error (continuing processing):', error);
        }
      })
    );
  }

  /**
   * Poll for new records from the stream
   */
  private async poll(): Promise<void> {
    if (!this.shardIterator) {
      console.log('⚠️  Stream processor: No shard iterator available');
      return;
    }

    try {
      console.log('🔄 Polling DynamoDB Stream...');
      const response = await this.streamsClient.send(
        new GetRecordsCommand({
          ShardIterator: this.shardIterator
        })
      );

      // Update iterator for next poll
      this.shardIterator = response.NextShardIterator || null;

      // Process records if any
      if (response.Records && response.Records.length > 0) {
        console.log(`✅ Found ${response.Records.length} stream record(s)`);
        await this.processRecords(response.Records);
      } else {
        console.log('📭 No new records');
      }
    } catch (error) {
      console.error('❌ Error polling stream:', error);
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
