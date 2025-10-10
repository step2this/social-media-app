/**
 * DynamoDB query builder utilities
 * Provides pure functional builders for constructing QueryCommandInput objects
 */

import type { QueryCommandInput, ScanCommandInput } from '@aws-sdk/lib-dynamodb';

/**
 * Key condition configuration
 */
export interface KeyCondition {
  readonly pk: string;
  readonly sk?: string;
}

/**
 * Query configuration
 */
export interface QueryConfig {
  readonly tableName: string;
  readonly indexName?: string;
  readonly keyCondition: KeyCondition;
  readonly filters?: Record<string, unknown>;
  readonly limit?: number;
  readonly scanIndexForward?: boolean;
}

/**
 * Feed query configuration (for scan operations)
 */
export interface FeedQueryConfig {
  readonly tableName: string;
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * User posts query options
 */
export interface UserPostsOptions {
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * Builds DynamoDB QueryCommandInput from configuration
 * Pure function - constructs query parameters
 *
 * @param config - Query configuration
 * @returns QueryCommandInput ready for DynamoDB
 *
 * @example
 * ```typescript
 * const query = buildQueryParams({
 *   tableName: 'posts-table',
 *   keyCondition: { pk: 'USER#123', sk: 'POST#' },
 *   limit: 24,
 *   scanIndexForward: false
 * });
 * ```
 */
export const buildQueryParams = (config: QueryConfig): QueryCommandInput => {
  const {
    tableName,
    indexName,
    keyCondition,
    filters,
    limit,
    scanIndexForward
  } = config;

  // Determine key names based on whether we're using an index
  const pkName = indexName ? 'GSI1PK' : 'PK';
  const skName = indexName ? 'GSI1SK' : 'SK';

  // Build key condition expression
  let keyConditionExpression = `${pkName} = :pk`;
  const expressionAttributeValues: Record<string, unknown> = {
    ':pk': keyCondition.pk
  };

  if (keyCondition.sk) {
    keyConditionExpression += ` AND begins_with(${skName}, :skPrefix)`;
    expressionAttributeValues[':skPrefix'] = keyCondition.sk;
  }

  // Build filter expression if filters provided
  let filterExpression: string | undefined;
  if (filters && Object.keys(filters).length > 0) {
    const filterParts = Object.entries(filters).map(([key, value]) => {
      expressionAttributeValues[`:filter_${key}`] = value;
      return `${key} = :filter_${key}`;
    });
    filterExpression = filterParts.join(' AND ');
  }

  // Construct query parameters
  const queryParams: QueryCommandInput = {
    TableName: tableName,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: expressionAttributeValues
  };

  // Add optional parameters
  if (indexName) {
    queryParams.IndexName = indexName;
  }
  if (filterExpression) {
    queryParams.FilterExpression = filterExpression;
  }
  if (limit !== undefined) {
    queryParams.Limit = limit;
  }
  if (scanIndexForward !== undefined) {
    queryParams.ScanIndexForward = scanIndexForward;
  }

  return queryParams;
};

/**
 * Builds query for retrieving user's posts
 * Convenience function for common use case
 *
 * @param userId - User ID
 * @param tableName - DynamoDB table name
 * @param options - Optional limit and cursor
 * @returns QueryCommandInput for user posts
 *
 * @example
 * ```typescript
 * const query = buildUserPostsQuery('user123', 'posts-table', { limit: 24 });
 * ```
 */
export const buildUserPostsQuery = (
  userId: string,
  tableName: string,
  options?: UserPostsOptions
): QueryCommandInput => {
  const query = buildQueryParams({
    tableName,
    keyCondition: {
      pk: `USER#${userId}`,
      sk: 'POST#'
    },
    limit: options?.limit,
    scanIndexForward: false // Newest first
  });

  // Add cursor if provided
  if (options?.cursor) {
    query.ExclusiveStartKey = JSON.parse(
      Buffer.from(options.cursor, 'base64').toString()
    );
  }

  return query;
};

/**
 * Builds query for retrieving a single post by ID
 * Uses GSI1 for efficient lookup
 *
 * @param postId - Post ID
 * @param tableName - DynamoDB table name
 * @returns QueryCommandInput for post lookup
 *
 * @example
 * ```typescript
 * const query = buildPostByIdQuery('post123', 'posts-table');
 * ```
 */
export const buildPostByIdQuery = (
  postId: string,
  tableName: string
): QueryCommandInput => {
  return buildQueryParams({
    tableName,
    indexName: 'GSI1',
    keyCondition: {
      pk: `POST#${postId}`
    },
    limit: 1
  });
};

/**
 * Builds scan parameters for public post feed
 * Note: Uses scan operation as it queries across all users
 *
 * @param config - Feed query configuration
 * @returns ScanCommandInput for feed query
 *
 * @example
 * ```typescript
 * const scan = buildPostFeedQuery({ tableName: 'posts-table', limit: 24 });
 * ```
 */
export const buildPostFeedQuery = (config: FeedQueryConfig): ScanCommandInput => {
  const { tableName, limit, cursor } = config;

  const scanParams: ScanCommandInput = {
    TableName: tableName,
    FilterExpression: 'entityType = :filter_entityType AND isPublic = :filter_isPublic',
    ExpressionAttributeValues: {
      ':filter_entityType': 'POST',
      ':filter_isPublic': true
    }
  };

  if (limit !== undefined) {
    scanParams.Limit = limit;
  }

  if (cursor) {
    scanParams.ExclusiveStartKey = JSON.parse(
      Buffer.from(cursor, 'base64').toString()
    );
  }

  return scanParams;
};
