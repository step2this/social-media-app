import { Stack, type StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';

/**
 * Configuration properties for KinesisStack
 */
export interface KinesisStackProps extends StackProps {
  /**
   * The environment name (e.g., 'local', 'dev', 'prod')
   * Used for naming resources and environment-specific configurations
   */
  environment: string;
}

/**
 * Kinesis Data Streams Stack
 *
 * Creates Kinesis Data Streams for event sourcing and real-time event processing.
 * Designed for Twitter-scale workloads with 365-day event replay capability.
 *
 * Features:
 * - 5 shards for horizontal scalability
 * - 365-day retention for complete event replay
 * - AWS managed encryption (KMS)
 * - LocalStack compatible for local development
 *
 * @example
 * ```typescript
 * const kinesisStack = new KinesisStack(app, 'KinesisStack', {
 *   environment: 'dev'
 * });
 *
 * // Access the stream for Lambda integration
 * const streamArn = kinesisStack.feedEventsStream.streamArn;
 * ```
 */
export class KinesisStack extends Stack {
  /**
   * The Kinesis Data Stream for feed events
   * Use this stream for:
   * - Publishing post creation events
   * - Publishing like events
   * - Publishing follow events
   * - Real-time feed fanout processing
   * - Event replay for historical analysis
   */
  public readonly feedEventsStream: kinesis.Stream;

  constructor(scope: Construct, id: string, props: KinesisStackProps) {
    super(scope, id);

    // Create Kinesis Data Stream for feed events
    // Twitter-scale configuration: 5 shards, 365-day retention
    this.feedEventsStream = new kinesis.Stream(this, 'FeedEventsStream', {
      streamName: `feed-events-${props.environment}`,

      // 5 shards for horizontal scalability
      // Each shard supports: 1 MB/s write, 2 MB/s read, 1000 writes/s
      // Total capacity: 5 MB/s write, 10 MB/s read, 5000 writes/s
      shardCount: 5,

      // 365-day retention for complete event replay capability
      // Enables:
      // - Historical feed reconstruction
      // - Compliance and audit requirements
      // - Machine learning training data
      // - Event replay for bug fixes
      retentionPeriod: Duration.days(365),

      // Provisioned mode for predictable capacity and cost
      streamMode: kinesis.StreamMode.PROVISIONED,

      // AWS managed encryption (KMS) for data at rest
      // Uses alias/aws/kinesis key
      encryption: kinesis.StreamEncryption.MANAGED
    });

    // Output stream name for Lambda configuration
    new CfnOutput(this, 'FeedEventsStreamName', {
      value: this.feedEventsStream.streamName,
      description: 'Kinesis stream name for feed events',
      exportName: `${props.environment}-feed-events-stream-name`
    });

    // Output stream ARN for IAM policies and Lambda event sources
    new CfnOutput(this, 'FeedEventsStreamArn', {
      value: this.feedEventsStream.streamArn,
      description: 'Kinesis stream ARN for feed events',
      exportName: `${props.environment}-feed-events-stream-arn`
    });
  }
}
