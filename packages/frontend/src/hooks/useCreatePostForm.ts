import { useState, useCallback } from 'react';
import { validateCaptionLength, validateTags, parseTags } from '../utils';

export interface UseCreatePostFormReturn {
  caption: string;
  tags: string;
  captionError: string | null;
  tagsError: string | null;
  setCaption: (value: string) => void;
  setTags: (value: string) => void;
  validateForm: () => boolean;
  resetForm: () => void;
  getFormData: () => {
    caption: string;
    tags: string[];
  };
}

/**
 * Custom hook for managing create post form state and validation
 * Handles caption and tags input, validation, and form submission preparation
 */
export function useCreatePostForm(): UseCreatePostFormReturn {
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [captionError, setCaptionError] = useState<string | null>(null);
  const [tagsError, setTagsError] = useState<string | null>(null);

  /**
   * Update caption and validate
   */
  const handleSetCaption = useCallback((value: string) => {
    setCaption(value);

    const validation = validateCaptionLength(value);
    if (!validation.isValid) {
      setCaptionError(validation.error || null);
    } else {
      setCaptionError(null);
    }
  }, []);

  /**
   * Update tags and validate
   */
  const handleSetTags = useCallback((value: string) => {
    setTags(value);

    const parsedTags = parseTags(value);
    const validation = validateTags(parsedTags);

    if (!validation.isValid) {
      setTagsError(validation.error || null);
    } else {
      setTagsError(null);
    }
  }, []);

  /**
   * Validate entire form
   * Returns true if form is valid
   */
  const validateForm = useCallback((): boolean => {
    let isValid = true;

    // Validate caption
    const captionValidation = validateCaptionLength(caption);
    if (!captionValidation.isValid) {
      setCaptionError(captionValidation.error || 'Invalid caption');
      isValid = false;
    }

    // Validate tags
    const parsedTags = parseTags(tags);
    const tagsValidation = validateTags(parsedTags);
    if (!tagsValidation.isValid) {
      setTagsError(tagsValidation.error || 'Invalid tags');
      isValid = false;
    }

    return isValid;
  }, [caption, tags]);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setCaption('');
    setTags('');
    setCaptionError(null);
    setTagsError(null);
  }, []);

  /**
   * Get form data ready for submission
   */
  const getFormData = useCallback(() => ({
      caption: caption.trim(),
      tags: parseTags(tags),
    }), [caption, tags]);

  return {
    caption,
    tags,
    captionError,
    tagsError,
    setCaption: handleSetCaption,
    setTags: handleSetTags,
    validateForm,
    resetForm,
    getFormData,
  };
}
