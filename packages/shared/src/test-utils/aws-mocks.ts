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
   * Whether to enable GSI1 support (for email/token lookups)
   * @default true
   */
  readonly enableGSI1?: boolean;

  /**
   * Whether to enable GSI4 support (for user post queries)
   * @default true
   */
  readonly enableGSI4?: boolean;

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
    readonly ScanIndexForward?: boolean;
    readonly ExclusiveStartKey?: Record<string, unknown>;
    readonly FilterExpression?: string;
    readonly RequestItems?: Record<string, unknown>;
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
  /** Get GSI1 items (test helper) */
  readonly _getGSI1Items: () => Map<string, Record<string, unknown>[]>;
  /** Get GSI3 items (test helper) */
  readonly _getGSI3Items: () => Map<string, Record<string, unknown>[]>;
  /** Get GSI4 items (test helper) */
  readonly _getGSI4Items: () => Map<string, Record<string, unknown>[]>;
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
  const { enableGSI3 = true, enableGSI2 = true, enableGSI1 = true, enableGSI4 = true, customHandlers = {} } = options;

  // Primary storage
  const items = new Map<string, Record<string, unknown>>();

  // GSI1 storage (for email/token-based queries)
  const gsi1Items = new Map<string, Record<string, unknown>[]>();

  // GSI2 storage (for username-based queries)
  const gsi2Items = new Map<string, Record<string, unknown>[]>();

  // GSI3 storage (for handle-based queries)
  const gsi3Items = new Map<string, Record<string, unknown>[]>();

  // GSI4 storage (for user post queries)
  const gsi4Items = new Map<string, Record<string, unknown>[]>();

  /**
   * Updates GSI1 index when items are modified
   */
  const updateGSI1 = (item: Record<string, unknown>): void => {
    if (!enableGSI1) return;

    const gsi1Key = item.GSI1PK as string;
    if (gsi1Key) {
      if (!gsi1Items.has(gsi1Key)) {
        gsi1Items.set(gsi1Key, []);
      }
      // Remove any existing entry for this item
      const existingItems = gsi1Items.get(gsi1Key)!;
      const filtered = existingItems.filter(
        existing => `${existing.PK}#${existing.SK}` !== `${item.PK}#${item.SK}`
      );
      filtered.push(item);
      gsi1Items.set(gsi1Key, filtered);
    }
  };

  /**
   * Updates GSI2 index when items are modified
   * Handles sparse index: removes items when GSI2PK is deleted
   */
  const updateGSI2 = (item: Record<string, unknown>): void => {
    if (!enableGSI2) return;

    const gsi2Key = item.GSI2PK as string | undefined;
    const itemKey = `${item.PK}#${item.SK}`;

    // First, remove this item from ALL GSI2 indexes (in case GSI2PK changed or was removed)
    for (const [key, items] of gsi2Items.entries()) {
      const filtered = items.filter(existing => `${existing.PK}#${existing.SK}` !== itemKey);
      if (filtered.length === 0) {
        gsi2Items.delete(key);
      } else if (filtered.length < items.length) {
        gsi2Items.set(key, filtered);
      }
    }

    // Then, if item has GSI2PK, add it to the appropriate index
    if (gsi2Key) {
      if (!gsi2Items.has(gsi2Key)) {
        gsi2Items.set(gsi2Key, []);
      }
      const existingItems = gsi2Items.get(gsi2Key)!;
      existingItems.push(item);
      gsi2Items.set(gsi2Key, existingItems);
    }
  };

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
   * Updates GSI4 index when items are modified
   */
  const updateGSI4 = (item: Record<string, unknown>): void => {
    if (!enableGSI4) return;

    const gsi4Key = item.GSI4PK as string;
    if (gsi4Key) {
      if (!gsi4Items.has(gsi4Key)) {
        gsi4Items.set(gsi4Key, []);
      }
      // Remove any existing entry for this item
      const existingItems = gsi4Items.get(gsi4Key)!;
      const filtered = existingItems.filter(
        existing => `${existing.PK}#${existing.SK}` !== `${item.PK}#${item.SK}`
      );
      filtered.push(item);
      gsi4Items.set(gsi4Key, filtered);
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
      FilterExpression,
      Limit,
      Select,
      ScanIndexForward,
      ExclusiveStartKey
    } = command.input;

    let results: Record<string, unknown>[] = [];

    // Handle GSI1 queries (e.g., email/token lookups)
    if (enableGSI1 && IndexName === 'GSI1') {
      // Support various key condition expressions for GSI1
      if (KeyConditionExpression === 'GSI1PK = :email' ||
          KeyConditionExpression === 'GSI1PK = :token' ||
          KeyConditionExpression === 'GSI1PK = :pk') {
        const pkValue = (ExpressionAttributeValues?.[':email'] ||
                        ExpressionAttributeValues?.[':token'] ||
                        ExpressionAttributeValues?.[':pk']) as string;
        results = gsi1Items.get(pkValue) || [];
      } else if (KeyConditionExpression?.includes('GSI1PK = :pk') && KeyConditionExpression?.includes('begins_with')) {
        // Handle begins_with for GSI1
        const pkValue = ExpressionAttributeValues?.[':pk'] as string;
        const skPrefix = ExpressionAttributeValues?.[':sk'] as string;
        const gsi1Results = gsi1Items.get(pkValue) || [];
        results = gsi1Results.filter(item =>
          typeof item.GSI1SK === 'string' && item.GSI1SK.startsWith(skPrefix)
        );
      }
    }
    // Handle GSI2 queries (e.g., username-based lookups, unread notifications)
    else if (enableGSI2 && IndexName === 'GSI2') {
      // Support various key condition expressions for GSI2
      if (KeyConditionExpression === 'GSI2PK = :username' ||
          KeyConditionExpression === 'GSI2PK = :pk' ||
          KeyConditionExpression === 'GSI2PK = :gsi2pk') {
        const pkValue = (ExpressionAttributeValues?.[':username'] ||
                        ExpressionAttributeValues?.[':pk'] ||
                        ExpressionAttributeValues?.[':gsi2pk']) as string;
        results = gsi2Items.get(pkValue) || [];
      } else if (KeyConditionExpression?.includes('begins_with')) {
        const pkValue = (ExpressionAttributeValues?.[':pk'] ||
                        ExpressionAttributeValues?.[':gsi2pk']) as string;
        const skPrefix = (ExpressionAttributeValues?.[':sk'] ||
                         ExpressionAttributeValues?.[':skPrefix']) as string;
        const gsi2Results = gsi2Items.get(pkValue) || [];
        results = gsi2Results.filter(item =>
          typeof item.GSI2SK === 'string' && item.GSI2SK.startsWith(skPrefix)
        );
      }
    }
    // Handle GSI3 queries (e.g., handle lookups)
    else if (enableGSI3 && IndexName === 'GSI3' && KeyConditionExpression === 'GSI3PK = :pk') {
      const pk = ExpressionAttributeValues?.[':pk'] as string;
      results = gsi3Items.get(pk) || [];
    }
    // Handle GSI4 queries (e.g., user post queries)
    else if (enableGSI4 && IndexName === 'GSI4' && KeyConditionExpression === 'GSI4PK = :pk') {
      const pk = ExpressionAttributeValues?.[':pk'] as string;
      const skPrefix = ExpressionAttributeValues?.[':skPrefix'] as string;
      results = (gsi4Items.get(pk) || []).filter(item => {
        const itemSK = item.GSI4SK as string;
        return !skPrefix || itemSK.startsWith(skPrefix);
      });
    }
    // Handle main table queries
    else {
      const pkValue = ExpressionAttributeValues?.[':pk'] as string;
      const skPrefix = (ExpressionAttributeValues?.[':sk'] || ExpressionAttributeValues?.[':skPrefix']) as string;

      for (const [, item] of items.entries()) {
        const pkMatches = item.PK === pkValue;
        const skMatches = typeof item.SK === 'string' && item.SK.startsWith(skPrefix);

        if (pkMatches && skMatches) {
          results.push(item);
        }
      }
    }

    // Apply FilterExpression if present
    if (FilterExpression && ExpressionAttributeValues) {
      // Handle authorId filter
      if (FilterExpression.includes('authorId = :authorId')) {
        const authorId = ExpressionAttributeValues[':authorId'] as string;
        results = results.filter(item => item.authorId === authorId);
      }

      // Handle notification type filter
      if (FilterExpression.includes('#type = :type')) {
        const typeValue = ExpressionAttributeValues[':type'];
        results = results.filter(item => item.type === typeValue);
      }

      // Handle notification priority filter
      if (FilterExpression.includes('priority = :priority')) {
        const priorityValue = ExpressionAttributeValues[':priority'];
        results = results.filter(item => item.priority === priorityValue);
      }

      // Handle notification status filter
      if (FilterExpression.includes('#status = :status')) {
        const statusValue = ExpressionAttributeValues[':status'];
        results = results.filter(item => item.status === statusValue);
      }

      // Handle postId filter
      if (FilterExpression.includes('postId = :postId')) {
        const postId = ExpressionAttributeValues[':postId'] as string;
        results = results.filter(item => item.postId === postId);
      }

      // Handle isRead filter (Instagram-like behavior)
      if (FilterExpression.includes('isRead')) {
        if (FilterExpression.includes('attribute_not_exists(isRead)') ||
            FilterExpression.includes('isRead = :false')) {
          results = results.filter(item => !item.isRead || item.isRead === false);
        }
      }
    }

    // Sort results by SK (ascending by default, descending if ScanIndexForward is false)
    const sorted = results.sort((a, b) => {
      const skA = String(a.SK);
      const skB = String(b.SK);
      return ScanIndexForward === false ? skB.localeCompare(skA) : skA.localeCompare(skB);
    });

    // Return count if requested (should be total count before pagination)
    if (Select === 'COUNT') {
      return Promise.resolve({ Count: sorted.length, $metadata: {} });
    }

    // Handle pagination with ExclusiveStartKey
    let startIndex = 0;
    if (ExclusiveStartKey) {
      startIndex = sorted.findIndex(item =>
        item.PK === ExclusiveStartKey.PK && item.SK === ExclusiveStartKey.SK
      ) + 1;
    }

    // Apply limit
    const limit = Limit || sorted.length;
    const paginatedResults = sorted.slice(startIndex, startIndex + limit);

    // Determine if there are more results
    const hasMore = startIndex + limit < sorted.length;
    const lastEvaluatedKey = hasMore && paginatedResults.length > 0
      ? {
          PK: paginatedResults[paginatedResults.length - 1].PK,
          SK: paginatedResults[paginatedResults.length - 1].SK
        }
      : undefined;

    return Promise.resolve({
      Items: paginatedResults,
      Count: paginatedResults.length,
      LastEvaluatedKey: lastEvaluatedKey,
      $metadata: {}
    });
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
      // Handle "if_not_exists(postsCount, :zero) > :zero" condition
      if (ConditionExpression.includes('if_not_exists(postsCount, :zero) > :zero')) {
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
      if (UpdateExpression.includes('#updatedAt = :updatedAt') || UpdateExpression.includes('updatedAt = :updatedAt')) {
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

      // Post-specific updates
      if (UpdateExpression.includes('caption = :caption')) {
        updatedItem.caption = ExpressionAttributeValues?.[':caption'];
      }
      if (UpdateExpression.includes('tags = :tags')) {
        updatedItem.tags = ExpressionAttributeValues?.[':tags'];
      }
      if (UpdateExpression.includes('isPublic = :isPublic')) {
        updatedItem.isPublic = ExpressionAttributeValues?.[':isPublic'];
      }

      // GSI1 updates (for auth service token updates)
      if (UpdateExpression.includes('GSI1PK = :gsi1pk')) {
        updatedItem.hashedToken = ExpressionAttributeValues?.[':token'];
        updatedItem.GSI1PK = ExpressionAttributeValues?.[':gsi1pk'];
        updateGSI1(updatedItem);
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

      // Feed item read status updates
      if (UpdateExpression.includes('isRead') && ExpressionAttributeValues?.[':isRead'] !== undefined) {
        updatedItem.isRead = ExpressionAttributeValues[':isRead'] as boolean;
      }
      if (UpdateExpression.includes('readAt') && ExpressionAttributeValues?.[':readAt']) {
        updatedItem.readAt = ExpressionAttributeValues[':readAt'] as string;
      }

      // Notification-specific updates
      if (UpdateExpression.includes('#status = :status') && command.input.ExpressionAttributeNames?.['#status']) {
        updatedItem.status = ExpressionAttributeValues?.[':status'];
      }

      // Handle REMOVE operations
      if (UpdateExpression.includes('REMOVE')) {
        const removeMatch = UpdateExpression.match(/REMOVE\s+(.+)$/);
        if (removeMatch) {
          const removeFields = removeMatch[1].split(',').map((f: string) => f.trim());
          const names = command.input.ExpressionAttributeNames || {};
          removeFields.forEach((field: string) => {
            // Handle expression attribute names
            const actualFieldName = (names[field] as string | undefined) || field;
            delete (updatedItem as Record<string, unknown>)[actualFieldName];
          });
        }
      }
    }

    items.set(key, updatedItem);
    // Update GSI2 after modifications (sparse index)
    updateGSI2(updatedItem);
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
    updateGSI1(Item);
    updateGSI2(Item);
    updateGSI3(Item);
    updateGSI4(Item);
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
   * Handles ScanCommand - scans table with filter expressions
   */
  const handleScanCommand = (command: MockDynamoCommand): Promise<any> => {
    const { FilterExpression, ExpressionAttributeValues } = command.input;

    let results = Array.from(items.values());

    // Apply filter expressions
    if (FilterExpression && ExpressionAttributeValues) {
      // Handle postId filter
      if (FilterExpression.includes('postId = :postId')) {
        const postId = ExpressionAttributeValues[':postId'] as string;
        results = results.filter(item => item.postId === postId);
      }

      // Handle entityType filter
      if (FilterExpression.includes('entityType = :entityType')) {
        const entityType = ExpressionAttributeValues[':entityType'] as string;
        results = results.filter(item => item.entityType === entityType);
      }
    }

    return Promise.resolve({
      Items: results,
      Count: results.length,
      $metadata: {}
    });
  };

  /**
   * Handles BatchWriteCommand - batch operations (deletes and puts)
   */
  const handleBatchWriteCommand = (command: MockDynamoCommand): Promise<any> => {
    const requestItems = command.input.RequestItems;
    if (!requestItems) {
      return Promise.resolve({ UnprocessedItems: {}, $metadata: {} });
    }

    const tableName = Object.keys(requestItems)[0];
    const requests = requestItems[tableName] as Array<{
      DeleteRequest?: { Key: { PK: string; SK: string } };
      PutRequest?: { Item: Record<string, unknown> };
    }>;

    let deletedCount = 0;

    requests.forEach(request => {
      if (request.DeleteRequest) {
        const key = `${request.DeleteRequest.Key.PK}#${request.DeleteRequest.Key.SK}`;
        if (items.has(key)) {
          items.delete(key);
          deletedCount++;
        }
      }
      if (request.PutRequest) {
        const item = request.PutRequest.Item;
        const key = `${item.PK}#${item.SK}`;
        items.set(key, item);
        updateGSI1(item);
        updateGSI2(item);
        updateGSI3(item);
        updateGSI4(item);
      }
    });

    return Promise.resolve({
      UnprocessedItems: {},
      _deletedCount: deletedCount, // For testing purposes
      $metadata: {}
    });
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
      case 'ScanCommand':
        return handleScanCommand(command);
      case 'BatchWriteCommand':
        return handleBatchWriteCommand(command);
      default:
        return Promise.resolve({ $metadata: {} });
    }
  });

  return {
    send: send as any,
    _getItems: () => items,
    _getGSI1Items: () => gsi1Items,
    _getGSI3Items: () => gsi3Items,
    _getGSI4Items: () => gsi4Items,
    _setItem: (key: string, item: Record<string, unknown>) => {
      items.set(key, item);
      updateGSI1(item);
      updateGSI2(item);
      updateGSI3(item);
      updateGSI4(item);
    },
    _clear: () => {
      items.clear();
      gsi1Items.clear();
      gsi2Items.clear();
      gsi3Items.clear();
      gsi4Items.clear();
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
