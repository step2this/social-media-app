/**
 * Tests for profile update helper utilities
 * Tests written FIRST following TDD approach
 */
import { describe, it, expect } from 'vitest';
import {
  buildHandleGSI3Keys,
  buildProfileUpdateData,
  isGSI3ValidationError,
  type ProfileUpdateOptions
} from './profile-update-helpers.js';
import type { UpdateProfileWithHandleRequest } from '@social-media-app/shared';

describe('profile-update-helpers', () => {
  describe('buildHandleGSI3Keys', () => {
    it('should build GSI3 keys for handle update', () => {
      const handle = 'testhandle';
      const userId = 'user123';

      const result = buildHandleGSI3Keys(handle, userId);

      expect(result).toEqual({
        GSI3PK: 'HANDLE#testhandle',
        GSI3SK: 'USER#user123'
      });
    });

    it('should convert handle to lowercase', () => {
      const handle = 'TestHandle';
      const userId = 'user456';

      const result = buildHandleGSI3Keys(handle, userId);

      expect(result).toEqual({
        GSI3PK: 'HANDLE#testhandle',
        GSI3SK: 'USER#user456'
      });
    });

    it('should handle handle with special characters', () => {
      const handle = 'test_handle-123';
      const userId = 'user789';

      const result = buildHandleGSI3Keys(handle, userId);

      expect(result).toEqual({
        GSI3PK: 'HANDLE#test_handle-123',
        GSI3SK: 'USER#user789'
      });
    });

    it('should handle empty handle', () => {
      const handle = '';
      const userId = 'user123';

      const result = buildHandleGSI3Keys(handle, userId);

      expect(result).toEqual({
        GSI3PK: 'HANDLE#',
        GSI3SK: 'USER#user123'
      });
    });
  });

  describe('buildProfileUpdateData', () => {
    const defaultTimestamp = '2024-01-01T00:00:00.000Z';

    describe('basic field updates', () => {
      it('should build update data with only timestamp', () => {
        const updates: UpdateProfileWithHandleRequest = {};
        const options: ProfileUpdateOptions = {
          timestamp: defaultTimestamp
        };

        const result = buildProfileUpdateData(updates, options);

        expect(result).toEqual({
          updatedAt: defaultTimestamp
        });
      });

      it('should build update data with bio', () => {
        const updates: UpdateProfileWithHandleRequest = {
          bio: 'Updated bio'
        };
        const options: ProfileUpdateOptions = {
          timestamp: defaultTimestamp
        };

        const result = buildProfileUpdateData(updates, options);

        expect(result).toEqual({
          updatedAt: defaultTimestamp,
          bio: 'Updated bio'
        });
      });

      it('should build update data with fullName', () => {
        const updates: UpdateProfileWithHandleRequest = {
          fullName: 'John Doe'
        };
        const options: ProfileUpdateOptions = {
          timestamp: defaultTimestamp
        };

        const result = buildProfileUpdateData(updates, options);

        expect(result).toEqual({
          updatedAt: defaultTimestamp,
          fullName: 'John Doe'
        });
      });

      it('should build update data with multiple fields', () => {
        const updates: UpdateProfileWithHandleRequest = {
          bio: 'My bio',
          fullName: 'Jane Smith'
        };
        const options: ProfileUpdateOptions = {
          timestamp: defaultTimestamp
        };

        const result = buildProfileUpdateData(updates, options);

        expect(result).toEqual({
          updatedAt: defaultTimestamp,
          bio: 'My bio',
          fullName: 'Jane Smith'
        });
      });
    });

    describe('handle updates with GSI3', () => {
      it('should build update data with handle and GSI3 keys when includeGSI3 is true', () => {
        const updates: UpdateProfileWithHandleRequest = {
          handle: 'newhandle'
        };
        const options: ProfileUpdateOptions = {
          timestamp: defaultTimestamp,
          includeGSI3: true,
          userId: 'user123'
        };

        const result = buildProfileUpdateData(updates, options);

        expect(result).toEqual({
          updatedAt: defaultTimestamp,
          handle: 'newhandle',
          GSI3PK: 'HANDLE#newhandle',
          GSI3SK: 'USER#user123'
        });
      });

      it('should build update data with handle but no GSI3 keys when includeGSI3 is false', () => {
        const updates: UpdateProfileWithHandleRequest = {
          handle: 'newhandle'
        };
        const options: ProfileUpdateOptions = {
          timestamp: defaultTimestamp,
          includeGSI3: false,
          userId: 'user123'
        };

        const result = buildProfileUpdateData(updates, options);

        expect(result).toEqual({
          updatedAt: defaultTimestamp,
          handle: 'newhandle'
        });
      });

      it('should build update data with handle but no GSI3 keys when includeGSI3 is undefined', () => {
        const updates: UpdateProfileWithHandleRequest = {
          handle: 'newhandle'
        };
        const options: ProfileUpdateOptions = {
          timestamp: defaultTimestamp,
          userId: 'user123'
        };

        const result = buildProfileUpdateData(updates, options);

        expect(result).toEqual({
          updatedAt: defaultTimestamp,
          handle: 'newhandle'
        });
      });

      it('should convert handle to lowercase', () => {
        const updates: UpdateProfileWithHandleRequest = {
          handle: 'NewHandle'
        };
        const options: ProfileUpdateOptions = {
          timestamp: defaultTimestamp,
          includeGSI3: true,
          userId: 'user456'
        };

        const result = buildProfileUpdateData(updates, options);

        expect(result).toEqual({
          updatedAt: defaultTimestamp,
          handle: 'newhandle',
          GSI3PK: 'HANDLE#newhandle',
          GSI3SK: 'USER#user456'
        });
      });

      it('should throw error when includeGSI3 is true but userId is missing', () => {
        const updates: UpdateProfileWithHandleRequest = {
          handle: 'newhandle'
        };
        const options: ProfileUpdateOptions = {
          timestamp: defaultTimestamp,
          includeGSI3: true
        };

        expect(() => buildProfileUpdateData(updates, options))
          .toThrow('userId is required when includeGSI3 is true');
      });
    });

    describe('complex updates', () => {
      it('should build update data with all fields and GSI3', () => {
        const updates: UpdateProfileWithHandleRequest = {
          handle: 'testhandle',
          bio: 'Test bio',
          fullName: 'Test User'
        };
        const options: ProfileUpdateOptions = {
          timestamp: defaultTimestamp,
          includeGSI3: true,
          userId: 'user789'
        };

        const result = buildProfileUpdateData(updates, options);

        expect(result).toEqual({
          updatedAt: defaultTimestamp,
          handle: 'testhandle',
          bio: 'Test bio',
          fullName: 'Test User',
          GSI3PK: 'HANDLE#testhandle',
          GSI3SK: 'USER#user789'
        });
      });

      it('should handle empty string values', () => {
        const updates: UpdateProfileWithHandleRequest = {
          bio: '',
          fullName: ''
        };
        const options: ProfileUpdateOptions = {
          timestamp: defaultTimestamp
        };

        const result = buildProfileUpdateData(updates, options);

        expect(result).toEqual({
          updatedAt: defaultTimestamp,
          bio: '',
          fullName: ''
        });
      });
    });

    describe('timestamp handling', () => {
      it('should use provided timestamp', () => {
        const customTimestamp = '2024-06-15T12:30:00.000Z';
        const updates: UpdateProfileWithHandleRequest = {
          bio: 'Test'
        };
        const options: ProfileUpdateOptions = {
          timestamp: customTimestamp
        };

        const result = buildProfileUpdateData(updates, options);

        expect(result.updatedAt).toBe(customTimestamp);
      });

      it('should use current time when timestamp is not provided', () => {
        const updates: UpdateProfileWithHandleRequest = {
          bio: 'Test'
        };
        const options: ProfileUpdateOptions = {};

        const result = buildProfileUpdateData(updates, options);

        expect(result.updatedAt).toBeDefined();
        expect(typeof result.updatedAt).toBe('string');
        // Verify it's a valid ISO string
        expect(new Date(result.updatedAt as string).toISOString()).toBe(result.updatedAt);
      });
    });
  });

  describe('isGSI3ValidationError', () => {
    it('should return true for ValidationException with Index not found', () => {
      const error = {
        name: 'ValidationException',
        message: 'Index not found: GSI3'
      };

      const result = isGSI3ValidationError(error);

      expect(result).toBe(true);
    });

    it('should return true for ValidationException with index not found (case insensitive)', () => {
      const error = {
        name: 'ValidationException',
        message: 'The requested index not found'
      };

      const result = isGSI3ValidationError(error);

      expect(result).toBe(true);
    });

    it('should return false for ValidationException without Index not found', () => {
      const error = {
        name: 'ValidationException',
        message: 'Invalid input parameters'
      };

      const result = isGSI3ValidationError(error);

      expect(result).toBe(false);
    });

    it('should return false for different error types', () => {
      const error = {
        name: 'ResourceNotFoundException',
        message: 'Index not found'
      };

      const result = isGSI3ValidationError(error);

      expect(result).toBe(false);
    });

    it('should return false for error without name property', () => {
      const error = {
        message: 'Index not found'
      };

      const result = isGSI3ValidationError(error);

      expect(result).toBe(false);
    });

    it('should return false for error without message property', () => {
      const error = {
        name: 'ValidationException'
      };

      const result = isGSI3ValidationError(error);

      expect(result).toBe(false);
    });

    it('should return false for non-object errors', () => {
      const error = 'string error';

      const result = isGSI3ValidationError(error);

      expect(result).toBe(false);
    });

    it('should return false for null', () => {
      const result = isGSI3ValidationError(null);

      expect(result).toBe(false);
    });

    it('should return false for undefined', () => {
      const result = isGSI3ValidationError(undefined);

      expect(result).toBe(false);
    });
  });
});
