/**
 * Feed Service Integration Test
 *
 * Minimal integration test verifying:
 * 1. Lazy singleton initialization pattern
 * 2. GraphQL client → Service interface integration
 * 3. AsyncState flow through the stack
 * 4. Error handling and propagation
 *
 * This is NOT a full end-to-end test - it uses mocks to test the integration
 * points between components without requiring a real GraphQL server.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    feedService,
    getFeedService,
    setFeedService,
    resetFeedService
} from '../../feedService.js';
import { FeedServiceGraphQL } from '../../implementations/FeedService.graphql.js';
import { MockGraphQLClient } from '../../../graphql/client.mock.js';
import { isSuccess, isError } from '../../../graphql/types.js';
import {
    createMockExploreFeed,
    createMockMarkPostsAsReadInput,
    createMockMarkPostsAsReadResult
} from '../fixtures/feedFixtures.js';
import { wrapInGraphQLSuccess, wrapInGraphQLError } from '../fixtures/graphqlFixtures.js';

describe('Feed Service Integration', () => {
    let mockClient: MockGraphQLClient;

    beforeEach(() => {
        // Reset singleton between tests for isolation
        resetFeedService();

        // Create fresh mock client
        mockClient = new MockGraphQLClient();
    });

    afterEach(() => {
        // Cleanup after each test
        resetFeedService();
    });

    describe('Singleton Lifecycle', () => {
        it('should create service instance lazily on first access', () => {
            // Access feedService for the first time
            const instance1 = getFeedService();
            const instance2 = getFeedService();

            // Should return same instance (singleton)
            expect(instance1).toBe(instance2);
            expect(instance1).toBeInstanceOf(FeedServiceGraphQL);
        });

        it('should delegate Proxy calls to real singleton instance', async () => {
            // Inject mock client via custom service
            const customService = new FeedServiceGraphQL(mockClient);
            setFeedService(customService);

            // Set up mock response
            const mockFeed = createMockExploreFeed(3, false);
            mockClient.setQueryResponse(wrapInGraphQLSuccess({ exploreFeed: mockFeed }));

            // Call via Proxy (feedService constant)
            const result = await feedService.getExploreFeed();

            // Verify Proxy delegated to injected instance
            expect(mockClient.queryCalls).toHaveLength(1);
            expect(isSuccess(result)).toBe(true);
        });

        it('should reset singleton instance correctly', () => {
            // Get initial instance
            const instance1 = getFeedService();

            // Reset
            resetFeedService();

            // Get new instance
            const instance2 = getFeedService();

            // Should be different instances after reset
            expect(instance1).not.toBe(instance2);
        });

        it('should allow custom service injection for testing', () => {
            // Inject custom service
            const customService = new FeedServiceGraphQL(mockClient);
            setFeedService(customService);

            // Verify it was injected
            const retrieved = getFeedService();
            expect(retrieved).toBe(customService);
        });
    });

    describe('Query Flow', () => {
        it('should execute getExploreFeed query and return AsyncState success', async () => {
            // Setup: Inject service with mock client
            const customService = new FeedServiceGraphQL(mockClient);
            setFeedService(customService);

            // Setup: Configure mock response
            const mockFeed = createMockExploreFeed(3, false);
            mockClient.setQueryResponse(wrapInGraphQLSuccess({ exploreFeed: mockFeed }));

            // Execute: Call service method
            const result = await feedService.getExploreFeed();

            // Verify: AsyncState structure
            expect(result.status).toBe('success');
            expect(isSuccess(result)).toBe(true);

            // Verify: Data transformation (PostConnection → FeedResult)
            if (isSuccess(result)) {
                expect(result.data.items).toHaveLength(3);
                expect(result.data.hasNextPage).toBe(false);
                expect(result.data.items[0]).toHaveProperty('id');
                expect(result.data.items[0]).toHaveProperty('authorHandle');
            }
        });

        it('should pass pagination parameters to GraphQL query', async () => {
            // Setup: Inject service with mock client
            const customService = new FeedServiceGraphQL(mockClient);
            setFeedService(customService);

            // Setup: Configure mock response
            const mockFeed = createMockExploreFeed(12, true);
            mockClient.setQueryResponse(wrapInGraphQLSuccess({ exploreFeed: mockFeed }));

            // Execute: Call with pagination params
            await feedService.getExploreFeed({
                limit: 12,
                cursor: 'test-cursor-123'
            });

            // Verify: Correct query variables were sent
            const lastCall = mockClient.lastQueryCall();
            expect(lastCall).toBeDefined();
            expect(lastCall?.variables).toEqual({
                limit: 12,
                cursor: 'test-cursor-123'
            });
        });

        it('should use default limit when not specified', async () => {
            // Setup: Inject service with mock client
            const customService = new FeedServiceGraphQL(mockClient);
            setFeedService(customService);

            // Setup: Configure mock response
            const mockFeed = createMockExploreFeed(24, false);
            mockClient.setQueryResponse(wrapInGraphQLSuccess({ exploreFeed: mockFeed }));

            // Execute: Call without limit
            await feedService.getExploreFeed();

            // Verify: Default limit (24) was used
            const lastCall = mockClient.lastQueryCall();
            expect(lastCall?.variables.limit).toBe(24);
        });

        it('should transform PostConnection to FeedResult correctly', async () => {
            // Setup: Inject service with mock client
            const customService = new FeedServiceGraphQL(mockClient);
            setFeedService(customService);

            // Setup: Create feed with specific structure
            const mockFeed = createMockExploreFeed(2, true);
            mockClient.setQueryResponse(wrapInGraphQLSuccess({ exploreFeed: mockFeed }));

            // Execute
            const result = await feedService.getExploreFeed();

            // Verify: Transformation from GraphQL structure to FeedResult
            if (isSuccess(result)) {
                // Items should be flattened from edges.node
                expect(result.data.items).toHaveLength(2);

                // PageInfo should be extracted
                expect(result.data.hasNextPage).toBe(true);
                expect(result.data.endCursor).toBeTruthy();

                // Author data should be flattened
                expect(result.data.items[0].authorHandle).toBeDefined();
                expect(result.data.items[0].authorFullName).toBeDefined();
            }
        });

        it('should handle GraphQL errors and return AsyncState error', async () => {
            // Setup: Inject service with mock client
            const customService = new FeedServiceGraphQL(mockClient);
            setFeedService(customService);

            // Setup: Configure error response
            mockClient.setQueryResponse(
                wrapInGraphQLError('Feed unavailable', 'SERVICE_ERROR')
            );

            // Execute
            const result = await feedService.getExploreFeed();

            // Verify: Error state
            expect(result.status).toBe('error');
            expect(isError(result)).toBe(true);

            if (isError(result)) {
                expect(result.error.message).toBe('Feed unavailable');
                expect(result.error.extensions?.code).toBe('SERVICE_ERROR');
            }
        });
    });

    // Keep the placeholder test for now
    it('placeholder test to verify imports', () => {
        // This ensures all imports resolve correctly
        expect(feedService).toBeDefined();
        expect(getFeedService).toBeDefined();
        expect(setFeedService).toBeDefined();
        expect(resetFeedService).toBeDefined();
        expect(FeedServiceGraphQL).toBeDefined();
        expect(MockGraphQLClient).toBeDefined();
        expect(isSuccess).toBeDefined();
        expect(isError).toBeDefined();
        expect(createMockExploreFeed).toBeDefined();
        expect(createMockMarkPostsAsReadInput).toBeDefined();
        expect(createMockMarkPostsAsReadResult).toBeDefined();
        expect(wrapInGraphQLSuccess).toBeDefined();
        expect(wrapInGraphQLError).toBeDefined();
    });
});
