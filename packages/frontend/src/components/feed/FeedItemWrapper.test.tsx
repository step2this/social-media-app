import { render, screen, waitFor } from '@testing-library/react';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { RelayEnvironmentProvider, useLazyLoadQuery, graphql } from 'react-relay';
import { createMockRelayEnvironment, resolveMostRecentOperation } from '../../test-utils/relay-test-utils';
import { createMockPost } from '@social-media-app/shared/test-utils';
import { FeedItemWrapper } from './FeedItemWrapper';

/**
 * Reusable test wrapper component for FeedItemWrapper with Relay
 * This simulates how FeedItemWrapper is used in real components
 *
 * RED PHASE: This test is EXPECTED to have type errors because:
 * 1. FeedItemWrapper_post fragment doesn't exist yet
 * 2. FeedItemWrapper doesn't accept fragment references yet
 * 3. Relay compiler hasn't generated types yet
 *
 * These errors will be resolved in the GREEN phase after implementation.
 */
function TestWrapper({ postId, compact = false }: { postId: string; compact?: boolean }) {
  // @ts-expect-error - RED PHASE: Fragment doesn't exist yet, will be created in GREEN phase
  const data = useLazyLoadQuery(
    graphql`
      query FeedItemWrapperTestQuery($postId: ID!) {
        post(id: $postId) {
          ...FeedItemWrapper_post
        }
      }
    `,
    { postId }
  );

  // @ts-expect-error - RED PHASE: data type is unknown until fragment is implemented
  if (!data.post) {
    return <div>Post not found</div>;
  }

  // @ts-expect-error - RED PHASE: FeedItemWrapper doesn't accept fragment reference yet
  return <FeedItemWrapper post={data.post} compact={compact} />;
}

describe('FeedItemWrapper', () => {
  let environment: ReturnType<typeof createMockRelayEnvironment>;

  beforeEach(() => {
    environment = createMockRelayEnvironment();

    // Mock IntersectionObserver for auto-read testing
    global.IntersectionObserver = class IntersectionObserver {
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
      root = null;
      rootMargin = '';
      thresholds = [];
    } as any;
  });

  afterEach(() => {
    delete (global as any).IntersectionObserver;
  });

  describe('Behavior: Rendering post content', () => {
    it('should display post caption from Relay fragment', async () => {
      const mockPost = createMockPost({
        id: 'post-123',
        caption: 'Test post caption from Relay'
      });

      render(
        <RelayEnvironmentProvider environment={environment}>
          <TestWrapper postId="post-123" />
        </RelayEnvironmentProvider>
      );

      resolveMostRecentOperation(environment, {
        Post: () => mockPost
      });

      await waitFor(() => {
        expect(screen.getByText('Test post caption from Relay')).toBeInTheDocument();
      });
    });

    it('should render wrapper element with correct structure', async () => {
      const mockPost = createMockPost({
        id: 'post-123',
        caption: 'Test post'
      });

      render(
        <RelayEnvironmentProvider environment={environment}>
          <TestWrapper postId="post-123" />
        </RelayEnvironmentProvider>
      );

      resolveMostRecentOperation(environment, {
        Post: () => mockPost
      });

      await waitFor(() => {
        const wrapper = screen.getByTestId('feed-item-wrapper');
        expect(wrapper).toBeInTheDocument();
        expect(wrapper).toHaveClass('feed-item-wrapper');
      });
    });
  });

  describe('Behavior: Compact mode', () => {
    it('should render in compact mode when prop is true', async () => {
      const mockPost = createMockPost({
        id: 'post-compact',
        caption: 'Compact post'
      });

      render(
        <RelayEnvironmentProvider environment={environment}>
          <TestWrapper postId="post-compact" compact={true} />
        </RelayEnvironmentProvider>
      );

      resolveMostRecentOperation(environment, {
        Post: () => mockPost
      });

      await waitFor(() => {
        expect(screen.getByTestId('feed-item-wrapper')).toBeInTheDocument();
        expect(screen.getByText('Compact post')).toBeInTheDocument();
      });
    });
  });

  describe('Behavior: Edge cases', () => {
    it('should handle missing post data gracefully', async () => {
      render(
        <RelayEnvironmentProvider environment={environment}>
          <TestWrapper postId="non-existent-post" />
        </RelayEnvironmentProvider>
      );

      resolveMostRecentOperation(environment, {
        Post: () => null
      });

      await waitFor(() => {
        expect(screen.getByText('Post not found')).toBeInTheDocument();
      });
    });

    it('should handle posts with minimal data', async () => {
      const minimalPost = createMockPost({
        id: 'minimal-post',
        caption: ''
      });

      render(
        <RelayEnvironmentProvider environment={environment}>
          <TestWrapper postId="minimal-post" />
        </RelayEnvironmentProvider>
      );

      resolveMostRecentOperation(environment, {
        Post: () => minimalPost
      });

      await waitFor(() => {
        expect(screen.getByTestId('feed-item-wrapper')).toBeInTheDocument();
      });
    });

    it('should handle posts with long captions', async () => {
      const longCaption = 'A'.repeat(1000);
      const longPost = createMockPost({
        id: 'long-post',
        caption: longCaption
      });

      render(
        <RelayEnvironmentProvider environment={environment}>
          <TestWrapper postId="long-post" />
        </RelayEnvironmentProvider>
      );

      resolveMostRecentOperation(environment, {
        Post: () => longPost
      });

      await waitFor(() => {
        expect(screen.getByTestId('feed-item-wrapper')).toBeInTheDocument();
        expect(screen.getByText(longCaption)).toBeInTheDocument();
      });
    });
  });

  describe('Behavior: Multiple posts', () => {
    it('should render multiple different posts', async () => {
      const post1 = createMockPost({
        id: 'post-1',
        caption: 'First post'
      });

      const post2 = createMockPost({
        id: 'post-2',
        caption: 'Second post'
      });

      const { rerender } = render(
        <RelayEnvironmentProvider environment={environment}>
          <TestWrapper postId="post-1" />
        </RelayEnvironmentProvider>
      );

      resolveMostRecentOperation(environment, {
        Post: () => post1
      });

      await waitFor(() => {
        expect(screen.getByText('First post')).toBeInTheDocument();
      });

      // Re-render with different post
      rerender(
        <RelayEnvironmentProvider environment={environment}>
          <TestWrapper postId="post-2" />
        </RelayEnvironmentProvider>
      );

      resolveMostRecentOperation(environment, {
        Post: () => post2
      });

      await waitFor(() => {
        expect(screen.getByText('Second post')).toBeInTheDocument();
      });
    });
  });
});
