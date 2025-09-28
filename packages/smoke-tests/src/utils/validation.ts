/**
 * Request/Response Validation for Smoke Tests
 * Uses Zod schemas to validate API data structures
 * Follows the same patterns as the backend handlers
 */

import { z } from 'zod';

export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors?: z.ZodIssue[];
}

/**
 * Validate response data against a Zod schema
 * Returns validation result with typed data if successful
 */
export function validateResponse<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  try {
    const parsedData = schema.parse(data);
    return {
      isValid: true,
      data: parsedData
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Use the same pattern as backend handlers - return issues array directly
      return {
        isValid: false,
        errors: error.issues
      };
    }

    return {
      isValid: false,
      errors: [{
        code: 'custom' as const,
        path: [],
        message: error instanceof Error ? error.message : 'Unknown validation error'
      }]
    };
  }
}

/**
 * Validate request data against a Zod schema
 * Returns validation result with typed data if successful
 */
export function validateRequest<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  // Request validation uses the same logic as response validation
  return validateResponse(data, schema);
}

/**
 * Create a validation helper that returns both success and detailed info
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return {
    validate: (data: unknown): ValidationResult<T> => validateResponse(data, schema),
    schema
  };
}

/**
 * Common validation patterns for API testing
 */
export const CommonSchemas = {
  // API response wrapper
  ApiResponse: <T>(dataSchema: z.ZodSchema<T>) => z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional()
  }),

  // Pagination wrapper
  PaginatedResponse: <T>(itemSchema: z.ZodSchema<T>) => z.object({
    items: z.array(itemSchema),
    total: z.number().min(0),
    page: z.number().min(1),
    limit: z.number().min(1),
    hasMore: z.boolean()
  }),

  // Error response
  ErrorResponse: z.object({
    success: z.literal(false),
    error: z.string(),
    details: z.any().optional()
  }),

  // Common field types
  Id: z.string().min(1),
  Email: z.string().email(),
  Timestamp: z.string().datetime(),
  OptionalString: z.string().optional(),
  NonEmptyString: z.string().min(1)
} as const;