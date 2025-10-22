/**
 * Mock GraphQL client for testing
 *
 * Implements same interface as production client but records calls for verification.
 * This is NOT a spy - it's a real implementation designed for testing.
 *
 * Benefits:
 * ✅ No vi.spyOn() or vi.fn() needed
 * ✅ Simple call recording with arrays
 * ✅ Configurable responses for different test scenarios
 * ✅ Same interface as production client
 * ✅ Tests focus on behavior, not implementation details
 *
 * @example
 * ```typescript
 * // Test setup
 * const mockClient = new MockGraphQLClient();
 * mockClient.setQueryResponse({
 *   status: 'success',
 *   data: { user: { id: '1', name: 'John' } }
 * });
 *
 * // Run code under test
 * const service = new UserService(mockClient);
 * await service.getUser('1');
 *
 * // Verify behavior (NOT implementation)
 * expect(mockClient.queryCalls).toHaveLength(1);
 * expect(mockClient.queryCalls[0].query).toContain('GetUser');
 * expect(mockClient.queryCalls[0].variables).toEqual({ id: '1' });
 * ```
 */

import type { IGraphQLClient } from './interfaces/IGraphQLClient.js';
import type { AsyncState } from './types.js';

/**
 * Mock GraphQL client for testing
 */
export class MockGraphQLClient implements IGraphQLClient {
    // ========================================
    // Call recording (NOT spies - just arrays)
    // ========================================

    /**
     * All query() calls made to this mock
     */
    public queryCalls: Array<{
        query: string;
        variables: Record<string, unknown>;
    }> = [];

    /**
     * All mutate() calls made to this mock
     */
    public mutateCalls: Array<{
        mutation: string;
        variables: Record<string, unknown>;
    }> = [];

    /**
     * All tokens set via setAuthToken()
     */
    public authTokens: string[] = [];

    // ========================================
    // Configurable responses
    // ========================================

    private queryResponse: AsyncState<any> = { status: 'success', data: {} };
    private mutationResponse: AsyncState<any> = { status: 'success', data: {} };

    /**
     * Configure what query() should return
     *
     * @example
     * ```typescript
     * mockClient.setQueryResponse({
     *   status: 'success',
     *   data: { user: { id: '1', name: 'John' } }
     * });
     * ```
     */
    setQueryResponse<TData>(response: AsyncState<TData>): void {
        this.queryResponse = response;
    }

    /**
     * Configure what mutate() should return
     *
     * @example
     * ```typescript
     * mockClient.setMutationResponse({
     *   status: 'error',
     *   error: { message: 'Validation failed' }
     * });
     * ```
     */
    setMutationResponse<TData>(response: AsyncState<TData>): void {
        this.mutationResponse = response;
    }

    // ========================================
    // IGraphQLClient implementation
    // ========================================

    async query<TData>(
        query: string,
        variables: Record<string, unknown> = {}
    ): Promise<AsyncState<TData>> {
        // Record the call
        this.queryCalls.push({ query, variables });

        // Return configured response
        return this.queryResponse as AsyncState<TData>;
    }

    async mutate<TData>(
        mutation: string,
        variables: Record<string, unknown> = {}
    ): Promise<AsyncState<TData>> {
        // Record the call
        this.mutateCalls.push({ mutation, variables });

        // Return configured response
        return this.mutationResponse as AsyncState<TData>;
    }

    setAuthToken(token: string): void {
        this.authTokens.push(token);
    }

    clearAuthToken(): void {
        this.authTokens = [];
    }

    // ========================================
    // Test utilities
    // ========================================

    /**
     * Reset all recorded calls and responses
     *
     * Use in beforeEach() to ensure test isolation
     *
     * @example
     * ```typescript
     * beforeEach(() => {
     *   mockClient.reset();
     * });
     * ```
     */
    reset(): void {
        this.queryCalls = [];
        this.mutateCalls = [];
        this.authTokens = [];
        this.queryResponse = { status: 'success', data: {} };
        this.mutationResponse = { status: 'success', data: {} };
    }

    /**
     * Get the last query call (convenience method)
     *
     * @typeParam TVariables - Type of the variables object for type-safe access
     *
     * @example
     * ```typescript
     * interface GetUserVariables {
     *   id: string;
     * }
     * const lastCall = mockClient.lastQueryCall<GetUserVariables>();
     * expect(lastCall?.variables.id).toBe('123');
     * ```
     */
    lastQueryCall<TVariables = Record<string, unknown>>():
        | { query: string; variables: TVariables }
        | undefined {
        return this.queryCalls[this.queryCalls.length - 1] as
            | { query: string; variables: TVariables }
            | undefined;
    }

    /**
     * Get the last mutation call (convenience method)
     *
     * @typeParam TVariables - Type of the variables object for type-safe access
     *
     * @example
     * ```typescript
     * interface CreateCommentVariables {
     *   input: {
     *     postId: string;
     *     content: string;
     *   };
     * }
     * const lastCall = mockClient.lastMutationCall<CreateCommentVariables>();
     * expect(lastCall?.variables.input.postId).toBe('post-456');
     * ```
     */
    lastMutationCall<TVariables = Record<string, unknown>>():
        | { mutation: string; variables: TVariables }
        | undefined {
        return this.mutateCalls[this.mutateCalls.length - 1] as
            | { mutation: string; variables: TVariables }
            | undefined;
    }

    /**
     * Get the last auth token (convenience method)
     */
    get lastAuthToken(): string | undefined {
        return this.authTokens[this.authTokens.length - 1];
    }
}
