/**
 * meResolver - Get Current User Profile
 *
 * Returns the profile of the authenticated user.
 * Requires authentication via withAuth HOC.
 */

import { GraphQLError } from 'graphql';
import { withAuth } from '../../infrastructure/resolvers/withAuth.js';
import { Container } from '../../infrastructure/di/Container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { ProfileAdapter } from '../../infrastructure/adapters/ProfileAdapter';
import type { ProfileService } from '@social-media-app/dal';

/**
 * Create the me resolver with DI container.
 *
 * @param container - DI container for resolving services
 * @returns GraphQL resolver for Query.me
 */
export const createMeResolver = (container: Container): QueryResolvers['me'] => {
  return withAuth(async (_parent: any, _args: any, context: any) => {
    const profileService = container.resolve<ProfileService>('ProfileService');
    const adapter = new ProfileAdapter(profileService);

    const profile = await adapter.getCurrentUserProfile(context.userId!);

    if (!profile) {
      throw new GraphQLError('Profile not found for authenticated user');
    }

    return profile;
  });
};
