import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { verifyAccessToken, getJWTConfigFromEnv, type JWTPayload } from './jwt.js';

/**
 * Authentication result types
 */
export interface AuthSuccess {
  readonly success: true;
  readonly userId: string;
  readonly payload: JWTPayload;
}

export interface AuthFailure {
  readonly success: false;
  readonly statusCode: 401;
  readonly message: string;
}

export type AuthResult = AuthSuccess | AuthFailure;

/**
 * Authenticates an API Gateway request by extracting and verifying the JWT token
 * Handles both Authorization and authorization headers (case-insensitive)
 *
 * @param event - API Gateway event with authorization header
 * @returns Authentication result with user ID or error details
 *
 * @example
 * const authResult = await authenticateRequest(event);
 * if (!authResult.success) {
 *   return errorResponse(authResult.statusCode, authResult.message);
 * }
 * const userId = authResult.userId;
 */
export const authenticateRequest = async (
  event: APIGatewayProxyEventV2
): Promise<AuthResult> => {
  // Extract authorization header (case-insensitive)
  const authHeader = event.headers.authorization || event.headers.Authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return {
      success: false,
      statusCode: 401,
      message: 'Unauthorized'
    };
  }

  // Extract token from Bearer scheme
  const token = authHeader.substring(7);

  // Get JWT configuration from environment
  const jwtConfig = getJWTConfigFromEnv();

  // Verify and decode token
  const decoded = await verifyAccessToken(token, jwtConfig.secret);

  if (!decoded || !decoded.userId) {
    return {
      success: false,
      statusCode: 401,
      message: 'Invalid token'
    };
  }

  return {
    success: true,
    userId: decoded.userId,
    payload: decoded
  };
};
