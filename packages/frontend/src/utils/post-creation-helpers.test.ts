import { describe, it, expect } from 'vitest';
import {
  parseTags,
  formatTagsDisplay,
  normalizeTagsInput,
  buildCreatePostRequest,
} from './post-creation-helpers.js';
import type { CreatePostRequest } from '@social-media-app/shared';

describe('post-creation-helpers', () => {
  describe('parseTags', () => {
    it('should return empty array for empty string', () => {
      expect(parseTags('')).toEqual([]);
    });

    it('should return empty array for whitespace-only string', () => {
      expect(parseTags('   ')).toEqual([]);
    });

    it('should parse single tag', () => {
      expect(parseTags('adventure')).toEqual(['adventure']);
    });

    it('should parse multiple tags', () => {
      expect(parseTags('adventure, cute, funny')).toEqual(['adventure', 'cute', 'funny']);
    });

    it('should trim whitespace from tags', () => {
      expect(parseTags('  tag1  ,  tag2  ,  tag3  ')).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should filter out empty tags', () => {
      expect(parseTags('tag1,,,,tag2,tag3')).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should limit to 5 tags by default', () => {
      expect(parseTags('tag1, tag2, tag3, tag4, tag5, tag6, tag7')).toEqual([
        'tag1',
        'tag2',
        'tag3',
        'tag4',
        'tag5',
      ]);
    });

    it('should respect custom maxTags parameter', () => {
      expect(parseTags('tag1, tag2, tag3, tag4', 3)).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should allow more tags when maxTags is set higher', () => {
      const result = parseTags('tag1, tag2, tag3, tag4, tag5, tag6, tag7', 7);
      expect(result).toEqual(['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7']);
    });

    it('should handle trailing comma', () => {
      expect(parseTags('tag1, tag2, tag3,')).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should handle leading comma', () => {
      expect(parseTags(', tag1, tag2')).toEqual(['tag1', 'tag2']);
    });

    it('should handle tags with spaces in them', () => {
      expect(parseTags('cute dog, funny cat')).toEqual(['cute dog', 'funny cat']);
    });

    it('should preserve case', () => {
      expect(parseTags('Adventure, CUTE, FuNnY')).toEqual(['Adventure', 'CUTE', 'FuNnY']);
    });

    it('should handle special characters in tags', () => {
      expect(parseTags('tag-1, tag_2, tag.3')).toEqual(['tag-1', 'tag_2', 'tag.3']);
    });

    it('should handle unicode characters', () => {
      expect(parseTags('🐕, 🐈, emoji')).toEqual(['🐕', '🐈', 'emoji']);
    });

    it('should return exactly maxTags when input has more', () => {
      const result = parseTags('a, b, c, d, e, f, g, h, i, j', 7);
      expect(result).toHaveLength(7);
      expect(result).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    });

    it('should not modify array when input has fewer than maxTags', () => {
      expect(parseTags('tag1, tag2', 5)).toEqual(['tag1', 'tag2']);
    });
  });

  describe('formatTagsDisplay', () => {
    it('should return empty string for empty array', () => {
      expect(formatTagsDisplay([])).toBe('');
    });

    it('should format single tag', () => {
      expect(formatTagsDisplay(['adventure'])).toBe('adventure');
    });

    it('should format multiple tags with comma and space', () => {
      expect(formatTagsDisplay(['adventure', 'cute', 'funny'])).toBe('adventure, cute, funny');
    });

    it('should handle tag with spaces', () => {
      expect(formatTagsDisplay(['cute dog', 'funny cat'])).toBe('cute dog, funny cat');
    });

    it('should handle many tags', () => {
      const tags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'];
      expect(formatTagsDisplay(tags)).toBe('tag1, tag2, tag3, tag4, tag5, tag6');
    });

    it('should preserve case', () => {
      expect(formatTagsDisplay(['Adventure', 'CUTE', 'FuNnY'])).toBe('Adventure, CUTE, FuNnY');
    });

    it('should handle special characters', () => {
      expect(formatTagsDisplay(['tag-1', 'tag_2', 'tag.3'])).toBe('tag-1, tag_2, tag.3');
    });

    it('should handle unicode characters', () => {
      expect(formatTagsDisplay(['🐕', '🐈', 'emoji'])).toBe('🐕, 🐈, emoji');
    });
  });

  describe('normalizeTagsInput', () => {
    it('should return empty string for empty string', () => {
      expect(normalizeTagsInput('')).toBe('');
    });

    it('should return empty string for whitespace-only string', () => {
      expect(normalizeTagsInput('   ')).toBe('');
    });

    it('should normalize single tag', () => {
      expect(normalizeTagsInput('  adventure  ')).toBe('adventure');
    });

    it('should normalize multiple tags with proper spacing', () => {
      expect(normalizeTagsInput('  tag1  ,  tag2  ,  tag3  ')).toBe('tag1, tag2, tag3');
    });

    it('should remove empty tags from multiple commas', () => {
      expect(normalizeTagsInput('tag1,,,,tag2,tag3')).toBe('tag1, tag2, tag3');
    });

    it('should handle trailing comma', () => {
      expect(normalizeTagsInput('tag1, tag2, tag3,')).toBe('tag1, tag2, tag3');
    });

    it('should handle leading comma', () => {
      expect(normalizeTagsInput(', tag1, tag2')).toBe('tag1, tag2');
    });

    it('should limit to 5 tags', () => {
      expect(normalizeTagsInput('tag1, tag2, tag3, tag4, tag5, tag6, tag7')).toBe(
        'tag1, tag2, tag3, tag4, tag5'
      );
    });

    it('should preserve tags with spaces', () => {
      expect(normalizeTagsInput('cute dog, funny cat')).toBe('cute dog, funny cat');
    });

    it('should handle already normalized input', () => {
      expect(normalizeTagsInput('tag1, tag2, tag3')).toBe('tag1, tag2, tag3');
    });

    it('should combine parseTags and formatTagsDisplay correctly', () => {
      const input = '  messy  ,  ,  input  ,tags  ,,  here  ';
      const result = normalizeTagsInput(input);
      expect(result).toBe('messy, input, tags, here');
    });
  });

  describe('buildCreatePostRequest', () => {
    it('should build minimal request with only required fields', () => {
      const formData = {
        caption: '',
        tags: '',
        isPublic: true,
      };

      const request = buildCreatePostRequest(formData, 'image/jpeg');

      expect(request).toEqual({
        fileType: 'image/jpeg',
        caption: undefined,
        tags: undefined,
        isPublic: true,
      });
    });

    it('should include caption when provided', () => {
      const formData = {
        caption: 'Test caption',
        tags: '',
        isPublic: true,
      };

      const request = buildCreatePostRequest(formData, 'image/jpeg');

      expect(request).toEqual({
        fileType: 'image/jpeg',
        caption: 'Test caption',
        tags: undefined,
        isPublic: true,
      });
    });

    it('should trim caption whitespace', () => {
      const formData = {
        caption: '  Test caption  ',
        tags: '',
        isPublic: true,
      };

      const request = buildCreatePostRequest(formData, 'image/jpeg');

      expect(request.caption).toBe('Test caption');
    });

    it('should exclude caption if only whitespace', () => {
      const formData = {
        caption: '   ',
        tags: '',
        isPublic: true,
      };

      const request = buildCreatePostRequest(formData, 'image/jpeg');

      expect(request.caption).toBeUndefined();
    });

    it('should include tags when provided', () => {
      const formData = {
        caption: '',
        tags: 'adventure, cute, funny',
        isPublic: true,
      };

      const request = buildCreatePostRequest(formData, 'image/jpeg');

      expect(request).toEqual({
        fileType: 'image/jpeg',
        caption: undefined,
        tags: ['adventure', 'cute', 'funny'],
        isPublic: true,
      });
    });

    it('should parse and limit tags to 5', () => {
      const formData = {
        caption: '',
        tags: 'tag1, tag2, tag3, tag4, tag5, tag6, tag7',
        isPublic: true,
      };

      const request = buildCreatePostRequest(formData, 'image/jpeg');

      expect(request.tags).toEqual(['tag1', 'tag2', 'tag3', 'tag4', 'tag5']);
    });

    it('should exclude tags if empty string', () => {
      const formData = {
        caption: '',
        tags: '',
        isPublic: true,
      };

      const request = buildCreatePostRequest(formData, 'image/jpeg');

      expect(request.tags).toBeUndefined();
    });

    it('should exclude tags if only whitespace', () => {
      const formData = {
        caption: '',
        tags: '   ',
        isPublic: true,
      };

      const request = buildCreatePostRequest(formData, 'image/jpeg');

      expect(request.tags).toBeUndefined();
    });

    it('should handle isPublic: false', () => {
      const formData = {
        caption: 'Private post',
        tags: 'private',
        isPublic: false,
      };

      const request = buildCreatePostRequest(formData, 'image/png');

      expect(request).toEqual({
        fileType: 'image/png',
        caption: 'Private post',
        tags: ['private'],
        isPublic: false,
      });
    });

    it('should handle all file types', () => {
      const formData = {
        caption: '',
        tags: '',
        isPublic: true,
      };

      expect(buildCreatePostRequest(formData, 'image/jpeg').fileType).toBe('image/jpeg');
      expect(buildCreatePostRequest(formData, 'image/png').fileType).toBe('image/png');
      expect(buildCreatePostRequest(formData, 'image/gif').fileType).toBe('image/gif');
      expect(buildCreatePostRequest(formData, 'image/webp').fileType).toBe('image/webp');
    });

    it('should build complete request with all fields', () => {
      const formData = {
        caption: 'My pet adventure',
        tags: 'adventure, cute, funny',
        isPublic: true,
      };

      const request = buildCreatePostRequest(formData, 'image/jpeg');

      expect(request).toEqual({
        fileType: 'image/jpeg',
        caption: 'My pet adventure',
        tags: ['adventure', 'cute', 'funny'],
        isPublic: true,
      });
    });

    it('should return type-safe CreatePostRequest', () => {
      const formData = {
        caption: 'Test',
        tags: 'test',
        isPublic: true,
      };

      const request: CreatePostRequest = buildCreatePostRequest(formData, 'image/jpeg');

      expect(request).toBeDefined();
      expect(request.fileType).toBe('image/jpeg');
    });

    it('should handle edge case with empty tags after parsing', () => {
      const formData = {
        caption: 'Test',
        tags: ',,,,,',
        isPublic: true,
      };

      const request = buildCreatePostRequest(formData, 'image/jpeg');

      expect(request.tags).toBeUndefined();
    });
  });

  describe('Integration: parseTags, formatTagsDisplay, and normalizeTagsInput', () => {
    it('should normalize messy input end-to-end', () => {
      const messyInput = '  tag1  ,  ,  tag2  ,,  tag3  ';

      // Parse tags
      const parsed = parseTags(messyInput);
      expect(parsed).toEqual(['tag1', 'tag2', 'tag3']);

      // Format for display
      const formatted = formatTagsDisplay(parsed);
      expect(formatted).toBe('tag1, tag2, tag3');

      // Or use normalizeTagsInput directly
      const normalized = normalizeTagsInput(messyInput);
      expect(normalized).toBe('tag1, tag2, tag3');
    });

    it('should handle tag limiting in full flow', () => {
      const input = 'tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8';

      const normalized = normalizeTagsInput(input);
      expect(normalized).toBe('tag1, tag2, tag3, tag4, tag5');

      const parsed = parseTags(input);
      expect(parsed).toHaveLength(5);
    });
  });

  describe('Integration: buildCreatePostRequest with full form flow', () => {
    it('should handle complete form submission flow', () => {
      // User fills out form
      const formData = {
        caption: '  My amazing pet photo!  ',
        tags: '  adventure  ,  ,  cute  ,  funny  ,  ,  pets  ',
        isPublic: true,
      };

      // Build request
      const request = buildCreatePostRequest(formData, 'image/jpeg');

      // Should have cleaned and formatted data
      expect(request).toEqual({
        fileType: 'image/jpeg',
        caption: 'My amazing pet photo!',
        tags: ['adventure', 'cute', 'funny', 'pets'],
        isPublic: true,
      });
    });

    it('should handle minimal form submission', () => {
      const formData = {
        caption: '',
        tags: '',
        isPublic: true,
      };

      const request = buildCreatePostRequest(formData, 'image/png');

      expect(request).toEqual({
        fileType: 'image/png',
        caption: undefined,
        tags: undefined,
        isPublic: true,
      });
    });
  });
});
