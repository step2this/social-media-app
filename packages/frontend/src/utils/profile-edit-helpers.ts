import type { Profile } from '@social-media-app/shared';

/**
 * Profile form data structure
 */
export interface ProfileFormData {
  fullName: string;
  bio: string;
}

/**
 * Profile validation errors structure
 */
export interface ProfileValidationErrors {
  fullName?: string;
  bio?: string;
}

/**
 * Profile update request structure
 */
export interface ProfileUpdateRequest {
  fullName: string;
  bio: string;
}

/**
 * Validates profile form data.
 * Returns an object with validation errors for each field.
 * Empty object means all fields are valid.
 *
 * @param formData - The profile form data to validate
 * @returns Object containing validation errors (empty if valid)
 *
 * @example
 * ```typescript
 * const errors = validateProfileForm({ fullName: '', bio: 'Test' });
 * if (Object.keys(errors).length > 0) {
 *   console.log('Validation failed:', errors);
 * }
 * ```
 */
export const validateProfileForm = (formData: ProfileFormData): ProfileValidationErrors => {
  const errors: ProfileValidationErrors = {};

  // Full name is required
  if (!formData.fullName.trim()) {
    errors.fullName = 'Full name is required';
  }

  // Bio is optional - no validation needed

  return errors;
};

/**
 * Initializes profile form data from a Profile object.
 * Handles null/undefined values by providing empty string defaults.
 * Trims whitespace from all fields.
 *
 * @param profile - The profile object to initialize from
 * @returns ProfileFormData with safe defaults
 *
 * @example
 * ```typescript
 * const formData = initializeProfileFormData(profile);
 * // formData = { fullName: 'John Doe', bio: 'Software developer' }
 * ```
 */
export const initializeProfileFormData = (profile: Profile): ProfileFormData => {
  return {
    fullName: (profile.fullName || '').trim(),
    bio: (profile.bio || '').trim(),
  };
};

/**
 * Builds a profile update request from form data.
 * Trims whitespace from all fields.
 *
 * @param formData - The profile form data
 * @returns ProfileUpdateRequest ready to send to API
 *
 * @example
 * ```typescript
 * const request = buildProfileUpdateRequest(formData);
 * await profileService.updateProfile(request);
 * ```
 */
export const buildProfileUpdateRequest = (formData: ProfileFormData): ProfileUpdateRequest => {
  return {
    fullName: formData.fullName.trim(),
    bio: formData.bio.trim(),
  };
};

/**
 * Clears a specific validation error from the errors object.
 * Returns a new object with the specified field error cleared.
 * Does not mutate the original errors object.
 *
 * @param errors - Current validation errors
 * @param field - Field name to clear error for
 * @returns New errors object with field error cleared
 *
 * @example
 * ```typescript
 * const newErrors = clearValidationError(errors, 'fullName');
 * // newErrors.fullName will be empty string
 * ```
 */
export const clearValidationError = (
  errors: ProfileValidationErrors,
  field: keyof ProfileValidationErrors
): ProfileValidationErrors => {
  return {
    ...errors,
    [field]: '',
  };
};

/**
 * Determines if the profile form should be submitted.
 * Performs validation and returns true if form is valid.
 *
 * @param formData - The profile form data to check
 * @returns True if form should be submitted, false otherwise
 *
 * @example
 * ```typescript
 * if (shouldSubmitProfileForm(formData)) {
 *   await submitForm();
 * }
 * ```
 */
export const shouldSubmitProfileForm = (formData: ProfileFormData): boolean => {
  const errors = validateProfileForm(formData);
  return Object.keys(errors).length === 0;
};

/**
 * Formats a validation error for a specific field.
 * Returns the error message or empty string if no error.
 *
 * @param errors - Validation errors object
 * @param field - Field name to get error for
 * @returns Error message or empty string
 *
 * @example
 * ```typescript
 * const errorMsg = formatProfileValidationError(errors, 'fullName');
 * if (errorMsg) {
 *   console.log('Error:', errorMsg);
 * }
 * ```
 */
export const formatProfileValidationError = (
  errors: ProfileValidationErrors,
  field: keyof ProfileValidationErrors
): string => {
  return errors[field] || '';
};

/**
 * Checks if the profile form is valid (no validation errors).
 *
 * @param errors - Validation errors object
 * @returns True if form is valid (no errors), false otherwise
 *
 * @example
 * ```typescript
 * if (isProfileFormValid(errors)) {
 *   console.log('Form is valid!');
 * }
 * ```
 */
export const isProfileFormValid = (errors: ProfileValidationErrors): boolean => {
  return Object.keys(errors).filter((key) => {
    const errorKey = key as keyof ProfileValidationErrors;
    return errors[errorKey] && errors[errorKey]!.length > 0;
  }).length === 0;
};

/**
 * Checks if the profile form data has changes compared to the original profile.
 * Trims whitespace before comparison to ignore formatting differences.
 *
 * @param originalProfile - The original profile object
 * @param formData - The current form data
 * @returns True if there are changes, false otherwise
 *
 * @example
 * ```typescript
 * if (hasProfileChanges(profile, formData)) {
 *   console.log('Profile has unsaved changes');
 * }
 * ```
 */
export const hasProfileChanges = (
  originalProfile: Profile,
  formData: ProfileFormData
): boolean => {
  const originalFullName = (originalProfile.fullName || '').trim();
  const originalBio = (originalProfile.bio || '').trim();
  const currentFullName = formData.fullName.trim();
  const currentBio = formData.bio.trim();

  return originalFullName !== currentFullName || originalBio !== currentBio;
};
