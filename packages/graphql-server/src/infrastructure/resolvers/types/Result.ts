/**
 * Result Type - Discriminated Union for Type-Safe Error Handling
 *
 * Pattern from SKILL.md - Pattern 6: Discriminated Unions
 *
 * Provides type-safe error handling without throwing exceptions.
 * The discriminated union pattern enables TypeScript to narrow types
 * based on the `success` property.
 *
 * @example
 * ```typescript
 * function divide(a: number, b: number): Result<number, 'DIVIDE_BY_ZERO'> {
 *   if (b === 0) {
 *     return failure('DIVIDE_BY_ZERO', 'Cannot divide by zero');
 *   }
 *   return success(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (isSuccess(result)) {
 *   console.log(result.data); // Type: number
 * } else {
 *   console.error(result.error.message); // Type: string
 * }
 * ```
 */

/**
 * Represents a successful operation with data
 */
export type Success<T> = {
  readonly success: true;
  readonly data: T;
};

/**
 * Represents a failed operation with error details
 */
export type Failure<E extends string = string> = {
  readonly success: false;
  readonly error: {
    readonly code: E;
    readonly message: string;
  };
};

/**
 * Result type that represents either success or failure
 * Uses discriminated union for type-safe error handling
 */
export type Result<T, E extends string = string> = Success<T> | Failure<E>;

/**
 * Type guard to check if a result is successful
 * Enables TypeScript to narrow the type to Success<T>
 */
export const isSuccess = <T, E extends string>(
  result: Result<T, E>
): result is Success<T> => result.success === true;

/**
 * Type guard to check if a result is a failure
 * Enables TypeScript to narrow the type to Failure<E>
 */
export const isFailure = <T, E extends string>(
  result: Result<T, E>
): result is Failure<E> => result.success === false;

/**
 * Creates a successful result with data
 */
export const success = <T>(data: T): Success<T> => ({
  success: true,
  data,
});

/**
 * Creates a failure result with error details
 */
export const failure = <E extends string>(
  code: E,
  message: string
): Failure<E> => ({
  success: false,
  error: { code, message },
});
