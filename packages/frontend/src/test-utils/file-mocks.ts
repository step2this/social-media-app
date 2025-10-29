/**
 * File mocking utilities for testing file upload/validation
 *
 * Provides cross-browser compatible File mocks for jsdom environment.
 * jsdom has incomplete File API implementation, these utilities work around that.
 *
 * @example
 * ```typescript
 * import { createTestImageFile, TestFiles } from '../test-utils/file-mocks';
 *
 * // Quick test files
 * const validImage = TestFiles.validJpeg();
 * const tooLarge = TestFiles.tooLarge();
 *
 * // Custom file
 * const customFile = createTestImageFile({
 *   size: 3 * 1024 * 1024,
 *   type: 'image/png'
 * });
 * ```
 */

/**
 * Create a mock File object for testing
 * Works around jsdom's incomplete File API implementation
 *
 * @param name - Filename with extension (e.g., 'photo.jpg')
 * @param size - File size in bytes
 * @param type - MIME type (e.g., 'image/jpeg')
 * @param lastModified - Timestamp (defaults to now)
 * @returns Mock File object with all required properties properly set
 */
export function createMockFile(
  name: string,
  size: number,
  type: string,
  lastModified: number = Date.now()
): File {
  // Create blob with correct size
  const content = 'a'.repeat(size);
  const blob = new Blob([content], { type });

  // Create File from blob
  const file = new File([blob], name, {
    type,
    lastModified
  });

  // jsdom workaround: Manually set properties that may not be properly initialized
  // These Object.defineProperty calls ensure the properties are readable
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false,
    configurable: false
  });

  Object.defineProperty(file, 'type', {
    value: type,
    writable: false,
    configurable: false
  });

  return file;
}

/**
 * Create a test image file with sensible defaults
 * Convenience wrapper around createMockFile for image files
 *
 * @param overrides - Partial file properties to override defaults
 * @returns Mock image File object
 *
 * @example
 * ```typescript
 * // Small JPEG
 * const small = createTestImageFile({ size: 100 * 1024 });
 *
 * // Large PNG
 * const large = createTestImageFile({
 *   name: 'photo.png',
 *   size: 10 * 1024 * 1024,
 *   type: 'image/png'
 * });
 *
 * // WebP image
 * const webp = createTestImageFile({
 *   name: 'photo.webp',
 *   type: 'image/webp'
 * });
 * ```
 */
export function createTestImageFile(
  overrides: Partial<{
    name: string;
    size: number;
    type: string;
    lastModified: number;
  }> = {}
): File {
  return createMockFile(
    overrides.name || 'test-image.jpg',
    overrides.size !== undefined ? overrides.size : 1024 * 1024, // 1MB default
    overrides.type || 'image/jpeg',
    overrides.lastModified
  );
}

/**
 * Predefined test files for common validation scenarios
 * Use these for consistent testing across the codebase
 *
 * @example
 * ```typescript
 * import { TestFiles } from '../test-utils/file-mocks';
 *
 * it('should accept valid JPEG', () => {
 *   const result = validateImageFile(TestFiles.validJpeg());
 *   expect(result.isValid).toBe(true);
 * });
 *
 * it('should reject oversized file', () => {
 *   const result = validateImageFile(TestFiles.tooLarge());
 *   expect(result.isValid).toBe(false);
 * });
 * ```
 */
export const TestFiles = {
  /**
   * Valid JPEG image under 5MB limit
   * Size: 3MB
   */
  validJpeg: () => createTestImageFile({
    name: 'photo.jpg',
    size: 3 * 1024 * 1024,
    type: 'image/jpeg'
  }),

  /**
   * Valid PNG image under limit
   * Size: 2MB
   */
  validPng: () => createTestImageFile({
    name: 'photo.png',
    size: 2 * 1024 * 1024,
    type: 'image/png'
  }),

  /**
   * Valid WebP image
   * Size: 1.5MB
   */
  validWebp: () => createTestImageFile({
    name: 'photo.webp',
    size: 1.5 * 1024 * 1024,
    type: 'image/webp'
  }),

  /**
   * File exceeding 10MB default limit
   * Size: 11MB
   */
  tooLarge: () => createTestImageFile({
    name: 'huge.jpg',
    size: 11 * 1024 * 1024,
    type: 'image/jpeg'
  }),

  /**
   * File with invalid type (not an image)
   * Type: PDF document
   */
  invalidType: () => createMockFile(
    'document.pdf',
    1024 * 1024,
    'application/pdf'
  ),

  /**
   * Very small valid image (edge case)
   * Size: 1KB
   */
  tinyImage: () => createTestImageFile({
    name: 'tiny.jpg',
    size: 1024,
    type: 'image/jpeg'
  }),

  /**
   * Image at exactly 10MB default limit (boundary test)
   * Size: 10MB exactly
   */
  exactLimit: () => createTestImageFile({
    name: 'exact-limit.jpg',
    size: 10 * 1024 * 1024,
    type: 'image/jpeg'
  }),
};
