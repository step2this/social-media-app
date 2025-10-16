/* eslint-disable functional/prefer-immutable-types */
/**
 * @fileoverview Shared AWS Mock Utilities for Testing
 *
 * This module provides reusable mock implementations for AWS services commonly
 * used in tests across the monorepo. These utilities eliminate code duplication
 * and provide consistent, well-tested mock behavior.
 *
 * @module @social-media-app/shared/test-utils/aws-mocks
 */

import { vi } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

/**
 * Configuration options for the mock DynamoDB client
 */
export interface MockDynamoClientOptions {
  /**
   * Whether to enable GSI3 support (for handle lookups)
   * @default true
   */
  readonly enableGSI3?: boolean;

  /**
   * Whether to enable GSI2 support (for user-based queries)
   * @default true
   */
  readonly enableGSI2?: boolean;

  /**
   * Custom command handlers for extending mock behavior
   */
  readonly customHandlers?: {
    readonly [commandName: string]: (command: MockDynamoCommand) => Promise<any>;
  };
}

/**
 * Type definition for DynamoDB commands used in tests
 */
export interface MockDynamoCommand {
  readonly constructor: { readonly name: string };
  readonly input: {
    readonly TableName?: string;
    readonly Item?: Record<string, unknown>;
    readonly Key?: Record<string, unknown>;
    readonly IndexName?: string;
    readonly KeyConditionExpression?: string;
    readonly ExpressionAttributeValues?: Record<string, unknown>;
    readonly ExpressionAttributeNames?: Record<string, unknown>;
    readonly Limit?: number;
    readonly UpdateExpression?: string;
    readonly ReturnValues?: string;
    readonly ConditionExpression?: string;
    readonly Select?: string;
  };
}

/**
 * Return type for the mock DynamoDB client
 */
export interface MockDynamoClient {
  /** Mock send function that handles DynamoDB commands */
  readonly send: ReturnType<typeof vi.fn>;
  /** Get all stored items (test helper) */
  readonly _getItems: () => Map<string, Record<string, unknown>>;
  /** Get GSI3 items (test helper) */
  readonly _getGSI3Items: () => Map<string, Record<string, unknown>[]>;
  /** Set an item directly (test helper) */
  readonly _setItem: (key: string, item: Record<string, unknown>) => void;
  /** Clear all data (test helper) */
  readonly _clear: () => void;
}

/**
 * Creates a mock DynamoDB DocumentClient with comprehensive command support
 *
 * This mock handles common DynamoDB operations including:
 * - GetCommand: Retrieve single items by PK/SK
 * - QueryCommand: Query with PK and SK prefix, supports GSI2 and GSI3
 * - UpdateCommand: Update items with expression support
 * - PutCommand: Create items with condition expressions
 * - DeleteCommand: Remove items
 *
 * @param options - Configuration options for the mock client
 * @returns A mock DynamoDB client with helper methods for test setup
 *
 * @example
 * ```typescript
 * import { createMockDynamoClient } from '@social-media-app/shared/test-utils/aws-mocks';
 *
 * const mockClient = createMockDynamoClient();
 *
 * // Setup test data
 * mockClient._setItem('USER#123#PROFILE', {
 *   PK: 'USER#123',
 *   SK: 'PROFILE',
 *   id: '123',
 *   username: 'testuser'
 * });
 *
 * // Pass to service
 * const service = new ProfileService(mockClient as any, 'test-table');
 *
 * // Run tests
 * const profile = await service.getProfileById('123');
 * expect(profile?.username).toBe('testuser');
 * ```
 */
