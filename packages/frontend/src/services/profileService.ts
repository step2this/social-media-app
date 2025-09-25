import { apiClient } from './apiClient';
import type {
  PublicProfile,
  Profile,
  UpdateProfileWithHandleRequest,
  GetPresignedUrlRequest,
  GetPresignedUrlResponse,
  PublicProfileResponse,
  UpdateProfileResponse
} from '@social-media-app/shared';

/**
 * Profile service for frontend API calls
 */
export const profileService = {
  /**
   * Get public profile by handle
   */
  async getProfileByHandle(handle: string): Promise<PublicProfile> {
    const response = await apiClient.get<PublicProfileResponse>(`/profile/${handle}`);
    return response.profile;
  },

  /**
   * Get current user's profile
   */
  async getCurrentProfile(): Promise<Profile> {
    const response = await apiClient.get<{ profile: Profile }>('/profile/me');
    return response.profile;
  },

  /**
   * Update current user's profile
   */
  async updateProfile(data: UpdateProfileWithHandleRequest): Promise<Profile> {
    const response = await apiClient.put<UpdateProfileResponse>('/profile', data);
    return response.profile;
  },

  /**
   * Get presigned URL for file upload
   */
  async getUploadUrl(data: GetPresignedUrlRequest): Promise<GetPresignedUrlResponse> {
    const response = await apiClient.post<GetPresignedUrlResponse>('/profile/upload-url', data);
    return response;
  },

  /**
   * Upload file to S3 using presigned URL
   */
  async uploadFile(uploadUrl: string, file: File): Promise<void> {
    await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });
  },

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(file: File): Promise<{ publicUrl: string; thumbnailUrl?: string }> {
    // Get presigned URL
    const uploadData = await this.getUploadUrl({
      fileType: file.type as any,
      purpose: 'profile-picture'
    });

    // Upload file to S3
    await this.uploadFile(uploadData.uploadUrl, file);

    // Update profile with new picture URLs
    await apiClient.patch('/profile/picture', {
      profilePictureUrl: uploadData.publicUrl,
      profilePictureThumbnailUrl: uploadData.thumbnailUrl
    });

    return {
      publicUrl: uploadData.publicUrl,
      thumbnailUrl: uploadData.thumbnailUrl
    };
  }
};