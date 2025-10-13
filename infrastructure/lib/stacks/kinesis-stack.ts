import { Stack, type StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuration properties for KinesisStack
 */
export interface KinesisStackProps extends StackProps {
  /**
   * The environment name (e.g., 'local', 'dev', 'prod')
   * Used for naming resources and environment-specific configurations
   */
  environment: string;

  /**
   * DynamoDB table for feed data operations
   */
  table: dynamodb.Table;

  /**
   * Redis cache endpoint for feed caching
   */
  redisEndpoint: string;

  /**
   * Redis cache port
   */
  redisPort: number;
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

  /**
   * Lambda function that processes Kinesis feed events
   */
  public readonly kinesisConsumerLambda: NodejsFunction;

  /**
   * Dead Letter Queue for failed Kinesis event processing
   */
  public readonly consumerDlq: sqs.Queue;

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

    // Create Dead Letter Queue for failed events
    this.consumerDlq = new sqs.Queue(this, 'KinesisConsumerDLQ', {
      queueName: `kinesis-consumer-dlq-${props.environment}`,
      retentionPeriod: Duration.days(14),
      visibilityTimeout: Duration.seconds(300),
      encryption: sqs.QueueEncryption.KMS_MANAGED
    });

    // Create Kinesis Consumer Lambda
    this.kinesisConsumerLambda = new NodejsFunction(this, 'KinesisFeedConsumer', {
      functionName: `kinesis-feed-consumer-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../packages/backend/src/handlers/streams/kinesis-feed-consumer.ts'),
      handler: 'handler',
      memorySize: 512,
      timeout: Duration.seconds(60),
      environment: {
        TABLE_NAME: props.table.tableName,
        REDIS_ENDPOINT: props.redisEndpoint,
        REDIS_PORT: props.redisPort.toString(),
        USE_LOCALSTACK: props.environment === 'local' ? 'true' : 'false',
        LOCALSTACK_ENDPOINT: props.environment === 'local' ? 'http://localhost:4566' : '',
        NODE_ENV: props.environment,
        LOG_LEVEL: props.environment === 'prod' ? 'warn' : 'debug'
      },
      description: 'Processes Kinesis feed events and updates Redis cache',
      projectRoot: path.join(__dirname, '../../../'),
      depsLockFilePath: path.join(__dirname, '../../../pnpm-lock.yaml'),
      bundling: {
        format: OutputFormat.ESM,
        target: 'es2022',
        platform: 'node',
        mainFields: ['module', 'main']
      }
    });

    // Grant permissions to Lambda
    // Kinesis permissions (automatically granted by event source mapping)
    this.feedEventsStream.grantRead(this.kinesisConsumerLambda);

    // DLQ permissions
    this.consumerDlq.grantSendMessages(this.kinesisConsumerLambda);

    // DynamoDB permissions for cache invalidation queries
    props.table.grantReadWriteData(this.kinesisConsumerLambda);

    // Create Kinesis Event Source Mapping
    new lambda.EventSourceMapping(this, 'KinesisEventSource', {
      target: this.kinesisConsumerLambda,
      eventSourceArn: this.feedEventsStream.streamArn,
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 100, // Max records per invocation
      maxBatchingWindow: Duration.seconds(10),
      parallelizationFactor: 1, // Process 1 shard at a time
      retryAttempts: 2,
      bisectBatchOnError: true, // Split batch on error for better isolation
      onFailure: new lambdaEventSources.SqsDlq(this.consumerDlq),
      reportBatchItemFailures: true, // Use batch item failures for partial success
      enabled: true
    });

    // Create CloudWatch Alarms (optional but recommended)
    if (props.environment !== 'local') {
      new cloudwatch.Alarm(this, 'DLQAlarm', {
        metric: this.consumerDlq.metricApproximateNumberOfMessagesVisible(),
        threshold: 10,
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
        alarmDescription: 'Alert when Kinesis consumer DLQ has >10 messages',
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
      });

      new cloudwatch.Alarm(this, 'ConsumerErrorAlarm', {
        metric: this.kinesisConsumerLambda.metricErrors(),
        threshold: 50,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        alarmDescription: 'Alert when Kinesis consumer Lambda has >50 errors in 2 periods',
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
      });
    }

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

    // Output DLQ URL for monitoring
    new CfnOutput(this, 'ConsumerDLQUrl', {
      value: this.consumerDlq.queueUrl,
      description: 'Dead Letter Queue URL for failed Kinesis events',
      exportName: `${props.environment}-kinesis-consumer-dlq-url`
    });

    // Output Lambda ARN for monitoring
    new CfnOutput(this, 'ConsumerLambdaArn', {
      value: this.kinesisConsumerLambda.functionArn,
      description: 'Kinesis consumer Lambda ARN',
      exportName: `${props.environment}-kinesis-consumer-lambda-arn`
    });
  }
}
