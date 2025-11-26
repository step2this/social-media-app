import { AwsInstrumentation } from '@opentelemetry/instrumentation-aws-sdk';

/**
 * Create AWS SDK instrumentation
 *
 * Configured to suppress internal AWS SDK noise and enable
 * SQS context propagation for distributed tracing.
 *
 * @returns Configured AWS SDK instrumentation
 *
 * @example
 * ```typescript
 * const awsInst = createAWSInstrumentation();
 * // Automatically instruments AWS SDK calls (DynamoDB, S3, SQS, etc.)
 * ```
 */
export function createAWSInstrumentation(): AwsInstrumentation {
  return new AwsInstrumentation({
    // Suppress internal AWS SDK instrumentation to reduce noise
    // Prevents duplicate spans for internal AWS SDK operations
    suppressInternalInstrumentation: true,

    // Extract context from SQS message payload for distributed tracing
    // Enables trace propagation across SQS messages
    sqsExtractContextPropagationFromPayload: true,
  });
}
