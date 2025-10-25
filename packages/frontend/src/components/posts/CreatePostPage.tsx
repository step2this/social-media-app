import React, { useEffect } from 'react';
import { useActionState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MaterialIcon } from '../common/MaterialIcon';
import { useImagePreview } from '../../hooks/useImagePreview';
import { useCreatePostForm } from '../../hooks/useCreatePostForm';
import { createPostAction, type CreatePostActionState } from './createPostAction';
import './CreatePostPage.css';

// Initial action state
const initialActionState: CreatePostActionState = {
  success: false,
  error: null,
};

export const CreatePostPage: React.FC = () => {
  const navigate = useNavigate();

  // Image preview hook
  const {
    selectedFile,
    previewUrl,
    error: imageError,
    fileInputRef,
    handleFileSelect,
    clearImage,
  } = useImagePreview();

  // Form state and validation hook
  const {
    caption,
    tags,
    captionError,
    tagsError,
    setCaption,
    setTags,
    validateForm,
    resetForm,
    getFormData,
  } = useCreatePostForm();

  // Form action state with useActionState
  const [actionState, formAction, isSubmitting] = useActionState(
    async (prevState: CreatePostActionState) => {
      // Client-side validation
      if (!validateForm()) {
        return {
          success: false,
          error: 'Please fix validation errors',
        };
      }

      if (!selectedFile) {
        return {
          success: false,
          error: 'Please select an image',
        };
      }

      // Get form data and submit
      const formData = getFormData();
      return createPostAction(prevState, {
        ...formData,
        imageFile: selectedFile,
      });
    },
    initialActionState
  );

  // Handle successful post creation
  useEffect(() => {
    if (actionState.success && actionState.postId) {
      // Reset form
      resetForm();
      clearImage();

      // Navigate to new post
      navigate(`/post/${actionState.postId}`);
    }
  }, [actionState.success, actionState.postId, navigate, resetForm, clearImage]);

  /**
   * Handle form submission
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    flushSync(() => {
      // Trigger form action
      formAction();
    });
  };

  return (
    <div className="create-post-page">
      <div className="create-post-container">
        <header className="create-post-header">
          <button
            onClick={() => navigate(-1)}
            className="retro-button secondary"
            aria-label="Go back"
          >
            <MaterialIcon name="arrow_back" />
          </button>
          <h1>Create New Post</h1>
        </header>

        {/* Display action errors */}
        {actionState.error && (
          <div className="error-banner" role="alert">
            <MaterialIcon name="error" />
            <span>{actionState.error}</span>
          </div>
        )}

        <form
          className="create-post-form retro-card"
          data-testid="create-post-form"
          onSubmit={handleSubmit}
          role="form"
          aria-label="Create post"
        >
          {/* Image Upload Section */}
          <div className="form-section">
            <label htmlFor="image-upload" className="form-label required">
              Image
            </label>

            {!previewUrl ? (
              <div className="image-upload-area">
                <input
                  ref={fileInputRef}
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="image-input"
                  aria-label="Upload image"
                  aria-describedby="image-upload-hint"
                  required
                />
                <label htmlFor="image-upload" className="image-upload-button">
                  <MaterialIcon name="add_photo_alternate" size="lg" />
                  <span>Click to upload image</span>
                  <span className="upload-hint" id="image-upload-hint">
                    Supports JPG, PNG, GIF (Max 5MB)
                  </span>
                </label>
              </div>
            ) : (
              <div className="image-preview-container">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="image-preview"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="remove-image-button"
                  aria-label="Remove image"
                >
                  <MaterialIcon name="close" />
                </button>
              </div>
            )}

            {imageError && (
              <div className="field-error" role="alert">
                {imageError}
              </div>
            )}
          </div>

          {/* Caption Section */}
          <div className="form-section">
            <label htmlFor="caption" className="form-label">
              Caption
              <span className="char-count">
                {caption.length}/2200
              </span>
            </label>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              className="caption-textarea"
              rows={4}
              maxLength={2200}
              aria-label="Post caption"
              aria-describedby={captionError ? 'caption-error' : undefined}
            />
            {captionError && (
              <div
                id="caption-error"
                className="field-error"
                role="alert"
              >
                {captionError}
              </div>
            )}
          </div>

          {/* Tags Section */}
          <div className="form-section">
            <label htmlFor="tags" className="form-label">
              Tags
              <span className="tags-hint">(comma-separated)</span>
            </label>
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="nature, photography, sunset"
              className="tags-input"
              aria-label="Post tags"
              aria-describedby={tagsError ? 'tags-error' : undefined}
            />
            {tagsError && (
              <div
                id="tags-error"
                className="field-error"
                role="alert"
              >
                {tagsError}
              </div>
            )}
            <div className="tags-hint-text">
              Add up to 10 tags to help others discover your post
            </div>
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="retro-button secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="retro-button primary"
              disabled={isSubmitting || !selectedFile}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" />
                  Creating...
                </>
              ) : (
                <>
                  <MaterialIcon name="publish" />
                  Create Post
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
