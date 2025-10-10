import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createImagePreview,
  revokeImagePreview,
  isValidImageType,
  formatFileSize,
  getImageDimensions,
} from './image-helpers.js';

describe('image-helpers', () => {
  describe('createImagePreview', () => {
    let mockCreateObjectURL: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockCreateObjectURL = vi.fn(() => 'blob:mock-url-123');
      global.URL.createObjectURL = mockCreateObjectURL;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should create a preview URL for an image file', () => {
      const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
      const url = createImagePreview(file);

      expect(url).toBe('blob:mock-url-123');
      expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it('should create different URLs for different files', () => {
      mockCreateObjectURL
        .mockReturnValueOnce('blob:url-1')
        .mockReturnValueOnce('blob:url-2');

      const file1 = new File(['content1'], 'test1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['content2'], 'test2.jpg', { type: 'image/jpeg' });

      const url1 = createImagePreview(file1);
      const url2 = createImagePreview(file2);

      expect(url1).toBe('blob:url-1');
      expect(url2).toBe('blob:url-2');
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(2);
    });

    it('should handle PNG files', () => {
      const file = new File(['png content'], 'test.png', { type: 'image/png' });
      const url = createImagePreview(file);

      expect(url).toBe('blob:mock-url-123');
      expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
    });

    it('should handle GIF files', () => {
      const file = new File(['gif content'], 'test.gif', { type: 'image/gif' });
      const url = createImagePreview(file);

      expect(url).toBe('blob:mock-url-123');
      expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
    });

    it('should handle WebP files', () => {
      const file = new File(['webp content'], 'test.webp', { type: 'image/webp' });
      const url = createImagePreview(file);

      expect(url).toBe('blob:mock-url-123');
      expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
    });
  });

  describe('revokeImagePreview', () => {
    let mockRevokeObjectURL: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockRevokeObjectURL = vi.fn();
      global.URL.revokeObjectURL = mockRevokeObjectURL;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should revoke a blob URL', () => {
      revokeImagePreview('blob:mock-url-123');

      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url-123');
      expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1);
    });

    it('should revoke different URLs', () => {
      revokeImagePreview('blob:url-1');
      revokeImagePreview('blob:url-2');
      revokeImagePreview('blob:url-3');

      expect(mockRevokeObjectURL).toHaveBeenCalledTimes(3);
      expect(mockRevokeObjectURL).toHaveBeenNthCalledWith(1, 'blob:url-1');
      expect(mockRevokeObjectURL).toHaveBeenNthCalledWith(2, 'blob:url-2');
      expect(mockRevokeObjectURL).toHaveBeenNthCalledWith(3, 'blob:url-3');
    });

    it('should handle empty string gracefully', () => {
      revokeImagePreview('');

      expect(mockRevokeObjectURL).toHaveBeenCalledWith('');
      expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1);
    });

    it('should not throw if URL is invalid', () => {
      expect(() => revokeImagePreview('invalid-url')).not.toThrow();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('invalid-url');
    });
  });

  describe('isValidImageType', () => {
    it('should return true for image/jpeg', () => {
      expect(isValidImageType('image/jpeg')).toBe(true);
    });

    it('should return true for image/png', () => {
      expect(isValidImageType('image/png')).toBe(true);
    });

    it('should return true for image/gif', () => {
      expect(isValidImageType('image/gif')).toBe(true);
    });

    it('should return true for image/webp', () => {
      expect(isValidImageType('image/webp')).toBe(true);
    });

    it('should return false for text/plain', () => {
      expect(isValidImageType('text/plain')).toBe(false);
    });

    it('should return false for application/pdf', () => {
      expect(isValidImageType('application/pdf')).toBe(false);
    });

    it('should return false for video/mp4', () => {
      expect(isValidImageType('video/mp4')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidImageType('')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidImageType(undefined as any)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValidImageType(null as any)).toBe(false);
    });

    it('should be case-sensitive (reject IMAGE/JPEG)', () => {
      expect(isValidImageType('IMAGE/JPEG')).toBe(false);
    });

    it('should be case-sensitive (reject image/JPEG)', () => {
      expect(isValidImageType('image/JPEG')).toBe(false);
    });

    it('should return false for image/svg+xml', () => {
      expect(isValidImageType('image/svg+xml')).toBe(false);
    });

    it('should return false for image/bmp', () => {
      expect(isValidImageType('image/bmp')).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes to B', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('should format 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('should format 1023 bytes as B', () => {
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('should format 1024 bytes as 1 KB', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
    });

    it('should format kilobytes with 1 decimal place', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format 1 MB', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    });

    it('should format 5.7 MB', () => {
      expect(formatFileSize(Math.floor(5.7 * 1024 * 1024))).toBe('5.7 MB');
    });

    it('should format 10 MB', () => {
      expect(formatFileSize(10 * 1024 * 1024)).toBe('10.0 MB');
    });

    it('should format 1 GB', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
    });

    it('should format 2.5 GB', () => {
      expect(formatFileSize(Math.floor(2.5 * 1024 * 1024 * 1024))).toBe('2.5 GB');
    });

    it('should handle very large numbers', () => {
      const result = formatFileSize(5 * 1024 * 1024 * 1024 * 1024); // 5 TB
      expect(result).toBe('5120.0 GB'); // Function maxes out at GB
    });

    it('should handle decimal bytes (rounds)', () => {
      expect(formatFileSize(1536.7)).toBe('1.5 KB');
    });

    it('should handle negative numbers gracefully', () => {
      expect(formatFileSize(-1024)).toBe('-1.0 KB');
    });
  });

  describe('getImageDimensions', () => {
    it('should return a promise', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const result = getImageDimensions(file);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should resolve with dimensions for valid image', async () => {
      // Mock Image constructor
      const mockImage = {
        addEventListener: vi.fn((event, handler) => {
          if (event === 'load') {
            // Set dimensions before triggering load
            mockImage.width = 800;
            mockImage.height = 600;
            handler();
          }
        }),
        src: '',
        width: 0,
        height: 0,
      };

      global.Image = vi.fn(() => mockImage) as any;

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const dimensions = await getImageDimensions(file);

      expect(dimensions).toEqual({ width: 800, height: 600 });
    });

    it('should reject for invalid image', async () => {
      // Mock Image constructor with error
      const mockImage = {
        addEventListener: vi.fn((event, handler) => {
          if (event === 'error') {
            handler(new Error('Failed to load image'));
          }
        }),
        src: '',
        width: 0,
        height: 0,
      };

      global.Image = vi.fn(() => mockImage) as any;

      const file = new File(['invalid'], 'test.jpg', { type: 'image/jpeg' });

      await expect(getImageDimensions(file)).rejects.toThrow('Failed to load image');
    });

    it('should set src to blob URL', async () => {
      const mockImage = {
        addEventListener: vi.fn((event, handler) => {
          if (event === 'load') {
            handler();
          }
        }),
        src: '',
        width: 1024,
        height: 768,
      };

      global.Image = vi.fn(() => mockImage) as any;
      global.URL.createObjectURL = vi.fn(() => 'blob:test-url');

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      await getImageDimensions(file);

      expect(mockImage.src).toBe('blob:test-url');
    });
  });

  describe('Integration: createImagePreview and revokeImagePreview', () => {
    it('should create and then revoke a preview URL', () => {
      const mockCreateObjectURL = vi.fn(() => 'blob:integration-test');
      const mockRevokeObjectURL = vi.fn();

      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      // Create preview
      const url = createImagePreview(file);
      expect(url).toBe('blob:integration-test');
      expect(mockCreateObjectURL).toHaveBeenCalledWith(file);

      // Revoke preview
      revokeImagePreview(url);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:integration-test');
    });
  });
});
