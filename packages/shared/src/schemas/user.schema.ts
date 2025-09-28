import { z } from 'zod';
import {
  UUIDField,
  TimestampField,
  OptionalFullNameField,
  BioField,
  OptionalURLField
} from './base.schema.js';

/**
 * Email validation schema
 */
export const EmailSchema = z.string()
  .trim()
  .toLowerCase()
  .email('Invalid email format')
  .max(255, 'Email must not exceed 255 characters');

/**
 * Username validation schema
 */
export const UsernameSchema = z.string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must not exceed 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

/**
 * Base user data schema - shared fields between requests and responses
 * Contains the mutable user data that can be updated
 */
export const BaseUserDataSchema = z.object({
  fullName: OptionalFullNameField,
  bio: BioField,
  avatarUrl: OptionalURLField
});

/**
 * Core user schema - represents the complete user entity
 * This is the canonical representation of a User in the system
 */
export const UserSchema = BaseUserDataSchema.extend({
  id: UUIDField,
  email: EmailSchema,
  username: UsernameSchema,
  emailVerified: z.boolean(),
  createdAt: TimestampField,
  updatedAt: TimestampField
});

/**
 * Request schemas - for updating user data
 */
export const UpdateUserRequestSchema = BaseUserDataSchema;

/**
 * Response schemas - standardized user responses
 */
export const UpdateUserResponseSchema = z.object({
  user: UserSchema
});

export const GetUserResponseSchema = z.object({
  user: UserSchema
});

/**
 * Public user schema - for displaying user info without sensitive data
 */
export const PublicUserSchema = UserSchema.pick({
  id: true,
  username: true,
  fullName: true,
  bio: true,
  avatarUrl: true,
  createdAt: true
});

export const PublicUserResponseSchema = z.object({
  user: PublicUserSchema
});

/**
 * Type exports
 */
export type BaseUserData = z.infer<typeof BaseUserDataSchema>;
export type User = z.infer<typeof UserSchema>;
export type PublicUser = z.infer<typeof PublicUserSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type UpdateUserResponse = z.infer<typeof UpdateUserResponseSchema>;
export type GetUserResponse = z.infer<typeof GetUserResponseSchema>;
export type PublicUserResponse = z.infer<typeof PublicUserResponseSchema>;