import { z } from 'zod';

/**
 * Common validation schemas for authentication
 */
export const EmailSchema = z.string()
  .trim()
  .toLowerCase()
  .email('Invalid email format')
  .max(255, 'Email must not exceed 255 characters');

export const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const UsernameSchema = z.string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must not exceed 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

/**
 * Request schemas
 */
export const RegisterRequestSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  username: UsernameSchema,
  fullName: z.string().min(1).max(100).trim().optional()
});

export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
  deviceInfo: z.object({
    userAgent: z.string().max(500).optional(),
    platform: z.string().max(50).optional()
  }).optional()
});

export const LogoutRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

export const PasswordResetRequestSchema = z.object({
  email: EmailSchema
});

export const PasswordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: PasswordSchema
});

export const VerifyEmailRequestSchema = z.object({
  token: z.string().min(1, 'Verification token is required')
});

export const UpdateProfileRequestSchema = z.object({
  fullName: z.string().min(1).max(100).trim().optional(),
  bio: z.string().max(500).trim().optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional()
});

/**
 * Response schemas
 */
export const AuthTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().positive()
});

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: EmailSchema,
  username: UsernameSchema,
  fullName: z.string().optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const RegisterResponseSchema = z.object({
  user: UserProfileSchema.pick({
    id: true,
    email: true,
    username: true,
    fullName: true,
    emailVerified: true,
    createdAt: true
  }),
  message: z.string()
});

export const LoginResponseSchema = z.object({
  user: UserProfileSchema.omit({
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
  user: UserProfileSchema
});

export const UpdateProfileResponseSchema = z.object({
  user: UserProfileSchema
});

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
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
export type UpdateProfileResponse = z.infer<typeof UpdateProfileResponseSchema>;
export type GetProfileResponse = z.infer<typeof GetProfileResponseSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type AuthTokens = z.infer<typeof AuthTokensSchema>;