import { http, HttpResponse } from 'msw';
import {
  CreatePostRequestSchema,
  CreatePostResponseSchema,
  UpdatePostRequestSchema,
  type CreatePostRequest,
  type CreatePostResponse,
  type Post,
  type UpdatePostRequest,
  type PostsListResponse,
  type PostGridResponse,
  type DeletePostResponse
} from '@social-media-app/shared';

// Use the same API base URL as the apiClient
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Mock data storage
let mockPosts: Post[] = [];
let postIdCounter = 1;

// Helper to generate mock post
const generateMockPost = (request: CreatePostRequest, userId: string, userHandle: string): Post => {
  const id = `post-${postIdCounter++}`;
  const now = new Date().toISOString();

  return {
    id,
    userId,
    userHandle,
    imageUrl: `https://picsum.photos/800/600?random=${postIdCounter}`,
    thumbnailUrl: `https://picsum.photos/400/300?random=${postIdCounter}`,
    caption: request.caption || undefined,
    tags: request.tags || [],
    likesCount: Math.floor(Math.random() * 100),
    commentsCount: Math.floor(Math.random() * 20),
    isPublic: request.isPublic ?? true,
    createdAt: now,
    updatedAt: now
  };
};

/**
 * Post-related MSW handlers
 */
export const postHandlers = [
  // Create post
  http.post(`${API_BASE_URL}/posts`, async ({ request }) => {
    try {
      console.log('📝 MSW: Creating post...');

      // Parse request body
      const body = await request.json() as CreatePostRequest;

      // Validate request
      const validatedRequest = CreatePostRequestSchema.parse(body);

      // Mock authentication (in real app this would come from token)
      const userId = 'user-123';
      const userHandle = 'testuser';

      // Create mock post
      const post = generateMockPost(validatedRequest, userId, userHandle);
      mockPosts.unshift(post); // Add to beginning of array

      // Generate mock response with upload URLs
      const response: CreatePostResponse = {
        post,
        uploadUrl: `https://mock-s3-upload-url.com/${post.id}`,
        thumbnailUploadUrl: `https://mock-s3-upload-url.com/${post.id}-thumb`
      };

      // Validate response
      const validatedResponse = CreatePostResponseSchema.parse(response);

      // Add realistic delay
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300));

      console.log('✅ MSW: Post created successfully', post.id);

      return HttpResponse.json(validatedResponse, {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      console.error('❌ MSW: Error creating post:', error);

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

  // Get user posts (for post grid)
  http.get(`${API_BASE_URL}/profile/:handle/posts`, ({ params, request }) => {
    try {
      const { handle } = params;
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '24');
      const cursor = url.searchParams.get('cursor');

      console.log(`📝 MSW: Getting posts for handle: ${handle}`);

      // Filter posts for this user (mock)
      const userPosts = mockPosts.filter(post => post.userHandle === handle);

      // Simple pagination mock
      let startIndex = 0;
      if (cursor) {
        const cursorIndex = userPosts.findIndex(post => post.id === cursor);
        startIndex = cursorIndex > -1 ? cursorIndex + 1 : 0;
      }

      const paginatedPosts = userPosts.slice(startIndex, startIndex + limit);
      const hasNext = startIndex + limit < userPosts.length;
      const nextCursor = hasNext ? paginatedPosts[paginatedPosts.length - 1]?.id : undefined;

      // Convert to grid items
      const gridPosts = paginatedPosts.map(post => ({
        id: post.id,
        thumbnailUrl: post.thumbnailUrl,
        caption: post.caption,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        createdAt: post.createdAt
      }));

      const response: PostGridResponse = {
        posts: gridPosts,
        totalCount: userPosts.length,
        hasMore: hasNext,
        nextCursor
      };

      return HttpResponse.json(response);

    } catch (error) {
      console.error('❌ MSW: Error getting user posts:', error);
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }),

  // Get current user's posts
  http.get(`${API_BASE_URL}/posts/my`, ({ request }) => {
    try {
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '24');
      const cursor = url.searchParams.get('cursor');

      console.log('📝 MSW: Getting current user posts');

      // Simple pagination mock
      let startIndex = 0;
      if (cursor) {
        const cursorIndex = mockPosts.findIndex(post => post.id === cursor);
        startIndex = cursorIndex > -1 ? cursorIndex + 1 : 0;
      }

      const paginatedPosts = mockPosts.slice(startIndex, startIndex + limit);
      const hasNext = startIndex + limit < mockPosts.length;
      const nextCursor = hasNext ? paginatedPosts[paginatedPosts.length - 1]?.id : undefined;

      const response: PostsListResponse = {
        posts: paginatedPosts,
        hasMore: hasNext,
        nextCursor
      };

      return HttpResponse.json(response);

    } catch (error) {
      console.error('❌ MSW: Error getting user posts:', error);
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }),

  // Get single post
  http.get(`${API_BASE_URL}/posts/:postId`, ({ params }) => {
    try {
      const { postId } = params;
      const post = mockPosts.find(p => p.id === postId);

      if (!post) {
        return HttpResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        );
      }

      return HttpResponse.json({ post });

    } catch (error) {
      console.error('❌ MSW: Error getting post:', error);
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }),

  // Update post
  http.put(`${API_BASE_URL}/posts/:postId`, async ({ params, request }) => {
    try {
      const { postId } = params;
      const body = await request.json() as UpdatePostRequest;

      const validatedRequest = UpdatePostRequestSchema.parse(body);

      const postIndex = mockPosts.findIndex(p => p.id === postId);
      if (postIndex === -1) {
        return HttpResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        );
      }

      // Update post
      mockPosts[postIndex] = {
        ...mockPosts[postIndex],
        ...validatedRequest,
        updatedAt: new Date().toISOString()
      };

      return HttpResponse.json({ post: mockPosts[postIndex] });

    } catch (error) {
      console.error('❌ MSW: Error updating post:', error);

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

  // Delete post
  http.delete(`${API_BASE_URL}/posts/:postId`, ({ params }) => {
    try {
      const { postId } = params;
      const postIndex = mockPosts.findIndex(p => p.id === postId);

      if (postIndex === -1) {
        return HttpResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        );
      }

      mockPosts.splice(postIndex, 1);

      const response: DeletePostResponse = {
        success: true,
        message: 'Post deleted successfully'
      };

      return HttpResponse.json(response);

    } catch (error) {
      console.error('❌ MSW: Error deleting post:', error);
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  })
];