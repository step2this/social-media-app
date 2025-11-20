/**
 * Core type definitions for the test data builder system
 *
 * This module provides foundational types used throughout the builder architecture,
 * including configuration, results, utilities, and domain-specific types.
 *
 * NOTE: Config types are now defined in schemas.ts via Zod schemas for runtime validation.
 * Import config types from there to ensure runtime and compile-time types stay in sync.
 */

// ============================================================================
// Zod Schemas and Config Types
// ============================================================================

/**
 * Export all Zod schemas and config types
 * These provide runtime validation and type safety
 */
export * from './schemas.js';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Builder state during execution
 */
export type BuilderState = 'idle' | 'validating' | 'building' | 'completed' | 'failed';

/**
 * Build context passed to hooks
 */
export interface BuildContext {
  config: BuilderConfig;
  state: BuilderState;
  startTime: number;
  retries: number;
}

/**
 * Hook function signature
 */
export type BuilderHook<T> = (
  data: T,
  context: BuildContext
) => Promise<void> | void;

/**
 * Global builder system configuration
 */
export interface BuilderConfig {
  /**
   * Whether to use real service layer (true) or allow direct DB writes (false)
   * @default true
   */
  useRealServices: boolean;

  /**
   * Logging verbosity level
   * - debug: All operations logged
   * - info: Key operations logged
   * - error: Only errors logged
   * @default 'info'
   */
  logLevel: 'debug' | 'info' | 'error';

  /**
   * Maximum batch size for concurrent operations
   * @default 10
   */
  batchSize: number;

  /**
   * Maximum number of retries for failed operations
   * @default 3
   */
  maxRetries: number;

  /**
   * Enable dry run mode (validation only, no DB writes)
   * @default false
   */
  dryRun: boolean;
}

/**
 * Default builder configuration
 */
export const DEFAULT_BUILDER_CONFIG: BuilderConfig = {
  useRealServices: true,
  logLevel: 'info',
  batchSize: 10,
  maxRetries: 3,
  dryRun: false,
};

// ============================================================================
// Result Types
// ============================================================================

/**
 * Metadata about a build operation
 */
export interface BuildMetadata {
  /**
   * Timestamp when build started (ISO 8601)
   */
  startedAt: string;

  /**
   * Timestamp when build completed (ISO 8601)
   */
  completedAt: string;

  /**
   * Duration in milliseconds
   */
  durationMs: number;

  /**
   * Builder class name
   */
  builderName: string;

  /**
   * Number of retries attempted
   */
  retriesAttempted: number;

  /**
   * Whether operation used real services or direct writes
   */
  usedRealServices: boolean;
}

/**
 * Result of a successful build operation
 */
export interface BuildSuccess<T> {
  success: true;
  data: T;
  metadata: BuildMetadata;
}

/**
 * Result of a failed build operation
 */
export interface BuildFailure {
  success: false;
  error: Error;
  metadata: Partial<BuildMetadata>;
}

/**
 * Union type representing the result of any build operation
 */
export type BuildResult<T> = BuildSuccess<T> | BuildFailure;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Makes all properties of T optional recursively
 *
 * @example
 * ```typescript
 * type User = { name: string; address: { street: string } };
 * type PartialUser = DeepPartial<User>;
 * // { name?: string; address?: { street?: string } }
 * ```
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? T[P] extends Array<infer U>
      ? Array<DeepPartial<U>>
      : DeepPartial<T[P]>
    : T[P];
};

/**
 * Makes all properties of T required recursively
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object
    ? T[P] extends Array<infer U>
      ? Array<DeepRequired<U>>
      : DeepRequired<T[P]>
    : T[P];
};

/**
 * Extracts the Promise type from an async function return type
 *
 * @example
 * ```typescript
 * type AsyncFn = () => Promise<string>;
 * type Result = Awaited<ReturnType<AsyncFn>>; // string
 * ```
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Range configuration for random number generation
 */
export interface Range {
  min: number;
  max: number;
}

/**
 * Type guard to check if a value is a Range
 */
export function isRange(value: unknown): value is Range {
  return (
    typeof value === 'object' &&
    value !== null &&
    'min' in value &&
    'max' in value &&
    typeof (value as Range).min === 'number' &&
    typeof (value as Range).max === 'number'
  );
}

/**
 * Extracts non-nullable properties from a type
 */
export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

/**
 * Creates a type with optional fields marked as required
 */
export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

// ============================================================================
// Domain-Specific Types
// ============================================================================

/**
 * Result of seeding a user
 */
export interface SeededUser {
  id: string;
  email: string;
  username: string;
  handle: string;
  fullName: string;
  bio: string | null;
  profilePictureUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
}

/**
 * Result of seeding a post
 */
export interface SeededPost {
  id: string;
  userId: string;
  userHandle: string;
  caption: string | null;
  imageUrl: string;
  thumbnailUrl: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  isPublic: boolean;
  createdAt: string;
}

/**
 * Result of seeding a like
 */
export interface SeededLike {
  userId: string;
  postId: string;
  createdAt: string;
  likesCount: number; // Updated count after like
  isLiked: boolean;   // Always true for successful like
}

/**
 * Result of seeding a comment
 */
export interface SeededComment {
  id: string;
  postId: string;
  userId: string;
  userHandle: string;
  content: string;
  createdAt: string;
}

/**
 * Result of seeding a follow relationship
 */
export interface SeededFollow {
  followerId: string;
  followeeId: string;
  createdAt: string;
  isFollowing: boolean;
}

/**
 * Result of seeding a feed item
 */
export interface SeededFeedItem {
  userId: string;      // Feed owner
  postId: string;
  authorId: string;
  createdAt: string;
  isRead: boolean;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Result of validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Helper to create a validation error
 */
export function validationError(
  field: string,
  message: string,
  value?: unknown
): ValidationError {
  return { field, message, value };
}

/**
 * Helper to validate required fields
 *
 * @param fields - Map of field name to value
 * @returns Array of validation errors for missing fields
 */
export function validateRequired(
  fields: Record<string, unknown>
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [field, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === '') {
      errors.push(validationError(field, `${field} is required`));
    }
  }

  return errors;
}
