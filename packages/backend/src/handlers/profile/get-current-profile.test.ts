import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler } from './get-current-profile.js';
import { ProfileService } from '@social-media-app/dal';
import * as dynamoUtils from '../../utils/dynamodb.js';
import * as jwtUtils from '../../utils/jwt.js';

vi.mock('@social-media-app/dal', () => ({
  ProfileService: vi.fn()
}));

vi.mock('../../utils/dynamodb.js', () => ({
  createDynamoDBClient: vi.fn(),
  getTableName: vi.fn(),
  createS3Client: vi.fn(),
  getS3BucketName: vi.fn(),
  getCloudFrontDomain: vi.fn()
}));

vi.mock('../../utils/jwt.js', () => ({
  createJWTProvider: vi.fn(),
  getJWTConfigFromEnv: vi.fn(),
  extractTokenFromHeader: vi.fn(),
  verifyAccessToken: vi.fn()
}));

const MockProfileService = ProfileService as vi.MockedClass<typeof ProfileService>;
const mockCreateDynamoDBClient = dynamoUtils.createDynamoDBClient as MockedFunction<typeof dynamoUtils.createDynamoDBClient>;
const mockGetTableName = dynamoUtils.getTableName as MockedFunction<typeof dynamoUtils.getTableName>;
const mockCreateS3Client = dynamoUtils.createS3Client as MockedFunction<typeof dynamoUtils.createS3Client>;
const mockGetS3BucketName = dynamoUtils.getS3BucketName as MockedFunction<typeof dynamoUtils.getS3BucketName>;
const mockGetCloudFrontDomain = dynamoUtils.getCloudFrontDomain as MockedFunction<typeof dynamoUtils.getCloudFrontDomain>;
const mockCreateJWTProvider = jwtUtils.createJWTProvider as MockedFunction<typeof jwtUtils.createJWTProvider>;
const mockGetJWTConfigFromEnv = jwtUtils.getJWTConfigFromEnv as MockedFunction<typeof jwtUtils.getJWTConfigFromEnv>;
const mockExtractTokenFromHeader = jwtUtils.extractTokenFromHeader as MockedFunction<typeof jwtUtils.extractTokenFromHeader>;
const mockVerifyAccessToken = jwtUtils.verifyAccessToken as MockedFunction<typeof jwtUtils.verifyAccessToken>;

