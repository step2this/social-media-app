/**
 * TDD: NotificationsPage.relay tests (Write BEFORE implementation)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RelayEnvironmentProvider } from 'react-relay';
import { BrowserRouter } from 'react-router-dom';
import { NotificationsPageRelay } from './NotificationsPage.relay';
import { createMockRelayEnvironment, resolveMostRecentOperation } from '../test-utils/relay-test-utils';
import type { MockEnvironment } from '../test-utils/relay-test-utils';

describe('NotificationsPage (Relay)', () => {
  let environment: MockEnvironment;

  beforeEach(() => {
    environment = createMockRelayEnvironment();
  });

  it('should show loading state initially', () => {
    render(
      <BrowserRouter>
        <RelayEnvironmentProvider environment={environment}>
          <NotificationsPageRelay />
        </RelayEnvironmentProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/loading notifications/i)).toBeInTheDocument();
  });

  it('should render notifications after query resolves', async () => {
    const mockNotifications = {
      notifications: {
        edges: [
          {
            node: {
              id: 'notif-1',
              type: 'LIKE',
              title: 'New like',
              message: 'liked your post',
              createdAt: new Date().toISOString(),
              readAt: null,
              actor: {
                userId: 'user-1',
                handle: 'testuser',
                avatarUrl: 'https://example.com/avatar.jpg',
              },
            },
          },
          {
            node: {
              id: 'notif-2',
              type: 'FOLLOW',
              title: 'New follower',
              message: 'started following you',
              createdAt: new Date().toISOString(),
              readAt: new Date().toISOString(),
              actor: {
                userId: 'user-2',
                handle: 'follower',
                avatarUrl: 'https://example.com/avatar2.jpg',
              },
            },
          },
        ],
        pageInfo: {
          hasNextPage: false,
          endCursor: null,
        },
      },
    };

    render(
      <BrowserRouter>
        <RelayEnvironmentProvider environment={environment}>
          <NotificationsPageRelay />
        </RelayEnvironmentProvider>
      </BrowserRouter>
    );

    resolveMostRecentOperation(environment, mockNotifications);

    await waitFor(() => {
      expect(screen.getByText(/liked your post/i)).toBeInTheDocument();
      expect(screen.getByText(/started following you/i)).toBeInTheDocument();
    });
  });

  it('should show error state when query fails', async () => {
    render(
      <BrowserRouter>
        <RelayEnvironmentProvider environment={environment}>
          <NotificationsPageRelay />
        </RelayEnvironmentProvider>
      </BrowserRouter>
    );

    environment.mock.rejectMostRecentOperation(new Error('Network error'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('should show empty state when no notifications', async () => {
    const mockEmptyNotifications = {
      notifications: {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          endCursor: null,
        },
      },
    };

    render(
      <BrowserRouter>
        <RelayEnvironmentProvider environment={environment}>
          <NotificationsPageRelay />
        </RelayEnvironmentProvider>
      </BrowserRouter>
    );

    resolveMostRecentOperation(environment, mockEmptyNotifications);

    await waitFor(() => {
      expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
    });
  });

  it('should handle pagination with loadNext', async () => {
    const mockNotifications = {
      notifications: {
        edges: [
          {
            node: {
              id: 'notif-1',
              type: 'LIKE',
              title: 'New like',
              message: 'liked your post',
              createdAt: new Date().toISOString(),
              readAt: null,
              actor: {
                userId: 'user-1',
                handle: 'testuser',
                avatarUrl: 'https://example.com/avatar.jpg',
              },
            },
          },
        ],
        pageInfo: {
          hasNextPage: true,
          endCursor: 'cursor-1',
        },
      },
    };

    render(
      <BrowserRouter>
        <RelayEnvironmentProvider environment={environment}>
          <NotificationsPageRelay />
        </RelayEnvironmentProvider>
      </BrowserRouter>
    );

    resolveMostRecentOperation(environment, mockNotifications);

    await waitFor(() => {
      expect(screen.getByText(/load more/i)).toBeInTheDocument();
    });
  });
});
