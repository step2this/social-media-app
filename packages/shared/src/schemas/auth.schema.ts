import { z } from 'zod';
import {
  OptionalFullNameField,
  TokenField,
  PasswordTokenField,
  RefreshTokenField,
  VerificationTokenField,
  ResetTokenField
} from './base.schema.js';

// Import user schemas from centralized location
import {
  EmailSchema,
  UsernameSchema,
  UserSchema,
  type User,
  type UpdateUserRequest,
  type UpdateUserResponse
} from './user.schema.js';

/**
 * Authentication-specific validation schemas
 */
export const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Re-export user schemas for convenience
export { EmailSchema, UsernameSchema };

/**
 * Request schemas
 */
export const RegisterRequestSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  username: UsernameSchema,
  fullName: OptionalFullNameField
});

export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: PasswordTokenField,
  deviceInfo: z.object({
    userAgent: z.string().max(500).optional(),
    platform: z.string().max(50).optional()
  }).optional()
});

export const LogoutRequestSchema = z.object({
  refreshToken: RefreshTokenField
});

export const RefreshTokenRequestSchema = z.object({
  refreshToken: RefreshTokenField
});

export const PasswordResetRequestSchema = z.object({
  email: EmailSchema
});

export const PasswordResetConfirmSchema = z.object({
  token: ResetTokenField,
  newPassword: PasswordSchema
});

export const VerifyEmailRequestSchema = z.object({
  token: VerificationTokenField
});

// Use centralized user request schema - no need for auth-specific duplicate
// export const UpdateUserProfileRequestSchema = UpdateUserRequestSchema;

/**
 * Response schemas
 */
export const AuthTokensSchema = z.object({
  accessToken: TokenField,
  refreshToken: RefreshTokenField,
  expiresIn: z.number().positive()
});

// Use centralized user schema - no need for auth-specific duplicate
// export const UserProfileSchema = UserSchema;

export const RegisterResponseSchema = z.object({
  user: UserSchema.pick({
    id: true,
    email: true,
    username: true,
    fullName: true,
    emailVerified: true,
    createdAt: true
  }),
  message: z.string(),
  tokens: AuthTokensSchema.optional() // Optional tokens for auto-login after registration
});

export const LoginResponseSchema = z.object({
  user: UserSchema.omit({
    createdAt: true,
    updatedAt: true
  }),
  tokens: AuthTokensSchema
});

export const LogoutResponseSchema = z.object({
  success: z.boolean(),
  message: z.string()
});

export const RefreshTokenResponseSchema = z.object({
  tokens: AuthTokensSchema
});

export const PasswordResetRequestResponseSchema = z.object({
  message: z.string()
});

export const PasswordResetConfirmResponseSchema = z.object({
  success: z.boolean(),
  message: z.string()
});

export const VerifyEmailResponseSchema = z.object({
  success: z.boolean(),
  message: z.string()
});

export const GetProfileResponseSchema = z.object({
  user: UserSchema
});

// Use centralized user response schema - no need for auth-specific duplicate
// export const UpdateUserProfileResponseSchema = UpdateUserResponseSchema;

/**
 * Type exports
 */
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;
export type PasswordResetRequestResponse = z.infer<typeof PasswordResetRequestResponseSchema>;
export type PasswordResetConfirm = z.infer<typeof PasswordResetConfirmSchema>;
export type PasswordResetConfirmResponse = z.infer<typeof PasswordResetConfirmResponseSchema>;
export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>;
export type VerifyEmailResponse = z.infer<typeof VerifyEmailResponseSchema>;
// Use centralized user types - re-export for convenience
export type UpdateUserProfileRequest = UpdateUserRequest;
export type UpdateUserProfileResponse = UpdateUserResponse;
export type GetProfileResponse = z.infer<typeof GetProfileResponseSchema>;
export type UserProfile = User;
export type AuthTokens = z.infer<typeof AuthTokensSchema>;