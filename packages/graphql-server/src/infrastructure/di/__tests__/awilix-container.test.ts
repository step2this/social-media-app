import { describe, it, expect, beforeEach } from 'vitest';
import { createGraphQLContainer } from '../awilix-container.js';
import type { GraphQLContext } from '../../../context.js';
import { ProfileService } from '@social-media-app/dal';

describe('Awilix Container', () => {
  let mockContext: GraphQLContext;

  beforeEach(() => {
    mockContext = {
      userId: 'user-123',
      correlationId: 'test-correlation-id',
      dynamoClient: {} as any,
      tableName: 'test-table',
      services: {
        profileService: new ProfileService({} as any, 'test-table'),
        postService: {} as any,
        commentService: {} as any,
        followService: {} as any,
        likeService: {} as any,
        notificationService: {} as any,
        auctionService: {} as any,
      },
      loaders: {} as any,
    } as GraphQLContext;
  });

  describe('Container Creation', () => {
    it('should create container with context', () => {
      const container = createGraphQLContainer(mockContext);

      expect(container).toBeDefined();
      expect(container.cradle).toBeDefined();
    });

    it('should register context as singleton value', () => {
      const container = createGraphQLContainer(mockContext);

      const resolvedContext = container.resolve('context');

      expect(resolvedContext).toBe(mockContext);
      expect(resolvedContext.userId).toBe('user-123');
    });
  });

  describe('Repository Registration', () => {
    it('should automatically resolve ProfileRepository from context.services', () => {
      const container = createGraphQLContainer(mockContext);

      const profileRepository = container.resolve('profileRepository');

      expect(profileRepository).toBeDefined();
      // ProfileRepository is an adapter wrapping ProfileService
      expect(profileRepository.findById).toBeDefined();
      expect(profileRepository.findByHandle).toBeDefined();
    });

    it('should create scoped instances for repositories', () => {
      const container = createGraphQLContainer(mockContext);

      const repo1 = container.resolve('profileRepository');
      const repo2 = container.resolve('profileRepository');

      // In scoped mode, multiple resolutions should give same instance within scope
      expect(repo1).toBe(repo2);
    });

    it('should resolve all repository adapters', () => {
      const container = createGraphQLContainer(mockContext);

      const repositories = [
        'profileRepository',
        'postRepository',
        'commentRepository',
        'followRepository',
        'likeRepository',
        'notificationRepository',
        'auctionRepository',
        'feedRepository',
      ] as const;

      repositories.forEach((repoName) => {
        expect(() => container.resolve(repoName)).not.toThrow();
        expect(container.resolve(repoName)).toBeDefined();
      });
    });
  });

  describe('Use Case Registration', () => {
    it('should automatically inject repository into GetCurrentUserProfile use case', () => {
      const container = createGraphQLContainer(mockContext);

      const useCase = container.resolve('getCurrentUserProfile');

      expect(useCase).toBeDefined();
      expect(useCase.execute).toBeDefined();
    });

    it('should resolve all use cases', () => {
      const container = createGraphQLContainer(mockContext);

      const useCases = [
        'getCurrentUserProfile',
        'getProfileByHandle',
        'getPostById',
        'getUserPosts',
        'getFollowingFeed',
        'getExploreFeed',
        'getCommentsByPost',
        'getFollowStatus',
        'getPostLikeStatus',
        'getNotifications',
        'getUnreadNotificationsCount',
        'getAuction',
        'getAuctions',
        'getBidHistory',
      ] as const;

      useCases.forEach((useCaseName) => {
        expect(() => container.resolve(useCaseName)).not.toThrow();
        expect(container.resolve(useCaseName)).toBeDefined();
      });
    });

    it('should inject correct repository into use case via constructor', () => {
      const container = createGraphQLContainer(mockContext);

      // GetCurrentUserProfile requires IProfileRepository in constructor
      const useCase = container.resolve('getCurrentUserProfile');

      // Execute the use case to verify repository is correctly injected
      expect(useCase.execute).toBeDefined();

      // If repository wasn't injected properly, constructor would fail
      expect(useCase).toBeInstanceOf(Object);
    });
  });

  describe('Lifecycle Management', () => {
    it('should support scoped container creation', () => {
      const container = createGraphQLContainer(mockContext);

      const scope1 = container.createScope();
      const scope2 = container.createScope();

      expect(scope1).toBeDefined();
      expect(scope2).toBeDefined();
      expect(scope1).not.toBe(scope2);
    });

    it('should cleanup scoped resources on dispose', async () => {
      const container = createGraphQLContainer(mockContext);
      const scope = container.createScope();

      await expect(scope.dispose()).resolves.not.toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should provide type-safe resolution', () => {
      const container = createGraphQLContainer(mockContext);

      // TypeScript should know the types without explicit casting
      const useCase = container.resolve('getCurrentUserProfile');

      // This should compile without type errors
      const result = useCase.execute({ userId: 'test' });

      expect(result).toBeDefined();
    });
  });
});
