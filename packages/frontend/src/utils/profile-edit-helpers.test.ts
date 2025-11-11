import { describe, it, expect } from 'vitest';
import {
  validateProfileForm,
  initializeProfileFormData,
  buildProfileUpdateRequest,
  clearValidationError,
  shouldSubmitProfileForm,
  formatProfileValidationError,
  isProfileFormValid,
  hasProfileChanges,
  type ProfileFormData,
  type ProfileValidationErrors,
} from './profile-edit-helpers.js';
import type { Profile } from '@social-media-app/shared';

describe('profile-edit-helpers', () => {
  describe('validateProfileForm', () => {
    it('should validate form with all required fields', () => {
      const formData: ProfileFormData = {
        fullName: 'John Doe',
        bio: 'Test bio',
      };

      const result = validateProfileForm(formData);

      expect(result).toEqual({});
    });

    it('should return error when fullName is empty', () => {
      const formData: ProfileFormData = {
        fullName: '',
        bio: 'Test bio',
      };

      const result = validateProfileForm(formData);

      expect(result).toEqual({
        fullName: 'Full name is required',
      });
    });

    it('should return error when fullName is only whitespace', () => {
      const formData: ProfileFormData = {
        fullName: '   ',
        bio: 'Test bio',
      };

      const result = validateProfileForm(formData);

      expect(result).toEqual({
        fullName: 'Full name is required',
      });
    });

    it('should allow empty bio', () => {
      const formData: ProfileFormData = {
        fullName: 'John Doe',
        bio: '',
      };

      const result = validateProfileForm(formData);

      expect(result).toEqual({});
    });

    it('should allow whitespace-only bio', () => {
      const formData: ProfileFormData = {
        fullName: 'John Doe',
        bio: '   ',
      };

      const result = validateProfileForm(formData);

      expect(result).toEqual({});
    });

    it('should validate form with minimal valid data', () => {
      const formData: ProfileFormData = {
        fullName: 'J',
        bio: '',
      };

      const result = validateProfileForm(formData);

      expect(result).toEqual({});
    });
  });

  describe('initializeProfileFormData', () => {
    it('should initialize form data from profile', () => {
      const profile: Profile = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        handle: 'testuser',
        fullName: 'John Doe',
        bio: 'Software developer',
        profilePictureUrl: undefined,
        profilePictureThumbnailUrl: undefined,
        postsCount: 5,
        followersCount: 10,
        followingCount: 3,
      };

      const result = initializeProfileFormData(profile);

      expect(result).toEqual({
        fullName: 'John Doe',
        bio: 'Software developer',
      });
    });

    it('should handle profile with null fullName', () => {
      const profile: Partial<Profile> = {
        fullName: null as any,
        bio: 'Test bio',
      };

      const result = initializeProfileFormData(profile as Profile);

      expect(result).toEqual({
        fullName: '',
        bio: 'Test bio',
      });
    });

    it('should handle profile with undefined fullName', () => {
      const profile: Partial<Profile> = {
        fullName: undefined,
        bio: 'Test bio',
      };

      const result = initializeProfileFormData(profile as Profile);

      expect(result).toEqual({
        fullName: '',
        bio: 'Test bio',
      });
    });

    it('should handle profile with null bio', () => {
      const profile: Partial<Profile> = {
        fullName: 'John Doe',
        bio: null as any,
      };

      const result = initializeProfileFormData(profile as Profile);

      expect(result).toEqual({
        fullName: 'John Doe',
        bio: '',
      });
    });

    it('should handle profile with undefined bio', () => {
      const profile: Partial<Profile> = {
        fullName: 'John Doe',
        bio: undefined,
      };

      const result = initializeProfileFormData(profile as Profile);

      expect(result).toEqual({
        fullName: 'John Doe',
        bio: '',
      });
    });

    it('should handle profile with both fields null', () => {
      const profile: Partial<Profile> = {
        fullName: null as any,
        bio: null as any,
      };

      const result = initializeProfileFormData(profile as Profile);

      expect(result).toEqual({
        fullName: '',
        bio: '',
      });
    });

    it('should trim whitespace from fields', () => {
      const profile: Partial<Profile> = {
        fullName: '  John Doe  ',
        bio: '  Test bio  ',
      };

      const result = initializeProfileFormData(profile as Profile);

      expect(result).toEqual({
        fullName: 'John Doe',
        bio: 'Test bio',
      });
    });
  });

  describe('buildProfileUpdateRequest', () => {
    it('should build update request from form data', () => {
      const formData: ProfileFormData = {
        fullName: 'John Doe',
        bio: 'Software developer',
      };

      const result = buildProfileUpdateRequest(formData);

      expect(result).toEqual({
        fullName: 'John Doe',
        bio: 'Software developer',
      });
    });

    it('should trim whitespace from fields', () => {
      const formData: ProfileFormData = {
        fullName: '  John Doe  ',
        bio: '  Test bio  ',
      };

      const result = buildProfileUpdateRequest(formData);

      expect(result).toEqual({
        fullName: 'John Doe',
        bio: 'Test bio',
      });
    });

    it('should handle empty bio', () => {
      const formData: ProfileFormData = {
        fullName: 'John Doe',
        bio: '',
      };

      const result = buildProfileUpdateRequest(formData);

      expect(result).toEqual({
        fullName: 'John Doe',
        bio: '',
      });
    });

    it('should preserve bio with only spaces when trimmed', () => {
      const formData: ProfileFormData = {
        fullName: 'John Doe',
        bio: '   ',
      };

      const result = buildProfileUpdateRequest(formData);

      expect(result).toEqual({
        fullName: 'John Doe',
        bio: '',
      });
    });
  });

  describe('clearValidationError', () => {
    it('should clear specific validation error', () => {
      const errors: ProfileValidationErrors = {
        fullName: 'Full name is required',
        bio: 'Bio is too long',
      };

      const result = clearValidationError(errors, 'fullName');

      expect(result).toEqual({
        fullName: '',
        bio: 'Bio is too long',
      });
    });

    it('should handle clearing non-existent error', () => {
      const errors: ProfileValidationErrors = {
        bio: 'Bio is too long',
      };

      const result = clearValidationError(errors, 'fullName');

      expect(result).toEqual({
        fullName: '',
        bio: 'Bio is too long',
      });
    });

    it('should handle empty errors object', () => {
      const errors: ProfileValidationErrors = {};

      const result = clearValidationError(errors, 'fullName');

      expect(result).toEqual({
        fullName: '',
      });
    });

    it('should not mutate original errors object', () => {
      const errors: ProfileValidationErrors = {
        fullName: 'Full name is required',
      };

      const result = clearValidationError(errors, 'fullName');

      expect(errors).toEqual({
        fullName: 'Full name is required',
      });
      expect(result).not.toBe(errors);
    });
  });

  describe('shouldSubmitProfileForm', () => {
    it('should return true when form is valid', () => {
      const formData: ProfileFormData = {
        fullName: 'John Doe',
        bio: 'Test bio',
      };

      const result = shouldSubmitProfileForm(formData);

      expect(result).toBe(true);
    });

    it('should return false when fullName is empty', () => {
      const formData: ProfileFormData = {
        fullName: '',
        bio: 'Test bio',
      };

      const result = shouldSubmitProfileForm(formData);

      expect(result).toBe(false);
    });

    it('should return false when fullName is whitespace', () => {
      const formData: ProfileFormData = {
        fullName: '   ',
        bio: 'Test bio',
      };

      const result = shouldSubmitProfileForm(formData);

      expect(result).toBe(false);
    });

    it('should return true when bio is empty', () => {
      const formData: ProfileFormData = {
        fullName: 'John Doe',
        bio: '',
      };

      const result = shouldSubmitProfileForm(formData);

      expect(result).toBe(true);
    });
  });

  describe('formatProfileValidationError', () => {
    it('should format fullName required error', () => {
      const errors: ProfileValidationErrors = {
        fullName: 'Full name is required',
      };

      const result = formatProfileValidationError(errors, 'fullName');

      expect(result).toBe('Full name is required');
    });

    it('should return empty string when no error for field', () => {
      const errors: ProfileValidationErrors = {
        bio: 'Bio is too long',
      };

      const result = formatProfileValidationError(errors, 'fullName');

      expect(result).toBe('');
    });

    it('should return empty string when errors object is empty', () => {
      const errors: ProfileValidationErrors = {};

      const result = formatProfileValidationError(errors, 'fullName');

      expect(result).toBe('');
    });

    it('should handle undefined error value', () => {
      const errors: ProfileValidationErrors = {
        fullName: undefined,
      };

      const result = formatProfileValidationError(errors, 'fullName');

      expect(result).toBe('');
    });
  });

  describe('isProfileFormValid', () => {
    it('should return true when no validation errors', () => {
      const errors: ProfileValidationErrors = {};

      const result = isProfileFormValid(errors);

      expect(result).toBe(true);
    });

    it('should return false when validation errors exist', () => {
      const errors: ProfileValidationErrors = {
        fullName: 'Full name is required',
      };

      const result = isProfileFormValid(errors);

      expect(result).toBe(false);
    });

    it('should return false when multiple validation errors exist', () => {
      const errors: ProfileValidationErrors = {
        fullName: 'Full name is required',
        bio: 'Bio is too long',
      };

      const result = isProfileFormValid(errors);

      expect(result).toBe(false);
    });

    it('should return true when errors have empty string values', () => {
      const errors: ProfileValidationErrors = {
        fullName: '',
        bio: '',
      };

      const result = isProfileFormValid(errors);

      expect(result).toBe(true);
    });
  });

  describe('hasProfileChanges', () => {
    const originalProfile: Profile = {
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      emailVerified: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      handle: 'testuser',
      fullName: 'John Doe',
      bio: 'Original bio',
      profilePictureUrl: undefined,
      profilePictureThumbnailUrl: undefined,
      postsCount: 5,
      followersCount: 10,
      followingCount: 3,
    };

    it('should return false when no changes made', () => {
      const formData: ProfileFormData = {
        fullName: 'John Doe',
        bio: 'Original bio',
      };

      const result = hasProfileChanges(originalProfile, formData);

      expect(result).toBe(false);
    });

    it('should return true when fullName changed', () => {
      const formData: ProfileFormData = {
        fullName: 'Jane Doe',
        bio: 'Original bio',
      };

      const result = hasProfileChanges(originalProfile, formData);

      expect(result).toBe(true);
    });

    it('should return true when bio changed', () => {
      const formData: ProfileFormData = {
        fullName: 'John Doe',
        bio: 'New bio',
      };

      const result = hasProfileChanges(originalProfile, formData);

      expect(result).toBe(true);
    });

    it('should return true when both fields changed', () => {
      const formData: ProfileFormData = {
        fullName: 'Jane Doe',
        bio: 'New bio',
      };

      const result = hasProfileChanges(originalProfile, formData);

      expect(result).toBe(true);
    });

    it('should handle profile with null values', () => {
      const profileWithNulls: Partial<Profile> = {
        ...originalProfile,
        fullName: null as any,
        bio: null as any,
      };

      const formData: ProfileFormData = {
        fullName: '',
        bio: '',
      };

      const result = hasProfileChanges(profileWithNulls as Profile, formData);

      expect(result).toBe(false);
    });

    it('should detect change from null to value', () => {
      const profileWithNulls: Partial<Profile> = {
        ...originalProfile,
        fullName: null as any,
        bio: null as any,
      };

      const formData: ProfileFormData = {
        fullName: 'John Doe',
        bio: 'Test bio',
      };

      const result = hasProfileChanges(profileWithNulls as Profile, formData);

      expect(result).toBe(true);
    });

    it('should ignore whitespace differences', () => {
      const formData: ProfileFormData = {
        fullName: '  John Doe  ',
        bio: '  Original bio  ',
      };

      const result = hasProfileChanges(originalProfile, formData);

      expect(result).toBe(false);
    });
  });
});
