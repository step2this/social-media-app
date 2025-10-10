/**
 * Utility Functions Barrel Export
 * Central export point for all utility modules
 */

// Form Validation Utilities
export {
  validateCaptionLength,
  validateTags,
  validateImageType,
  validateImageSize,
  validateImageFile,
  type ValidationResult,
} from './form-validation.js';

// Image Helper Utilities
export {
  createImagePreview,
  revokeImagePreview,
  isValidImageType,
  formatFileSize,
  getImageDimensions,
  type ImageDimensions,
} from './image-helpers.js';

// Post Creation Helper Utilities
export {
  parseTags,
  formatTagsDisplay,
  normalizeTagsInput,
  buildCreatePostRequest,
  type PostFormData,
} from './post-creation-helpers.js';

// Authentication Error Handler Utilities
export {
  isAuthError,
  extractAuthErrorMessage,
  createRegisterErrorMessage,
  createLoginErrorMessage,
  createProfileErrorMessage,
  createUpdateProfileErrorMessage,
} from './auth-error-handler.js';

// Authentication User Builder Utilities
export {
  ensureUserTimestamps,
  buildUserWithFallbacks,
  extractUserFromProfile,
} from './auth-user-builder.js';

// Authentication Response Handler Utilities
export {
  hasTokensInResponse,
  shouldAutoLogin,
  processRegisterResponse,
} from './auth-response-handlers.js';

// Follow State Helper Utilities
export {
  incrementFollowersCount,
  decrementFollowersCount,
  calculateOptimisticFollowState,
  calculateOptimisticUnfollowState,
  createStateSnapshot,
  shouldAllowFollow,
  shouldAllowUnfollow,
  hasInitialFollowValues,
  type FollowState,
  type FollowStateSnapshot,
} from './follow-state-helpers.js';

// Follow Error Handler Utilities
export {
  createFollowErrorMessage,
  createUnfollowErrorMessage,
  createFetchStatusErrorMessage,
  extractFollowErrorMessage,
  isNetworkError,
  isAuthenticationError,
  formatFollowOperationError,
  type FollowErrorContext,
} from './follow-error-handler.js';
