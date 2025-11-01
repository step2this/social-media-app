/**
 * GetCurrentUserProfile Use Case Tests
 *
 * TDD for GetCurrentUserProfile use case.
 * This use case retrieves the authenticated user's profile.
 *
 * Business Logic:
 * - User must be authenticated (userId required)
 * - Profile must exist (or return NotFoundError)
 * - Returns profile data on success
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IProfileRepository } from '../../../../domain/repositories/IProfileRepository.js';
import { GetCurrentUserProfile } from '../GetCurrentUserProfile.js';
import { UserId } from '../../../../shared/types/index.js';

describe('GetCurrentUserProfile', () => {
  let mockRepository: IProfileRepository;
  let useCase: GetCurrentUserProfile;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByHandle: vi.fn(),
    };
    useCase = new GetCurrentUserProfile(mockRepository);
  });

  describe('execute()', () => {
    it('should return profile when user is authenticated and profile exists', async () => {
      const userId = UserId('user-123');
      const mockProfile = {
        id: 'user-123',
        handle: '@john',
        fullName: 'John Doe',
        bio: 'Software engineer',
        profilePictureUrl: 'https://example.com/avatar.jpg',
        createdAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(mockRepository.findById).mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      const result = await useCase.execute({ userId });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.handle).toBe('@john');
        expect(result.data.fullName).toBe('John Doe');
      }
    });

    it('should return error when user is not authenticated', async () => {
      const result = await useCase.execute({ userId: undefined });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain('authenticated');
      }
    });

    it('should return error when profile not found', async () => {
      const userId = UserId('nonexistent');

      vi.mocked(mockRepository.findById).mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await useCase.execute({ userId });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('not found');
      }
    });

    it('should propagate repository errors', async () => {
      const userId = UserId('user-123');
      const dbError = new Error('Database connection failed');

      vi.mocked(mockRepository.findById).mockResolvedValue({
        success: false,
        error: dbError,
      });

      const result = await useCase.execute({ userId });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(dbError);
      }
    });

    it('should call repository with correct userId', async () => {
      const userId = UserId('user-456');

      vi.mocked(mockRepository.findById).mockResolvedValue({
        success: true,
        data: {
          id: 'user-456',
          handle: '@alice',
          fullName: 'Alice',
          bio: null,
          profilePictureUrl: null,
          createdAt: '2024-01-01T00:00:00Z',
        },
      });

      await useCase.execute({ userId });

      expect(mockRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockRepository.findById).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dependency injection', () => {
    it('should accept IProfileRepository via constructor', () => {
      const customRepository = {} as IProfileRepository;
      const customUseCase = new GetCurrentUserProfile(customRepository);

      expect(customUseCase).toBeInstanceOf(GetCurrentUserProfile);
    });

    it('should be testable with mock repository', async () => {
      const mockRepo: IProfileRepository = {
        findById: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'test',
            handle: '@test',
            fullName: 'Test User',
            bio: null,
            profilePictureUrl: null,
            createdAt: '2024-01-01T00:00:00Z',
          },
        }),
        findByHandle: vi.fn(),
      };

      const testUseCase = new GetCurrentUserProfile(mockRepo);
      const result = await testUseCase.execute({ userId: UserId('test') });

      expect(result.success).toBe(true);
    });
  });
});
