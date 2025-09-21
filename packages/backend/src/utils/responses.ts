import type { APIGatewayProxyResultV2 } from 'aws-lambda';

/**
 * Common CORS headers
 */
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
} as const;

/**
 * Create successful response
 */
export const successResponse = (statusCode: number, data: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify(data)
});

/**
 * Create error response
 */
export const errorResponse = (statusCode: number, message: string, details?: unknown): APIGatewayProxyResultV2 => {
  const responseBody = details
    ? { error: message, details }
    : { error: message };

  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(responseBody)
  };
};

/**
 * Create validation error response
 */
export const validationErrorResponse = (errors: unknown[]): APIGatewayProxyResultV2 =>
  errorResponse(400, 'Validation failed', errors);

/**
 * Create unauthorized response
 */
export const unauthorizedResponse = (message = 'Unauthorized'): APIGatewayProxyResultV2 =>
  errorResponse(401, message);

/**
 * Create forbidden response
 */
export const forbiddenResponse = (message = 'Forbidden'): APIGatewayProxyResultV2 =>
  errorResponse(403, message);

/**
 * Create not found response
 */
export const notFoundResponse = (message = 'Not found'): APIGatewayProxyResultV2 =>
  errorResponse(404, message);

/**
 * Create conflict response
 */
export const conflictResponse = (message = 'Resource already exists'): APIGatewayProxyResultV2 =>
  errorResponse(409, message);

/**
 * Create internal server error response
 */
export const internalServerErrorResponse = (message = 'Internal server error'): APIGatewayProxyResultV2 =>
  errorResponse(500, message);

/**
 * Create OPTIONS response for CORS preflight
 */
export const optionsResponse = (): APIGatewayProxyResultV2 => ({
  statusCode: 200,
  headers: CORS_HEADERS,
  body: ''
});