describe('Get Current Profile Handler', () => {
  let mockProfileService: any;

  const createMockEvent = (
    headers?: Record<string, string>
  ): APIGatewayProxyEventV2 => ({
    version: '2.0',
    routeKey: 'GET /profile/me',
    rawPath: '/profile/me',
    rawQueryString: '',
    headers: headers || {},
    requestContext: {
      requestId: 'test-request-id',
      http: {
        method: 'GET',
        path: '/profile/me',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent'
      },
      stage: 'test',
      time: '2024-01-01T00:00:00Z',
      timeEpoch: 1704067200000,
      accountId: 'test-account',
      apiId: 'test-api',
      requestId: 'test-request-id',
      routeKey: 'GET /profile/me',
      domainName: 'test-domain',
      domainPrefix: 'test'
    },
    body: null,
    isBase64Encoded: false
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockProfileService = {
      getProfileById: vi.fn(),
    };

    mockCreateDynamoDBClient.mockReturnValue({} as any);
    mockGetTableName.mockReturnValue('test-table');
    mockCreateS3Client.mockReturnValue({} as any);
    mockGetS3BucketName.mockReturnValue('test-bucket');
    mockGetCloudFrontDomain.mockReturnValue('test-cloudfront.com');
    mockCreateJWTProvider.mockReturnValue({} as any);
    mockGetJWTConfigFromEnv.mockReturnValue({ secret: 'test-secret' });
    MockProfileService.mockImplementation(() => mockProfileService);
  });

  describe('Authentication', () => {
    it('should return 401 when no Authorization header provided', async () => {
      mockExtractTokenFromHeader.mockReturnValue(null);

      const event = createMockEvent();
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body!)).toEqual({
        error: 'Access token required'
      });
      expect(mockProfileService.getProfileById).not.toHaveBeenCalled();
    });

    it('should return 401 when invalid token provided', async () => {
      mockExtractTokenFromHeader.mockReturnValue('invalid-token');
      mockVerifyAccessToken.mockResolvedValue(null);

      const event = createMockEvent({
        Authorization: 'Bearer invalid-token'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body!)).toEqual({
        error: 'Invalid access token'
      });
      expect(mockProfileService.getProfileById).not.toHaveBeenCalled();
    });
  });

  describe('Profile Retrieval', () => {
    const mockUser = {
      id: 'dd85593c-49b6-4102-a111-937d1bcd5cae',
      email: 'test@example.com',
      username: 'testuser',
      handle: 'testhandle',
      fullName: 'Test User',
      bio: 'Test bio',
      profilePictureUrl: 'https://example.com/avatar.jpg',
      profilePictureThumbnailUrl: undefined,
      postsCount: 5,
      followersCount: 10,
      followingCount: 15,
      emailVerified: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    beforeEach(() => {
      mockExtractTokenFromHeader.mockReturnValue('valid-token');
      mockVerifyAccessToken.mockResolvedValue({ userId: 'dd85593c-49b6-4102-a111-937d1bcd5cae' });
    });

    it('should return current user profile when valid token provided', async () => {
      mockProfileService.getProfileById.mockResolvedValue(mockUser);

      const event = createMockEvent({
        Authorization: 'Bearer valid-token'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockProfileService.getProfileById).toHaveBeenCalledWith('dd85593c-49b6-4102-a111-937d1bcd5cae');

      const responseBody = JSON.parse(result.body!);
      expect(responseBody).toEqual({ profile: mockUser });
    });

    it('should return 404 when user profile not found', async () => {
      mockProfileService.getProfileById.mockResolvedValue(null);

      const event = createMockEvent({
        Authorization: 'Bearer valid-token'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      expect(mockProfileService.getProfileById).toHaveBeenCalledWith('dd85593c-49b6-4102-a111-937d1bcd5cae');

      const responseBody = JSON.parse(result.body!);
      expect(responseBody).toEqual({
        error: 'Profile not found'
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockExtractTokenFromHeader.mockReturnValue('valid-token');
      mockVerifyAccessToken.mockResolvedValue({ userId: 'dd85593c-49b6-4102-a111-937d1bcd5cae' });
    });

    it('should return 500 when ProfileService throws an error', async () => {
      const serviceError = new Error('Database connection failed');
      mockProfileService.getProfileById.mockRejectedValue(serviceError);

      const event = createMockEvent({
        Authorization: 'Bearer valid-token'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const responseBody = JSON.parse(result.body!);
      expect(responseBody).toEqual({
        error: 'Internal server error'
      });
    });

    it('should return 500 when JWT verification throws an error', async () => {
      mockVerifyAccessToken.mockRejectedValue(new Error('JWT verification failed'));

      const event = createMockEvent({
        Authorization: 'Bearer valid-token'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const responseBody = JSON.parse(result.body!);
      expect(responseBody).toEqual({
        error: 'Internal server error'
      });
    });
  });

  describe('Response Format', () => {
    const mockUser = {
      id: 'ca11b0cd-c07a-41fe-b60c-b51bd3854be9',
      email: 'format@example.com',
      username: 'formatuser',
      handle: 'formathandle',
      fullName: 'Format User',
      bio: 'Format bio',
      profilePictureUrl: 'https://example.com/format.jpg',
      profilePictureThumbnailUrl: undefined,
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
      emailVerified: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    beforeEach(() => {
      mockExtractTokenFromHeader.mockReturnValue('valid-token');
      mockVerifyAccessToken.mockResolvedValue({ userId: 'ca11b0cd-c07a-41fe-b60c-b51bd3854be9' });
    });

    it('should return properly formatted response with correct headers', async () => {
      mockProfileService.getProfileById.mockResolvedValue(mockUser);

      const event = createMockEvent({
        Authorization: 'Bearer valid-token'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toEqual({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      });

      const responseBody = JSON.parse(result.body!);
      expect(responseBody).toHaveProperty('profile');
      expect(responseBody.profile).toEqual(mockUser);
    });

    it('should include all required profile fields', async () => {
      mockProfileService.getProfileById.mockResolvedValue(mockUser);

      const event = createMockEvent({
        Authorization: 'Bearer valid-token'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);

      const responseBody = JSON.parse(result.body!);
      const profile = responseBody.profile;

      expect(profile).toHaveProperty('id');
      expect(profile).toHaveProperty('email');
      expect(profile).toHaveProperty('username');
      expect(profile).toHaveProperty('handle');
      expect(profile).toHaveProperty('fullName');
      expect(profile).toHaveProperty('bio');
      expect(profile).toHaveProperty('profilePictureUrl');
      expect(profile).toHaveProperty('postsCount');
      expect(profile).toHaveProperty('followersCount');
      expect(profile).toHaveProperty('followingCount');
      expect(profile).toHaveProperty('emailVerified');
      expect(profile).toHaveProperty('createdAt');
      expect(profile).toHaveProperty('updatedAt');
    });
  });

  describe('Service Integration', () => {
    beforeEach(() => {
      mockExtractTokenFromHeader.mockReturnValue('valid-token');
      mockVerifyAccessToken.mockResolvedValue({ userId: '15f781e5-542b-4672-9e4c-429908b7934a' });
    });

    it('should initialize ProfileService with correct parameters', async () => {
      const mockUser = {
        id: '15f781e5-542b-4672-9e4c-429908b7934a',
        email: 'service@example.com',
        username: 'serviceuser',
        handle: 'servicehandle',
        fullName: undefined,
        bio: undefined,
        profilePictureUrl: undefined,
        profilePictureThumbnailUrl: undefined,
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockProfileService.getProfileById.mockResolvedValue(mockUser);

      const event = createMockEvent({
        Authorization: 'Bearer valid-token'
      });

      await handler(event);

      expect(MockProfileService).toHaveBeenCalledWith(
        {}, // DynamoDB client mock
        'test-table',
        'test-bucket', // S3 bucket name
        'test-cloudfront.com', // CloudFront domain
        {} // S3 client mock
      );
    });
  });
});