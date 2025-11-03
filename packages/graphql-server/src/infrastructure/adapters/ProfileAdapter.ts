/**
 * ProfileAdapter
 *
 * Adapter that bridges ProfileService (DAL) and GraphQL profile resolvers.
 * Transforms domain Profile types to GraphQL Profile types using TypeMapper.
 *
 * Following hexagonal architecture adapter pattern.
 */

import { GraphQLError } from 'graphql';
import type { ProfileService } from '@social-media-app/dal';
import type { Profile as GraphQLProfile } from '../../schema/generated/types';
import { TypeMapper } from './shared/TypeMapper';

/**
 * ProfileAdapter - Adapts ProfileService to GraphQL profile queries
 */
export class ProfileAdapter {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * Get current authenticated user's profile
   *
   * @param userId - The user ID to fetch profile for
   * @returns GraphQL Profile or null if not found
   * @throws GraphQLError if validation fails or service errors occur
   */
  async getCurrentUserProfile(userId: string): Promise<GraphQLProfile | null> {
    if (!userId) {
      throw new GraphQLError('userId is required');
    }

    try {
      const profile = await this.profileService.getProfileById(userId);
      if (!profile) {
        return null;
      }

      return TypeMapper.toGraphQLProfile(profile);
    } catch (error) {
      throw new GraphQLError((error as Error).message);
    }
  }

  /**
   * Get a public profile by handle
   *
   * @param handle - The user handle to fetch profile for
   * @returns GraphQL Profile or null if not found
   * @throws GraphQLError if validation fails or service errors occur
   */
  async getProfileByHandle(handle: string): Promise<GraphQLProfile | null> {
    if (!handle) {
      throw new GraphQLError('handle is required');
    }

    try {
      const profile = await this.profileService.getProfileByHandle(handle);
      if (!profile) {
        return null;
      }

      return TypeMapper.toGraphQLPublicProfile(profile);
    } catch (error) {
      throw new GraphQLError((error as Error).message);
    }
  }
}
