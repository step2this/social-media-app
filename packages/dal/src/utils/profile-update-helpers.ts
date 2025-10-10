/**
 * Profile update helper utilities
 * Pure functions for building profile update data
 */
import type { UpdateProfileWithHandleRequest } from '@social-media-app/shared';

/**
 * GSI3 key structure for handle lookups
 */
export interface HandleGSI3Keys {
  readonly GSI3PK: string;
  readonly GSI3SK: string;
}

/**
 * Options for building profile update data
 */
export interface ProfileUpdateOptions {
  readonly timestamp?: string;
  readonly includeGSI3?: boolean;
  readonly userId?: string;
}

/**
 * Builds GSI3 partition and sort keys for handle updates
 * Pure function - constructs DynamoDB GSI3 keys
 *
 * @param handle - User handle (will be normalized to lowercase)
 * @param userId - User ID
 * @returns GSI3 key structure
 *
 * @example
 * ```typescript
 * buildHandleGSI3Keys('TestHandle', 'user123');
 * // => {
 * //   GSI3PK: 'HANDLE#testhandle',
 * //   GSI3SK: 'USER#user123'
 * // }
 * ```
 */
export const buildHandleGSI3Keys = (handle: string, userId: string): HandleGSI3Keys => {
  const normalizedHandle = handle.toLowerCase();

  return {
    GSI3PK: `HANDLE#${normalizedHandle}`,
    GSI3SK: `USER#${userId}`
  };
};

/**
 * Builds profile update data from update request
 * Pure function - transforms update request into DynamoDB update data
 *
 * @param updates - Profile update request
 * @param options - Update options (timestamp, GSI3 inclusion, userId)
 * @returns Update data object for DynamoDB
 * @throws Error if includeGSI3 is true but userId is missing
 *
 * @example
 * ```typescript
 * // Basic update
 * buildProfileUpdateData(
 *   { bio: 'New bio' },
 *   { timestamp: '2024-01-01T00:00:00.000Z' }
 * );
 * // => { updatedAt: '2024-01-01T00:00:00.000Z', bio: 'New bio' }
 *
 * // Handle update with GSI3
 * buildProfileUpdateData(
 *   { handle: 'newhandle' },
 *   { timestamp: '2024-01-01T00:00:00.000Z', includeGSI3: true, userId: 'user123' }
 * );
 * // => {
 * //   updatedAt: '2024-01-01T00:00:00.000Z',
 * //   handle: 'newhandle',
 * //   GSI3PK: 'HANDLE#newhandle',
 * //   GSI3SK: 'USER#user123'
 * // }
 * ```
 */
export const buildProfileUpdateData = (
  updates: UpdateProfileWithHandleRequest,
  options: ProfileUpdateOptions = {}
): Record<string, unknown> => {
  const { timestamp, includeGSI3 = false, userId } = options;

  // Build base update data with timestamp
  const updateData: Record<string, unknown> = {
    updatedAt: timestamp || new Date().toISOString()
  };

  // Add bio if provided
  if (updates.bio !== undefined) {
    updateData.bio = updates.bio;
  }

  // Add fullName if provided
  if (updates.fullName !== undefined) {
    updateData.fullName = updates.fullName;
  }

  // Add handle if provided
  if (updates.handle !== undefined) {
    updateData.handle = updates.handle.toLowerCase();

    // Add GSI3 keys if requested
    if (includeGSI3) {
      if (!userId) {
        throw new Error('userId is required when includeGSI3 is true');
      }

      const gsi3Keys = buildHandleGSI3Keys(updates.handle, userId);
      updateData.GSI3PK = gsi3Keys.GSI3PK;
      updateData.GSI3SK = gsi3Keys.GSI3SK;
    }
  }

  return updateData;
};

/**
 * Checks if an error is a GSI3 validation error (index not found)
 * Pure function - identifies LocalStack GSI3 availability errors
 *
 * @param error - Error to check
 * @returns true if error indicates GSI3 index not found
 *
 * @example
 * ```typescript
 * try {
 *   await queryGSI3();
 * } catch (error) {
 *   if (isGSI3ValidationError(error)) {
 *     // GSI3 not available (LocalStack)
 *     console.warn('GSI3 not available');
 *   } else {
 *     throw error;
 *   }
 * }
 * ```
 */
export const isGSI3ValidationError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as { name?: string; message?: string };

  return (
    err.name === 'ValidationException' &&
    typeof err.message === 'string' &&
    err.message.toLowerCase().includes('index not found')
  );
};
