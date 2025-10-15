import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { AuctionService } from '@social-media-app/auction-dal';
import { GetAuctionResponseSchema } from '@social-media-app/shared';
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
 * Handler to get an auction by ID
 *
 * @description Retrieves a single auction with its details
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Get auctionId from path parameters
    const auctionId = event.pathParameters?.auctionId;

    if (!auctionId) {
      return errorResponse(400, 'Auction ID is required');
    }

    // Initialize AuctionService
    const pool = getPostgresPool();
    const auctionService = new AuctionService(pool);

    // Get auction
    const auction = await auctionService.getAuction(auctionId);

    // Validate response
    const response = GetAuctionResponseSchema.parse({ auction });

    return successResponse(200, response);
  } catch (error) {
    console.error('Error getting auction:', error);

    if (error instanceof Error && error.message === 'Auction not found') {
      return errorResponse(404, 'Auction not found');
    }

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid response data', error.errors);
    }

    return errorResponse(500, 'Internal server error');
  }
};
