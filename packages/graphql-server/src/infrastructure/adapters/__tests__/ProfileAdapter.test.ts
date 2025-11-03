/**
 * ProfileAdapter Tests (TDD RED → GREEN)
 *
 * Minimal behavior-focused tests using dependency injection and shared fixtures.
 * Tests that ProfileAdapter correctly uses ProfileService and transforms to GraphQL types.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileAdapter } from '../ProfileAdapter';
import { createMockProfiles } from '@social-media-app/shared/test-utils';
import { GraphQLError } from 'graphql';
import type { ProfileService } from '@social-media-app/dal';

describe('ProfileAdapter', () => {
  let adapter: ProfileAdapter;
  let mockProfileService: ProfileService;

  beforeEach(() => {
    // Inject mock service - no spies needed
    mockProfileService = {
      getProfileById: async () => null,
      getProfileByHandle: async () => null,
    } as any;

    adapter = new ProfileAdapter(mockProfileService);
  });

  describe('getCurrentUserProfile', () => {
    it('transforms Profile to GraphQL Profile', async () => {
      const profile = createMockProfiles(1)[0];
      mockProfileService.getProfileById = async () => profile;

      const result = await adapter.getCurrentUserProfile('user-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('user-1');
      expect(result?.handle).toBe('user1');
    });

    it('returns null when profile not found', async () => {
      mockProfileService.getProfileById = async () => null;

      const result = await adapter.getCurrentUserProfile('nonexistent');

      expect(result).toBeNull();
    });

    it('validates userId parameter', async () => {
      await expect(adapter.getCurrentUserProfile('')).rejects.toThrow('userId is required');
    });

    it('throws GraphQLError on service error', async () => {
      mockProfileService.getProfileById = async () => {
        throw new Error('Database error');
      };

      await expect(adapter.getCurrentUserProfile('user-1')).rejects.toThrow(GraphQLError);
    });
  });

  describe('getProfileByHandle', () => {
    it('transforms PublicProfile to GraphQL Profile', async () => {
      const profile = createMockProfiles(1)[0];
      mockProfileService.getProfileByHandle = async () => profile;

      const result = await adapter.getProfileByHandle('user1');

      expect(result).toBeDefined();
      expect(result?.handle).toBe('user1');
      expect(result?.id).toBe('user-1');
    });

    it('returns null when profile not found', async () => {
      mockProfileService.getProfileByHandle = async () => null;

      const result = await adapter.getProfileByHandle('nonexistent');

      expect(result).toBeNull();
    });

    it('validates handle parameter', async () => {
      await expect(adapter.getProfileByHandle('')).rejects.toThrow('handle is required');
    });
  });
});
