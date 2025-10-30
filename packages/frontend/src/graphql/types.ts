/**
 * GraphQL Type System
 *
 * Advanced TypeScript patterns for type-safe GraphQL operations:
 * - Discriminated unions for async state management
 * - Conditional types for operation extraction
 * - Type guards for runtime type narrowing
 * - Assertion functions for type-safe error handling
 */

/**
 * GraphQL error structure matching GraphQL spec
 */
export interface GraphQLError {
  message: string;
  extensions?: {
    code?: string;
    [key: string]: unknown;
  };
  path?: ReadonlyArray<string | number>;
}

/**
 * Async state machine using discriminated union
 * Enables exhaustive type narrowing in switch statements
 *
 * @example
 * ```typescript
 * const state: AsyncState<User> = await fetchUser();
 *
 * switch (state.status) {
 *   case 'idle':
 *     return <div>Not started</div>;
 *   case 'loading':
 *     return <div>Loading...</div>;
 *   case 'success':
 *     return <div>{state.data.name}</div>; // TypeScript knows state.data exists
 *   case 'error':
 *     return <div>{state.error.message}</div>; // TypeScript knows state.error exists
 * }
 * ```
 */
export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: GraphQLError };

/**
 * GraphQL operation base type
 */
export interface GraphQLOperation<
  TName extends string,
  TVariables extends Record<string, unknown>,
  TResponse,
  TOperationType extends 'query' | 'mutation' | 'subscription'
> {
  name: TName;
  variables: TVariables;
  response: TResponse;
  operationType: TOperationType;
}

/**
 * GraphQL query operation type
 */
export type GraphQLQuery<
  TName extends string,
  TVariables extends Record<string, unknown>,
  TResponse
> = GraphQLOperation<TName, TVariables, TResponse, 'query'>;

/**
 * GraphQL mutation operation type
 */
export type GraphQLMutation<
  TName extends string,
  TVariables extends Record<string, unknown>,
  TResponse
> = GraphQLOperation<TName, TVariables, TResponse, 'mutation'>;

/**
 * GraphQL subscription operation type
 */
export type GraphQLSubscription<
  TName extends string,
  TVariables extends Record<string, unknown>,
  TResponse
> = GraphQLOperation<TName, TVariables, TResponse, 'subscription'>;

/**
 * Extract variables from GraphQL operation type
 *
 * @example
 * ```typescript
 * type GetUserOp = GraphQLQuery<'GetUser', { id: string }, { user: User }>;
 * type Vars = ExtractVariables<GetUserOp>; // { id: string }
 * ```
 */
export type ExtractVariables<T> = T extends GraphQLOperation<
  any,
  infer V,
  any,
  any
>
  ? V
  : never;

/**
 * Extract response from GraphQL operation type
 *
 * @example
 * ```typescript
 * type GetUserOp = GraphQLQuery<'GetUser', { id: string }, { user: User }>;
 * type Response = ExtractResponse<GetUserOp>; // { user: User }
 * ```
 */
export type ExtractResponse<T> = T extends GraphQLOperation<
  any,
  any,
  infer R,
  any
>
  ? R
  : never;

/**
 * Type guard for idle state
 */
export function isIdle<T>(
  state: AsyncState<T>
): state is Extract<AsyncState<T>, { status: 'idle' }> {
  return state.status === 'idle';
}

/**
 * Type guard for loading state
 */
export function isLoading<T>(
  state: AsyncState<T>
): state is Extract<AsyncState<T>, { status: 'loading' }> {
  return state.status === 'loading';
}

/**
 * Type guard for success state
 * Used for type narrowing, not spying
 *
 * @example
 * ```typescript
 * const result = await client.query<User>('...');
 * if (isSuccess(result)) {
 *   // TypeScript knows result.data is User
 *   console.log(result.data.name);
 * }
 * ```
 */
export function isSuccess<T>(
  state: AsyncState<T>
): state is Extract<AsyncState<T>, { status: 'success' }> {
  return state.status === 'success';
}

/**
 * Type guard for error state
 */
export function isError<T>(
  state: AsyncState<T>
): state is Extract<AsyncState<T>, { status: 'error' }> {
  return state.status === 'error';
}

/**
 * Assert success state, throw if not
 *
 * @example
 * ```typescript
 * const result = await client.query<User>('...');
 * assertSuccess(result); // Throws if not success
 * // TypeScript knows result.data is User after this line
 * console.log(result.data.name);
 * ```
 */
export function assertSuccess<T>(
  state: AsyncState<T>
): asserts state is Extract<AsyncState<T>, { status: 'success' }> {
  if (!isSuccess(state)) {
    throw new Error(`Expected success state, got: ${state.status}`);
  }
}

/**
 * Assert error state, throw if not
 */
export function assertError<T>(
  state: AsyncState<T>
): asserts state is Extract<AsyncState<T>, { status: 'error' }> {
  if (!isError(state)) {
    throw new Error(`Expected error state, got: ${state.status}`);
  }
}

/**
 * Unwrap AsyncState to get data or throw error
 * Simplifies handling of AsyncState in async contexts where you want to throw on error
 *
 * @example
 * ```typescript
 * // Before (verbose):
 * const result = await service.getData();
 * if (isSuccess(result)) {
 *   return result.data;
 * } else {
 *   throw new Error(result.error.message);
 * }
 *
 * // After (concise):
 * return unwrap(await service.getData());
 * ```
 *
 * @throws {Error} If state is error or not success
 */
export function unwrap<T>(state: AsyncState<T>): T {
  if (isSuccess(state)) {
    return state.data;
  }
  if (isError(state)) {
    throw new Error(state.error.message);
  }
  throw new Error(`Cannot unwrap state with status: ${state.status}`);
}

/**
 * Unwrap AsyncState or return null on error
 * Useful when you want to handle errors gracefully without throwing
 *
 * @example
 * ```typescript
 * const data = unwrapOr(await service.getData(), null);
 * if (data === null) {
 *   // Handle error gracefully
 * }
 * ```
 */
export function unwrapOr<T, D>(state: AsyncState<T>, defaultValue: D): T | D {
  return isSuccess(state) ? state.data : defaultValue;
}

/**
 * Test helper: Create success AsyncState
 * Useful for testing without needing to mock API calls
 *
 * @example
 * ```typescript
 * const mockState = createSuccessState({ id: '1', name: 'Test' });
 * ```
 */
export function createSuccessState<T>(data: T): AsyncState<T> {
  return { status: 'success', data };
}

/**
 * Test helper: Create error AsyncState
 * Useful for testing error scenarios
 *
 * @example
 * ```typescript
 * const mockState = createErrorState({ message: 'Network error' });
 * ```
 */
export function createErrorState(error: GraphQLError): AsyncState<never> {
  return { status: 'error', error };
}

/**
 * Test helper: Create loading AsyncState
 */
export function createLoadingState(): AsyncState<never> {
  return { status: 'loading' };
}

/**
 * Test helper: Create idle AsyncState
 */
export function createIdleState(): AsyncState<never> {
  return { status: 'idle' };
}
