import type { LoginRequest, RegisterRequest, LoginResponse, RegisterResponse, RefreshTokenResponse } from '@social-media-app/shared';
import { createDefaultAuthService } from '@social-media-app/dal';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { generateAccessToken, generateRefreshToken } from '@social-media-app/auth-utils';

// Log JWT secret being used (masked)
const jwtSecret = process.env.JWT_SECRET || '';
console.log('[NEXT] 🔑 JWT_SECRET loaded:', jwtSecret ? `${jwtSecret.substring(0, 10)}...${jwtSecret.substring(jwtSecret.length - 10)}` : 'NOT SET');

// Initialize DynamoDB client
const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    endpoint: process.env.DYNAMODB_ENDPOINT || process.env.AWS_ENDPOINT_URL,
    region: process.env.AWS_REGION || 'us-east-1',
  })
);

const tableName = process.env.TABLE_NAME || 'social-media-app-dev';

// Create JWT provider
const jwtProvider = {
  generateAccessToken: async (payload: { userId: string; email: string }) => {
    return generateAccessToken(payload);
  },
  generateRefreshToken: () => {
    return generateRefreshToken();
  },
  // Refresh tokens are verified in the database, not as JWTs
  verifyRefreshToken: async (): Promise<{ userId: string } | null> => {
    return null;
  }
};

// Create auth service instance
const authService = createDefaultAuthService(dynamoClient, tableName, jwtProvider);

export async function loginUser(credentials: LoginRequest): Promise<LoginResponse> {
  return authService.login(credentials);
}

export async function registerUser(data: RegisterRequest): Promise<RegisterResponse> {
  return authService.register(data);
}

export async function refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse> {
  return authService.refreshToken({ refreshToken });
}

export async function logoutUser(refreshToken: string, userId: string): Promise<void> {
  return authService.logout(refreshToken, userId);
}
