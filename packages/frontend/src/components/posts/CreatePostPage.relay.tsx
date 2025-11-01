import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, graphql } from 'react-relay';
import type { CreatePostPageRelayMutation } from './__generated__/CreatePostPageRelayMutation.graphql';
import { MaterialIcon } from '../common/MaterialIcon';
import { useImagePreview } from '../../hooks/useImagePreview';
import { useCreatePostForm } from '../../hooks/useCreatePostForm';
import './CreatePostPage.css';

export const CreatePostPageRelay: React.FC = () => {
  const navigate = useNavigate();

  const {
    selectedFile,
    previewUrl,
    error: imageError,
    fileInputRef,
    handleFileSelect,
    clearImage,
  } = useImagePreview();

  const {
    caption,
    tags,
    captionError,
    tagsError,
    setCaption,
    setTags,
    validateForm,
    resetForm,
  } = useCreatePostForm();

  const [actionError, setActionError] = useState<string | null>(null);

  const [commitCreatePost, isSubmitting] = useMutation<CreatePostPageRelayMutation>(
    graphql`
      mutation CreatePostPageRelayMutation($input: CreatePostInput!) {
        createPost(input: $input) {
          post {
            id
            imageUrl
            caption
            createdAt
            author {
              id
              handle
              username
            }
          }
          uploadUrl
          thumbnailUploadUrl
        }
      }
    `
  );

  const uploadImageToS3 = async (uploadUrl: string, file: File): Promise<void> => {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setActionError('Please fix validation errors');
      return;
    }

    if (!selectedFile) {
      setActionError('Please select an image');
      return;
    }

    setActionError(null);

    commitCreatePost({
      variables: {
        input: {
          fileType: selectedFile.type,
          caption: caption.trim() || null,
        },
      },
      onCompleted: async (response) => {
        try {
          if (!response.createPost) {
            throw new Error('Failed to create post');
          }

          await uploadImageToS3(response.createPost.uploadUrl, selectedFile);

          resetForm();
          clearImage();

          navigate(`/post/${response.createPost.post.id}`);
        } catch (error) {
          console.error('Error uploading image:', error);
          setActionError('Failed to upload image. Please try again.');
        }
      },
      onError: (error) => {
        console.error('Failed to create post:', error);
        setActionError(error.message || 'Failed to create post');
      },
    });
  }, [validateForm, selectedFile, caption, commitCreatePost, resetForm, clearImage, navigate]);

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

        {actionError && (
          <div className="error-banner" role="alert">
            <MaterialIcon name="error" />
            <span>{actionError}</span>
          </div>
        )}

        <form
          className="create-post-form retro-card"
          data-testid="create-post-form"
          onSubmit={handleSubmit}
          role="form"
          aria-label="Create post"
        >
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
