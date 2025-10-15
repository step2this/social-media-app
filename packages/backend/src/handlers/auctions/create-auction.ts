import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { AuctionService } from '@social-media-app/auction-dal';
import {
  CreateAuctionRequestSchema,
  CreateAuctionResponseSchema,
} from '@social-media-app/shared';
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
 * Handler to create a new auction
 *
 * @description Creates a new auction listing with validation
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return errorResponse(400, 'Invalid JSON in request body');
    }

    // Validate request body
    const validatedRequest = CreateAuctionRequestSchema.parse(body);

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

    // Initialize AuctionService
    const pool = getPostgresPool();
    const auctionService = new AuctionService(pool);

    // Create auction
    const auction = await auctionService.createAuction(decoded.userId, validatedRequest);

    // Validate response
    const response = CreateAuctionResponseSchema.parse({ auction });

    return successResponse(201, response);
  } catch (error) {
    console.error('Error creating auction:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid request data', error.errors);
    }

    return errorResponse(500, 'Internal server error');
  }
};
