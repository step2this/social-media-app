/**
 * Generalized Test Helpers for Service Tests
 *
 * Provides reusable utilities to DRY up repetitive test patterns across
 * all service tests (Post, Like, Comment, Auction, etc.)
 */

import { expect } from 'vitest';
import type { AsyncState } from '../../../graphql/types.js';
import type { MockGraphQLClient } from '../../../graphql/client.mock.js';
import {
    wrapInGraphQLSuccess,
    wrapInGraphQLError,
} from '../fixtures/graphqlFixtures.js';

/**
 * Helper to test error scenarios with consistent assertions
 *
 * @example
 * await expectServiceError(
 *   mockClient,
 *   () => service.createPost(input),
 *   'Failed to create post',
 *   'INTERNAL_SERVER_ERROR'
 * );
 */
export async function expectServiceError<T>(
    mockClient: MockGraphQLClient,
    serviceCall: () => Promise<AsyncState<T>>,
    expectedMessage: string,
    expectedCode: string,
    setupType: 'query' | 'mutation' = 'mutation'
): Promise<void> {
    const errorResponse = wrapInGraphQLError(expectedMessage, expectedCode);

    if (setupType === 'query') {
        mockClient.setQueryResponse(errorResponse);
    } else {
        mockClient.setMutationResponse(errorResponse);
    }

    const result = await serviceCall();

    expect(result.status).toBe('error');
    if (result.status === 'error') {
        expect(result.error.message).toBe(expectedMessage);
        expect(result.error.extensions?.code).toBe(expectedCode);
    }
}

/**
 * Helper to test success scenarios with custom assertions
 *
 * @example
 * await expectServiceSuccess(
 *   mockClient,
 *   () => service.createPost(input),
 *   { createPost: payload },
 *   (data) => {
 *     expect(data.post.id).toBe('post-1');
 *   }
 * );
 */
export async function expectServiceSuccess<T>(
    mockClient: MockGraphQLClient,
    serviceCall: () => Promise<AsyncState<T>>,
    mockResponse: any,
    assertions: (data: T) => void,
    setupType: 'query' | 'mutation' = 'mutation'
): Promise<void> {
    const successResponse = wrapInGraphQLSuccess(mockResponse);

    if (setupType === 'query') {
        mockClient.setQueryResponse(successResponse);
    } else {
        mockClient.setMutationResponse(successResponse);
    }

    const result = await serviceCall();

    expect(result.status).toBe('success');
    if (result.status === 'success') {
        assertions(result.data);
    }
}

/**
 * Helper to verify mutation call variables
 * Works with generic types for type-safe assertions
 *
 * @example
 * expectMutationCalledWith<{ postId: string }>(
 *   mockClient,
 *   { postId: 'post-123' }
 * );
 */
export function expectMutationCalledWith<T>(
    mockClient: MockGraphQLClient,
    expectedVariables: Partial<T>
): void {
    const lastCall = mockClient.lastMutationCall<T>();
    expect(lastCall).toBeDefined();

    for (const [key, value] of Object.entries(expectedVariables)) {
        expect((lastCall?.variables as any)[key]).toEqual(value);
    }
}

/**
 * Helper to verify query call variables
 * Works with generic types for type-safe assertions
 *
 * @example
 * expectQueryCalledWith<{ id: string }>(
 *   mockClient,
 *   { id: 'post-123' }
 * );
 */
export function expectQueryCalledWith<T>(
    mockClient: MockGraphQLClient,
    expectedVariables: Partial<T>
): void {
    const lastCall = mockClient.lastQueryCall<T>();
    expect(lastCall).toBeDefined();

    for (const [key, value] of Object.entries(expectedVariables)) {
        expect((lastCall?.variables as any)[key]).toEqual(value);
    }
}

/**
 * Re-export error scenarios from shared package
 * This maintains backward compatibility while using centralized error definitions
 */
export { errorScenarios } from '@social-media-app/shared/test-utils';
