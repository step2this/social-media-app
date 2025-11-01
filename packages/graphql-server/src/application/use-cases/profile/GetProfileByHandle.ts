/**
 * GetProfileByHandle Use Case
 *
 * Retrieves a user profile by handle (e.g., @johndoe).
 * This is a public operation - no authentication required.
 */

import type { IProfileRepository, Profile } from '../../../domain/repositories/IProfileRepository.js';
import { AsyncResult } from '../../../shared/types/index.js';

export interface GetProfileByHandleInput {
  handle: string;
}

export class GetProfileByHandle {
  constructor(private readonly profileRepository: IProfileRepository) {}

  async execute(input: GetProfileByHandleInput): AsyncResult<Profile> {
    // Validate handle provided
    if (!input.handle || input.handle.trim() === '') {
      return {
        success: false,
        error: new Error('Handle is required'),
      };
    }

    // Fetch profile from repository
    const repositoryResult = await this.profileRepository.findByHandle(input.handle);

    if (!repositoryResult.success) {
      return repositoryResult;
    }

    if (!repositoryResult.data) {
      return {
        success: false,
        error: new Error(`Profile not found: ${input.handle}`),
      };
    }

    return {
      success: true,
      data: repositoryResult.data,
    };
  }
}