export const createMockDynamoClient = (
  options: MockDynamoClientOptions = {}
): MockDynamoClient => {
  const { enableGSI3 = true, enableGSI2 = true, customHandlers = {} } = options;

  // Primary storage
  const items = new Map<string, Record<string, unknown>>();

  // GSI3 storage (for handle-based queries)
  const gsi3Items = new Map<string, Record<string, unknown>[]>();

  /**
   * Updates GSI3 index when items are modified
   */
  const updateGSI3 = (item: Record<string, unknown>): void => {
    if (!enableGSI3) return;

    const gsi3Key = item.GSI3PK as string;
    if (gsi3Key) {
      if (!gsi3Items.has(gsi3Key)) {
        gsi3Items.set(gsi3Key, []);
      }
      // Remove any existing entry for this item
      const existingItems = gsi3Items.get(gsi3Key)!;
      const filtered = existingItems.filter(
        existing => `${existing.PK}#${existing.SK}` !== `${item.PK}#${item.SK}`
      );
      filtered.push(item);
      gsi3Items.set(gsi3Key, filtered);
    }
  };

  /**
   * Handles GetCommand - retrieves single item by PK/SK
   */
  const handleGetCommand = (command: MockDynamoCommand): Promise<any> => {
    const { Key } = command.input;
    if (!Key) {
      return Promise.resolve({ $metadata: {} });
    }

    const key = `${Key.PK}#${Key.SK}`;
    const item = items.get(key);
    return Promise.resolve({ Item: item, $metadata: {} });
  };

  /**
   * Handles QueryCommand - supports main table and GSI queries
   */
  const handleQueryCommand = (command: MockDynamoCommand): Promise<any> => {
    const {
      KeyConditionExpression,
      IndexName,
      ExpressionAttributeValues,
      Limit,
      Select
    } = command.input;

    let results: Record<string, unknown>[] = [];

    // Handle GSI3 queries (e.g., handle lookups)
    if (enableGSI3 && IndexName === 'GSI3' && KeyConditionExpression === 'GSI3PK = :pk') {
      const pk = ExpressionAttributeValues?.[':pk'] as string;
      results = gsi3Items.get(pk) || [];
    }
    // Handle GSI2 queries (e.g., user-based lookups)
    else if (enableGSI2 && IndexName === 'GSI2') {
      const pkValue = ExpressionAttributeValues?.[':pk'] as string;
      const skPrefix = ExpressionAttributeValues?.[':sk'] as string;

      for (const [, item] of items.entries()) {
        if (
          item.GSI2PK === pkValue &&
          typeof item.GSI2SK === 'string' &&
          item.GSI2SK.startsWith(skPrefix)
        ) {
          results.push(item);
        }
      }
    }
    // Handle main table queries
    else {
      const pkValue = ExpressionAttributeValues?.[':pk'] as string;
      const skPrefix = ExpressionAttributeValues?.[':sk'] as string;

      for (const [, item] of items.entries()) {
        const pkMatches = item.PK === pkValue;
        const skMatches = typeof item.SK === 'string' && item.SK.startsWith(skPrefix);

        if (pkMatches && skMatches) {
          results.push(item);
        }
      }
    }

    // Apply limit
    const limit = Limit || results.length;
    const paginatedResults = results.slice(0, limit);

    // Return count if requested
    if (Select === 'COUNT') {
      return Promise.resolve({ Count: paginatedResults.length, $metadata: {} });
    }

    return Promise.resolve({ Items: paginatedResults, $metadata: {} });
  };

  /**
   * Handles UpdateCommand - updates items with expression parsing
   */
  const handleUpdateCommand = (command: MockDynamoCommand): Promise<any> => {
    const {
      Key,
      UpdateExpression,
      ExpressionAttributeValues,
      ConditionExpression
    } = command.input;

    if (!Key) {
      return Promise.resolve({ Attributes: null, $metadata: {} });
    }

    const key = `${Key.PK}#${Key.SK}`;
    const item = items.get(key);

    if (!item) {
      return Promise.resolve({ Attributes: null, $metadata: {} });
    }

    // Handle condition expressions
    if (ConditionExpression) {
      // Handle "postsCount > :zero" condition
      if (ConditionExpression.includes('postsCount > :zero')) {
        const postsCount = (item.postsCount as number) || 0;
        const zero = (ExpressionAttributeValues?.[':zero'] as number) || 0;
        if (postsCount <= zero) {
          const error: any = new Error('ConditionalCheckFailedException');
          error.name = 'ConditionalCheckFailedException';
          return Promise.reject(error);
        }
      }
    }

    const updatedItem = { ...item };

    // Parse UpdateExpression - supports common patterns
    if (UpdateExpression) {
      // Simple SET operations
      if (UpdateExpression.includes('#updatedAt = :updatedAt')) {
        updatedItem.updatedAt = ExpressionAttributeValues?.[':updatedAt'];
      }
      if (UpdateExpression.includes('#handle = :handle')) {
        updatedItem.handle = ExpressionAttributeValues?.[':handle'];
      }
      if (UpdateExpression.includes('#bio = :bio')) {
        updatedItem.bio = ExpressionAttributeValues?.[':bio'];
      }
      if (UpdateExpression.includes('#fullName = :fullName')) {
        updatedItem.fullName = ExpressionAttributeValues?.[':fullName'];
      }
      if (UpdateExpression.includes('profilePictureUrl = :url')) {
        updatedItem.profilePictureUrl = ExpressionAttributeValues?.[':url'];
        updatedItem.profilePictureThumbnailUrl = ExpressionAttributeValues?.[':thumb'];
      }

      // GSI3 updates
      if (UpdateExpression.includes('GSI3PK = :gsi3pk')) {
        updatedItem.GSI3PK = ExpressionAttributeValues?.[':gsi3pk'];
        updatedItem.GSI3SK = ExpressionAttributeValues?.[':gsi3sk'];
        updateGSI3(updatedItem);
      }

      // Counter operations with if_not_exists
      if (UpdateExpression.includes('postsCount = if_not_exists(postsCount, :zero) + :inc')) {
        const currentCount = (updatedItem.postsCount as number) || 0;
        updatedItem.postsCount = currentCount + ((ExpressionAttributeValues?.[':inc'] as number) || 0);
      } else if (UpdateExpression.includes('postsCount = postsCount + :inc')) {
        const currentCount = (updatedItem.postsCount as number) || 0;
        updatedItem.postsCount = currentCount + ((ExpressionAttributeValues?.[':inc'] as number) || 0);
      }

      if (UpdateExpression.includes('postsCount = if_not_exists(postsCount, :zero) - :dec')) {
        const currentCount = (updatedItem.postsCount as number) || 0;
        updatedItem.postsCount = Math.max(0, currentCount - ((ExpressionAttributeValues?.[':dec'] as number) || 0));
      } else if (UpdateExpression.includes('postsCount = postsCount - :dec')) {
        const currentCount = (updatedItem.postsCount as number) || 0;
        updatedItem.postsCount = Math.max(0, currentCount - ((ExpressionAttributeValues?.[':dec'] as number) || 0));
      }

      // Similar patterns for likesCount
      if (UpdateExpression.includes('likesCount = if_not_exists(likesCount, :zero) + :inc')) {
        const currentCount = (updatedItem.likesCount as number) || 0;
        updatedItem.likesCount = currentCount + ((ExpressionAttributeValues?.[':inc'] as number) || 0);
      } else if (UpdateExpression.includes('likesCount = likesCount + :inc')) {
        const currentCount = (updatedItem.likesCount as number) || 0;
        updatedItem.likesCount = currentCount + ((ExpressionAttributeValues?.[':inc'] as number) || 0);
      }

      if (UpdateExpression.includes('likesCount = if_not_exists(likesCount, :zero) - :dec')) {
        const currentCount = (updatedItem.likesCount as number) || 0;
        updatedItem.likesCount = Math.max(0, currentCount - ((ExpressionAttributeValues?.[':dec'] as number) || 0));
      } else if (UpdateExpression.includes('likesCount = likesCount - :dec')) {
        const currentCount = (updatedItem.likesCount as number) || 0;
        updatedItem.likesCount = Math.max(0, currentCount - ((ExpressionAttributeValues?.[':dec'] as number) || 0));
      }

      // Similar patterns for commentsCount
      if (UpdateExpression.includes('commentsCount = if_not_exists(commentsCount, :zero) + :inc')) {
        const currentCount = (updatedItem.commentsCount as number) || 0;
        updatedItem.commentsCount = currentCount + ((ExpressionAttributeValues?.[':inc'] as number) || 0);
      } else if (UpdateExpression.includes('commentsCount = commentsCount + :inc')) {
        const currentCount = (updatedItem.commentsCount as number) || 0;
        updatedItem.commentsCount = currentCount + ((ExpressionAttributeValues?.[':inc'] as number) || 0);
      }

      if (UpdateExpression.includes('commentsCount = if_not_exists(commentsCount, :zero) - :dec')) {
        const currentCount = (updatedItem.commentsCount as number) || 0;
        updatedItem.commentsCount = Math.max(0, currentCount - ((ExpressionAttributeValues?.[':dec'] as number) || 0));
      } else if (UpdateExpression.includes('commentsCount = commentsCount - :dec')) {
        const currentCount = (updatedItem.commentsCount as number) || 0;
        updatedItem.commentsCount = Math.max(0, currentCount - ((ExpressionAttributeValues?.[':dec'] as number) || 0));
      }

      // Follower/following counters
      if (UpdateExpression.includes('followersCount = if_not_exists(followersCount, :zero) + :inc')) {
        const currentCount = (updatedItem.followersCount as number) || 0;
        updatedItem.followersCount = currentCount + ((ExpressionAttributeValues?.[':inc'] as number) || 0);
      } else if (UpdateExpression.includes('followersCount = followersCount + :inc')) {
        const currentCount = (updatedItem.followersCount as number) || 0;
        updatedItem.followersCount = currentCount + ((ExpressionAttributeValues?.[':inc'] as number) || 0);
      }

      if (UpdateExpression.includes('followersCount = if_not_exists(followersCount, :zero) - :dec')) {
        const currentCount = (updatedItem.followersCount as number) || 0;
        updatedItem.followersCount = Math.max(0, currentCount - ((ExpressionAttributeValues?.[':dec'] as number) || 0));
      } else if (UpdateExpression.includes('followersCount = followersCount - :dec')) {
        const currentCount = (updatedItem.followersCount as number) || 0;
        updatedItem.followersCount = Math.max(0, currentCount - ((ExpressionAttributeValues?.[':dec'] as number) || 0));
      }

      if (UpdateExpression.includes('followingCount = if_not_exists(followingCount, :zero) + :inc')) {
        const currentCount = (updatedItem.followingCount as number) || 0;
        updatedItem.followingCount = currentCount + ((ExpressionAttributeValues?.[':inc'] as number) || 0);
      } else if (UpdateExpression.includes('followingCount = followingCount + :inc')) {
        const currentCount = (updatedItem.followingCount as number) || 0;
        updatedItem.followingCount = currentCount + ((ExpressionAttributeValues?.[':inc'] as number) || 0);
      }

      if (UpdateExpression.includes('followingCount = if_not_exists(followingCount, :zero) - :dec')) {
        const currentCount = (updatedItem.followingCount as number) || 0;
        updatedItem.followingCount = Math.max(0, currentCount - ((ExpressionAttributeValues?.[':dec'] as number) || 0));
      } else if (UpdateExpression.includes('followingCount = followingCount - :dec')) {
        const currentCount = (updatedItem.followingCount as number) || 0;
        updatedItem.followingCount = Math.max(0, currentCount - ((ExpressionAttributeValues?.[':dec'] as number) || 0));
      }
    }

    items.set(key, updatedItem);
    return Promise.resolve({ Attributes: updatedItem, $metadata: {} });
  };

  /**
   * Handles PutCommand - creates items with condition support
   */
  const handlePutCommand = (command: MockDynamoCommand): Promise<any> => {
    const { Item, ConditionExpression } = command.input;
    if (!Item) {
      return Promise.resolve({ $metadata: {} });
    }

    const key = `${Item.PK}#${Item.SK}`;

    // Check condition expression for duplicate prevention
    if (ConditionExpression === 'attribute_not_exists(PK)' && items.has(key)) {
      const error: any = new Error('ConditionalCheckFailedException');
      error.name = 'ConditionalCheckFailedException';
      error.__type = 'ConditionalCheckFailedException';
      return Promise.reject(error);
    }

    items.set(key, Item);
    updateGSI3(Item);
    return Promise.resolve({ $metadata: {} });
  };

  /**
   * Handles DeleteCommand - removes items
   */
  const handleDeleteCommand = (command: MockDynamoCommand): Promise<any> => {
    const { Key } = command.input;
    if (!Key) {
      return Promise.resolve({ $metadata: {} });
    }

    const key = `${Key.PK}#${Key.SK}`;
    items.delete(key);
    return Promise.resolve({ $metadata: {} });
  };

  /**
   * Main send function that routes commands to handlers
   */
  const send = vi.fn(async (command: MockDynamoCommand) => {
    const commandName = command.constructor.name;

    // Check for custom handler
    if (customHandlers[commandName]) {
      return customHandlers[commandName](command);
    }

    // Route to built-in handlers
    switch (commandName) {
      case 'GetCommand':
        return handleGetCommand(command);
      case 'QueryCommand':
        return handleQueryCommand(command);
      case 'UpdateCommand':
        return handleUpdateCommand(command);
      case 'PutCommand':
        return handlePutCommand(command);
      case 'DeleteCommand':
        return handleDeleteCommand(command);
      default:
        return Promise.resolve({ $metadata: {} });
    }
  });

  return {
    send: send as any,
    _getItems: () => items,
    _getGSI3Items: () => gsi3Items,
    _setItem: (key: string, item: Record<string, unknown>) => {
      items.set(key, item);
      updateGSI3(item);
    },
    _clear: () => {
      items.clear();
      gsi3Items.clear();
    }
  };
};

