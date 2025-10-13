import type { CreatePostRequest } from '@social-media-app/shared';

/**
 * Default maximum number of tags allowed
 */
const DEFAULT_MAX_TAGS = 5;

/**
 * Form data structure for post creation
 */
export interface PostFormData {
  caption: string;
  tags: string;
  isPublic: boolean;
}

/**
 * Parses a comma-separated tags string into an array of trimmed tags.
 * Filters out empty tags and optionally limits the number of tags.
 *
 * @param tagsString - Comma-separated tags string
 * @param maxTags - Maximum number of tags to return (default: 5, undefined for unlimited)
 * @returns Array of parsed and trimmed tag strings
 *
 * @example
 * ```typescript
 * parseTags('adventure, cute, funny'); // ['adventure', 'cute', 'funny']
 * parseTags('  tag1  ,  tag2  ,  tag3  '); // ['tag1', 'tag2', 'tag3']
 * parseTags('tag1, tag2, tag3, tag4, tag5, tag6'); // ['tag1', 'tag2', 'tag3', 'tag4', 'tag5']
 * parseTags('tag1, tag2, tag3', 2); // ['tag1', 'tag2']
 * ```
 */
export const parseTags = (tagsString: string, maxTags: number = DEFAULT_MAX_TAGS): string[] => {
  if (!tagsString.trim()) {
    return [];
  }

  const tags = tagsString
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return tags.slice(0, maxTags);
};

/**
 * Formats an array of tags into a comma-separated display string.
 *
 * @param tags - Array of tag strings
 * @returns Comma-separated string suitable for display
 *
 * @example
 * ```typescript
 * formatTagsDisplay(['adventure', 'cute', 'funny']); // 'adventure, cute, funny'
 * formatTagsDisplay([]); // ''
 * formatTagsDisplay(['single']); // 'single'
 * ```
 */
export const formatTagsDisplay = (tags: string[]): string => tags.join(', ');

/**
 * Normalizes a tags input string by parsing and reformatting it.
 * Useful for cleaning up user input (trimming whitespace, removing empty tags).
 * Limits to 5 tags by default.
 *
 * @param tagsString - Raw tags input string
 * @returns Normalized comma-separated tags string
 *
 * @example
 * ```typescript
 * normalizeTagsInput('  tag1  ,  ,  tag2  ,  tag3  '); // 'tag1, tag2, tag3'
 * normalizeTagsInput('tag1,,,,tag2'); // 'tag1, tag2'
 * normalizeTagsInput('   '); // ''
 * ```
 */
export const normalizeTagsInput = (tagsString: string): string => {
  const tags = parseTags(tagsString, DEFAULT_MAX_TAGS);
  return formatTagsDisplay(tags);
};

/**
 * Builds a CreatePostRequest object from form data.
 * Handles data transformation and normalization:
 * - Trims caption whitespace, excludes if empty
 * - Parses and limits tags, excludes if empty
 * - Includes isPublic flag
 *
 * @param formData - The form data object
 * @param fileType - The image file MIME type
 * @returns CreatePostRequest object ready for API submission
 *
 * @example
 * ```typescript
 * const formData = {
 *   caption: 'My pet adventure',
 *   tags: 'adventure, cute, funny',
 *   isPublic: true
 * };
 * const request = buildCreatePostRequest(formData, 'image/jpeg');
 * // {
 * //   fileType: 'image/jpeg',
 * //   caption: 'My pet adventure',
 * //   tags: ['adventure', 'cute', 'funny'],
 * //   isPublic: true
 * // }
 * ```
 */
export const buildCreatePostRequest = (
  formData: PostFormData,
  fileType: string
): CreatePostRequest => {
  // Trim caption and exclude if empty
  const trimmedCaption = formData.caption.trim();
  const caption = trimmedCaption.length > 0 ? trimmedCaption : undefined;

  // Parse tags and exclude if empty
  const parsedTags = parseTags(formData.tags, DEFAULT_MAX_TAGS);
  const tags = parsedTags.length > 0 ? parsedTags : undefined;

  return {
    fileType: fileType as any, // Type assertion needed for MIME type string
    caption,
    tags,
    isPublic: formData.isPublic,
  };
};
