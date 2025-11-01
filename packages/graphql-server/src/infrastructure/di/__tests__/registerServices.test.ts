/**
 * registerServices Tests
 *
 * TDD for service registration function.
 * Tests complete dependency wiring from context → adapters → use cases.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Container } from '../Container.js';
import { registerServices } from '../registerServices.js';
import type { GraphQLContext } from '../../../context.js';
import type { IProfileRepository } from '../../../domain/repositories/IProfileRepository.js';
import type { IPostRepository } from '../../../domain/repositories/IPostRepository.js';
import type { IFeedRepository } from '../../../domain/repositories/IFeedRepository.js';
import type { GetCurrentUserProfile } from '../../../application/use-cases/profile/GetCurrentUserProfile.js';
import type { GetProfileByHandle } from '../../../application/use-cases/profile/GetProfileByHandle.js';
import type { GetPostById } from '../../../application/use-cases/post/GetPostById.js';
import type { GetUserPosts } from '../../../application/use-cases/post/GetUserPosts.js';
import type { GetFollowingFeed } from '../../../application/use-cases/feed/GetFollowingFeed.js';
import type { GetExploreFeed } from '../../../application/use-cases/feed/GetExploreFeed.js';

describe('registerServices', () => {
  let container: Container;
  let mockContext: GraphQLContext;

  beforeEach(() => {
    container = new Container();

    mockContext = {
      services: {
        profileService: {
          getProfileById: vi.fn(),
          getProfileByHandle: vi.fn(),
        } as any,
        postService: {
          getPostById: vi.fn(),
          getPostsByUserId: vi.fn(),
        } as any,
        feedService: {
          getFollowingFeed: vi.fn(),
          getExploreFeed: vi.fn(),
        } as any,
        likeService: {} as any,
        followService: {} as any,
        commentService: {} as any,
        notificationService: {} as any,
        authService: {} as any,
        auctionService: {} as any,
      },
    } as GraphQLContext;
  });

  describe('Repository registration', () => {
    it('should register all repository adapters', () => {
      registerServices(container, mockContext);

      expect(container.has('ProfileRepository')).toBe(true);
      expect(container.has('PostRepository')).toBe(true);
      expect(container.has('FeedRepository')).toBe(true);
    });

    it('should resolve ProfileRepository', () => {
      registerServices(container, mockContext);

      const repo = container.resolve<IProfileRepository>('ProfileRepository');

      expect(repo).toBeDefined();
      expect(typeof repo.findById).toBe('function');
      expect(typeof repo.findByHandle).toBe('function');
    });

    it('should resolve PostRepository', () => {
      registerServices(container, mockContext);

      const repo = container.resolve<IPostRepository>('PostRepository');

      expect(repo).toBeDefined();
      expect(typeof repo.findById).toBe('function');
      expect(typeof repo.findByUser).toBe('function');
    });

    it('should resolve FeedRepository', () => {
      registerServices(container, mockContext);

      const repo = container.resolve<IFeedRepository>('FeedRepository');

      expect(repo).toBeDefined();
      expect(typeof repo.getFollowingFeed).toBe('function');
      expect(typeof repo.getExploreFeed).toBe('function');
    });
  });

  describe('Use case registration', () => {
    it('should register all use cases', () => {
      registerServices(container, mockContext);

      expect(container.has('GetCurrentUserProfile')).toBe(true);
      expect(container.has('GetProfileByHandle')).toBe(true);
      expect(container.has('GetPostById')).toBe(true);
      expect(container.has('GetUserPosts')).toBe(true);
      expect(container.has('GetFollowingFeed')).toBe(true);
      expect(container.has('GetExploreFeed')).toBe(true);
    });

    it('should resolve GetCurrentUserProfile with ProfileRepository', () => {
      registerServices(container, mockContext);

      const useCase = container.resolve<GetCurrentUserProfile>('GetCurrentUserProfile');

      expect(useCase).toBeDefined();
      expect(typeof useCase.execute).toBe('function');
    });

    it('should resolve GetProfileByHandle with ProfileRepository', () => {
      registerServices(container, mockContext);

      const useCase = container.resolve<GetProfileByHandle>('GetProfileByHandle');

      expect(useCase).toBeDefined();
      expect(typeof useCase.execute).toBe('function');
    });

    it('should resolve GetPostById with PostRepository', () => {
      registerServices(container, mockContext);

      const useCase = container.resolve<GetPostById>('GetPostById');

      expect(useCase).toBeDefined();
      expect(typeof useCase.execute).toBe('function');
    });

    it('should resolve GetUserPosts with PostRepository', () => {
      registerServices(container, mockContext);

      const useCase = container.resolve<GetUserPosts>('GetUserPosts');

      expect(useCase).toBeDefined();
      expect(typeof useCase.execute).toBe('function');
    });

    it('should resolve GetFollowingFeed with FeedRepository', () => {
      registerServices(container, mockContext);

      const useCase = container.resolve<GetFollowingFeed>('GetFollowingFeed');

      expect(useCase).toBeDefined();
      expect(typeof useCase.execute).toBe('function');
    });

    it('should resolve GetExploreFeed with FeedRepository', () => {
      registerServices(container, mockContext);

      const useCase = container.resolve<GetExploreFeed>('GetExploreFeed');

      expect(useCase).toBeDefined();
      expect(typeof useCase.execute).toBe('function');
    });
  });

  describe('Integration', () => {
    it('should wire up complete chain: context → adapter → use case', async () => {
      const mockProfile = {
        id: 'user-123',
        handle: '@john',
        fullName: 'John Doe',
        bio: 'Software engineer',
        profilePictureUrl: 'https://example.com/avatar.jpg',
        createdAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(mockContext.services.profileService.getProfileById).mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      registerServices(container, mockContext);

      const useCase = container.resolve<GetCurrentUserProfile>('GetCurrentUserProfile');
      const result = await useCase.execute({ userId: 'user-123' as any });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
      }
      expect(mockContext.services.profileService.getProfileById).toHaveBeenCalledWith('user-123');
    });
  });
});