/**
 * Configuration for S3 mock setup
 */
export interface S3MockConfig {
  /**
   * Default presigned URL to return
   * @default 'https://example.com/signed-url'
   */
  readonly defaultPresignedUrl?: string;

  /**
   * Custom getSignedUrl implementation
   */
  readonly getSignedUrlMock?: ReturnType<typeof vi.fn>;
}

/**
 * Sets up S3-related mocks (S3Client and getSignedUrl)
 *
 * This function mocks both the S3Client and the getSignedUrl function
 * from @aws-sdk/s3-request-presigner, which are commonly used together
 * for generating presigned upload URLs.
 *
 * @param config - Configuration for the S3 mocks
 *
 * @example
 * ```typescript
 * import { setupS3Mocks } from '@social-media-app/shared/test-utils/aws-mocks';
 *
 * // Basic setup with defaults
 * setupS3Mocks();
 *
 * // Custom presigned URL
 * setupS3Mocks({
 *   defaultPresignedUrl: 'https://my-bucket.s3.amazonaws.com/upload'
 * });
 *
 * // Custom getSignedUrl behavior
 * setupS3Mocks({
 *   getSignedUrlMock: vi.fn().mockImplementation(async () => {
 *     return 'https://custom-url.com/signed';
 *   })
 * });
 * ```
 */
