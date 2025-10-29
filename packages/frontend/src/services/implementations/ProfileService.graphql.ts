import type { IGraphQLClient } from '../../graphql/interfaces/IGraphQLClient';
import type { AsyncState } from '../../graphql/types';
import type { IProfileService, ProfileUpdateInput } from '../interfaces/IProfileService';
import type { Profile } from '@social-media-app/shared';
import {
    GET_PROFILE_BY_HANDLE_QUERY,
    UPDATE_PROFILE_MUTATION,
    type GetProfileByHandleResponse,
    type GetProfileByHandleVariables,
    type UpdateProfileResponse,
    type UpdateProfileVariables,
} from '../../graphql/operations/profiles';

/**
 * GraphQL implementation of Profile Service
 * Handles user profile operations via GraphQL API
 */
export class ProfileServiceGraphQL implements IProfileService {
    constructor(private client: IGraphQLClient) { }

    /**
     * Get user profile by handle
     */
    async getProfileByHandle(handle: string): Promise<AsyncState<Profile>> {
        const variables: GetProfileByHandleVariables = { handle };

        const result = await this.client.query<GetProfileByHandleResponse>(
            GET_PROFILE_BY_HANDLE_QUERY,
            variables
        );

        return transformResponse(result, (data) => transformPublicProfile(data.profile));
    }

    /**
     * Update current user's profile
     * Accepts partial updates - all fields are optional
     */
    async updateProfile(updates: ProfileUpdateInput): Promise<AsyncState<Profile>> {
        const variables: UpdateProfileVariables = {
            input: {
                handle: updates.handle,
                fullName: updates.fullName,
                bio: updates.bio,
            },
        };

        const result = await this.client.mutate<UpdateProfileResponse>(
            UPDATE_PROFILE_MUTATION,
            variables
        );

        return transformResponse(result, (data) => transformFullProfile(data.updateProfile));
    }
}

/**
 * Transform GraphQL PublicProfile response to Profile domain model
 * Used for getProfileByHandle (viewing other users)
 */
function transformPublicProfile(graphqlProfile: {
    id: string;
    username: string;
    handle: string;
    fullName: string | null;
    bio: string | null;
    profilePictureUrl: string | null;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    isFollowing: boolean | null;
    createdAt: string;
}): Profile & { isFollowing?: boolean } {
    return {
        id: graphqlProfile.id,
        email: '', // PublicProfile doesn't have email
        username: graphqlProfile.username,
        emailVerified: false, // PublicProfile doesn't have emailVerified
        handle: graphqlProfile.handle,
        fullName: graphqlProfile.fullName ?? undefined,
        bio: graphqlProfile.bio ?? undefined,
        profilePictureUrl: graphqlProfile.profilePictureUrl ?? undefined,
        profilePictureThumbnailUrl: undefined, // PublicProfile doesn't include thumbnail
        followersCount: graphqlProfile.followersCount,
        followingCount: graphqlProfile.followingCount,
        postsCount: graphqlProfile.postsCount,
        createdAt: graphqlProfile.createdAt,
        updatedAt: graphqlProfile.createdAt, // PublicProfile doesn't have updatedAt
        isFollowing: graphqlProfile.isFollowing ?? undefined, // Add isFollowing field
    };
}

/**
 * Transform GraphQL Profile response to Profile domain model
 * Used for updateProfile (authenticated user's own profile)
 */
function transformFullProfile(graphqlProfile: {
    id: string;
    username: string;
    email: string;
    emailVerified: boolean;
    handle: string;
    fullName: string | null;
    bio: string | null;
    profilePictureUrl: string | null;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    createdAt: string;
}): Profile {
    return {
        id: graphqlProfile.id,
        email: graphqlProfile.email,
        username: graphqlProfile.username,
        emailVerified: graphqlProfile.emailVerified,
        handle: graphqlProfile.handle,
        fullName: graphqlProfile.fullName ?? undefined,
        bio: graphqlProfile.bio ?? undefined,
        profilePictureUrl: graphqlProfile.profilePictureUrl ?? undefined,
        followersCount: graphqlProfile.followersCount,
        followingCount: graphqlProfile.followingCount,
        postsCount: graphqlProfile.postsCount,
        createdAt: graphqlProfile.createdAt,
        updatedAt: graphqlProfile.createdAt, // Use createdAt as fallback
    };
}

/**
 * Helper to transform successful GraphQL responses
 */
function transformResponse<TResponse, TData>(
    result: AsyncState<TResponse>,
    transformer: (response: TResponse) => TData
): AsyncState<TData> {
    if (result.status === 'success') {
        return {
            status: 'success' as const,
            data: transformer(result.data),
        };
    }
    return result;
}
