import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { AuctionService } from '@social-media-app/auction-dal';
import { ActivateAuctionResponseSchema } from '@social-media-app/shared';
import {
  errorResponse,
  successResponse,
  verifyAccessToken,
  getJWTConfigFromEnv,
} from '../../utils/index.js';
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
 * Handler to activate a pending auction
 *
 * @description Changes auction status from pending to active (owner only)
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Verify authentication
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse(401, 'Unauthorized');
    }

    const token = authHeader.substring(7);
    const jwtConfig = getJWTConfigFromEnv();
    const decoded = await verifyAccessToken(token, jwtConfig.secret);

    if (!decoded || !decoded.userId) {
      return errorResponse(401, 'Invalid token');
    }

    // Get auction ID from path parameters
    const auctionId = event.pathParameters?.auctionId;

    if (!auctionId) {
      return errorResponse(400, 'Auction ID is required');
    }

    // Initialize AuctionService
    const pool = getPostgresPool();
    const auctionService = new AuctionService(pool);

    // Check ownership - get current auction first
    try {
      const currentAuction = await auctionService.getAuction(auctionId);

      // Verify user is the auction owner
      if (currentAuction.userId !== decoded.userId) {
        return errorResponse(403, 'Only auction owner can activate');
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Auction not found') {
          return errorResponse(404, 'Auction not found');
        }
        if (error.message.includes('invalid input syntax for type uuid')) {
          return errorResponse(400, 'Invalid auction ID format');
        }
      }
      throw error;
    }

    // Activate the auction
    const auction = await auctionService.activateAuction(auctionId);

    // Validate response
    const response = ActivateAuctionResponseSchema.parse({ auction });

    return successResponse(200, response);
  } catch (error) {
    console.error('Error activating auction:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid response data', error.errors);
    }

    return errorResponse(500, 'Internal server error');
  }
};