export const setupS3Mocks = (config: S3MockConfig = {}): void => {
  const {
    defaultPresignedUrl = 'https://example.com/signed-url',
    getSignedUrlMock
  } = config;

  vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vi.fn().mockImplementation(() => ({})),
    PutObjectCommand: vi.fn()
  }));

  vi.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: getSignedUrlMock || vi.fn().mockResolvedValue(defaultPresignedUrl)
  }));
};

/**
 * Configuration for API Gateway event creation
 */
export interface APIGatewayEventConfig {
  /** Request body (will be stringified if object) */
  readonly body?: string | Record<string, unknown>;
  /** Authorization header value */
  readonly authHeader?: string;
  /** HTTP method */
  readonly method?: string;
  /** Request path */
  readonly path?: string;
  /** Route key (e.g., 'POST /likes') */
  readonly routeKey?: string;
  /** Additional headers */
  readonly headers?: Record<string, string>;
  /** Query string parameters */
  readonly queryStringParameters?: Record<string, string>;
  /** Source IP address */
  readonly sourceIp?: string;
  /** User agent */
  readonly userAgent?: string;
}

/**
 * Creates a mock APIGatewayProxyEventV2 for testing Lambda handlers
 *
 * This function generates a realistic API Gateway event with sensible defaults
 * for all required fields. It's particularly useful for testing Lambda handlers
 * that accept API Gateway events.
 *
 * @param config - Configuration for the event
 * @returns A complete APIGatewayProxyEventV2 object
 *
 * @example
 * ```typescript
 * import { createMockAPIGatewayEvent } from '@social-media-app/shared/test-utils/aws-mocks';
 *
 * // Basic event with JSON body
 * const event = createMockAPIGatewayEvent({
 *   body: { postId: '123', content: 'Hello' },
 *   authHeader: 'Bearer eyJhbGc...'
 * });
 *
 * // Custom method and path
 * const getEvent = createMockAPIGatewayEvent({
 *   method: 'GET',
 *   path: '/posts/123',
 *   routeKey: 'GET /posts/{id}'
 * });
 *
 * // With query parameters
 * const searchEvent = createMockAPIGatewayEvent({
 *   method: 'GET',
 *   path: '/search',
 *   queryStringParameters: { q: 'test', limit: '10' }
 * });
 * ```
 */
