'use client';

import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createPost } from '@/app/actions/posts';
import { generateThumbnail } from '@/lib/utils/image';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

interface CreatePostFormProps {
  onSuccess?: () => void;
}

export function CreatePostForm({ onSuccess }: CreatePostFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please select a valid image file (JPG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('Image must be less than 10MB');
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setError('Please select an image');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Generate thumbnail before uploading
      console.log('[CreatePostForm] Generating thumbnail...');
      const thumbnailBlob = await generateThumbnail(selectedFile);

      console.log('[CreatePostForm] Calling createPost action...');
      const result = await createPost(selectedFile, thumbnailBlob, caption || undefined);

      if (!result.success) {
        setError(result.error || 'Failed to create post');
        setIsSubmitting(false);
        return;
      }

      console.log('[CreatePostForm] Post created successfully:', result.postId);

      // Success! Reset form and redirect
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption('');

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/explore');
      }
    } catch (err) {
      console.error('[CreatePostForm] Error creating post:', err);
      setError(err instanceof Error ? err.message : 'Failed to create post');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="create-post-form">
      {/* Image Upload */}
      <div className="form-section">
        <label htmlFor="image-upload" className="form-label">
          Image *
        </label>

        {!previewUrl ? (
          <div className="image-upload-area">
            <input
              ref={fileInputRef}
              type="file"
              id="image-upload"
              accept={ALLOWED_TYPES.join(',')}
              onChange={handleFileSelect}
              disabled={isSubmitting}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              className="upload-button"
            >
              <span className="material-icons">add_photo_alternate</span>
              <span>Select Image</span>
            </button>
            <p className="upload-hint">
              JPG, PNG, GIF, or WebP (max 10MB)
            </p>
          </div>
        ) : (
          <div className="image-preview-container">
            <img src={previewUrl} alt="Preview" className="image-preview" />
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={isSubmitting}
              className="remove-image-button"
              aria-label="Remove image"
            >
              <span className="material-icons">close</span>
            </button>
          </div>
        )}
      </div>

      {/* Caption */}
      <div className="form-section">
        <label htmlFor="caption" className="form-label">
          Caption (optional)
        </label>
        <textarea
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption..."
          maxLength={500}
          rows={4}
          disabled={isSubmitting}
          className="caption-input"
        />
        <p className="character-count">
          {caption.length} / 500
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message" role="alert">
          <span className="material-icons">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <div className="form-actions">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="button-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!selectedFile || isSubmitting}
          className="button-primary"
        >
          {isSubmitting ? (
            <>
              <span className="spinner"></span>
              <span>Posting...</span>
            </>
          ) : (
            <>
              <span className="material-icons">send</span>
              <span>Post</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
