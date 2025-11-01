/**
 * GetFollowStatus Use Case
 *
 * Retrieves the follow status between two users.
 * Delegates to repository implementation for data access.
 */

import type { IFollowRepository, FollowStatus } from '../../../domain/repositories/IFollowRepository';
import type { Result } from '../../../shared/types/result';

export class GetFollowStatus {
  constructor(private readonly followRepository: IFollowRepository) {}

  async execute(
    followerId: string,
    followeeId: string
  ): Promise<Result<FollowStatus, Error>> {
    return this.followRepository.getFollowStatus(followerId, followeeId);
  }
}
