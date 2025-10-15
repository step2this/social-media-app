import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { AuctionService } from '@social-media-app/auction-dal';
import {
  ListAuctionsRequestSchema,
  ListAuctionsResponseSchema,
} from '@social-media-app/shared';
import { errorResponse, successResponse } from '../../utils/index.js';
import { Pool } from 'pg';
import { z } from 'zod';

// Initialize PostgreSQL pool at container scope for warm start optimization
let poolInstance: Pool | null = null;

function getPostgresPool(): Pool {
  if (!poolInstance) {
    poolInstance = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'auctions_dev',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return poolInstance;
}

/**
 * Handler to list auctions with filtering
 *
 * @description Lists auctions with optional status and userId filters
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const request = {
      status: queryParams.status as any,
      userId: queryParams.userId,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 24,
      cursor: queryParams.cursor,
    };

    // Validate request
    const validatedRequest = ListAuctionsRequestSchema.parse(request);

    // Initialize AuctionService
    const pool = getPostgresPool();
    const auctionService = new AuctionService(pool);

    // List auctions
    const result = await auctionService.listAuctions(validatedRequest);

    // Validate response
    const response = ListAuctionsResponseSchema.parse(result);

    return successResponse(200, response);
  } catch (error) {
    console.error('Error listing auctions:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid request parameters', error.errors);
    }

    return errorResponse(500, 'Internal server error');
  }
};
