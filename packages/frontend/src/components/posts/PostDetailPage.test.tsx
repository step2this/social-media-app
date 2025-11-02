/**
 * TDD: PostDetailPage.relay tests (Write BEFORE implementation)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RelayEnvironmentProvider } from 'react-relay';
import { BrowserRouter, Routes, Route, MemoryRouter } from 'react-router-dom';
import { PostDetailPage } from './PostDetailPage';
import { createMockRelayEnvironment, resolveMostRecentOperation } from '../../test-utils/relay-test-utils';
import type { MockEnvironment } from '../../test-utils/relay-test-utils';

describe('PostDetailPage (Relay)', () => {
  let environment: MockEnvironment;

  beforeEach(() => {
    environment = createMockRelayEnvironment();
  });

  it('should show loading state while query is pending', () => {
    render(
      <MemoryRouter initialEntries={['/post/123']}>
        <RelayEnvironmentProvider environment={environment}>
          <Routes>
            <Route path="/post/:postId" element={<PostDetailPage />} />
          </Routes>
        </RelayEnvironmentProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('post-detail-loading')).toBeInTheDocument();
  });

  it('should render post details after query resolves', async () => {
    const mockPost = {
      id: 'post-1',
      caption: 'Test post caption',
      imageUrl: 'https://example.com/image.jpg',
      likesCount: 42,
      commentsCount: 5,
      isLiked: false,
      createdAt: new Date().toISOString(),
      author: {
        id: 'user-1',
        username: 'testuser',
        profilePictureUrl: 'https://example.com/avatar.jpg',
      },
      comments: {
        edges: [
          {
            node: {
              id: 'comment-1',
              content: 'Great post!',
              createdAt: new Date().toISOString(),
              author: {
                id: 'user-2',
                username: 'commenter',
              },
            },
          },
        ],
      },
    };

    render(
      <MemoryRouter initialEntries={['/post/post-1']}>
        <RelayEnvironmentProvider environment={environment}>
          <Routes>
            <Route path="/post/:postId" element={<PostDetailPage />} />
          </Routes>
        </RelayEnvironmentProvider>
      </MemoryRouter>
    );

    resolveMostRecentOperation(environment, {
      Post: () => mockPost,
    });

    await waitFor(() => {
      expect(screen.getByText('Test post caption')).toBeInTheDocument();
    });
  });

  it('should show error state when query fails', async () => {
    render(
      <MemoryRouter initialEntries={['/post/123']}>
        <RelayEnvironmentProvider environment={environment}>
          <Routes>
            <Route path="/post/:postId" element={<PostDetailPage />} />
          </Routes>
        </RelayEnvironmentProvider>
      </MemoryRouter>
    );

    // Reject the query
    environment.mock.rejectMostRecentOperation(new Error('Network error'));

    await waitFor(() => {
      expect(screen.getByTestId('post-detail-error')).toBeInTheDocument();
    });
  });

  it('should handle missing postId parameter', () => {
    render(
      <BrowserRouter>
        <RelayEnvironmentProvider environment={environment}>
          <PostDetailPage />
        </RelayEnvironmentProvider>
      </BrowserRouter>
    );

    // Should show error when no postId is in the URL
    expect(screen.getByText(/post id is required/i)).toBeInTheDocument();
  });
});
