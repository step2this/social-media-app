/**
 * ProfileServiceAdapter Tests
 *
 * Test-Driven Development (TDD) for ProfileService adapter.
 * The adapter bridges the existing ProfileService to IProfileRepository interface.
 *
 * This is the Adapter Pattern in action - we're adapting an existing service
 * to a new interface without modifying the existing service.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProfileService } from '@social-media-app/dal';

// Import types and classes we're about to create (will fail initially - TDD RED phase)
import { ProfileServiceAdapter } from '../ProfileServiceAdapter.js';
import { UserId } from '../../../shared/types/index.js';
import type { Profile } from '../../../domain/repositories/IProfileRepository.js';

describe('ProfileServiceAdapter', () => {
  let mockProfileService: ProfileService;
  let adapter: ProfileServiceAdapter;

  beforeEach(() => {
    // Create mock ProfileService
    mockProfileService = {
      getProfileById: vi.fn(),
      getProfileByHandle: vi.fn(),
    } as unknown as ProfileService;

    adapter = new ProfileServiceAdapter(mockProfileService);
  });

  describe('Constructor', () => {
    it('should create ProfileServiceAdapter with ProfileService', () => {
      expect(adapter).toBeInstanceOf(ProfileServiceAdapter);
    });

    it('should accept ProfileService dependency', () => {
      const service = {} as ProfileService;
      const customAdapter = new ProfileServiceAdapter(service);

      expect(customAdapter).toBeInstanceOf(ProfileServiceAdapter);
    });
  });

  describe('findById()', () => {
    it('should call ProfileService.getProfileById with user ID', async () => {
      const userId = UserId('user-123');
      const mockProfile = {
        id: 'user-123',
        handle: '@johndoe',
        fullName: 'John Doe',
        bio: 'Software engineer',
        profilePictureUrl: 'https://example.com/avatar.jpg',
        createdAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(mockProfileService.getProfileById).mockResolvedValue(mockProfile);

      const result = await adapter.findById(userId);

      expect(mockProfileService.getProfileById).toHaveBeenCalledWith('user-123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockProfile);
      }
    });

    it('should return success with profile data', async () => {
      const userId = UserId('user-456');
      const mockProfile: Profile = {
        id: 'user-456',
        handle: '@alice',
        fullName: 'Alice Smith',
        bio: null,
        profilePictureUrl: null,
        createdAt: '2024-01-15T00:00:00Z',
      };

      vi.mocked(mockProfileService.getProfileById).mockResolvedValue(mockProfile);

      const result = await adapter.findById(userId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.id).toBe('user-456');
        expect(result.data?.handle).toBe('@alice');
        expect(result.data?.fullName).toBe('Alice Smith');
      }
    });

    it('should return success with null when profile not found', async () => {
      const userId = UserId('nonexistent');

      vi.mocked(mockProfileService.getProfileById).mockResolvedValue(null);

      const result = await adapter.findById(userId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(null);
      }
    });

    it('should return error when ProfileService throws', async () => {
      const userId = UserId('user-123');
      const error = new Error('Database connection failed');

      vi.mocked(mockProfileService.getProfileById).mockRejectedValue(error);

      const result = await adapter.findById(userId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
        expect(result.error.message).toBe('Database connection failed');
      }
    });

    it('should handle different error types', async () => {
      const userId = UserId('user-123');
      const errors = [
        new Error('Network timeout'),
        new Error('Permission denied'),
        new TypeError('Invalid argument'),
      ];

      for (const error of errors) {
        vi.mocked(mockProfileService.getProfileById).mockRejectedValue(error);

        const result = await adapter.findById(userId);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe(error);
        }
      }
    });

    it('should unwrap branded UserId for service call', async () => {
      const userId = UserId('user-branded-123');

      vi.mocked(mockProfileService.getProfileById).mockResolvedValue(null);

      await adapter.findById(userId);

      // Service should receive plain string, not branded type
      expect(mockProfileService.getProfileById).toHaveBeenCalledWith('user-branded-123');
    });
  });

  describe('findByHandle()', () => {
    it('should call ProfileService.getProfileByHandle with handle', async () => {
      const handle = '@johndoe';
      const mockProfile: Profile = {
        id: 'user-123',
        handle: '@johndoe',
        fullName: 'John Doe',
        bio: 'Developer',
        profilePictureUrl: 'https://example.com/avatar.jpg',
        createdAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(mockProfileService.getProfileByHandle).mockResolvedValue(mockProfile);

      const result = await adapter.findByHandle(handle);

      expect(mockProfileService.getProfileByHandle).toHaveBeenCalledWith('@johndoe');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockProfile);
      }
    });

    it('should return success with profile data', async () => {
      const handle = '@alice_smith';
      const mockProfile: Profile = {
        id: 'user-456',
        handle: '@alice_smith',
        fullName: 'Alice Smith',
        bio: 'Designer',
        profilePictureUrl: null,
        createdAt: '2024-02-01T00:00:00Z',
      };

      vi.mocked(mockProfileService.getProfileByHandle).mockResolvedValue(mockProfile);

      const result = await adapter.findByHandle(handle);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.handle).toBe('@alice_smith');
      }
    });

    it('should return success with null when handle not found', async () => {
      const handle = '@nonexistent';

      vi.mocked(mockProfileService.getProfileByHandle).mockResolvedValue(null);

      const result = await adapter.findByHandle(handle);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(null);
      }
    });

    it('should return error when ProfileService throws', async () => {
      const handle = '@johndoe';
      const error = new Error('Service unavailable');

      vi.mocked(mockProfileService.getProfileByHandle).mockRejectedValue(error);

      const result = await adapter.findByHandle(handle);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
    });

    it('should handle handle with or without @ prefix', async () => {
      const handles = ['@johndoe', 'johndoe'];

      for (const handle of handles) {
        vi.mocked(mockProfileService.getProfileByHandle).mockResolvedValue(null);

        await adapter.findByHandle(handle);

        expect(mockProfileService.getProfileByHandle).toHaveBeenCalledWith(handle);
      }
    });
  });

  describe('Real-world adapter scenarios', () => {
    it('should adapt ProfileService to IProfileRepository interface', async () => {
      // This demonstrates the Adapter Pattern
      // ProfileService (existing) -> ProfileServiceAdapter -> IProfileRepository (new interface)

      const mockProfile: Profile = {
        id: 'user-789',
        handle: '@bob',
        fullName: 'Bob Johnson',
        bio: 'Product manager',
        profilePictureUrl: 'https://example.com/bob.jpg',
        createdAt: '2024-03-01T00:00:00Z',
      };

      vi.mocked(mockProfileService.getProfileById).mockResolvedValue(mockProfile);

      // Use adapter as IProfileRepository
      const result = await adapter.findById(UserId('user-789'));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.id).toBe('user-789');
      }
    });

    it('should be usable in use cases that depend on IProfileRepository', async () => {
      // Simulate use case dependency injection
      const mockProfile: Profile = {
        id: 'user-123',
        handle: '@john',
        fullName: 'John Doe',
        bio: null,
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(mockProfileService.getProfileById).mockResolvedValue(mockProfile);

      // Use case receives IProfileRepository interface
      const repository = adapter;
      const result = await repository.findById(UserId('user-123'));

      expect(result.success).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should wrap service errors in Result type', async () => {
      const userId = UserId('user-123');
      const serviceError = new Error('DynamoDB timeout');

      vi.mocked(mockProfileService.getProfileById).mockRejectedValue(serviceError);

      const result = await adapter.findById(userId);

      // Adapter should catch error and wrap in Result
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it('should preserve error details', async () => {
      const userId = UserId('user-123');
      const error = new Error('Connection refused');
      error.name = 'NetworkError';

      vi.mocked(mockProfileService.getProfileById).mockRejectedValue(error);

      const result = await adapter.findById(userId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Connection refused');
        expect(result.error.name).toBe('NetworkError');
      }
    });

    it('should handle non-Error thrown values', async () => {
      const userId = UserId('user-123');

      vi.mocked(mockProfileService.getProfileById).mockRejectedValue('String error');

      const result = await adapter.findById(userId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Type safety', () => {
    it('should maintain type information through adapter', async () => {
      const mockProfile: Profile = {
        id: 'user-123',
        handle: '@john',
        fullName: 'John Doe',
        bio: 'Engineer',
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(mockProfileService.getProfileById).mockResolvedValue(mockProfile);

      const result = await adapter.findById(UserId('user-123'));

      // TypeScript knows result is AsyncResult<Profile | null>
      if (result.success && result.data) {
        const profile: Profile = result.data;
        const handle: string = profile.handle;
        const fullName: string = profile.fullName;

        expect(handle).toBe('@john');
        expect(fullName).toBe('John Doe');
      }
    });

    it('should enforce IProfileRepository contract', () => {
      // TypeScript compilation verifies adapter implements interface
      // If this test compiles, the adapter correctly implements IProfileRepository
      expect(adapter.findById).toBeDefined();
      expect(adapter.findByHandle).toBeDefined();
      expect(typeof adapter.findById).toBe('function');
      expect(typeof adapter.findByHandle).toBe('function');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string user ID', async () => {
      const userId = UserId('');

      vi.mocked(mockProfileService.getProfileById).mockResolvedValue(null);

      const result = await adapter.findById(userId);

      expect(mockProfileService.getProfileById).toHaveBeenCalledWith('');
      expect(result.success).toBe(true);
    });

    it('should handle very long user IDs', async () => {
      const longId = 'user-' + 'a'.repeat(1000);
      const userId = UserId(longId);

      vi.mocked(mockProfileService.getProfileById).mockResolvedValue(null);

      const result = await adapter.findById(userId);

      expect(mockProfileService.getProfileById).toHaveBeenCalledWith(longId);
    });

    it('should handle unicode characters in handle', async () => {
      const handle = '@用户名';

      vi.mocked(mockProfileService.getProfileByHandle).mockResolvedValue(null);

      const result = await adapter.findByHandle(handle);

      expect(mockProfileService.getProfileByHandle).toHaveBeenCalledWith(handle);
    });

    it('should be stateless (no side effects)', async () => {
      const userId = UserId('user-123');
      const mockProfile: Profile = {
        id: 'user-123',
        handle: '@john',
        fullName: 'John Doe',
        bio: null,
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(mockProfileService.getProfileById).mockResolvedValue(mockProfile);

      // Multiple calls should not affect each other
      const result1 = await adapter.findById(userId);
      const result2 = await adapter.findById(userId);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(mockProfileService.getProfileById).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance', () => {
    it('should handle many concurrent requests', async () => {
      const userId = UserId('user-123');
      const mockProfile: Profile = {
        id: 'user-123',
        handle: '@john',
        fullName: 'John Doe',
        bio: null,
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(mockProfileService.getProfileById).mockResolvedValue(mockProfile);

      // Simulate 100 concurrent requests
      const promises = Array.from({ length: 100 }, () =>
        adapter.findById(userId)
      );

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });
  });
});
