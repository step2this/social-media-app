import { http, HttpResponse } from 'msw';
import {
  GetPresignedUrlRequestSchema,
  GetPresignedUrlResponseSchema,
  type GetPresignedUrlRequest,
  type GetPresignedUrlResponse,
  type PublicProfile,
  type Profile,
  type PublicProfileResponse,
  type UpdateProfileWithHandleRequest,
  type UpdateProfileResponse
} from '@social-media-app/shared';

// Use the same API base URL as the apiClient
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Mock profile data
const mockProfiles: Record<string, PublicProfile> = {
  'testuser': {
    id: 'user-123',
    username: 'testuser',
    handle: 'testuser',
    fullName: 'Test User',
    bio: 'Just testing the app!',
    profilePictureUrl: 'https://picsum.photos/200/200?random=1',
    profilePictureThumbnailUrl: 'https://picsum.photos/100/100?random=1',
    postsCount: 5,
    followersCount: 42,
    followingCount: 24,
    createdAt: '2024-01-01T00:00:00.000Z'
  }
};

const mockCurrentProfile: Profile = {
  ...mockProfiles.testuser,
  email: 'test@example.com',
  emailVerified: true,
  updatedAt: '2024-01-01T00:00:00.000Z'
};

/**
 * Profile-related MSW handlers
 */
export const profileHandlers = [
  // Get presigned URL for file upload
  http.post(`${API_BASE_URL}/profile/upload-url`, async ({ request }) => {
    try {
      console.log('📤 MSW: Getting presigned upload URL...');

      // Parse request body
      const body = await request.json() as GetPresignedUrlRequest;

      // Validate request
      GetPresignedUrlRequestSchema.parse(body);

      // Generate mock presigned URLs
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const response: GetPresignedUrlResponse = {
        uploadUrl: `https://mock-s3-upload.example.com/upload/${fileId}`,
        publicUrl: `https://mock-cdn.example.com/media/${fileId}`,
        thumbnailUrl: `https://mock-cdn.example.com/media/${fileId}-thumb`,
        expiresIn: 3600 // 1 hour
      };

      // Validate response
      const validatedResponse = GetPresignedUrlResponseSchema.parse(response);

      // Add realistic delay
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 100));

      console.log('✅ MSW: Presigned URL generated', fileId);

      return HttpResponse.json(validatedResponse, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      console.error('❌ MSW: Error generating presigned URL:', error);

      if ((error as any)?.name === 'ZodError') {
        return HttpResponse.json(
          {
            error: 'Validation failed',
            details: (error as any).errors
          },
          { status: 400 }
        );
      }

      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }),

  // Get public profile by handle
  http.get(`${API_BASE_URL}/profile/:handle`, ({ params }) => {
    try {
      const { handle } = params;
      console.log(`👤 MSW: Getting profile for handle: ${handle}`);

      const profile = mockProfiles[handle as string];
      if (!profile) {
        return HttpResponse.json(
          { error: 'Profile not found' },
          { status: 404 }
        );
      }

      const response: PublicProfileResponse = {
        profile
      };

      return HttpResponse.json(response);

    } catch (error) {
      console.error('❌ MSW: Error getting profile:', error);
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }),

  // Get current user's profile
  http.get(`${API_BASE_URL}/profile/me`, () => {
    try {
      console.log('👤 MSW: Getting current user profile');

      return HttpResponse.json({ profile: mockCurrentProfile });

    } catch (error) {
      console.error('❌ MSW: Error getting current profile:', error);
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }),

  // Update profile
  http.put(`${API_BASE_URL}/profile`, async ({ request }) => {
    try {
      console.log('✏️ MSW: Updating profile...');

      // Parse request body
      const body = await request.json() as UpdateProfileWithHandleRequest;

      // Simple validation (could add schema validation here)
      if (!body) {
        return HttpResponse.json(
          { error: 'Request body is required' },
          { status: 400 }
        );
      }

      // Update mock profile
      const updatedProfile: Profile = {
        ...mockCurrentProfile,
        ...body,
        updatedAt: new Date().toISOString()
      };

      // Update the mock data
      Object.assign(mockCurrentProfile, updatedProfile);
      if (body.handle && mockProfiles[mockCurrentProfile.handle]) {
        delete mockProfiles[mockCurrentProfile.handle];
        mockProfiles[body.handle] = updatedProfile;
      }

      const response: UpdateProfileResponse = {
        profile: updatedProfile,
        message: 'Profile updated successfully'
      };

      console.log('✅ MSW: Profile updated');

      return HttpResponse.json(response);

    } catch (error) {
      console.error('❌ MSW: Error updating profile:', error);
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }),

  // Update profile picture URLs
  http.patch(`${API_BASE_URL}/profile/picture`, async ({ request }) => {
    try {
      console.log('🖼️ MSW: Updating profile picture...');

      const body = await request.json() as {
        profilePictureUrl: string;
        profilePictureThumbnailUrl?: string;
      };

      // Update mock profile
      mockCurrentProfile.profilePictureUrl = body.profilePictureUrl;
      if (body.profilePictureThumbnailUrl) {
        mockCurrentProfile.profilePictureThumbnailUrl = body.profilePictureThumbnailUrl;
      }
      mockCurrentProfile.updatedAt = new Date().toISOString();

      console.log('✅ MSW: Profile picture updated');

      return HttpResponse.json({ success: true });

    } catch (error) {
      console.error('❌ MSW: Error updating profile picture:', error);
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }),

  // Mock S3 upload endpoint (for the actual file upload)
  http.put('https://mock-s3-upload.example.com/upload/*', async () => {
    try {
      console.log('🗄️ MSW: Mock S3 upload...');

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      console.log('✅ MSW: File uploaded to mock S3');

      return new HttpResponse(null, {
        status: 200,
        headers: {
          'ETag': '"mock-etag-' + Math.random().toString(36) + '"',
          'x-amz-request-id': 'mock-request-id-' + Math.random().toString(36)
        }
      });

    } catch (error) {
      console.error('❌ MSW: Error uploading to S3:', error);
      return HttpResponse.json(
        { error: 'Upload failed' },
        { status: 500 }
      );
    }
  })
];