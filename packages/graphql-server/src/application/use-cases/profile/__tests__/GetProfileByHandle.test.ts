/**
 * GetProfileByHandle Use Case Tests
 *
 * TDD for GetProfileByHandle use case.
 * This use case retrieves a user profile by handle.
 *
 * Business Logic:
 * - Handle must be provided and non-empty
 * - Returns profile data on success
 * - Returns NotFoundError if profile doesn't exist
 * - Public operation - no authentication required
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IProfileRepository } from '../../../../domain/repositories/IProfileRepository.js';
import { GetProfileByHandle } from '../GetProfileByHandle.js';

describe('GetProfileByHandle', () => {
  let mockRepository: IProfileRepository;
  let useCase: GetProfileByHandle;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByHandle: vi.fn(),
    };
    useCase = new GetProfileByHandle(mockRepository);
  });

  describe('execute()', () => {
    it('should return profile when valid handle provided', async () => {
      const handle = '@johndoe';
      const mockProfile = {
        id: 'user-123',
        handle: '@johndoe',
        fullName: 'John Doe',
        bio: 'Software engineer',
        profilePictureUrl: 'https://example.com/avatar.jpg',
        createdAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(mockRepository.findByHandle).mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      const result = await useCase.execute({ handle });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.handle).toBe('@johndoe');
        expect(result.data.fullName).toBe('John Doe');
        expect(result.data.id).toBe('user-123');
      }
    });

    it('should return error when handle is empty string', async () => {
      const result = await useCase.execute({ handle: '' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain('required');
      }
    });

    it('should return error when handle is whitespace only', async () => {
      const result = await useCase.execute({ handle: '   ' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain('required');
      }
    });

    it('should return error when profile not found', async () => {
      const handle = '@nonexistent';

      vi.mocked(mockRepository.findByHandle).mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await useCase.execute({ handle });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('not found');
        expect(result.error.message).toContain(handle);
      }
    });

    it('should propagate repository errors', async () => {
      const handle = '@johndoe';
      const dbError = new Error('Database connection failed');

      vi.mocked(mockRepository.findByHandle).mockResolvedValue({
        success: false,
        error: dbError,
      });

      const result = await useCase.execute({ handle });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(dbError);
      }
    });

    it('should call repository with correct handle', async () => {
      const handle = '@alice';

      vi.mocked(mockRepository.findByHandle).mockResolvedValue({
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

      await useCase.execute({ handle });

      expect(mockRepository.findByHandle).toHaveBeenCalledWith(handle);
      expect(mockRepository.findByHandle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dependency injection', () => {
    it('should accept IProfileRepository via constructor', () => {
      const customRepository = {} as IProfileRepository;
      const customUseCase = new GetProfileByHandle(customRepository);

      expect(customUseCase).toBeInstanceOf(GetProfileByHandle);
    });
  });
});
