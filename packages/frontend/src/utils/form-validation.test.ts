import { describe, it, expect } from 'vitest';
import {
  validateCaptionLength,
  validateTags,
  validateImageFile,
  validateImageSize,
  validateImageType,
  type ValidationResult,
} from './form-validation.js';

describe('form-validation', () => {
  describe('validateCaptionLength', () => {
    it('should return valid for empty caption', () => {
      const result = validateCaptionLength('');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for caption under 500 characters', () => {
      const caption = 'This is a test caption';
      const result = validateCaptionLength(caption);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for caption exactly 500 characters', () => {
      const caption = 'a'.repeat(500);
      const result = validateCaptionLength(caption);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for caption over 500 characters', () => {
      const caption = 'a'.repeat(501);
      const result = validateCaptionLength(caption);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Caption must be 500 characters or less');
    });

    it('should return invalid for caption with 1000 characters', () => {
      const caption = 'x'.repeat(1000);
      const result = validateCaptionLength(caption);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Caption must be 500 characters or less');
    });

    it('should handle unicode characters correctly', () => {
      // Note: Some unicode characters (like emojis) count as 2 units in JS string length
      const caption = '🐕'.repeat(250); // 250 emojis = 500 character units
      const result = validateCaptionLength(caption);
      expect(result.isValid).toBe(true);

      const tooLong = '🐕'.repeat(251); // 251 emojis = 502 character units
      const result2 = validateCaptionLength(tooLong);
      expect(result2.isValid).toBe(false);
    });
  });

  describe('validateTags', () => {
    it('should return valid for empty tags string', () => {
      const result = validateTags('');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for whitespace-only tags string', () => {
      const result = validateTags('   ');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for single tag', () => {
      const result = validateTags('adventure');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for multiple tags (under limit)', () => {
      const result = validateTags('adventure, cute, funny');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for exactly 5 tags', () => {
      const result = validateTags('tag1, tag2, tag3, tag4, tag5');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for more than 5 tags', () => {
      const result = validateTags('tag1, tag2, tag3, tag4, tag5, tag6');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Maximum 5 tags allowed');
    });

    it('should return invalid for tags containing # symbol', () => {
      const result = validateTags('#adventure, cute');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Tags should not include # symbol');
    });

    it('should return invalid for single tag with # symbol', () => {
      const result = validateTags('#tag');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Tags should not include # symbol');
    });

    it('should return invalid for tags with # in middle', () => {
      const result = validateTags('adventure, cu#te, funny');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Tags should not include # symbol');
    });

    it('should handle tags with extra whitespace', () => {
      const result = validateTags('  tag1  ,  tag2  ,  tag3  ');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should ignore empty tags from multiple commas', () => {
      const result = validateTags('tag1,,,,tag2,tag3');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should prioritize # error over max tags error', () => {
      const result = validateTags('#tag1, #tag2, #tag3, #tag4, #tag5, #tag6');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Tags should not include # symbol');
    });

    it('should handle trailing comma', () => {
      const result = validateTags('tag1, tag2, tag3,');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle leading comma', () => {
      const result = validateTags(', tag1, tag2');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('validateImageType', () => {
    it('should return valid for image/jpeg', () => {
      const result = validateImageType('image/jpeg');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for image/png', () => {
      const result = validateImageType('image/png');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for image/gif', () => {
      const result = validateImageType('image/gif');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for image/webp', () => {
      const result = validateImageType('image/webp');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for text/plain', () => {
      const result = validateImageType('text/plain');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
    });

    it('should return invalid for application/pdf', () => {
      const result = validateImageType('application/pdf');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
    });

    it('should return invalid for video/mp4', () => {
      const result = validateImageType('video/mp4');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
    });

    it('should return invalid for empty string', () => {
      const result = validateImageType('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
    });

    it('should be case sensitive (image/JPEG should fail)', () => {
      const result = validateImageType('image/JPEG');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
    });
  });

  describe('validateImageSize', () => {
    const MB = 1024 * 1024;

    it('should return valid for file under 10MB', () => {
      const file = new File(['x'.repeat(5 * MB)], 'test.jpg', { type: 'image/jpeg' });
      const result = validateImageSize(file, 10);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for file exactly 10MB', () => {
      const file = new File(['x'.repeat(10 * MB)], 'test.jpg', { type: 'image/jpeg' });
      const result = validateImageSize(file, 10);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for file over 10MB', () => {
      const file = new File(['x'.repeat(11 * MB)], 'test.jpg', { type: 'image/jpeg' });
      const result = validateImageSize(file, 10);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Image size must be less than 10MB');
    });

    it('should return valid for very small file', () => {
      const file = new File(['tiny'], 'test.jpg', { type: 'image/jpeg' });
      const result = validateImageSize(file, 10);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for empty file', () => {
      const file = new File([], 'test.jpg', { type: 'image/jpeg' });
      const result = validateImageSize(file, 10);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should respect custom max size (5MB)', () => {
      const file = new File(['x'.repeat(6 * MB)], 'test.jpg', { type: 'image/jpeg' });
      const result = validateImageSize(file, 5);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Image size must be less than 5MB');
    });

    it('should respect custom max size (20MB)', () => {
      const file = new File(['x'.repeat(15 * MB)], 'test.jpg', { type: 'image/jpeg' });
      const result = validateImageSize(file, 20);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('validateImageFile', () => {
    it('should return valid for valid JPEG file under size limit', () => {
      const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
      const result = validateImageFile(file);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for valid PNG file', () => {
      const file = new File(['image content'], 'test.png', { type: 'image/png' });
      const result = validateImageFile(file);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for wrong file type', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = validateImageFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
    });

    it('should return invalid for file over size limit', () => {
      const largeContent = 'x'.repeat(11 * 1024 * 1024);
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
      const result = validateImageFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Image size must be less than 10MB');
    });

    it('should prioritize type error over size error', () => {
      const largeContent = 'x'.repeat(11 * 1024 * 1024);
      const file = new File([largeContent], 'large.txt', { type: 'text/plain' });
      const result = validateImageFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
    });

    it('should accept custom max size parameter', () => {
      const content = 'x'.repeat(6 * 1024 * 1024);
      const file = new File([content], 'test.jpg', { type: 'image/jpeg' });

      const result1 = validateImageFile(file, 5);
      expect(result1.isValid).toBe(false);

      const result2 = validateImageFile(file, 10);
      expect(result2.isValid).toBe(true);
    });
  });

  describe('ValidationResult type safety', () => {
    it('should have correct type for valid result', () => {
      const result: ValidationResult = {
        isValid: true,
      };
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should have correct type for invalid result', () => {
      const result: ValidationResult = {
        isValid: false,
        error: 'Test error',
      };
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Test error');
    });
  });
});
