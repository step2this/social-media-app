/**
 * GraphQL Server Response Types
 *
 * Type-safe wrappers for Apollo Server responses used in backend testing.
 * These types match the actual response structure from Apollo Server's executeOperation.
 *
 * Note: These are different from frontend's AsyncState types.
 * - Frontend: AsyncState<T> for client-side state management
 * - Backend: GraphQLResult<T> for server response validation
 *
 * @example
 * ```typescript
 * import { assertSingleResult, assertNoErrors } from '@social-media-app/shared/test-utils';
 *
 * const result = await server.executeOperation({ query, variables }, { contextValue });
 * assertSingleResult(result.body);
 * assertNoErrors(result.body.singleResult);
 * const data = result.body.singleResult.data;
 * ```
 */

/**
 * GraphQL error response structure
 */
export interface GraphQLErrorResponse {
  message: string;
  path?: (string | number)[];
  locations?: Array<{ line: number; column: number }>;
  extensions?: {
    code?: string;
    [key: string]: unknown;
  };
}

/**
 * Single result from GraphQL execution
 * Contains either data or errors (or both in some cases)
 */
export interface SingleResult<T> {
  data?: T;
  errors?: GraphQLErrorResponse[];
}

/**
 * GraphQL execution result
 * Discriminated union for single vs incremental results
 */
export type GraphQLResult<T> =
  | {
      kind: 'single';
      singleResult: SingleResult<T>;
    }
  | {
      kind: 'incremental';
      initialResult: SingleResult<T>;
      subsequentResults: AsyncIterable<SingleResult<T>>;
    };

/**
 * Type guard to assert result is single (not incremental)
 *
 * @param result - GraphQL result to check
 * @throws Error if result is not single kind
 */
export function assertSingleResult<T>(
  result: GraphQLResult<T>
): asserts result is { kind: 'single'; singleResult: SingleResult<T> } {
  if (result.kind !== 'single') {
    throw new Error(
      `Expected single result, got ${result.kind}. Incremental delivery is not supported in tests.`
    );
  }
}

/**
 * Type guard to assert result has no errors
 *
 * @param result - Single result to check
 * @throws Error if result has errors
 */
export function assertNoErrors<T>(
  result: SingleResult<T>
): asserts result is { data: T } {
  if (result.errors && result.errors.length > 0) {
    const errorMessages = result.errors.map(e => e.message).join(', ');
    const errorDetails = JSON.stringify(result.errors, null, 2);
    throw new Error(
      `Expected no GraphQL errors but got ${result.errors.length}:\n` +
      `Messages: ${errorMessages}\n` +
      `Details: ${errorDetails}`
    );
  }

  if (!result.data) {
    throw new Error('Expected data to be present when there are no errors');
  }
}

/**
 * Type guard to assert result has errors
 *
 * @param result - Single result to check
 * @throws Error if result has no errors
 */
export function assertHasErrors<T>(
  result: SingleResult<T>
): asserts result is { errors: GraphQLErrorResponse[] } {
  if (!result.errors || result.errors.length === 0) {
    throw new Error(
      `Expected GraphQL errors but got none. Data: ${JSON.stringify(result.data)}`
    );
  }
}

/**
 * Type guard to check if result has a specific error code
 *
 * @param result - Single result to check
 * @param expectedCode - Expected error code
 * @returns True if any error has the expected code
 */
export function hasErrorCode<T>(
  result: SingleResult<T>,
  expectedCode: string
): boolean {
  return Boolean(
    result.errors?.some(err => err.extensions?.code === expectedCode)
  );
}

/**
 * Get first error code from result
 *
 * @param result - Single result
 * @returns First error code or undefined
 */
export function getFirstErrorCode<T>(result: SingleResult<T>): string | undefined {
  return result.errors?.[0]?.extensions?.code as string | undefined;
}

/**
 * Get all error codes from result
 *
 * @param result - Single result
 * @returns Array of error codes
 */
export function getAllErrorCodes<T>(result: SingleResult<T>): string[] {
  if (!result.errors) return [];
  return result.errors
    .map(err => err.extensions?.code as string | undefined)
    .filter((code): code is string => Boolean(code));
}

/**
 * Extract data from a successful GraphQL result
 * Throws if result has errors
 *
 * @param result - GraphQL result
 * @returns Extracted data
 * @throws Error if result has errors or is incremental
 */
export function extractData<T>(result: GraphQLResult<T>): T {
  assertSingleResult(result);
  assertNoErrors(result.singleResult);
  return result.singleResult.data;
}

/**
 * Extract errors from a failed GraphQL result
 * Throws if result has no errors
 *
 * @param result - GraphQL result
 * @returns Array of errors
 * @throws Error if result has no errors or is incremental
 */
export function extractErrors<T>(result: GraphQLResult<T>): GraphQLErrorResponse[] {
  assertSingleResult(result);
  assertHasErrors(result.singleResult);
  return result.singleResult.errors;
}
