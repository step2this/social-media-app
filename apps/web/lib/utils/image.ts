/**
 * Client-side Image Utilities
 *
 * Functions for image processing in the browser
 */

/**
 * Generate a thumbnail from an image file
 *
 * @param file - The original image file
 * @param maxWidth - Maximum width of thumbnail (default: 400px)
 * @param maxHeight - Maximum height of thumbnail (default: 400px)
 * @param quality - JPEG quality from 0 to 1 (default: 0.85)
 * @returns Promise<Blob> - The thumbnail as a Blob
 */
export async function generateThumbnail(
  file: File,
  maxWidth: number = 400,
  maxHeight: number = 400,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      // Calculate thumbnail dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw the resized image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log('[Image Utils] Thumbnail generated:', {
              originalSize: file.size,
              thumbnailSize: blob.size,
              dimensions: `${width}x${height}`,
              reduction: `${((1 - blob.size / file.size) * 100).toFixed(1)}%`
            });
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail blob'));
          }
        },
        file.type,
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load the image
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Validate image file type
 *
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns true if valid, false otherwise
 */
export function isValidImageType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Validate image file size
 *
 * @param file - File to validate
 * @param maxSizeBytes - Maximum allowed size in bytes
 * @returns true if valid, false otherwise
 */
export function isValidImageSize(file: File, maxSizeBytes: number): boolean {
  return file.size <= maxSizeBytes;
}

/**
 * Format file size for display
 *
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
