/**
 * Query Executor for GraphQL Tests
 *
 * Provides type-safe GraphQL query execution with automatic assertions.
 * Wraps Apollo Server's executeOperation for cleaner test code.
 *
 * @example
 * ```typescript
 * import { QueryExecutor } from '../helpers/query-executor';
 *
 * const executor = new QueryExecutor(server, context);
 * const data = await executor.executeAndAssertSuccess(query, variables);
 * ```
 */

import type { ApolloServer } from '@apollo/server';
import type { GraphQLContext } from '../../context.js';
import {
  type GraphQLResult,
  type GraphQLErrorResponse,
  assertSingleResult,
  assertNoErrors,
  assertHasErrors,
  hasErrorCode,
} from '@social-media-app/shared/test-utils';

/**
 * Query Executor class
 * Provides type-safe GraphQL query execution
 */
export class QueryExecutor<T = any> {
  constructor(
    private server: ApolloServer<GraphQLContext>,
    private context: GraphQLContext
  ) {}

  /**
   * Execute a GraphQL query and return raw result
   *
   * @param query - GraphQL query string
   * @param variables - Query variables
   * @returns GraphQL result
   */
  async execute(
    query: string,
    variables?: Record<string, any>
  ): Promise<GraphQLResult<T>> {
    const result = await this.server.executeOperation(
      { query, variables },
      { contextValue: this.context }
    );
    return result.body as GraphQLResult<T>;
  }

  /**
   * Execute a query and assert it succeeds
   * Throws if the query returns errors
   *
   * @param query - GraphQL query string
   * @param variables - Query variables
   * @returns Query data
   * @throws Error if query has errors
   */
  async executeAndAssertSuccess(
    query: string,
    variables?: Record<string, any>
  ): Promise<T> {
    const result = await this.execute(query, variables);
    assertSingleResult(result);
    assertNoErrors(result.singleResult);
    return result.singleResult.data as T;
  }

  /**
   * Execute a query and assert it returns errors
   * Throws if the query succeeds
   *
   * @param query - GraphQL query string
   * @param variables - Query variables
   * @param expectedCode - Optional expected error code to verify
   * @returns Array of errors
   * @throws Error if query has no errors or wrong error code
   */
  async executeAndAssertError(
    query: string,
    variables?: Record<string, any>,
    expectedCode?: string
  ): Promise<GraphQLErrorResponse[]> {
    const result = await this.execute(query, variables);
    assertSingleResult(result);
    assertHasErrors(result.singleResult);

    if (expectedCode && !hasErrorCode(result.singleResult, expectedCode)) {
      const actualCodes = result.singleResult.errors
        .map(e => e.extensions?.code)
        .join(', ');
      throw new Error(
        `Expected error code "${expectedCode}", but got: ${actualCodes}\n` +
        `Errors: ${JSON.stringify(result.singleResult.errors, null, 2)}`
      );
    }

    return result.singleResult.errors;
  }

  /**
   * Execute a query and assert it returns a specific error code
   *
   * @param query - GraphQL query string
   * @param expectedCode - Expected error code
   * @param variables - Query variables
   * @returns First error with matching code
   * @throws Error if no matching error code found
   */
  async executeAndExpectErrorCode(
    query: string,
    expectedCode: string,
    variables?: Record<string, any>
  ): Promise<GraphQLErrorResponse> {
    const errors = await this.executeAndAssertError(query, variables, expectedCode);
    const matchingError = errors.find(e => e.extensions?.code === expectedCode);

    if (!matchingError) {
      throw new Error(`No error with code "${expectedCode}" found`);
    }

    return matchingError;
  }

  /**
   * Execute a query and return result without assertions
   * Useful when you need to inspect the result manually
   *
   * @param query - GraphQL query string
   * @param variables - Query variables
   * @returns Single result (asserts kind is 'single')
   */
  async executeAndGetResult(
    query: string,
    variables?: Record<string, any>
  ) {
    const result = await this.execute(query, variables);
    assertSingleResult(result);
    return result.singleResult;
  }
}
