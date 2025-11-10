/**
 * Auth Types - Pothos Implementation
 *
 * This file defines all auth-related GraphQL types using Pothos.
 *
 * Key Benefits:
 * - ✅ Type-safe: TypeScript types flow into GraphQL schema
 * - ✅ No type adapters: Schema matches DAL types exactly
 * - ✅ Autocomplete: Full IntelliSense when defining fields
 * - ✅ Refactoring: Rename a field = schema updates automatically
 *
 * Compare with SDL:
 *
 * SDL (schema.graphql):
 * ```graphql
 * type Profile {
 *   id: ID!
 *   username: String!
 *   # ... must manually keep in sync
 * }
 * ```
 *
 * Pothos (this file):
 * ```typescript
 * builder.objectRef<ProfileFromDAL>('Profile').implement({
 *   fields: (t) => ({
 *     id: t.exposeID('id'),              // ✅ Autocomplete!
 *     username: t.exposeString('username'), // ✅ Type-checked!
 *     // ...
 *   }),
 * });
 * ```
 */

import { builder } from '../builder.js';
import { executeUseCase } from '../../../resolvers/helpers/resolverHelpers.js';

/**
 * Profile Type (DAL)
 *
 * This should match the Profile type returned by ProfileService.
 * For now, using inline type definition. In production, import from DAL.
 */
type ProfileFromDAL = {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
  handle: string;
  fullName?: string;
  bio?: string;
  profilePictureUrl?: string;
  profilePictureThumbnailUrl?: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * AuthTokens Type (DAL)
 *
 * Token information returned by auth operations.
 */
type AuthTokensFromDAL = {
  accessToken: string;
  refreshToken: string;
};

/**
 * AuthPayload Type (DAL)
 *
 * Combined user + tokens returned by register/login/refreshToken.
 */
type AuthPayloadFromDAL = {
  user: ProfileFromDAL;
  tokens: AuthTokensFromDAL;
};

/**
 * LogoutResponse Type (DAL)
 *
 * Simple success response for logout operation.
 */
type LogoutResponseFromDAL = {
  success: boolean;
};

/**
 * Profile GraphQL Type
 *
 * Exposes user profile information.
 * Maps directly from ProfileFromDAL with type safety.
 *
 * Note: Fields with `?` in TypeScript become nullable in GraphQL automatically!
 */
export const ProfileType = builder.objectRef<ProfileFromDAL>('Profile');

ProfileType.implement({
  fields: (t) => ({
    id: t.exposeID('id', {
      description: 'Unique identifier for the user',
    }),
    username: t.exposeString('username', {
      description: 'Unique username for login',
    }),
    email: t.exposeString('email', {
      description: 'Email address (only visible to own profile)',
    }),
    emailVerified: t.exposeBoolean('emailVerified', {
      description: 'Whether email has been verified',
    }),
    handle: t.exposeString('handle', {
      description: 'Public handle (e.g., @johndoe)',
    }),
    fullName: t.exposeString('fullName', {
      nullable: true,
      description: 'Full display name',
    }),
    bio: t.exposeString('bio', {
      nullable: true,
      description: 'User biography',
    }),
    profilePictureUrl: t.exposeString('profilePictureUrl', {
      nullable: true,
      description: 'URL to full-size profile picture',
    }),
    profilePictureThumbnailUrl: t.exposeString('profilePictureThumbnailUrl', {
      nullable: true,
      description: 'URL to profile picture thumbnail',
    }),
    postsCount: t.exposeInt('postsCount', {
      description: 'Total number of posts',
    }),
    followersCount: t.exposeInt('followersCount', {
      description: 'Total number of followers',
    }),
    followingCount: t.exposeInt('followingCount', {
      description: 'Total number of users being followed',
    }),
    createdAt: t.exposeString('createdAt', {
      description: 'Account creation timestamp (ISO 8601)',
    }),
    updatedAt: t.exposeString('updatedAt', {
      description: 'Last update timestamp (ISO 8601)',
    }),
  }),
});

/**
 * AuthTokens GraphQL Type
 *
 * JWT access and refresh tokens returned after authentication.
 */
export const AuthTokensType = builder.objectRef<AuthTokensFromDAL>('AuthTokens');

AuthTokensType.implement({
  fields: (t) => ({
    accessToken: t.exposeString('accessToken', {
      description: 'JWT access token for API authentication',
    }),
    refreshToken: t.exposeString('refreshToken', {
      description: 'JWT refresh token for obtaining new access tokens',
    }),
    expiresIn: t.int({
      description: 'Access token expiration time in seconds',
      resolve: () => 3600, // 1 hour
    }),
  }),
});

/**
 * AuthPayload GraphQL Type
 *
 * Combined response containing user profile and authentication tokens.
 * Returned by register, login, and refreshToken mutations.
 */
export const AuthPayloadType = builder.objectRef<AuthPayloadFromDAL>('AuthPayload');

AuthPayloadType.implement({
  fields: (t) => ({
    user: t.field({
      type: ProfileType,
      description: 'Authenticated user profile',
      resolve: (parent) => parent.user,
    }),
    tokens: t.field({
      type: AuthTokensType,
      description: 'Authentication tokens',
      resolve: (parent) => parent.tokens,
    }),
  }),
});

/**
 * LogoutResponse GraphQL Type
 *
 * Simple success response for logout operation.
 */
export const LogoutResponseType = builder.objectRef<LogoutResponseFromDAL>('LogoutResponse');

LogoutResponseType.implement({
  fields: (t) => ({
    success: t.exposeBoolean('success', {
      description: 'Whether logout was successful',
    }),
  }),
});
