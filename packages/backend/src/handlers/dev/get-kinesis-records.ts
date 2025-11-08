import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import {
  GetShardIteratorCommand,
  GetRecordsCommand,
  type GetRecordsCommandOutput
} from '@aws-sdk/client-kinesis';
import { successResponse, errorResponse } from '../../utils/index.js';
import {
  createKinesisClient,
  getKinesisStreamName,
  isLocalStackEnvironment
} from '../../utils/aws-config.js';
import { compose } from '../../infrastructure/middleware/compose.js';
import { withErrorHandling } from '../../infrastructure/middleware/withErrorHandling.js';
import { withLogging } from '../../infrastructure/middleware/withLogging.js';

/**
 * Kinesis record for dev monitoring
 */
interface KinesisRecordView {
  sequenceNumber: string;
  approximateArrivalTimestamp: string;
  data: Record<string, any>;
  partitionKey: string;
}

/**
 * Response structure for Kinesis records endpoint
 */
interface GetKinesisRecordsResponse {
  streamName: string;
  records: KinesisRecordView[];
  totalRecords: number;
  nextShardIterator?: string;
  millisBehindLatest: number;
}

/**
 * Lambda handler for Kinesis records dev endpoint
 * Development-only endpoint for monitoring Kinesis stream records
 */
export const handler = compose(
  withErrorHandling(),
  withLogging(),
  async (event: APIGatewayProxyEventV2) => {
    // Only allow in development environment
    const isDevelopment = process.env.NODE_ENV === 'development' || isLocalStackEnvironment();
    if (!isDevelopment) {
      return errorResponse(403, 'Kinesis records endpoint is only available in development');
    }

    // Parse query parameters
    const limit = parseInt(event.queryStringParameters?.limit || '50', 10);
    const shardIteratorType = event.queryStringParameters?.iteratorType || 'LATEST';

    if (limit < 1 || limit > 100) {
      return errorResponse(400, 'Limit must be between 1 and 100');
    }

    const streamName = getKinesisStreamName();
    const kinesisClient = createKinesisClient();

    // Get shard iterator (assuming single shard for dev)
    const shardId = 'shardId-000000000000';

    const getShardIteratorCommand = new GetShardIteratorCommand({
      StreamName: streamName,
      ShardId: shardId,
      ShardIteratorType: shardIteratorType as any
    });

    const shardIteratorResult = await kinesisClient.send(getShardIteratorCommand);

    if (!shardIteratorResult.ShardIterator) {
      return errorResponse(500, 'Failed to get shard iterator');
    }

    // Get records from the stream
    const getRecordsCommand = new GetRecordsCommand({
      ShardIterator: shardIteratorResult.ShardIterator,
      Limit: limit
    });

    const recordsResult: GetRecordsCommandOutput = await kinesisClient.send(getRecordsCommand);

    // Parse and format records
    const records: KinesisRecordView[] = (recordsResult.Records || []).map((record) => {
      // Decode base64 data
      const dataString = Buffer.from(record.Data || new Uint8Array()).toString('utf-8');
      let parsedData: Record<string, any>;

      try {
        parsedData = JSON.parse(dataString);
      } catch {
        parsedData = { raw: dataString };
      }

      return {
        sequenceNumber: record.SequenceNumber || 'unknown',
        approximateArrivalTimestamp: record.ApproximateArrivalTimestamp?.toISOString() || new Date().toISOString(),
        data: parsedData,
        partitionKey: record.PartitionKey || 'unknown'
      };
    });

    const response: GetKinesisRecordsResponse = {
      streamName,
      records,
      totalRecords: records.length,
      nextShardIterator: recordsResult.NextShardIterator,
      millisBehindLatest: recordsResult.MillisBehindLatest || 0
    };

    return successResponse(200, response);
  }
);
