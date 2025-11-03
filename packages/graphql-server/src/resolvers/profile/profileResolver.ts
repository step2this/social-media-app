/**
 * profileResolver - Get Profile by Handle
 *
 * Fetches a user's public profile by their handle.
 * Public operation - no authentication required.
 */

import { Container } from '../../infrastructure/di/Container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { ProfileAdapter } from '../../infrastructure/adapters/ProfileAdapter';
import type { ProfileService } from '@social-media-app/dal';

/**
 * Create the profile resolver with DI container.
 *
 * @param container - DI container for resolving services
 * @returns GraphQL resolver for Query.profile
 */
export const createProfileResolver = (container: Container): QueryResolvers['profile'] => {
  return async (_parent: any, args: { handle: string }) => {
    const profileService = container.resolve<ProfileService>('ProfileService');
    const adapter = new ProfileAdapter(profileService);

    return adapter.getProfileByHandle(args.handle);
  };
};
