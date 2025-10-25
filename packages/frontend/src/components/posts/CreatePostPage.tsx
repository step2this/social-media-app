import React, { useState, useRef, useCallback } from 'react';
import { useActionState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { CreatePostRequestSchema, type CreatePostRequest } from '@social-media-app/shared';
import { PostServiceGraphQL } from '../../services/implementations/PostService.graphql.js';
import { createGraphQLClient } from '../../graphql/client.js';
import { unwrap } from '../../graphql/types';
import {
  validateCaptionLength,
  validateTags,
  validateImageFile,
  createImagePreview,
  revokeImagePreview,
  parseTags,
  formatTagsDisplay,
  buildCreatePostRequest,
} from '../../utils/index.js';
import './CreatePostPage.css';

interface FormData {
  caption: string;
  tags: string;
  isPublic: boolean;
}

interface FormErrors {
  image?: string;
  caption?: string;
  tags?: string;
  general?: string;
}

interface CreatePostActionState {
  success?: boolean;
  error?: string;
}

const postService = new PostServiceGraphQL(createGraphQLClient());

const initialActionState: CreatePostActionState = {};

export const CreatePostPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    caption: '',
    tags: '',
    isPublic: true,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<FormErrors>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation function (defined early for use in action)
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Validate image
    if (!selectedFile) {
      newErrors.image = 'Image is required';
    }

    // Validate caption
    const captionValidation = validateCaptionLength(formData.caption);
    if (!captionValidation.isValid) {
      newErrors.caption = captionValidation.error;
    }

    // Validate tags
    const tagsValidation = validateTags(formData.tags);
    if (!tagsValidation.isValid) {
      newErrors.tags = tagsValidation.error;
    }

    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [selectedFile, formData]);

  // Action function for form submission
  const createPostAction = useCallback(async (
    prevState: CreatePostActionState,
    _formData: FormData
  ): Promise<CreatePostActionState> => {
    // Validation using existing function
    if (!validateForm() || !selectedFile) {
      setIsSubmitting(false);
      return { success: false, error: 'Please fix validation errors' };
    }

    try {
      // Build request using utility function
      const requestData = buildCreatePostRequest(formData, selectedFile.type);

      // Validate with schema
      const validatedData = CreatePostRequestSchema.parse(requestData);

      // Create post - returns CreatePostPayload with upload URLs
      const createPayload = unwrap(await postService.createPost(validatedData));

      // Upload image to S3 using the pre-signed URL
      if (selectedFile) {
        await fetch(createPayload.uploadUrl, {
          method: 'PUT',
          body: selectedFile,
          headers: {
            'Content-Type': selectedFile.type,
          },
        });
      }

      // Navigate to the new post detail page on success
      navigate(`/post/${createPayload.post.id}`);
      setIsSubmitting(false);
      return { success: true };
    } catch (error) {
      console.error('Error creating post:', error);

      setIsSubmitting(false);

      if (error instanceof z.ZodError) {
        return { success: false, error: 'Invalid request data' };
      } else if (error instanceof Error) {
        if (error.message.includes('Network')) {
          return { success: false, error: 'Network error. Please try again.' };
        }
        return { success: false, error: 'Failed to create post. Please try again.' };
      }
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [validateForm, selectedFile, formData, navigate]);

  const [actionState, formAction, isPending] = useActionState(createPostAction, initialActionState);

  // Handle form input changes
  const handleInputChange = useCallback(
    (field: keyof FormData, value: string | boolean) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear related errors
      if (validationErrors[field as keyof FormErrors]) {
        setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
      }

      // Live validation for caption length
      if (field === 'caption' && typeof value === 'string') {
        const validation = validateCaptionLength(value);
        if (!validation.isValid) {
          setValidationErrors((prev) => ({ ...prev, caption: validation.error }));
        }
      }

      // Live validation for tags
      if (field === 'tags' && typeof value === 'string') {
        const validation = validateTags(value);
        if (!validation.isValid) {
          setValidationErrors((prev) => ({ ...prev, tags: validation.error }));
        } else {
          setValidationErrors((prev) => ({ ...prev, tags: undefined }));
        }
      }
    },
    [validationErrors]
  );

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    // Validate file using utility function
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setValidationErrors((prev) => ({ ...prev, image: validation.error }));
      return;
    }

    setSelectedFile(file);
    setValidationErrors((prev) => ({ ...prev, image: undefined }));

    // Create preview URL using utility function
    const url = createImagePreview(file);
    setPreviewUrl(url);

    return () => {
      revokeImagePreview(url);
    };
  }, []);

  // Handle file input change
  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Handle drag and drop
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragOver(false);

      const file = event.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Remove selected image
  const handleRemoveImage = useCallback(() => {
    if (previewUrl) {
      revokeImagePreview(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewUrl]);

  // Handle tags normalization on blur
  const handleTagsBlur = useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      // Normalize tags on blur for better UX
      const tags = parseTags(event.target.value);
      const normalizedTags = formatTagsDisplay(tags);
      if (normalizedTags !== event.target.value) {
        handleInputChange('tags', normalizedTags);
      }
    },
    [handleInputChange]
  );

  return (
    <main className="create-post-page" data-testid="create-post-page">
      <div className="create-post-container">
        <header className="create-post-header">
          <h1 className="page-title">Create Post</h1>
          <p className="page-subtitle">Share your pet's adventures with the world</p>
        </header>

        <form
          className="create-post-form retro-card"
          data-testid="create-post-form"
          onSubmit={(e) => {
            e.preventDefault();
            flushSync(() => {
              setIsSubmitting(true);
            });
            formAction(formData);
          }}
          role="form"
          aria-label="Create post"
        >
          {/* Image Upload */}
          <div className="form-group">
            <label htmlFor="image-upload" className="form-label">
              Upload Image *
            </label>

            <div
              className={`image-upload-zone ${isDragOver ? 'drop-zone--active' : ''}`}
              data-testid="image-upload-zone"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {previewUrl ? (
                <div className="image-preview-container">
                  <img
                    src={previewUrl}
                    alt="Post preview"
                    className="image-preview"
                    data-testid="image-preview"
                  />
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={handleRemoveImage}
                    aria-label="Remove image"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <div className="upload-icon">📷</div>
                  <div className="upload-text">
                    <p>Click to upload or drag and drop</p>
                    <p className="upload-hint">PNG, JPG up to 10MB</p>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="file-input"
                aria-label="Upload image"
              />
            </div>

            {validationErrors.image && (
              <div className="error-message" role="alert" aria-live="polite">
                {validationErrors.image}
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="form-group">
            <label htmlFor="caption" className="form-label">
              Caption
            </label>
            <textarea
              id="caption"
              className="form-textarea"
              placeholder="Tell your story..."
              value={formData.caption}
              onChange={(e) => handleInputChange('caption', e.target.value)}
              rows={4}
              aria-label="Post caption"
            />
            <div className="character-count">{formData.caption.length} / 500</div>
            {validationErrors.caption && (
              <div className="error-message" role="alert" aria-live="polite">
                {validationErrors.caption}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="form-group">
            <label htmlFor="tags" className="form-label">
              Tags
            </label>
            <input
              id="tags"
              type="text"
              className="form-input"
              placeholder="adventure, cute, funny (max 5)"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              onBlur={handleTagsBlur}
              aria-label="Post tags"
            />
            <div className="form-hint">
              Separate tags with commas. Do not include # symbol.
            </div>
            {validationErrors.tags && (
              <div className="error-message" role="alert" aria-live="polite">
                {validationErrors.tags}
              </div>
            )}
          </div>

          {/* Privacy */}
          <div className="form-group">
            <div className="privacy-toggle">
              <input
                id="privacy"
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                className="privacy-checkbox"
                aria-label="Privacy setting"
              />
              <label htmlFor="privacy" className="privacy-label">
                <span className="toggle-switch"></span>
                <span className="privacy-text">
                  {formData.isPublic ? 'Public' : 'Private'}
                </span>
              </label>
            </div>
            <div className="form-hint">
              {formData.isPublic
                ? 'Everyone can see this post'
                : 'Only you can see this post'}
            </div>
          </div>

          {/* General errors */}
          {(validationErrors.general || actionState.error) && (
            <div
              className="error-message error-message--general"
              role="alert"
              aria-live="polite"
            >
              {validationErrors.general || actionState.error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            className="tama-btn tama-btn--automotive tama-btn--racing-red submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Post...' : 'Create Post'}
          </button>
        </form>
      </div>
    </main>
  );
};
