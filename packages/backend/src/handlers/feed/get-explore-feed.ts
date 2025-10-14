/**
 * GET /feed/explore - Public Explore Feed Handler
 *
 * Returns all public posts from all users for the Explore page.
 * This endpoint is public (no authentication required) but supports
 * optional authentication to set the `isLiked` flag for authenticated users.
 *
 * Architecture:
 * - Queries GSI3 index: GSI3PK = 'POSTS' (all public posts)
 * - Sorted by GSI3SK (createdAt#postId) for chronological order
 * - No read status filtering (Explore shows everything)
 * - No following relationship filtering (Explore shows all users)
 *
 * Features:
 * - Infinite scroll with cursor-based pagination
 * - Optional authentication for personalized `isLiked` status
 * - Public posts only (privacy preserved)
 *
 * @returns PostGridResponse with posts, hasMore, and optional nextCursor
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { PostGridItem, PostGridResponse } from '@social-media-app/shared';
import { errorResponse, successResponse } from '../../utils/index.js';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';

// Constants
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

// Initialize DynamoDB client at container scope for Lambda warm starts
const dynamoClient = createDynamoDBClient();
const tableName = getTableName();

/**
 * Parse and validate limit parameter
 */
const parseLimit = (limitParam?: string): { limit?: number; error?: string } => {
  if (!limitParam) {
    return { limit: DEFAULT_LIMIT };
  }

  const parsed = parseInt(limitParam, 10);

  if (isNaN(parsed)) {
    return { error: 'Limit must be a valid number' };
  }

  if (parsed <= 0) {
    return { error: 'Limit must be positive' };
  }

  if (parsed > MAX_LIMIT) {
    return { error: `Limit cannot exceed ${MAX_LIMIT}` };
  }

  return { limit: parsed };
};

/**
 * Parse cursor from base64 string
 */
const parseCursor = (cursorParam?: string): Record<string, any> | undefined => {
  if (!cursorParam) {
    return undefined;
  }

  try {
    const decoded = Buffer.from(cursorParam, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    console.error('[GetExploreFeed] Failed to parse cursor:', error);
    return undefined;
  }
};

/**
 * Encode cursor to base64 string
 */
const encodeCursor = (lastEvaluatedKey: Record<string, any>): string => {
  const json = JSON.stringify(lastEvaluatedKey);
  return Buffer.from(json, 'utf-8').toString('base64');
};


/**
 * Convert DynamoDB post entity to PostGridItem
 * Note: PostGridItem schema only includes: id, userId, userHandle, thumbnailUrl, caption, likesCount, commentsCount, createdAt
 * isLiked is not part of PostGridItem (Explore page doesn't show like status)
 */
const entityToPostGridItem = (entity: any): PostGridItem => {
  return {
    id: entity.id,
    userId: entity.userId,
    userHandle: entity.userHandle,
    thumbnailUrl: entity.thumbnailUrl,
    caption: entity.caption,
    likesCount: entity.likesCount ?? 0,
    commentsCount: entity.commentsCount ?? 0,
    createdAt: entity.createdAt
  };
};

/**
 * Lambda handler
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // 1. Parse pagination parameters
    const limitResult = parseLimit(event.queryStringParameters?.limit);
    if (limitResult.error) {
      return errorResponse(400, 'Invalid pagination parameters', {
        message: limitResult.error
      });
    }
    const limit = limitResult.limit!;

    // 2. Parse cursor (optional)
    const cursorParam = event.queryStringParameters?.cursor;
    const exclusiveStartKey = parseCursor(cursorParam);

    // 3. Query GSI3 for all public posts
    // GSI3PK = 'POSTS' (all posts)
    // GSI3SK = '{createdAt}#{postId}' (chronological order)
    const queryResult = await dynamoClient.send(new QueryCommand({
      TableName: tableName,
      IndexName: 'GSI3',
      KeyConditionExpression: 'GSI3PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'POSTS'
      },
      ScanIndexForward: false, // Descending order (newest first)
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey
    }));

    // 4. Convert entities to PostGridItems
    const items = queryResult.Items ?? [];
    const posts = items.map(entityToPostGridItem);

    // 5. Build response with cursor
    const response: PostGridResponse = {
      posts,
      hasMore: !!queryResult.LastEvaluatedKey,
      totalCount: posts.length,
      ...(queryResult.LastEvaluatedKey && {
        nextCursor: encodeCursor(queryResult.LastEvaluatedKey)
      })
    };

    return successResponse(200, response);
  } catch (error) {
    console.error('[GetExploreFeed] Handler error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return errorResponse(500, 'Failed to fetch explore feed', {
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};
