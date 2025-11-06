/**
 * Validation Middleware
 *
 * Validates request body against Zod schema and adds parsed data to context.
 * Provides type-safe input validation with automatic error responses.
 *
 * Features:
 * - Zod schema validation
 * - JSON body parsing
 * - Type-safe validatedInput in context
 * - Automatic 400 Bad Request on validation failure
 *
 * @example
 * ```typescript
 * export const handler = compose(
 *   withErrorHandling(),
 *   withValidation(LoginRequestSchema),
 *   async (event, context) => {
 *     // context.validatedInput is type-safe LoginRequest
 *     const { email, password } = context.validatedInput;
 *   }
 * );
 * ```
 */

import type { z } from '@social-media-app/shared';
import type { Middleware } from './compose.js';

/**
 * Validation middleware factory
 *
 * Parses and validates request body against provided Zod schema.
 * Throws Zod validation error on failure (caught by withErrorHandling).
 *
 * @param schema - Zod schema to validate request body against
 * @returns Middleware function that validates and adds validatedInput to context
 *
 * @example
 * ```typescript
 * export const handler = compose(
 *   withErrorHandling(),
 *   withValidation(CreatePostRequestSchema),
 *   async (event, context) => {
 *     // context.validatedInput is CreatePostRequest (type-safe)
 *     const post = await createPost(context.validatedInput);
 *     return successResponse(201, post);
 *   }
 * );
 * ```
 */
export const withValidation = <T>(schema: z.ZodSchema<T>): Middleware => {
  return async (event, context, next) => {
    // Parse JSON body (handle empty body gracefully)
    const body = event.body ? JSON.parse(event.body) : {};

    // Validate with Zod schema (throws ZodError on failure)
    // withErrorHandling middleware will catch this and convert to 400 response
    context.validatedInput = schema.parse(body);

    return next();
  };
};
