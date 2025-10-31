/**
 * Result Type
 * 
 * Type-safe error handling using discriminated unions.
 * Inspired by Rust's Result<T, E> and functional programming.
 * 
 * Benefits:
 * - Forces explicit error handling (compiler errors if not handled)
 * - Type-safe success and error branches (discriminated union)
 * - No try/catch needed (errors are values)
 * - Composable error handling (map, flatMap, etc.)
 * - Zero runtime overhead (types erased at compile time)
 * 
 * Example:
 * ```typescript
 * const divide = (a: number, b: number): Result<number> => {
 *   if (b === 0) {
 *     return { success: false, error: new Error('Division by zero') };
 *   }
 *   return { success: true, data: a / b };
 * };
 * 
 * const result = divide(10, 2);
 * 
 * if (result.success) {
 *   console.log(result.data); // TypeScript knows data exists
 * } else {
 *   console.error(result.error); // TypeScript knows error exists
 * }
 * ```
 * 
 * @see https://imhoff.blog/posts/using-results-in-typescript
 * @see https://doc.rust-lang.org/std/result/
 */

/**
 * Result<T, E> - Discriminated union for type-safe error handling
 * 
 * Represents either success with data T, or failure with error E.
 * 
 * @template T - The success data type
 * @template E - The error type (defaults to Error)
 * 
 * @example
 * ```typescript
 * const success: Result<string> = {
 *   success: true,
 *   data: 'hello'
 * };
 * 
 * const failure: Result<string> = {
 *   success: false,
 *   error: new Error('Something went wrong')
 * };
 * ```
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * AsyncResult<T, E> - Promise of Result
 * 
 * Useful for async operations that can fail.
 * 
 * @template T - The success data type
 * @template E - The error type (defaults to Error)
 * 
 * @example
 * ```typescript
 * const fetchUser = async (id: string): AsyncResult<User> => {
 *   try {
 *     const user = await db.users.findById(id);
 *     if (!user) {
 *       return { success: false, error: new Error('User not found') };
 *     }
 *     return { success: true, data: user };
 *   } catch (error) {
 *     return { success: false, error: error as Error };
 *   }
 * };
 * ```
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * unwrap - Extract data from Result or throw error
 * 
 * Use when you're confident the result is success,
 * or when you want to propagate errors up the call stack.
 * 
 * @param result - The Result to unwrap
 * @returns The data if success
 * @throws The error if failure
 * 
 * @example
 * ```typescript
 * const result: Result<number> = { success: true, data: 42 };
 * const data = unwrap(result); // 42
 * 
 * const failResult: Result<number> = { success: false, error: new Error('Failed') };
 * unwrap(failResult); // throws Error('Failed')
 * ```
 */
export function unwrap<T, E = Error>(result: Result<T, E>): T {
  if (!result.success) {
    throw result.error;
  }
  return result.data;
}

/**
 * unwrapOr - Extract data from Result or return default value
 * 
 * Safe alternative to unwrap when you have a sensible default.
 * 
 * @param result - The Result to unwrap
 * @param defaultValue - The default value to return if failure
 * @returns The data if success, or defaultValue if failure
 * 
 * @example
 * ```typescript
 * const result: Result<number> = { success: false, error: new Error('Failed') };
 * const data = unwrapOr(result, 0); // 0
 * ```
 */
export function unwrapOr<T, E = Error>(result: Result<T, E>, defaultValue: T): T {
  if (!result.success) {
    return defaultValue;
  }
  return result.data;
}

/**
 * isSuccess - Type guard for success Result
 * 
 * Narrows Result type to success branch.
 * 
 * @param result - The Result to check
 * @returns true if success, false if failure
 * 
 * @example
 * ```typescript
 * const result: Result<number> = { success: true, data: 42 };
 * 
 * if (isSuccess(result)) {
 *   // TypeScript knows result.data exists here
 *   console.log(result.data);
 * }
 * ```
 */
export function isSuccess<T, E = Error>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success;
}

/**
 * isFailure - Type guard for failure Result
 * 
 * Narrows Result type to failure branch.
 * 
 * @param result - The Result to check
 * @returns true if failure, false if success
 * 
 * @example
 * ```typescript
 * const result: Result<number> = { success: false, error: new Error('Failed') };
 * 
 * if (isFailure(result)) {
 *   // TypeScript knows result.error exists here
 *   console.error(result.error);
 * }
 * ```
 */
export function isFailure<T, E = Error>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}

/**
 * map - Transform success value
 * 
 * Applies function to data if success, passes through error if failure.
 * Similar to Array.map() but for Result.
 * 
 * @param result - The Result to map
 * @param fn - The transformation function
 * @returns A new Result with transformed data
 * 
 * @example
 * ```typescript
 * const result: Result<number> = { success: true, data: 42 };
 * const doubled = map(result, n => n * 2);
 * // { success: true, data: 84 }
 * 
 * const failResult: Result<number> = { success: false, error: new Error('Failed') };
 * const stillFailed = map(failResult, n => n * 2);
 * // { success: false, error: Error('Failed') }
 * ```
 */
export function map<T, U, E = Error>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> {
  if (!result.success) {
    return result;
  }
  return { success: true, data: fn(result.data) };
}

/**
 * mapError - Transform error value
 * 
 * Applies function to error if failure, passes through data if success.
 * Useful for wrapping or enriching errors.
 * 
 * @param result - The Result to map error
 * @param fn - The error transformation function
 * @returns A new Result with transformed error
 * 
 * @example
 * ```typescript
 * const result: Result<number> = { success: false, error: new Error('DB error') };
 * const wrapped = mapError(result, err => new Error(`Wrapped: ${err.message}`));
 * // { success: false, error: Error('Wrapped: DB error') }
 * ```
 */
export function mapError<T, E1, E2>(
  result: Result<T, E1>,
  fn: (error: E1) => E2
): Result<T, E2> {
  if (result.success) {
    return result;
  }
  return { success: false, error: fn(result.error) };
}

/**
 * flatMap - Chain operations that return Result
 * 
 * Also known as "bind" or "andThen" in other languages.
 * Prevents nested Results (Result<Result<T>>).
 * 
 * @param result - The Result to flat map
 * @param fn - The function that returns a new Result
 * @returns A new Result from the function, or original error
 * 
 * @example
 * ```typescript
 * const divide = (a: number, b: number): Result<number> => {
 *   if (b === 0) return { success: false, error: new Error('Division by zero') };
 *   return { success: true, data: a / b };
 * };
 * 
 * const result = divide(10, 2);
 * const chained = flatMap(result, n => divide(n, 2));
 * // { success: true, data: 2.5 }
 * 
 * const failResult = divide(10, 0);
 * const chainedFail = flatMap(failResult, n => divide(n, 2));
 * // { success: false, error: Error('Division by zero') }
 * ```
 */
export function flatMap<T, U, E = Error>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>
): Result<U, E> {
  if (!result.success) {
    return result;
  }
  return fn(result.data);
}
