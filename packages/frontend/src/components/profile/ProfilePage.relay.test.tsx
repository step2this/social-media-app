/**
 * TDD: ProfilePage.relay tests (Write BEFORE implementation)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RelayEnvironmentProvider } from 'react-relay';
import { BrowserRouter, Routes, Route, MemoryRouter } from 'react-router-dom';
import { ProfilePageRelay } from './ProfilePage.relay';
import { createMockRelayEnvironment, resolveMostRecentOperation } from '../../test-utils/relay-test-utils';
import type { MockEnvironment } from '../../test-utils/relay-test-utils';

describe('ProfilePage (Relay)', () => {
  let environment: MockEnvironment;

  beforeEach(() => {
    environment = createMockRelayEnvironment();
  });

  it('should show loading state while query is pending', () => {
    render(
      <MemoryRouter initialEntries={['/profile/testuser']}>
        <RelayEnvironmentProvider environment={environment}>
          <Routes>
            <Route path="/profile/:handle" element={<ProfilePageRelay />} />
          </Routes>
        </RelayEnvironmentProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/loading profile/i)).toBeInTheDocument();
  });

  it('should render profile details after query resolves', async () => {
    const mockProfile = {
      profile: {
        id: 'user-1',
        handle: 'testuser',
        username: 'Test User',
        fullName: 'Test User Full',
        profilePictureUrl: 'https://example.com/avatar.jpg',
        bio: 'Test bio',
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        isFollowing: false,
      },
      userPosts: {
        edges: [
          {
            node: {
              id: 'post-1',
              imageUrl: 'https://example.com/post1.jpg',
              thumbnailUrl: 'https://example.com/thumb1.jpg',
              likesCount: 10,
              commentsCount: 5,
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
      <MemoryRouter initialEntries={['/profile/testuser']}>
        <RelayEnvironmentProvider environment={environment}>
          <Routes>
            <Route path="/profile/:handle" element={<ProfilePageRelay />} />
          </Routes>
        </RelayEnvironmentProvider>
      </MemoryRouter>
    );

    resolveMostRecentOperation(environment, mockProfile);

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('Test bio')).toBeInTheDocument();
    });
  });

  it('should show error state when query fails', async () => {
    render(
      <MemoryRouter initialEntries={['/profile/testuser']}>
        <RelayEnvironmentProvider environment={environment}>
          <Routes>
            <Route path="/profile/:handle" element={<ProfilePageRelay />} />
          </Routes>
        </RelayEnvironmentProvider>
      </MemoryRouter>
    );

    environment.mock.rejectMostRecentOperation(new Error('Network error'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('should handle missing handle parameter', () => {
    render(
      <BrowserRouter>
        <RelayEnvironmentProvider environment={environment}>
          <ProfilePageRelay />
        </RelayEnvironmentProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/handle is required/i)).toBeInTheDocument();
  });

  it('should show follow button for other users profiles', async () => {
    const mockProfile = {
      profile: {
        id: 'user-1',
        handle: 'testuser',
        username: 'Test User',
        fullName: 'Test User Full',
        profilePictureUrl: 'https://example.com/avatar.jpg',
        bio: 'Test bio',
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        isFollowing: false,
      },
      userPosts: {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          endCursor: null,
        },
      },
    };

    render(
      <MemoryRouter initialEntries={['/profile/testuser']}>
        <RelayEnvironmentProvider environment={environment}>
          <Routes>
            <Route path="/profile/:handle" element={<ProfilePageRelay />} />
          </Routes>
        </RelayEnvironmentProvider>
      </MemoryRouter>
    );

    resolveMostRecentOperation(environment, mockProfile);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /follow/i })).toBeInTheDocument();
    });
  });

  it('should handle pagination (load more posts)', async () => {
    const mockProfile = {
      profile: {
        id: 'user-1',
        handle: 'testuser',
        username: 'Test User',
        fullName: 'Test User Full',
        profilePictureUrl: 'https://example.com/avatar.jpg',
        bio: 'Test bio',
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        isFollowing: false,
      },
      userPosts: {
        edges: [
          {
            node: {
              id: 'post-1',
              imageUrl: 'https://example.com/post1.jpg',
              thumbnailUrl: 'https://example.com/thumb1.jpg',
              likesCount: 10,
              commentsCount: 5,
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
      <MemoryRouter initialEntries={['/profile/testuser']}>
        <RelayEnvironmentProvider environment={environment}>
          <Routes>
            <Route path="/profile/:handle" element={<ProfilePageRelay />} />
          </Routes>
        </RelayEnvironmentProvider>
      </MemoryRouter>
    );

    resolveMostRecentOperation(environment, mockProfile);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
    });
  });
});
