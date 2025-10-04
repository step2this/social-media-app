import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { CreatePostRequestSchema, type CreatePostRequest, ImageFileTypeField } from '@social-media-app/shared';
// import { useAuthStore } from '../../stores/authStore.js';
import { postService } from '../../services/postService.js';
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

export const CreatePostPage: React.FC = () => {
  const navigate = useNavigate();
  // const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    caption: '',
    tags: '',
    isPublic: true
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isDragOver, setIsDragOver] = useState(false);

  // Parse tags for validation (without limiting)
  const parseTagsForValidation = useCallback((tagsString: string): string[] => {
    if (!tagsString.trim()) return [];

    return tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }, []);

  // Parse and normalize tags for final submission
  const parseTags = useCallback((tagsString: string): string[] => {
    if (!tagsString.trim()) return [];

    return tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .slice(0, 5); // Limit to 5 tags
  }, []);

  // Handle form input changes
  const handleInputChange = useCallback((field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear related errors
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Live validation for caption length
    if (field === 'caption' && typeof value === 'string') {
      if (value.length > 500) {
        setErrors(prev => ({ ...prev, caption: 'Caption must be 500 characters or less' }));
      }
    }

    // Live validation for tags
    if (field === 'tags' && typeof value === 'string') {
      const tags = parseTagsForValidation(value);

      if (tags.some(tag => tag.includes('#'))) {
        setErrors(prev => ({ ...prev, tags: 'Tags should not include # symbol' }));
      } else if (tags.length > 5) {
        setErrors(prev => ({ ...prev, tags: 'Maximum 5 tags allowed' }));
      } else {
        setErrors(prev => ({ ...prev, tags: undefined }));
      }
    }
  }, [errors, parseTagsForValidation]);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    // Validate file type using shared schema
    const fileTypeValidation = ImageFileTypeField.safeParse(file.type);
    if (!fileTypeValidation.success) {
      setErrors(prev => ({ ...prev, image: 'Please select a valid image file (JPEG, PNG, GIF, or WebP)' }));
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, image: 'Image size must be less than 10MB' }));
      return;
    }

    setSelectedFile(file);
    setErrors(prev => ({ ...prev, image: undefined }));

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, []);

  // Handle file input change
  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Handle drag and drop
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Remove selected image
  const handleRemoveImage = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewUrl]);


  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Validate image
    if (!selectedFile) {
      newErrors.image = 'Image is required';
    }

    // Validate caption
    if (formData.caption.length > 500) {
      newErrors.caption = 'Caption must be 500 characters or less';
    }

    // Validate tags
    const tags = parseTagsForValidation(formData.tags);
    if (tags.some(tag => tag.includes('#'))) {
      newErrors.tags = 'Tags should not include # symbol';
    } else if (tags.length > 5) {
      newErrors.tags = 'Maximum 5 tags allowed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [selectedFile, formData, parseTagsForValidation]);

  // Handle form submission
  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm() || !selectedFile) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Validate file type again (defensive programming)
      const fileTypeValidation = ImageFileTypeField.safeParse(selectedFile.type);
      if (!fileTypeValidation.success) {
        setErrors({ general: 'Invalid file type selected' });
        return;
      }

      // Prepare request data
      const tags = parseTags(formData.tags);
      const requestData: CreatePostRequest = {
        fileType: fileTypeValidation.data, // Type-safe after validation
        caption: formData.caption.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        isPublic: formData.isPublic
      };

      // Validate with schema
      const validatedData = CreatePostRequestSchema.parse(requestData);

      // Create post
      const createdPost = await postService.createPost(validatedData, selectedFile);

      // Navigate to the new post detail page on success
      navigate(`/post/${createdPost.id}`);
    } catch (error) {
      console.error('Error creating post:', error);

      if (error instanceof z.ZodError) {
        setErrors({ general: 'Invalid request data' });
      } else if (error instanceof Error) {
        if (error.message.includes('Network')) {
          setErrors({ general: 'Network error. Please try again.' });
        } else {
          setErrors({ general: 'Failed to create post. Please try again.' });
        }
      } else {
        setErrors({ general: 'An unexpected error occurred' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [validateForm, selectedFile, formData, parseTags, navigate]);

  // Format tags display
  const formatTagsDisplay = useCallback((tagsString: string): string => {
    const tags = parseTags(tagsString);
    return tags.join(', ');
  }, [parseTags]);

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
          onSubmit={handleSubmit}
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

            {errors.image && (
              <div className="error-message" role="alert" aria-live="polite">
                {errors.image}
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
            <div className="character-count">
              {formData.caption.length} / 500
            </div>
            {errors.caption && (
              <div className="error-message" role="alert" aria-live="polite">
                {errors.caption}
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
              onBlur={(e) => {
                // Normalize tags on blur for better UX
                const normalizedTags = formatTagsDisplay(e.target.value);
                if (normalizedTags !== e.target.value) {
                  handleInputChange('tags', normalizedTags);
                }
              }}
              aria-label="Post tags"
            />
            <div className="form-hint">
              Separate tags with commas. Do not include # symbol.
            </div>
            {errors.tags && (
              <div className="error-message" role="alert" aria-live="polite">
                {errors.tags}
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
                : 'Only you can see this post'
              }
            </div>
          </div>

          {/* General errors */}
          {errors.general && (
            <div className="error-message error-message--general" role="alert" aria-live="polite">
              {errors.general}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            className="tama-btn tama-btn--automotive tama-btn--racing-red submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Post...' : 'Create Post'}
          </button>
        </form>
      </div>
    </main>
  );
};