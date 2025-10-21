/**
 * GraphQL Client Behavior Tests
 *
 * Testing principles:
 * ✅ Test behavior, not implementation
 * ✅ Mock only external dependencies (graphql-request)
 * ✅ Verify AsyncState transformations
 * ✅ Test error handling paths
 * ❌ NO spying on internal methods
 * ❌ NO testing implementation details
 */
import { describe, test, expect, beforeEach, vi, type Mock } from 'vitest';
import { GraphQLClient } from '../client.js';
import { ClientError } from 'graphql-request';
import { isSuccess, isError } from '../types.js';

// Create mock request function
const mockRequest = vi.fn();

// Mock graphql-request module
vi.mock('graphql-request', () => {
  const MockGQLClient = vi.fn().mockImplementation(() => ({
    request: mockRequest,
  }));

  return {
    GraphQLClient: MockGQLClient,
    ClientError: class ClientError extends Error {
      response: any;
      request: any;
      constructor(response: any, request: any) {
        super('GraphQL Error');
        this.response = response;
        this.request = request;
      }
    },
  };
});

describe('GraphQLClient Behavior', () => {
  let client: GraphQLClient;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    mockRequest.mockReset();

    // Create our client
    client = new GraphQLClient('http://localhost:4000/graphql');
  });

  describe('Query Behavior', () => {
    test('should return success state when query succeeds', async () => {
      // Arrange: Configure mock response
      const mockData = { user: { id: '1', name: 'John Doe' } };
      mockRequest.mockResolvedValueOnce(mockData);

      // Act: Execute query
      const result = await client.query<{ user: { id: string; name: string } }>(
        'query GetUser($id: ID!) { user(id: $id) { id name } }',
        { id: '1' }
      );

      // Assert: Verify behavior
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual(mockData);
        expect(result.data.user.name).toBe('John Doe');
      }

      // Verify the client was called correctly
      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith(
        'query GetUser($id: ID!) { user(id: $id) { id name } }',
        { id: '1' }
      );
    });

    test('should return success state with empty data', async () => {
      // Arrange
      const mockData = { user: null };
      mockRequest.mockResolvedValueOnce(mockData);

      // Act
      const result = await client.query<{ user: any }>(
        'query GetUser($id: ID!) { user(id: $id) { id } }',
        { id: '999' }
      );

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.user).toBeNull();
      }
    });

    test('should handle query with no variables', async () => {
      // Arrange
      const mockData = { users: [] };
      mockRequest.mockResolvedValueOnce(mockData);

      // Act
      const result = await client.query<{ users: any[] }>(
        'query GetAllUsers { users { id name } }'
      );

      // Assert
      expect(isSuccess(result)).toBe(true);
      expect(mockRequest).toHaveBeenCalledWith(
        'query GetAllUsers { users { id name } }',
        {}
      );
    });
  });

  describe('Mutation Behavior', () => {
    test('should return success state when mutation succeeds', async () => {
      // Arrange
      const mockData = {
        createUser: { id: '2', name: 'Jane Doe' },
      };
      mockRequest.mockResolvedValueOnce(mockData);

      // Act
      const result = await client.mutate<{
        createUser: { id: string; name: string };
      }>(
        'mutation CreateUser($input: CreateUserInput!) { createUser(input: $input) { id name } }',
        { input: { name: 'Jane Doe' } }
      );

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.createUser.name).toBe('Jane Doe');
      }

      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    test('should handle mutation with complex input', async () => {
      // Arrange
      const mockData = { updateUser: { id: '1', name: 'Updated' } };
      mockRequest.mockResolvedValueOnce(mockData);

      const complexInput = {
        id: '1',
        name: 'Updated',
        metadata: { lastLogin: new Date().toISOString() },
      };

      // Act
      const result = await client.mutate('mutation UpdateUser { ... }', {
        input: complexInput,
      });

      // Assert
      expect(isSuccess(result)).toBe(true);
      expect(mockRequest).toHaveBeenCalledWith(
        'mutation UpdateUser { ... }',
        { input: complexInput }
      );
    });
  });

  describe('Error Handling - GraphQL Errors', () => {
    test('should return error state when GraphQL returns validation errors', async () => {
      // Arrange: Create GraphQL error response
      const gqlError = new ClientError(
        {
          errors: [
            {
              message: 'User not found',
              extensions: { code: 'NOT_FOUND' },
              path: ['user'],
            } as any,
          ],
        } as any,
        { query: 'test query' } as any as any
      );

      mockRequest.mockRejectedValueOnce(gqlError);

      // Act
      const result = await client.query('query { user { id } }', { id: '999' });

      // Assert
      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.error.message).toBe('User not found');
        expect(result.error.extensions?.code).toBe('NOT_FOUND');
        expect(result.error.path).toEqual(['user']);
      }
    });

    test('should handle GraphQL errors without extensions', async () => {
      // Arrange
      const gqlError = new ClientError(
        {
          errors: [
            {
              message: 'Something went wrong',
            } as any,
          ],
        } as any,
        { query: 'test' } as any
      );

      mockRequest.mockRejectedValueOnce(gqlError);

      // Act
      const result = await client.query('query { test }');

      // Assert
      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.error.message).toBe('Something went wrong');
        expect(result.error.extensions?.code).toBe('GRAPHQL_ERROR');
      }
    });

    test('should use ClientError message as fallback', async () => {
      // Arrange: ClientError with no errors array
      const gqlError = new ClientError(
        { errors: [] } as any,
        { query: 'test' } as any
      );
      gqlError.message = 'Network timeout';

      mockRequest.mockRejectedValueOnce(gqlError);

      // Act
      const result = await client.query('query { test }');

      // Assert
      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.error.message).toBe('Network timeout');
      }
    });
  });

  describe('Error Handling - Network Errors', () => {
    test('should return error state on network failure', async () => {
      // Arrange: Simulate network error
      const networkError = new Error('Failed to fetch');
      mockRequest.mockRejectedValueOnce(networkError);

      // Act
      const result = await client.query('query { test }');

      // Assert
      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.error.message).toBe('Failed to fetch');
        expect(result.error.extensions?.code).toBe('NETWORK_ERROR');
      }
    });

    test('should handle unknown error types gracefully', async () => {
      // Arrange: Non-Error object thrown
      mockRequest.mockRejectedValueOnce('Something weird happened');

      // Act
      const result = await client.query('query { test }');

      // Assert
      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.error.message).toBe('Unknown error');
        expect(result.error.extensions?.code).toBe('NETWORK_ERROR');
      }
    });

    test('should handle timeout errors', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout');
      mockRequest.mockRejectedValueOnce(timeoutError);

      // Act
      const result = await client.query('query { test }');

      // Assert
      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.error.message).toBe('Request timeout');
      }
    });
  });

  describe('Authentication Behavior', () => {
    test('should allow setting auth token without throwing', () => {
      // Arrange & Act: Set auth token (behavior test, not implementation)
      expect(() => {
        client.setAuthToken('test-token-123');
      }).not.toThrow();
    });

    test('should allow clearing auth token without throwing', () => {
      // Arrange: Set token first
      client.setAuthToken('test-token');

      // Act & Assert: Clear token should not throw
      expect(() => {
        client.clearAuthToken();
      }).not.toThrow();
    });

    test('should continue working after setting and clearing tokens', async () => {
      // Arrange
      const mockData = { user: { id: '1' } };
      mockRequest.mockResolvedValue(mockData);

      // Act: Set token, make query, clear token, make another query
      client.setAuthToken('token-1');
      const result1 = await client.query('query { user { id } }');

      client.clearAuthToken();
      const result2 = await client.query('query { user { id } }');

      client.setAuthToken('token-2');
      const result3 = await client.query('query { user { id } }');

      // Assert: All queries should succeed
      expect(isSuccess(result1)).toBe(true);
      expect(isSuccess(result2)).toBe(true);
      expect(isSuccess(result3)).toBe(true);

      // Should have made 3 requests
      expect(mockRequest).toHaveBeenCalledTimes(3);
    });

    test('should handle multiple token updates gracefully', () => {
      // Act: Set token multiple times (behavior: should not throw)
      expect(() => {
        client.setAuthToken('token-1');
        client.setAuthToken('token-2');
        client.setAuthToken('token-3');
      }).not.toThrow();
    });
  });

  describe('Type Safety', () => {
    test('should preserve type information in success state', async () => {
      // Arrange
      interface User {
        id: string;
        name: string;
        email: string;
      }

      const mockData = {
        user: { id: '1', name: 'John', email: 'john@example.com' },
      };
      mockRequest.mockResolvedValueOnce(mockData);

      // Act
      const result = await client.query<{ user: User }>(
        'query GetUser { user { id name email } }'
      );

      // Assert: TypeScript should know the exact type
      if (isSuccess(result)) {
        // These should all be type-safe
        const userId: string = result.data.user.id;
        const userName: string = result.data.user.name;
        const userEmail: string = result.data.user.email;

        expect(userId).toBe('1');
        expect(userName).toBe('John');
        expect(userEmail).toBe('john@example.com');
      }
    });

    test('should handle complex nested types', async () => {
      // Arrange
      interface Post {
        id: string;
        author: {
          id: string;
          name: string;
        };
        comments: Array<{
          id: string;
          text: string;
        }>;
      }

      const mockData = {
        post: {
          id: '1',
          author: { id: '2', name: 'Author' },
          comments: [{ id: '3', text: 'Comment 1' }],
        },
      };
      mockRequest.mockResolvedValueOnce(mockData);

      // Act
      const result = await client.query<{ post: Post }>(
        'query GetPost { post { id author { id name } comments { id text } } }'
      );

      // Assert
      if (isSuccess(result)) {
        expect(result.data.post.author.name).toBe('Author');
        expect(result.data.post.comments).toHaveLength(1);
        expect(result.data.post.comments[0].text).toBe('Comment 1');
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty query string', async () => {
      // Arrange
      mockRequest.mockResolvedValueOnce({});

      // Act
      const result = await client.query('');

      // Assert: Should not throw, just pass through
      expect(mockRequest).toHaveBeenCalledWith('', {});
    });

    test('should handle large response data', async () => {
      // Arrange: Create large dataset
      const mockData = {
        users: Array.from({ length: 1000 }, (_, i) => ({
          id: `${i}`,
          name: `User ${i}`,
        })),
      };
      mockRequest.mockResolvedValueOnce(mockData);

      // Act
      const result = await client.query<{ users: any[] }>(
        'query { users { id name } }'
      );

      // Assert
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.users).toHaveLength(1000);
      }
    });

    test('should handle special characters in variables', async () => {
      // Arrange
      const mockData = { search: [] };
      mockRequest.mockResolvedValueOnce(mockData);

      const specialChars = {
        query: 'test@#$%^&*()',
        emoji: '🎉🚀💯',
      };

      // Act
      const result = await client.query('query Search { ... }', specialChars);

      // Assert
      expect(isSuccess(result)).toBe(true);
      expect(mockRequest).toHaveBeenCalledWith(
        'query Search { ... }',
        specialChars
      );
    });
  });
});
