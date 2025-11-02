import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { createMockEnvironment } from 'relay-test-utils';
import { RelayEnvironmentProvider } from 'react-relay';
import { FeedItemWrapper } from './FeedItemWrapper';
import { createMockPost } from '@social-media-app/shared';

describe('FeedItemWrapper', () => {
  it('should render with post data', () => {
    const environment = createMockEnvironment();
    const post = createMockPost({ id: 'post-123' });

    const { getByTestId } = render(
      <RelayEnvironmentProvider environment={environment}>
        <FeedItemWrapper post={post} />
      </RelayEnvironmentProvider>
    );

    expect(getByTestId('feed-item-wrapper')).toBeInTheDocument();
  });

  it('should render with compact prop', () => {
    const environment = createMockEnvironment();
    const post = createMockPost({ id: 'post-123' });

    const { getByTestId } = render(
      <RelayEnvironmentProvider environment={environment}>
        <FeedItemWrapper post={post} compact={false} />
      </RelayEnvironmentProvider>
    );

    expect(getByTestId('feed-item-wrapper')).toBeInTheDocument();
  });

  it('should attach ref to wrapper element', () => {
    const environment = createMockEnvironment();
    const post = createMockPost({ id: 'post-123' });

    const { container } = render(
      <RelayEnvironmentProvider environment={environment}>
        <FeedItemWrapper post={post} />
      </RelayEnvironmentProvider>
    );

    const wrapper = container.querySelector('.feed-item-wrapper');
    expect(wrapper).toBeInTheDocument();
  });
});