export const createMockAPIGatewayEvent = (
  config: APIGatewayEventConfig = {}
): APIGatewayProxyEventV2 => {
  const {
    body,
    authHeader,
    method = 'POST',
    path = '/api',
    routeKey = `${method} ${path}`,
    headers = {},
    queryStringParameters,
    sourceIp = '127.0.0.1',
    userAgent = 'test-agent'
  } = config;

  // Convert body to string if it's an object
  const bodyString = typeof body === 'string'
    ? body
    : body
      ? JSON.stringify(body)
      : '';

  // Build headers
  const eventHeaders: Record<string, string> = {
    'content-type': 'application/json',
    ...headers
  };

  if (authHeader) {
    eventHeaders.authorization = authHeader;
  }

  return {
    version: '2.0',
    routeKey,
    rawPath: path,
    rawQueryString: queryStringParameters
      ? new URLSearchParams(queryStringParameters).toString()
      : '',
    headers: eventHeaders,
    queryStringParameters,
    requestContext: {
      requestId: 'test-request-id',
      http: {
        method,
        path,
        protocol: 'HTTP/1.1',
        sourceIp,
        userAgent
      },
      stage: 'test',
      time: '2024-01-01T00:00:00.000Z',
      timeEpoch: 1704067200000,
      domainName: 'api.example.com',
      accountId: '123456789012',
      apiId: 'api123',
      routeKey,
      domainPrefix: 'api'
    },
    body: bodyString,
    isBase64Encoded: false
  };
};

