import { describe, it, expect } from 'vitest';
import {
  HandleSchema,
  ProfileSchema,
  UpdateProfileWithHandleRequestSchema,
  GetPresignedUrlRequestSchema,
  PublicProfileSchema
} from './profile.schema.js';

describe('Profile Schemas', () => {
  describe('HandleSchema', () => {
    it('should validate valid handles', () => {
      const validHandles = ['john123', 'user_name', 'test123', 'ABC'];
      validHandles.forEach(handle => {
        expect(() => HandleSchema.parse(handle)).not.toThrow();
      });
    });

    it('should reject invalid handles', () => {
      const invalidHandles = [
        'ab', // too short
        'a'.repeat(31), // too long
        'user@name', // invalid character
        'user-name', // invalid character
        'user name', // space
      ];
      invalidHandles.forEach(handle => {
        expect(() => HandleSchema.parse(handle)).toThrow();
      });
    });

    it('should convert handle to lowercase', () => {
      const result = HandleSchema.parse('JohnDoe');
      expect(result).toBe('johndoe');
    });

    it('should trim whitespace', () => {
      const result = HandleSchema.parse('  johndoe  ');
      expect(result).toBe('johndoe');
    });
  });

  describe('UpdateProfileWithHandleRequestSchema', () => {
    it('should validate valid update request', () => {
      const validRequest = {
        handle: 'newhandle',
        bio: 'This is my bio',
        fullName: 'John Doe'
      };
      const result = UpdateProfileWithHandleRequestSchema.parse(validRequest);
      expect(result).toMatchObject({
        handle: 'newhandle',
        bio: 'This is my bio',
        fullName: 'John Doe'
      });
    });

    it('should accept partial updates', () => {
      const partialRequest = { bio: 'Updated bio' };
      const result = UpdateProfileWithHandleRequestSchema.parse(partialRequest);
      expect(result).toMatchObject({ bio: 'Updated bio' });
    });

    it('should accept empty object for no updates', () => {
      const emptyRequest = {};
      const result = UpdateProfileWithHandleRequestSchema.parse(emptyRequest);
      expect(result).toEqual({});
    });

    it('should reject bio that is too long', () => {
      const request = { bio: 'a'.repeat(501) };
      expect(() => UpdateProfileWithHandleRequestSchema.parse(request)).toThrow();
    });
  });

  describe('GetPresignedUrlRequestSchema', () => {
    it('should validate valid presigned URL request', () => {
      const validRequest = {
        fileType: 'image/jpeg',
        purpose: 'profile-picture'
      };
      const result = GetPresignedUrlRequestSchema.parse(validRequest);
      expect(result).toMatchObject(validRequest);
    });

    it('should accept all valid file types', () => {
      const fileTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      fileTypes.forEach(fileType => {
        const request = { fileType, purpose: 'post-image' };
        expect(() => GetPresignedUrlRequestSchema.parse(request)).not.toThrow();
      });
    });

    it('should accept both valid purposes', () => {
      const purposes = ['profile-picture', 'post-image'];
      purposes.forEach(purpose => {
        const request = { fileType: 'image/jpeg', purpose };
        expect(() => GetPresignedUrlRequestSchema.parse(request)).not.toThrow();
      });
    });

    it('should reject invalid file type', () => {
      const request = {
        fileType: 'image/bmp',
        purpose: 'profile-picture'
      };
      expect(() => GetPresignedUrlRequestSchema.parse(request)).toThrow();
    });

    it('should reject invalid purpose', () => {
      const request = {
        fileType: 'image/jpeg',
        purpose: 'invalid-purpose'
      };
      expect(() => GetPresignedUrlRequestSchema.parse(request)).toThrow();
    });
  });

  describe('PublicProfileSchema', () => {
    it('should include only public fields', () => {
      const fullProfile = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        handle: 'userhandle',
        username: 'username',
        fullName: 'John Doe',
        bio: 'My bio',
        avatarUrl: 'https://example.com/avatar.jpg',
        profilePictureUrl: 'https://example.com/picture.jpg',
        profilePictureThumbnailUrl: 'https://example.com/thumb.jpg',
        postsCount: 10,
        followersCount: 100,
        followingCount: 50,
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const publicProfile = PublicProfileSchema.parse(fullProfile);

      // Should include public fields
      expect(publicProfile).toHaveProperty('id');
      expect(publicProfile).toHaveProperty('handle');
      expect(publicProfile).toHaveProperty('username');
      expect(publicProfile).toHaveProperty('fullName');
      expect(publicProfile).toHaveProperty('bio');
      expect(publicProfile).toHaveProperty('profilePictureUrl');
      expect(publicProfile).toHaveProperty('postsCount');
      expect(publicProfile).toHaveProperty('followersCount');
      expect(publicProfile).toHaveProperty('followingCount');
      expect(publicProfile).toHaveProperty('createdAt');

      // Should NOT include private fields
      expect(publicProfile).not.toHaveProperty('email');
      expect(publicProfile).not.toHaveProperty('emailVerified');
      expect(publicProfile).not.toHaveProperty('updatedAt');
    });
  });
});