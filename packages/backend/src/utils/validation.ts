import { z } from 'zod';

/**
 * UUID field validator
 * Reusable across all handlers that need UUID validation
 */
export const UUIDField = z.string().uuid('Invalid UUID format');

/**
 * Validation result types
 */
export interface ValidationSuccess<T> {
  readonly success: true;
  readonly data: T;
}

export interface ValidationFailure {
  readonly success: false;
  readonly statusCode: 400;
  readonly message: string;
  readonly errors: z.ZodIssue[];
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Validates a UUID string from path parameters
 * Returns a typed validation result for consistent error handling
 *
 * @param id - The ID string to validate
 * @param paramName - The parameter name for error messages (default: 'id')
 * @returns Validation result with validated UUID or error details
 *
 * @example
 * const idValidation = validateUUID(event.pathParameters?.id);
 * if (!idValidation.success) {
 *   return errorResponse(idValidation.statusCode, idValidation.message, idValidation.errors);
 * }
 * const notificationId = idValidation.data;
 */
export const validateUUID = (
  id: string | undefined,
  paramName: string = 'id'
): ValidationResult<string> => {
  if (!id) {
    return {
      success: false,
      statusCode: 400,
      message: 'Invalid request data',
      errors: [{
        code: 'invalid_type',
        path: [paramName],
        message: `${paramName.charAt(0).toUpperCase() + paramName.slice(1)} is required`,
        expected: 'string',
        received: 'undefined'
      }]
    };
  }

  const validation = UUIDField.safeParse(id);

  if (!validation.success) {
    return {
      success: false,
      statusCode: 400,
      message: 'Invalid request data',
      errors: validation.error.errors
    };
  }

  return {
    success: true,
    data: validation.data
  };
};

/**
 * Parses and validates JSON request body
 * Returns null for empty bodies (useful for optional body endpoints)
 *
 * @param body - The raw request body string
 * @returns Parsed JSON object or null for empty body
 * @throws Error with descriptive message if JSON is invalid
 *
 * @example
 * const body = parseRequestBody(event.body);
 * const validation = RequestSchema.safeParse(body);
 */
export const parseRequestBody = (body: string | undefined): unknown => {
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error('Invalid JSON in request body');
  }
};
