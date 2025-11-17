/**
 * S3 Upload Utilities
 *
 * Helper functions for uploading files to S3 using presigned URLs
 */

import { logger } from '@/lib/logger';

/**
 * Upload a file to S3 using a presigned URL
 *
 * @param file - The file to upload
 * @param presignedUrl - The presigned S3 upload URL
 * @returns Promise that resolves when upload completes
 */
export async function uploadToS3(file: File | Blob, presignedUrl: string): Promise<void> {
  try {
    logger.info({
      fileSize: file.size,
      fileType: file.type,
      urlHost: new URL(presignedUrl).host
    }, 'Uploading file to S3');

    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!response.ok) {
      throw new Error(`S3 upload failed: ${response.status} ${response.statusText}`);
    }

    logger.info({ status: response.status }, 'S3 upload successful');
  } catch (error) {
    logger.error({ error }, 'Failed to upload to S3');
    throw error;
  }
}

/**
 * Generate a thumbnail from an image file
 *
 * @param file - The original image file
 * @param maxWidth - Maximum width of thumbnail (default: 400px)
 * @param maxHeight - Maximum height of thumbnail (default: 400px)
 * @returns Promise<Blob> - The thumbnail as a Blob
 */
export async function generateThumbnail(
  file: File,
  maxWidth: number = 400,
  maxHeight: number = 400
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
            logger.info({
              originalSize: file.size,
              thumbnailSize: blob.size,
              dimensions: `${width}x${height}`
            }, 'Thumbnail generated');
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail blob'));
          }
        },
        file.type,
        0.85 // JPEG quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load the image
    img.src = URL.createObjectURL(file);
  });
}
