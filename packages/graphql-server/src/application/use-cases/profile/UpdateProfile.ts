/**
 * UpdateProfile Use Case
 *
 * Updates user profile information.
 */

import { AsyncResult, UserId } from '../../../shared/types/index.js';

export interface UpdateProfileInput {
  userId: UserId;
  handle?: string;
  fullName?: string;
  bio?: string;
}

export interface UpdateProfileOutput {
  id: string;
  handle: string;
  fullName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileServices {
  profileService: {
    updateProfile(
      userId: string,
      data: { handle?: string; fullName?: string; bio?: string }
    ): Promise<UpdateProfileOutput>;
  };
}

export class UpdateProfile {
  constructor(private readonly services: UpdateProfileServices) {}

  async execute(input: UpdateProfileInput): AsyncResult<UpdateProfileOutput> {
    try {
      const updatedProfile = await this.services.profileService.updateProfile(
        input.userId,
        {
          handle: input.handle,
          fullName: input.fullName,
          bio: input.bio,
        }
      );

      return {
        success: true,
        data: updatedProfile,
      };
    } catch (error) {
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message.includes('Handle is already taken')) {
          return {
            success: false,
            error,
          };
        }
      }
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to update profile'),
      };
    }
  }
}
