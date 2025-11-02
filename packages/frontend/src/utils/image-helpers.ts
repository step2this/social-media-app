import { ImageFileTypeField } from '@social-media-app/shared';

/**
 * Image dimensions structure
 */
export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Creates a blob URL for image preview from a File object.
 * This URL must be revoked later using revokeImagePreview to prevent memory leaks.
 *
 * @param file - The image File object
 * @returns Blob URL string for preview
 *
 * @example
 * ```typescript
 * const file = new File(['content'], 'image.jpg', { type: 'image/jpeg' });
 * const url = createImagePreview(file);
 * // Use url for preview
 * // Later: revokeImagePreview(url);
 * ```
 */
export const createImagePreview = (file: File): string => URL.createObjectURL(file);

/**
 * Revokes a blob URL created by createImagePreview.
 * This is important for memory management to prevent memory leaks.
 *
 * @param url - The blob URL to revoke
 *
 * @example
 * ```typescript
 * const url = createImagePreview(file);
 * // After using the preview
 * revokeImagePreview(url);
 * ```
 */
export const revokeImagePreview = (url: string): void => {
  URL.revokeObjectURL(url);
};

/**
 * Checks if a MIME type is a valid image type.
 * Uses the shared schema validation from @social-media-app/shared.
 *
 * @param mimeType - The MIME type string to check
 * @returns True if valid image type, false otherwise
 *
 * @example
 * ```typescript
 * if (isValidImageType('image/jpeg')) {
 *   console.log('Valid image type');
 * }
 * ```
 */
export const isValidImageType = (mimeType: string): boolean => {
  if (!mimeType) {
    return false;
  }

  const validation = ImageFileTypeField.safeParse(mimeType);
  return validation.success;
};

/**
 * Formats a file size in bytes to a human-readable string.
 * Converts to appropriate unit (B, KB, MB, GB).
 *
 * @param bytes - File size in bytes
 * @returns Formatted string with size and unit
 *
 * @example
 * ```typescript
 * formatFileSize(1024); // '1.0 KB'
 * formatFileSize(1536); // '1.5 KB'
 * formatFileSize(5242880); // '5.0 MB'
 * ```
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const absBytes = Math.abs(bytes);
  const sign = bytes < 0 ? '-' : '';

  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;

  if (absBytes >= GB) {
    return `${sign}${(absBytes / GB).toFixed(1)} GB`;
  } else if (absBytes >= MB) {
    return `${sign}${(absBytes / MB).toFixed(1)} MB`;
  } else if (absBytes >= KB) {
    return `${sign}${(absBytes / KB).toFixed(1)} KB`;
  } else {
    return `${sign}${absBytes} B`;
  }
};

/**
 * Gets the dimensions (width and height) of an image file.
 * Returns a promise that resolves with the dimensions.
 *
 * @param file - The image File object
 * @returns Promise resolving to ImageDimensions
 *
 * @example
 * ```typescript
 * const file = new File(['content'], 'image.jpg', { type: 'image/jpeg' });
 * const { width, height } = await getImageDimensions(file);
 * console.log(`Image is ${width}x${height}`);
 * ```
 */
export const getImageDimensions = (file: File): Promise<ImageDimensions> => new Promise((resolve, reject) => {
    const img = new Image();

    img.addEventListener('load', () => {
      resolve({
        width: img.width,
        height: img.height,
      });
    });

    img.addEventListener('error', () => {
      reject(new Error('Failed to load image'));
    });

    img.src = URL.createObjectURL(file);
  });
