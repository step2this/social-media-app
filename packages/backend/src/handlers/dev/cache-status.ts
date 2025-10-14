import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DescribeStreamCommand } from '@aws-sdk/client-kinesis';
import Redis from 'ioredis';
import { successResponse, errorResponse } from '../../utils/index.js';
import {
  getRedisConfig,
  createKinesisClient,
  getKinesisStreamName,
  isLocalStackEnvironment
} from '../../utils/aws-config.js';

/**
 * Cache status response structure
 */
interface CacheStatusResponse {
  redis: {
    connected: boolean;
    latency?: number;
    error?: string;
  };
  stats: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  kinesis: {
    streamName: string;
    status: 'ACTIVE' | 'CREATING' | 'DELETING' | 'UPDATING' | 'UNKNOWN';
    error?: string;
  };
  environment: string;
}

/**
 * Lambda handler for cache status endpoint
 * Development-only endpoint for monitoring Redis and Kinesis status
 *
 * @param _event - API Gateway proxy event (unused, but required for Lambda signature)
 * @returns API Gateway proxy result with cache status
 */
export const handler = async (
  _event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Only allow in development environment
    const isDevelopment = process.env.NODE_ENV === 'development' || isLocalStackEnvironment();
    if (!isDevelopment) {
      return errorResponse(403, 'Cache status endpoint is only available in development');
    }

    // Initialize response structure
    const response: CacheStatusResponse = {
      redis: {
        connected: false
      },
      stats: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      kinesis: {
        streamName: getKinesisStreamName(),
        status: 'UNKNOWN'
      },
      environment: process.env.NODE_ENV || 'unknown'
    };

    // Check Redis connection and get stats
    let redisClient;
    try {
      // Create Redis client with enableOfflineQueue=true for dev endpoint
      // This allows graceful failure instead of throwing immediately
      const redisConfig = getRedisConfig();
      redisClient = new Redis({
        ...redisConfig,
        enableOfflineQueue: true, // Allow offline queue for dev status checks
        lazyConnect: true // Don't connect immediately
      });

      // Attempt connection
      await redisClient.connect();

      // Test connection with PING command and measure latency
      const startTime = Date.now();
      await redisClient.ping();
      const latency = Date.now() - startTime;

      response.redis.connected = true;
      response.redis.latency = latency;

      // Get cache statistics from Redis INFO command
      const info = await redisClient.info('stats');
      const statsMatch = info.match(/keyspace_hits:(\d+)\s+keyspace_misses:(\d+)/);

      if (statsMatch) {
        const hits = parseInt(statsMatch[1], 10);
        const misses = parseInt(statsMatch[2], 10);
        const total = hits + misses;

        response.stats = {
          hits,
          misses,
          hitRate: total > 0 ? parseFloat((hits / total).toFixed(4)) : 0
        };
      }
    } catch (error) {
      response.redis.connected = false;
      response.redis.error = error instanceof Error ? error.message : 'Unknown error';
      console.warn('[dev/cache-status] Redis connection failed (this is OK in dev):', error);
    } finally {
      // Clean up Redis connection - gracefully handle disconnected client
      if (redisClient) {
        try {
          await redisClient.quit();
        } catch (quitError) {
          // Ignore quit errors if already disconnected
          console.warn('[dev/cache-status] Redis quit failed (already disconnected)');
        }
      }
    }

    // Check Kinesis stream status
    try {
      const kinesisClient = createKinesisClient();
      const streamName = getKinesisStreamName();

      const command = new DescribeStreamCommand({
        StreamName: streamName
      });

      const result = await kinesisClient.send(command);
      const streamStatus = result.StreamDescription?.StreamStatus;

      // Map AWS stream status to our type-safe enum
      if (streamStatus) {
        response.kinesis.status = streamStatus as CacheStatusResponse['kinesis']['status'];
      }
    } catch (error) {
      response.kinesis.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('[dev/cache-status] Kinesis status check failed:', error);
    }

    return successResponse(200, response);
  } catch (error) {
    console.error('[dev/cache-status] Unexpected error:', error);
    return errorResponse(
      500,
      'Failed to retrieve cache status',
      error instanceof Error ? error.message : undefined
    );
  }
};
