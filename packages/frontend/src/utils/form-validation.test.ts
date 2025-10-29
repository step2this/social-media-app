import { describe, it, expect } from 'vitest';
import {
  validateCaptionLength,
  validateTags,
  validateImageFile,
} from './form-validation.js';
import { TestFiles, createTestImageFile } from '../test-utils/file-mocks.js';

// Test helper: Assert validation success
const assertValid = (result: { isValid: boolean; error?: string }) => {
  expect(result.isValid).toBe(true);
  expect(result.error).toBeUndefined();
};

// Test helper: Assert validation failure with expected error
const assertInvalid = (result: { isValid: boolean; error?: string }, expectedError: string) => {
  expect(result.isValid).toBe(false);
  expect(result.error).toBe(expectedError);
};

describe('form-validation', () => {
  describe('validateCaptionLength', () => {
    it('should accept captions up to 500 characters', () => {
      assertValid(validateCaptionLength(''));
      assertValid(validateCaptionLength('Short caption'));
      assertValid(validateCaptionLength('a'.repeat(500)));
    });

    it('should reject captions over 500 characters', () => {
      assertInvalid(
        validateCaptionLength('a'.repeat(501)),
        'Caption must be 500 characters or less'
      );
    });

    it('should count unicode characters correctly', () => {
      // Emojis count as 2 character units in JS
      assertValid(validateCaptionLength('🐕'.repeat(250))); // 500 units
      assertInvalid(
        validateCaptionLength('🐕'.repeat(251)), // 502 units
        'Caption must be 500 characters or less'
      );
    });
  });

  describe('validateTags', () => {
    it('should accept valid tag formats', () => {
      assertValid(validateTags(''));
      assertValid(validateTags('adventure'));
      assertValid(validateTags('adventure, cute, funny'));
      assertValid(validateTags('tag1, tag2, tag3, tag4, tag5')); // Max 5 tags
    });

    it('should reject more than 5 tags', () => {
      assertInvalid(
        validateTags('tag1, tag2, tag3, tag4, tag5, tag6'),
        'Maximum 5 tags allowed'
      );
    });

    it('should reject tags containing # symbol', () => {
      assertInvalid(
        validateTags('#adventure'),
        'Tags should not include # symbol'
      );
      assertInvalid(
        validateTags('adventure, #cute'),
        'Tags should not include # symbol'
      );
    });

    it('should prioritize # error over max tags error', () => {
      assertInvalid(
        validateTags('#tag1, #tag2, #tag3, #tag4, #tag5, #tag6'),
        'Tags should not include # symbol'
      );
    });
  });

  describe('validateImageFile', () => {
    const MB = 1024 * 1024;

    it('should accept valid image files under size limit', () => {
      assertValid(validateImageFile(TestFiles.validJpeg()));
      assertValid(validateImageFile(TestFiles.validPng()));
      assertValid(validateImageFile(TestFiles.validWebp()));
    });

    it('should reject files over 10MB default limit', () => {
      assertInvalid(
        validateImageFile(TestFiles.tooLarge()),
        'Image size must be less than 10MB'
      );
    });

    it('should reject non-image files', () => {
      assertInvalid(
        validateImageFile(TestFiles.invalidType()),
        'Please select a valid image file (JPEG, PNG, GIF, or WebP)'
      );
    });

    it('should prioritize type error over size error', () => {
      const largeNonImage = TestFiles.invalidType();
      assertInvalid(
        validateImageFile(largeNonImage),
        'Please select a valid image file (JPEG, PNG, GIF, or WebP)'
      );
    });

    it('should respect custom max size parameter', () => {
      const file6MB = createTestImageFile({ size: 6 * MB });

      // Should fail with 5MB limit
      assertInvalid(
        validateImageFile(file6MB, 5),
        'Image size must be less than 5MB'
      );

      // Should pass with 10MB limit
      assertValid(validateImageFile(file6MB, 10));
    });

    it('should accept file at exact size limit', () => {
      assertValid(validateImageFile(TestFiles.exactLimit()));
    });

    it('should accept very small files', () => {
      assertValid(validateImageFile(TestFiles.tinyImage()));
    });
  });
});
