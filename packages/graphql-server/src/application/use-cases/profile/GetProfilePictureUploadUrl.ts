/**
 * GetProfilePictureUploadUrl Use Case
 *
 * Generates presigned S3 URL for profile picture upload.
 */

import { AsyncResult, UserId } from '../../../shared/types/index.js';

export type ImageFileType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

export interface GetProfilePictureUploadUrlInput {
  userId: UserId;
  fileType: ImageFileType;
}

export interface GetProfilePictureUploadUrlOutput {
  uploadUrl: string;
}

export interface GetProfilePictureUploadUrlServices {
  profileService: {
    generatePresignedUrl(
      userId: string,
      options: { fileType: ImageFileType; purpose: string }
    ): Promise<{
      uploadUrl: string;
      publicUrl: string;
      thumbnailUrl?: string;
    }>;
  };
}

export class GetProfilePictureUploadUrl {
  constructor(private readonly services: GetProfilePictureUploadUrlServices) {}

  async execute(input: GetProfilePictureUploadUrlInput): AsyncResult<GetProfilePictureUploadUrlOutput> {
    try {
      const result = await this.services.profileService.generatePresignedUrl(
        input.userId,
        {
          fileType: input.fileType,
          purpose: 'profile-picture',
        }
      );

      return {
        success: true,
        data: {
          uploadUrl: result.uploadUrl,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to generate upload URL'),
      };
    }
  }
}
