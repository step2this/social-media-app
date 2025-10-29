import { ImageFileTypeField } from '@social-media-app/shared';

/**
 * Validation result structure
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Maximum caption length in characters
 */
const MAX_CAPTION_LENGTH = 500;

/**
 * Maximum number of tags allowed
 */
const MAX_TAGS_COUNT = 5;

/**
 * Maximum image size in MB
 */
const DEFAULT_MAX_IMAGE_SIZE_MB = 10;

/**
 * Validates caption length against maximum allowed characters.
 *
 * @param caption - The caption text to validate
 * @returns ValidationResult indicating if caption is valid
 *
 * @example
 * ```typescript
 * const result = validateCaptionLength('My caption');
 * if (result.isValid) {
 *   console.log('Caption is valid');
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export const validateCaptionLength = (caption: string): ValidationResult => {
  if (caption.length > MAX_CAPTION_LENGTH) {
    return {
      isValid: false,
      error: 'Caption must be 500 characters or less',
    };
  }

  return { isValid: true };
};

/**
 * Parses a comma-separated tags string into an array of trimmed tags.
 * Filters out empty tags.
 *
 * @param tagsString - Comma-separated tags string
 * @returns Array of parsed tag strings
 */
const parseTagsArray = (tagsString: string): string[] => {
  if (!tagsString.trim()) {
    return [];
  }

  return tagsString
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
};

/**
 * Validates tags format and count.
 * Checks for:
 * - No # symbols in tags
 * - Maximum of 5 tags
 *
 * @param tagsString - Comma-separated tags string
 * @returns ValidationResult indicating if tags are valid
 *
 * @example
 * ```typescript
 * const result = validateTags('adventure, cute, funny');
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 * ```
 */
export const validateTags = (tagsString: string | string[]): ValidationResult => {
  const tags = Array.isArray(tagsString) ? tagsString : parseTagsArray(tagsString);

  // Empty tags are valid
  if (tags.length === 0) {
    return { isValid: true };
  }

  // Check for # symbol (higher priority error)
  if (tags.some((tag) => tag.includes('#'))) {
    return {
      isValid: false,
      error: 'Tags should not include # symbol',
    };
  }

  // Check max count
  if (tags.length > MAX_TAGS_COUNT) {
    return {
      isValid: false,
      error: 'Maximum 5 tags allowed',
    };
  }

  return { isValid: true };
};

/**
 * Validates image MIME type against allowed types.
 * Uses shared schema validation from @social-media-app/shared.
 *
 * @param mimeType - The MIME type string to validate
 * @returns ValidationResult indicating if image type is valid
 *
 * @example
 * ```typescript
 * const result = validateImageType('image/jpeg');
 * if (result.isValid) {
 *   console.log('Valid image type');
 * }
 * ```
 */
export const validateImageType = (mimeType: string): ValidationResult => {
  const validation = ImageFileTypeField.safeParse(mimeType);

  if (!validation.success) {
    return {
      isValid: false,
      error: 'Please select a valid image file (JPEG, PNG, GIF, or WebP)',
    };
  }

  return { isValid: true };
};

/**
 * Validates image file size against maximum allowed size.
 *
 * @param file - The File object to validate
 * @param maxSizeMB - Maximum allowed size in megabytes (default: 10MB)
 * @returns ValidationResult indicating if image size is valid
 *
 * @example
 * ```typescript
 * const file = new File(['content'], 'image.jpg', { type: 'image/jpeg' });
 * const result = validateImageSize(file, 10);
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 * ```
 */
export const validateImageSize = (
  file: File,
  maxSizeMB: number = DEFAULT_MAX_IMAGE_SIZE_MB
): ValidationResult => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `Image size must be less than ${maxSizeMB}MB`,
    };
  }

  return { isValid: true };
};

/**
 * Validates an image file for both type and size.
 * Performs comprehensive validation combining type and size checks.
 * Type validation takes priority over size validation.
 *
 * @param file - The File object to validate
 * @param maxSizeMB - Maximum allowed size in megabytes (default: 10MB)
 * @returns ValidationResult indicating if image file is valid
 *
 * @example
 * ```typescript
 * const file = new File(['content'], 'image.jpg', { type: 'image/jpeg' });
 * const result = validateImageFile(file);
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 * ```
 */
export const validateImageFile = (
  file: File,
  maxSizeMB: number = DEFAULT_MAX_IMAGE_SIZE_MB
): ValidationResult => {
  // Validate type first (higher priority)
  const typeValidation = validateImageType(file.type);
  if (!typeValidation.isValid) {
    return typeValidation;
  }

  // Then validate size
  const sizeValidation = validateImageSize(file, maxSizeMB);
  if (!sizeValidation.isValid) {
    return sizeValidation;
  }

  return { isValid: true };
};
