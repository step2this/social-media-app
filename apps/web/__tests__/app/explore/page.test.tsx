/**
 * Explore Page Tests
 *
 * Behavioral tests for the Explore page Server Component.
 * Uses dependency injection to test data fetching and rendering.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExplorePage from '@/app/(app)/explore/page';
import { createMockPost } from '../../helpers/fixtures';

// Mock dependencies
vi.mock('@/lib/graphql/client', () => ({
  getGraphQLClient: vi.fn(),
}));

vi.mock('@/components/posts/PostCard', () => ({
  PostCard: ({ post }: any) => (
    <div data-testid={`post-${post.id}`}>
      <h3>{post.caption}</h3>
      <p>By: {post.author.username}</p>
    </div>
  ),
}));

import { getGraphQLClient } from '@/lib/graphql/client';

describe('Explore Page', () => {
  describe('Successful Data Loading', () => {
    it('should display posts when data loads successfully', async () => {
      const mockPosts = [
        createMockPost({
          id: 'post-1',
          caption: 'First post',
          author: { id: 'user-1', username: 'alice', avatarUrl: null },
        }),
        createMockPost({
          id: 'post-2',
          caption: 'Second post',
          author: { id: 'user-2', username: 'bob', avatarUrl: null },
        }),
      ];

      const mockClient = {
        request: vi.fn().mockResolvedValue({
          exploreFeed: {
            edges: mockPosts.map((post) => ({ node: post })),
          },
        }),
      };

      vi.mocked(getGraphQLClient).mockResolvedValue(mockClient as any);

      const page = await ExplorePage();
      render(page);

      // Should show the page title
      expect(screen.getByText('Explore')).toBeInTheDocument();

      // Should show success banner with count
      expect(screen.getByText(/Showing all posts \(2 loaded\)/)).toBeInTheDocument();

      // Should render both posts
      expect(screen.getByTestId('post-post-1')).toBeInTheDocument();
      expect(screen.getByTestId('post-post-2')).toBeInTheDocument();

      // Verify GraphQL request was made correctly
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.anything(),
        { first: 20 }
      );
    });

    it('should handle empty feed gracefully', async () => {
      const mockClient = {
        request: vi.fn().mockResolvedValue({
          exploreFeed: {
            edges: [],
          },
        }),
      };

      vi.mocked(getGraphQLClient).mockResolvedValue(mockClient as any);

      const page = await ExplorePage();
      render(page);

      // Should show empty state message
      expect(
        screen.getByText(/No posts yet! Use the seed script/)
      ).toBeInTheDocument();

      // Should not show error or success states
      expect(screen.queryByText(/Error:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Showing all posts/)).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when GraphQL request fails', async () => {
      const mockClient = {
        request: vi.fn().mockRejectedValue(new Error('Network error')),
      };

      vi.mocked(getGraphQLClient).mockResolvedValue(mockClient as any);

      const page = await ExplorePage();
      render(page);

      // Should show error banner
      expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
      expect(
        screen.getByText(/Make sure the GraphQL server is running/)
      ).toBeInTheDocument();

      // Should not show posts or empty state
      expect(screen.queryByText(/No posts yet/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Showing all posts/)).not.toBeInTheDocument();
    });

    it('should handle non-Error exceptions', async () => {
      const mockClient = {
        request: vi.fn().mockRejectedValue('String error'),
      };

      vi.mocked(getGraphQLClient).mockResolvedValue(mockClient as any);

      const page = await ExplorePage();
      render(page);

      // Should show generic error message
      expect(screen.getByText(/Error: Failed to load posts/)).toBeInTheDocument();
    });

    it('should handle null exploreFeed response', async () => {
      const mockClient = {
        request: vi.fn().mockResolvedValue({
          exploreFeed: null,
        }),
      };

      vi.mocked(getGraphQLClient).mockResolvedValue(mockClient as any);

      const page = await ExplorePage();
      render(page);

      // Should handle as empty feed
      expect(screen.getByText(/No posts yet/)).toBeInTheDocument();
    });
  });

  describe('Page Configuration', () => {
    it('should export correct metadata', async () => {
      const { metadata } = await import('@/app/(app)/explore/page');
      expect(metadata).toEqual({ title: 'Explore' });
    });

    it('should export correct revalidate config', async () => {
      const { revalidate } = await import('@/app/(app)/explore/page');
      expect(revalidate).toBe(30);
    });
  });
});
