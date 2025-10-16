/* eslint-disable */
import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { handler } from './get-comments.js';
import { CommentService } from '@social-media-app/dal';
import { createMockAPIGatewayEvent } from '@social-media-app/shared/test-utils';
import * as dynamoUtils from '../../utils/dynamodb.js';

// Mock dependencies
vi.mock('@social-media-app/dal', () => ({
  CommentService: vi.fn()
}));

vi.mock('../../utils/dynamodb.js', () => ({
  createDynamoDBClient: vi.fn(),
  getTableName: vi.fn()
}));

const MockCommentService = CommentService as vi.MockedClass<typeof CommentService>;
const mockCreateDynamoDBClient = dynamoUtils.createDynamoDBClient as MockedFunction<typeof dynamoUtils.createDynamoDBClient>;
const mockGetTableName = dynamoUtils.getTableName as MockedFunction<typeof dynamoUtils.getTableName>;

describe('Get Comments Handler', () => {
  const mockCommentService = {
    createComment: vi.fn(),
    deleteComment: vi.fn(),
    getCommentsByPost: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockCreateDynamoDBClient.mockReturnValue({} as any);
    mockGetTableName.mockReturnValue('test-table');

    MockCommentService.mockImplementation(() => mockCommentService as any);
  });

  it('should get comments successfully with valid postId', async () => {
    const postId = '123e4567-e89b-12d3-a456-426614174000';
    const mockCommentsResponse = {
      comments: [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          postId,
          userId: '123e4567-e89b-12d3-a456-426614174002',
          userHandle: 'testuser',
          content: 'Great post!',
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z'
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174003',
          postId,
          userId: '123e4567-e89b-12d3-a456-426614174004',
          userHandle: 'anotheruser',
          content: 'Nice photo!',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ],
      totalCount: 2,
      hasMore: false
    };

    mockCommentService.getCommentsByPost.mockResolvedValue(mockCommentsResponse);

    const event = createMockAPIGatewayEvent({
      queryStringParameters: { postId }
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body || '{}');
    expect(body).toMatchObject(mockCommentsResponse);

    expect(mockCommentService.getCommentsByPost).toHaveBeenCalledWith(
      postId,
      20, // default limit
      undefined // no cursor
    );
  });

  it('should return empty array when post has no comments', async () => {
    const postId = '123e4567-e89b-12d3-a456-426614174000';
    const mockCommentsResponse = {
      comments: [],
      totalCount: 0,
      hasMore: false
    };

    mockCommentService.getCommentsByPost.mockResolvedValue(mockCommentsResponse);

    const event = createMockAPIGatewayEvent({
      queryStringParameters: { postId }
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body || '{}');
    expect(body).toMatchObject(mockCommentsResponse);
  });

  it('should respect limit parameter', async () => {
    const postId = '123e4567-e89b-12d3-a456-426614174000';
    const limit = '10';
    const mockCommentsResponse = {
      comments: Array.from({ length: 10 }, (_, i) => ({
        id: `123e4567-e89b-12d3-a456-42661417400${i}`,
        postId,
        userId: '123e4567-e89b-12d3-a456-426614174002',
        userHandle: 'testuser',
        content: `Comment ${i}`,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      })),
      totalCount: 10,
      hasMore: true,
      nextCursor: 'eyJwayI6InRlc3QiLCJzayI6InRlc3QifQ=='
    };

    mockCommentService.getCommentsByPost.mockResolvedValue(mockCommentsResponse);

    const event = createMockAPIGatewayEvent({
      queryStringParameters: { postId, limit }
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body || '{}');
    expect(body).toMatchObject(mockCommentsResponse);

    expect(mockCommentService.getCommentsByPost).toHaveBeenCalledWith(
      postId,
      10,
      undefined
    );
  });

  it('should use default limit of 20 when not provided', async () => {
    const postId = '123e4567-e89b-12d3-a456-426614174000';
    const mockCommentsResponse = {
      comments: [],
      totalCount: 0,
      hasMore: false
    };

    mockCommentService.getCommentsByPost.mockResolvedValue(mockCommentsResponse);

    const event = createMockAPIGatewayEvent({
      queryStringParameters: { postId }
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockCommentService.getCommentsByPost).toHaveBeenCalledWith(
      postId,
      20, // Default limit
      undefined
    );
  });

  it('should handle pagination with cursor', async () => {
    const postId = '123e4567-e89b-12d3-a456-426614174000';
    const cursor = 'eyJwayI6InRlc3QiLCJzayI6InRlc3QifQ=='; // base64 encoded test cursor
    const mockCommentsResponse = {
      comments: [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          postId,
          userId: '123e4567-e89b-12d3-a456-426614174002',
          userHandle: 'testuser',
          content: 'Comment from page 2',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ],
      totalCount: 1,
      hasMore: true,
      nextCursor: 'eyJwayI6Im5leHQiLCJzayI6Im5leHQifQ=='
    };

    mockCommentService.getCommentsByPost.mockResolvedValue(mockCommentsResponse);

    const event = createMockAPIGatewayEvent({
      queryStringParameters: { postId, cursor }
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body || '{}');
    expect(body).toMatchObject(mockCommentsResponse);

    expect(mockCommentService.getCommentsByPost).toHaveBeenCalledWith(
      postId,
      20,
      cursor
    );
  });

  it('should return 400 when postId is missing', async () => {
    const event = createMockAPIGatewayEvent({});

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: expect.any(String)
    });
  });

  it('should return 400 when postId is not a valid UUID', async () => {
    const event = createMockAPIGatewayEvent({
      queryStringParameters: { postId: 'invalid-uuid' }
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: expect.any(String)
    });
  });

  it('should return 400 when limit is negative', async () => {
    const postId = '123e4567-e89b-12d3-a456-426614174000';
    const event = createMockAPIGatewayEvent({
      queryStringParameters: { postId, limit: '-1' }
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: expect.any(String)
    });
  });

  it('should return 400 when limit is not a number', async () => {
    const postId = '123e4567-e89b-12d3-a456-426614174000';
    const event = createMockAPIGatewayEvent({
      queryStringParameters: { postId, limit: 'invalid' }
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: expect.any(String)
    });
  });

  it('should return 500 when CommentService throws an error', async () => {
    const postId = '123e4567-e89b-12d3-a456-426614174000';

    mockCommentService.getCommentsByPost.mockRejectedValue(
      new Error('DynamoDB connection failed')
    );

    const event = createMockAPIGatewayEvent({
      queryStringParameters: { postId }
    });

    // Mock console.error to suppress error output during test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Internal server error'
    });
    expect(consoleSpy).toHaveBeenCalledWith('Error getting comments:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('should return 400 for invalid response data validation', async () => {
    const postId = '123e4567-e89b-12d3-a456-426614174000';

    // Mock service to return invalid data structure
    mockCommentService.getCommentsByPost.mockResolvedValue({
      comments: [
        {
          id: 'invalid-uuid', // Invalid UUID format
          postId,
          userId: '123e4567-e89b-12d3-a456-426614174002',
          userHandle: 'testuser',
          content: 'Test comment',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ],
      totalCount: 1,
      hasMore: false
    });

    const event = createMockAPIGatewayEvent({
      queryStringParameters: { postId }
    });

    // Mock console.error to suppress error output during test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Invalid response data'
    });

    consoleSpy.mockRestore();
  });

  it('should handle edge case with maximum valid limit (100)', async () => {
    const postId = '123e4567-e89b-12d3-a456-426614174000';
    const mockCommentsResponse = {
      comments: [],
      totalCount: 0,
      hasMore: false
    };

    mockCommentService.getCommentsByPost.mockResolvedValue(mockCommentsResponse);

    const event = createMockAPIGatewayEvent({
      queryStringParameters: { postId, limit: '100' }
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockCommentService.getCommentsByPost).toHaveBeenCalledWith(
      postId,
      100,
      undefined
    );
  });

  it('should handle edge case with minimum valid limit (1)', async () => {
    const postId = '123e4567-e89b-12d3-a456-426614174000';
    const mockCommentsResponse = {
      comments: [],
      totalCount: 0,
      hasMore: false
    };

    mockCommentService.getCommentsByPost.mockResolvedValue(mockCommentsResponse);

    const event = createMockAPIGatewayEvent({
      queryStringParameters: { postId, limit: '1' }
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockCommentService.getCommentsByPost).toHaveBeenCalledWith(
      postId,
      1,
      undefined
    );
  });

  it('should handle both limit and cursor together', async () => {
    const postId = '123e4567-e89b-12d3-a456-426614174000';
    const limit = '15';
    const cursor = 'eyJwayI6InRlc3QiLCJzayI6InRlc3QifQ==';
    const mockCommentsResponse = {
      comments: [],
      totalCount: 0,
      hasMore: false
    };

    mockCommentService.getCommentsByPost.mockResolvedValue(mockCommentsResponse);

    const event = createMockAPIGatewayEvent({
      queryStringParameters: { postId, limit, cursor }
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockCommentService.getCommentsByPost).toHaveBeenCalledWith(
      postId,
      15,
      cursor
    );
  });
});
