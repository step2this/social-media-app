import { Stack, type StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
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
export declare class KinesisStack extends Stack {
    /**
     * The Kinesis Data Stream for feed events
     * Use this stream for:
     * - Publishing post creation events
     * - Publishing like events
     * - Publishing follow events
     * - Real-time feed fanout processing
     * - Event replay for historical analysis
     */
    readonly feedEventsStream: kinesis.Stream;
    /**
     * Lambda function that processes Kinesis feed events
     */
    readonly kinesisConsumerLambda: NodejsFunction;
    /**
     * Dead Letter Queue for failed Kinesis event processing
     */
    readonly consumerDlq: sqs.Queue;
    constructor(scope: Construct, id: string, props: KinesisStackProps);
}
//# sourceMappingURL=kinesis-stack.d.ts.map