/**
 * Creates a mock JWT token for testing
 *
 * This is a simple helper that returns a realistic-looking JWT token string.
 * The token is not actually valid, but has the correct format for testing.
 *
 * @param userId - User ID to encode in the token (optional)
 * @returns A mock JWT token string
 *
 * @example
 * ```typescript
 * import { createMockJWT } from '@social-media-app/shared/test-utils/aws-mocks';
 *
 * const token = createMockJWT('user-123');
 * const event = createMockAPIGatewayEvent({
 *   body: { postId: '456' },
 *   authHeader: `Bearer ${token}`
 * });
 * ```
 */
export const createMockJWT = (userId = 'test-user-id'): string => {
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIke userId}In0.${userId}`;
};

/**
 * Type guard to check if an error is a ConditionalCheckFailedException
 *
 * @param error - The error to check
 * @returns True if the error is a ConditionalCheckFailedException
 *
 * @example
 * ```typescript
 * import { isConditionalCheckFailedException } from '@social-media-app/shared/test-utils/aws-mocks';
 *
 * try {
 *   await service.createItem(item);
 * } catch (error) {
 *   if (isConditionalCheckFailedException(error)) {
 *     // Handle duplicate item
 *   }
 * }
 * ```
 */
export const isConditionalCheckFailedException = (error: unknown): boolean => {
  return (
    error instanceof Error &&
    (error.name === 'ConditionalCheckFailedException' ||
     (error as any).__type === 'ConditionalCheckFailedException')
  );
};
