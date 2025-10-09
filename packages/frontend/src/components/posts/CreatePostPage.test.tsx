import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { CreatePostPage } from './CreatePostPage.js';
import { useAuthStore } from '../../stores/authStore.js';
import * as postService from '../../services/postService.js';
import type { Post } from '@social-media-app/shared';

// Mock the postService
vi.mock('../../services/postService.js', () => ({
  postService: {
    createPost: vi.fn(),
    uploadPostImage: vi.fn()
  }
}));

// Mock the auth store
vi.mock('../../stores/authStore.js', () => ({
  useAuthStore: vi.fn()
}));

// Mock react-router-dom for navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock URL.createObjectURL for file preview
Object.defineProperty(global, 'URL', {
  writable: true,
  value: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn()
  }
});

const renderCreatePostPage = () => {
  return render(
    <BrowserRouter>
      <CreatePostPage />
    </BrowserRouter>
  );
};

describe('CreatePostPage', () => {
  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    handle: 'testuser',
    email: 'test@example.com'
  };

  beforeEach(() => {
    // Setup auth store mock
    vi.mocked(useAuthStore).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false
    });

    // Clear all mocks
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render create post form with all required fields', () => {
      renderCreatePostPage();

      expect(screen.getByRole('heading', { name: 'Create Post' })).toBeInTheDocument();
      expect(screen.getByText('Share your pet\'s adventures with the world')).toBeInTheDocument();

      // Form fields
      expect(screen.getByLabelText(/upload image/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/caption/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/privacy/i)).toBeInTheDocument();

      // Submit button
      expect(screen.getByRole('button', { name: /create post/i })).toBeInTheDocument();
    });

    it('should render with retro automotive theme styling', () => {
      renderCreatePostPage();

      const container = screen.getByTestId('create-post-page');
      expect(container).toHaveClass('create-post-page');

      const form = screen.getByTestId('create-post-form');
      expect(form).toHaveClass('retro-card');

      const submitButton = screen.getByRole('button', { name: /create post/i });
      expect(submitButton).toHaveClass('tama-btn', 'tama-btn--automotive', 'tama-btn--racing-red');
    });

    it('should show empty form initially', () => {
      renderCreatePostPage();

      const captionInput = screen.getByLabelText(/caption/i) as HTMLTextAreaElement;
      const tagsInput = screen.getByLabelText(/tags/i) as HTMLInputElement;
      const privacyToggle = screen.getByLabelText(/privacy/i) as HTMLInputElement;

      expect(captionInput.value).toBe('');
      expect(tagsInput.value).toBe('');
      expect(privacyToggle.checked).toBe(true); // Default to public
    });
  });

  describe('Form Validation', () => {
    it('should require image upload', async () => {
      const user = userEvent.setup();
      renderCreatePostPage();

      const submitButton = screen.getByRole('button', { name: /create post/i });
      await user.click(submitButton);

      expect(screen.getByText(/image is required/i)).toBeInTheDocument();
      expect(postService.postService.createPost).not.toHaveBeenCalled();
    });

    it('should validate caption length (max 500 characters)', async () => {
      const user = userEvent.setup();
      renderCreatePostPage();

      const captionInput = screen.getByLabelText(/caption/i);
      const longCaption = 'a'.repeat(501);

      await user.type(captionInput, longCaption);

      expect(screen.getByText(/caption must be 500 characters or less/i)).toBeInTheDocument();
    });

    it('should validate tags format', async () => {
      const user = userEvent.setup();
      renderCreatePostPage();

      const tagsInput = screen.getByLabelText(/tags/i);

      // Test invalid tags (with #)
      await user.type(tagsInput, '#invalidtag, #anothertag');

      expect(screen.getByText(/tags should not include # symbol/i)).toBeInTheDocument();
    });

    it('should limit number of tags to 5', async () => {
      const user = userEvent.setup();
      renderCreatePostPage();

      const tagsInput = screen.getByLabelText(/tags/i);
      const manyTags = 'tag1, tag2, tag3, tag4, tag5, tag6';

      await user.type(tagsInput, manyTags);

      expect(screen.getByText(/maximum 5 tags allowed/i)).toBeInTheDocument();
    });

    it('should validate image file type', async () => {
      renderCreatePostPage();

      const fileInput = screen.getByLabelText(/upload image/i);
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });

      // Simulate file selection using fireEvent
      fireEvent.change(fileInput, {
        target: { files: [invalidFile] }
      });

      await waitFor(() => {
        expect(screen.getByText(/Please select a valid image file/)).toBeInTheDocument();
      });
    });

    it('should validate image file size (max 10MB)', async () => {
      const user = userEvent.setup();
      renderCreatePostPage();

      const fileInput = screen.getByLabelText(/upload image/i);
      // Create a mock file that's too large
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, largeFile);

      expect(screen.getByText(/image size must be less than 10MB/i)).toBeInTheDocument();
    });
  });

  describe('Image Upload and Preview', () => {
    it('should show image preview after valid file selection', async () => {
      const user = userEvent.setup();
      renderCreatePostPage();

      const fileInput = screen.getByLabelText(/upload image/i);
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, validFile);

      const preview = screen.getByTestId('image-preview');
      expect(preview).toBeInTheDocument();
      expect(preview).toHaveAttribute('src', 'blob:mock-url');
      expect(preview).toHaveAttribute('alt', 'Post preview');
    });

    it('should allow removing uploaded image', async () => {
      const user = userEvent.setup();
      renderCreatePostPage();

      const fileInput = screen.getByLabelText(/upload image/i);
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, validFile);

      expect(screen.getByTestId('image-preview')).toBeInTheDocument();

      const removeButton = screen.getByRole('button', { name: /remove image/i });
      await user.click(removeButton);

      expect(screen.queryByTestId('image-preview')).not.toBeInTheDocument();
    });

    it('should support drag and drop image upload', async () => {
      renderCreatePostPage();

      const dropZone = screen.getByTestId('image-upload-zone');
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.dragOver(dropZone);
      expect(dropZone).toHaveClass('drop-zone--active');

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [validFile]
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('image-preview')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
    const mockPost: Post = {
      id: 'post-123',
      userId: 'user-123',
      userHandle: 'testuser',
      imageUrl: 'https://cdn.example.com/image.jpg',
      thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      caption: 'Test caption',
      tags: ['test', 'post'],
      likesCount: 0,
      commentsCount: 0,
      isPublic: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    };

    it('should successfully create post with valid data', async () => {
      const user = userEvent.setup();
      vi.mocked(postService.postService.createPost).mockResolvedValue(mockPost);

      renderCreatePostPage();

      // Upload image
      const fileInput = screen.getByLabelText(/upload image/i);
      await user.upload(fileInput, validFile);

      // Fill form
      await user.type(screen.getByLabelText(/caption/i), 'Test caption');
      await user.type(screen.getByLabelText(/tags/i), 'test, post');

      // Submit
      const submitButton = screen.getByRole('button', { name: /create post/i });
      await user.click(submitButton);

      expect(postService.postService.createPost).toHaveBeenCalledWith(
        expect.objectContaining({
          caption: 'Test caption',
          tags: ['test', 'post'],
          isPublic: true
        }),
        validFile
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/post/post-123');
      });
    });

    it('should create post with minimal data (image only)', async () => {
      const user = userEvent.setup();
      vi.mocked(postService.postService.createPost).mockResolvedValue(mockPost);

      renderCreatePostPage();

      // Upload image only
      const fileInput = screen.getByLabelText(/upload image/i);
      await user.upload(fileInput, validFile);

      // Submit without caption or tags
      const submitButton = screen.getByRole('button', { name: /create post/i });
      await user.click(submitButton);

      expect(postService.postService.createPost).toHaveBeenCalledWith(
        expect.objectContaining({
          caption: undefined,
          tags: undefined,
          isPublic: true
        }),
        validFile
      );
    });

    it('should handle privacy toggle correctly', async () => {
      const user = userEvent.setup();
      vi.mocked(postService.postService.createPost).mockResolvedValue(mockPost);

      renderCreatePostPage();

      // Upload image
      const fileInput = screen.getByLabelText(/upload image/i);
      await user.upload(fileInput, validFile);

      // Toggle privacy to private
      const privacyToggle = screen.getByLabelText(/privacy/i);
      await user.click(privacyToggle);

      // Submit
      const submitButton = screen.getByRole('button', { name: /create post/i });
      await user.click(submitButton);

      expect(postService.postService.createPost).toHaveBeenCalledWith(
        expect.objectContaining({
          isPublic: false
        }),
        validFile
      );
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      // Mock a delayed response
      vi.mocked(postService.postService.createPost).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockPost), 100))
      );

      renderCreatePostPage();

      // Upload image
      const fileInput = screen.getByLabelText(/upload image/i);
      await user.upload(fileInput, validFile);

      // Submit
      const submitButton = screen.getByRole('button', { name: /create post/i });
      await user.click(submitButton);

      // Check loading state
      expect(screen.getByText(/creating post/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/post/post-123');
      });
    });

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to create post';
      vi.mocked(postService.postService.createPost).mockRejectedValue(new Error(errorMessage));

      renderCreatePostPage();

      // Upload image
      const fileInput = screen.getByLabelText(/upload image/i);
      await user.upload(fileInput, validFile);

      // Submit
      const submitButton = screen.getByRole('button', { name: /create post/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to create post/i)).toBeInTheDocument();
      });

      // Form should be re-enabled
      expect(submitButton).not.toBeDisabled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should handle network errors with appropriate message', async () => {
      const user = userEvent.setup();
      vi.mocked(postService.postService.createPost).mockRejectedValue(new Error('Network error'));

      renderCreatePostPage();

      // Upload image and submit
      const fileInput = screen.getByLabelText(/upload image/i);
      await user.upload(fileInput, validFile);

      const submitButton = screen.getByRole('button', { name: /create post/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/network error.*please try again/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      renderCreatePostPage();

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('form')).toHaveAccessibleName(/create post/i);
      expect(screen.getByLabelText(/upload image/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/caption/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/privacy/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderCreatePostPage();

      const fileInput = screen.getByLabelText(/upload image/i);
      const captionInput = screen.getByLabelText(/caption/i);
      const tagsInput = screen.getByLabelText(/tags/i);
      const submitButton = screen.getByRole('button', { name: /create post/i });

      // Tab through form elements
      await user.tab();
      expect(fileInput).toHaveFocus();

      await user.tab();
      expect(captionInput).toHaveFocus();

      await user.tab();
      expect(tagsInput).toHaveFocus();

      await user.tab();
      await user.tab(); // Skip privacy toggle
      expect(submitButton).toHaveFocus();
    });

    it('should announce validation errors to screen readers', async () => {
      const user = userEvent.setup();
      renderCreatePostPage();

      const submitButton = screen.getByRole('button', { name: /create post/i });
      await user.click(submitButton);

      const errorMessage = screen.getByText(/image is required/i);
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('User Experience', () => {
    it('should parse and format tags correctly', async () => {
      const user = userEvent.setup();
      renderCreatePostPage();

      const tagsInput = screen.getByLabelText(/tags/i);

      // Type tags with various formats
      await user.type(tagsInput, '  tag1 , tag2,tag3   , tag4 ');

      // Trigger blur to normalize tags
      await user.tab();

      // Should normalize tags (trim spaces, split properly)
      const normalizedTags = screen.getByDisplayValue('tag1, tag2, tag3, tag4');
      expect(normalizedTags).toBeInTheDocument();
    });

    it('should show character count for caption', async () => {
      const user = userEvent.setup();
      renderCreatePostPage();

      const captionInput = screen.getByLabelText(/caption/i);

      await user.type(captionInput, 'Hello world');

      expect(screen.getByText('11 / 500')).toBeInTheDocument();
    });

    it('should preserve form data when validation fails', async () => {
      const user = userEvent.setup();
      renderCreatePostPage();

      // Fill form without image
      await user.type(screen.getByLabelText(/caption/i), 'Test caption');
      await user.type(screen.getByLabelText(/tags/i), 'test, post');

      // Submit (should fail)
      const submitButton = screen.getByRole('button', { name: /create post/i });
      await user.click(submitButton);

      // Data should be preserved
      expect(screen.getByDisplayValue('Test caption')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test, post')).toBeInTheDocument();
    });
  });
});