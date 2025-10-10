/* eslint-disable max-lines-per-function */
import { describe, it, expect } from 'vitest';
import {
  buildQueryParams,
  buildUserPostsQuery,
  buildPostByIdQuery,
  buildPostFeedQuery,
  type QueryConfig,
  type FeedQueryConfig
} from './dynamo-query-builder.js';
import type { QueryCommandInput } from '@aws-sdk/lib-dynamodb';

describe('dynamo-query-builder', () => {
  const tableName = 'test-table';

  describe('buildQueryParams', () => {
    it('should build basic query with PK only', () => {
      const config: QueryConfig = {
        tableName,
        keyCondition: {
          pk: 'USER#user123'
        }
      };

      const result = buildQueryParams(config);

      expect(result).toEqual({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': 'USER#user123'
        }
      });
    });

    it('should build query with PK and SK prefix', () => {
      const config: QueryConfig = {
        tableName,
        keyCondition: {
          pk: 'USER#user123',
          sk: 'POST#'
        }
      };

      const result = buildQueryParams(config);

      expect(result).toEqual({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': 'USER#user123',
          ':skPrefix': 'POST#'
        }
      });
    });

    it('should include index name when specified', () => {
      const config: QueryConfig = {
        tableName,
        indexName: 'GSI1',
        keyCondition: {
          pk: 'POST#post123'
        }
      };

      const result = buildQueryParams(config);

      expect(result).toEqual({
        TableName: tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': 'POST#post123'
        }
      });
    });

    it('should include limit when specified', () => {
      const config: QueryConfig = {
        tableName,
        keyCondition: {
          pk: 'USER#user123'
        },
        limit: 24
      };

      const result = buildQueryParams(config);

      expect(result.Limit).toBe(24);
    });

    it('should set ScanIndexForward when specified', () => {
      const config: QueryConfig = {
        tableName,
        keyCondition: {
          pk: 'USER#user123',
          sk: 'POST#'
        },
        scanIndexForward: false
      };

      const result = buildQueryParams(config);

      expect(result.ScanIndexForward).toBe(false);
    });

    it('should include filter expression for single filter', () => {
      const config: QueryConfig = {
        tableName,
        keyCondition: {
          pk: 'USER#user123',
          sk: 'POST#'
        },
        filters: {
          isPublic: true
        }
      };

      const result = buildQueryParams(config);

      expect(result.FilterExpression).toBe('isPublic = :filter_isPublic');
      expect(result.ExpressionAttributeValues).toEqual({
        ':pk': 'USER#user123',
        ':skPrefix': 'POST#',
        ':filter_isPublic': true
      });
    });

    it('should include filter expression for multiple filters', () => {
      const config: QueryConfig = {
        tableName,
        keyCondition: {
          pk: 'USER#user123'
        },
        filters: {
          isPublic: true,
          entityType: 'POST'
        }
      };

      const result = buildQueryParams(config);

      expect(result.FilterExpression).toBe('isPublic = :filter_isPublic AND entityType = :filter_entityType');
      expect(result.ExpressionAttributeValues).toMatchObject({
        ':pk': 'USER#user123',
        ':filter_isPublic': true,
        ':filter_entityType': 'POST'
      });
    });

    it('should build query with all options combined', () => {
      const config: QueryConfig = {
        tableName,
        indexName: 'GSI1',
        keyCondition: {
          pk: 'USER#user123',
          sk: 'POST#'
        },
        filters: {
          isPublic: true
        },
        limit: 50,
        scanIndexForward: false
      };

      const result = buildQueryParams(config);

      expect(result).toEqual({
        TableName: tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :skPrefix)',
        FilterExpression: 'isPublic = :filter_isPublic',
        ExpressionAttributeValues: {
          ':pk': 'USER#user123',
          ':skPrefix': 'POST#',
          ':filter_isPublic': true
        },
        Limit: 50,
        ScanIndexForward: false
      });
    });
  });

  describe('buildUserPostsQuery', () => {
    it('should build query for user posts', () => {
      const userId = 'user123';
      const result = buildUserPostsQuery(userId, tableName);

      expect(result).toEqual({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': 'USER#user123',
          ':skPrefix': 'POST#'
        },
        ScanIndexForward: false
      });
    });

    it('should include limit when specified', () => {
      const userId = 'user123';
      const result = buildUserPostsQuery(userId, tableName, { limit: 10 });

      expect(result.Limit).toBe(10);
    });

    it('should include cursor for pagination', () => {
      const userId = 'user123';
      const cursor = Buffer.from(JSON.stringify({ PK: 'USER#user123', SK: 'POST#123' })).toString('base64');
      const result = buildUserPostsQuery(userId, tableName, { cursor });

      expect(result.ExclusiveStartKey).toEqual({
        PK: 'USER#user123',
        SK: 'POST#123'
      });
    });
  });

  describe('buildPostByIdQuery', () => {
    it('should build query for post by ID using GSI1', () => {
      const postId = 'post123';
      const result = buildPostByIdQuery(postId, tableName);

      expect(result).toEqual({
        TableName: tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': 'POST#post123'
        },
        Limit: 1
      });
    });
  });

  describe('buildPostFeedQuery', () => {
    it('should build query for public post feed', () => {
      const config: FeedQueryConfig = {
        tableName,
        limit: 24
      };

      const result = buildPostFeedQuery(config);

      expect(result).toEqual({
        TableName: tableName,
        FilterExpression: 'entityType = :filter_entityType AND isPublic = :filter_isPublic',
        ExpressionAttributeValues: {
          ':filter_entityType': 'POST',
          ':filter_isPublic': true
        },
        Limit: 24
      });
    });

    it('should include cursor for pagination', () => {
      const cursor = Buffer.from(JSON.stringify({ PK: 'USER#user123', SK: 'POST#123' })).toString('base64');
      const config: FeedQueryConfig = {
        tableName,
        limit: 24,
        cursor
      };

      const result = buildPostFeedQuery(config);

      expect(result.ExclusiveStartKey).toEqual({
        PK: 'USER#user123',
        SK: 'POST#123'
      });
    });
  });

  describe('Immutability and edge cases', () => {
    it('should not mutate input config', () => {
      const config: QueryConfig = {
        tableName,
        keyCondition: {
          pk: 'USER#user123'
        },
        filters: {
          isPublic: true
        }
      };
      const originalConfig = JSON.parse(JSON.stringify(config));

      buildQueryParams(config);

      expect(config).toEqual(originalConfig);
    });

    it('should handle empty filters object', () => {
      const config: QueryConfig = {
        tableName,
        keyCondition: {
          pk: 'USER#user123'
        },
        filters: {}
      };

      const result = buildQueryParams(config);

      expect(result.FilterExpression).toBeUndefined();
    });

    it('should handle filter with null value', () => {
      const config: QueryConfig = {
        tableName,
        keyCondition: {
          pk: 'USER#user123'
        },
        filters: {
          deletedAt: null
        }
      };

      const result = buildQueryParams(config);

      expect(result.FilterExpression).toBe('deletedAt = :filter_deletedAt');
      expect(result.ExpressionAttributeValues).toMatchObject({
        ':filter_deletedAt': null
      });
    });
  });
});
