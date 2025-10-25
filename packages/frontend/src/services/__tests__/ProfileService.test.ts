import { describe, it, expect, beforeEach } from 'vitest';
import type { IProfileService } from '../interfaces/IProfileService';
import { ProfileServiceGraphQL } from '../implementations/ProfileService.graphql';
import { MockGraphQLClient } from '../../graphql/client.mock';
import type { Profile } from '@social-media-app/shared';
import type { ProfileUpdateInput } from '../interfaces/IProfileService';
import type { AsyncState } from '../../graphql/types';
import {
  createMockProfile,
  createMockGetProfileResponse,
  createMockUpdateProfileResponse,
  mockOwnProfile,
  mockFollowedProfile,
} from './fixtures/profileFixtures';
import { wrapInGraphQLSuccess, wrapInGraphQLError } from './fixtures/graphqlFixtures';

describe('ProfileServiceGraphQL', () => {
  let service: IProfileService;
  let mockClient: MockGraphQLClient;

  beforeEach(() => {
    mockClient = new MockGraphQLClient();
    service = new ProfileServiceGraphQL(mockClient);
  });

  describe('getProfileByHandle', () => {
    it('should fetch profile by handle successfully', async () => {
      const mockProfile = createMockProfile({ handle: 'johndoe' });
      mockClient.setQueryResponse(wrapInGraphQLSuccess(createMockGetProfileResponse(mockProfile)));

      const result = await service.getProfileByHandle('johndoe');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.handle).toBe('johndoe');
        expect(result.data.fullName).toBe(mockProfile.fullName);
        expect(result.data.bio).toBe(mockProfile.bio);
        expect(result.data.followersCount).toBe(mockProfile.followersCount);
        expect(result.data.followingCount).toBe(mockProfile.followingCount);
        expect(result.data.postsCount).toBe(mockProfile.postsCount);
      }
    });

    it('should fetch own profile with null isFollowing', async () => {
      mockClient.setQueryResponse(wrapInGraphQLSuccess(createMockGetProfileResponse(mockOwnProfile)));

      const result = await service.getProfileByHandle('myhandle');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.handle).toBe('myhandle');
        expect(result.data.isFollowing).toBeUndefined();
      }
    });

    it('should fetch followed user profile with isFollowing true', async () => {
      mockClient.setQueryResponse(wrapInGraphQLSuccess(createMockGetProfileResponse(mockFollowedProfile)));

      const result = await service.getProfileByHandle('followeduser');

      expect(result.status === 'success');
      if (result.status === 'success') {
        expect(result.data.handle).toBe('followeduser');
        expect(result.data.isFollowing).toBe(true);
      }
    });

    it('should handle profile not found error', async () => {
      mockClient.setQueryResponse(wrapInGraphQLError('Profile not found'));

      const result = await service.getProfileByHandle('nonexistent');

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.message).toContain('Profile not found');
      }
    });

    it('should handle network errors', async () => {
      mockClient.setQueryResponse(wrapInGraphQLError('Network connection failed'));

      const result = await service.getProfileByHandle('johndoe');

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.message).toContain('Network connection failed');
      }
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updates: ProfileUpdateInput = {
        fullName: 'Updated Name',
        bio: 'Updated bio',
      };

      const updatedProfile = createMockProfile({
        ...mockOwnProfile,
        fullName: updates.fullName,
        bio: updates.bio,
      });

      mockClient.setMutationResponse(wrapInGraphQLSuccess(createMockUpdateProfileResponse(updatedProfile)));

      const result = await service.updateProfile(updates);

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.fullName).toBe(updates.fullName);
        expect(result.data.bio).toBe(updates.bio);
        expect(result.data.handle).toBe(mockOwnProfile.handle);
      }
    });

    it('should update only fullName', async () => {
      const updates: ProfileUpdateInput = {
        fullName: 'New Name Only',
      };

      const updatedProfile = createMockProfile({
        ...mockOwnProfile,
        fullName: updates.fullName,
      });

      mockClient.setMutationResponse(wrapInGraphQLSuccess(createMockUpdateProfileResponse(updatedProfile)));

      const result = await service.updateProfile(updates);

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.fullName).toBe(updates.fullName);
        expect(result.data.bio).toBe(mockOwnProfile.bio); // Should remain unchanged
      }
    });

    it('should update only bio', async () => {
      const updates: ProfileUpdateInput = {
        bio: 'New bio only',
      };

      const updatedProfile = createMockProfile({
        ...mockOwnProfile,
        bio: updates.bio,
      });

      mockClient.setMutationResponse(wrapInGraphQLSuccess(createMockUpdateProfileResponse(updatedProfile)));

      const result = await service.updateProfile(updates);

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.bio).toBe(updates.bio);
        expect(result.data.fullName).toBe(mockOwnProfile.fullName); // Should remain unchanged
      }
    });

    it('should handle validation errors', async () => {
      const updates: ProfileUpdateInput = {
        bio: 'x'.repeat(501), // Exceeds max length
      };

      mockClient.setMutationResponse(wrapInGraphQLError('Bio must be 500 characters or less'));

      const result = await service.updateProfile(updates);

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.message).toContain('Bio must be 500 characters or less');
      }
    });

    it('should handle unauthorized errors', async () => {
      const updates: ProfileUpdateInput = {
        fullName: 'Hacker Name',
      };

      mockClient.setMutationResponse(wrapInGraphQLError('Unauthorized'));

      const result = await service.updateProfile(updates);

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.message).toContain('Unauthorized');
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('should fetch profile then update it', async () => {
      // First, fetch the profile
      mockClient.setQueryResponse(wrapInGraphQLSuccess(createMockGetProfileResponse(mockOwnProfile)));

      const fetchResult = await service.getProfileByHandle('myhandle');
      expect(fetchResult.status).toBe('success');

      // Then, update the profile
      const updates: ProfileUpdateInput = {
        fullName: 'Updated Name',
        bio: 'Updated Bio',
      };

      const updatedProfile = createMockProfile({
        ...mockOwnProfile,
        fullName: updates.fullName,
        bio: updates.bio,
      });

      mockClient.setMutationResponse(wrapInGraphQLSuccess(createMockUpdateProfileResponse(updatedProfile)));

      const updateResult = await service.updateProfile(updates);
      expect(updateResult.status).toBe('success');

      if (updateResult.status === 'success') {
        expect(updateResult.data.fullName).toBe(updates.fullName);
        expect(updateResult.data.bio).toBe(updates.bio);
      }
    });
  });
});
