import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';

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
}
