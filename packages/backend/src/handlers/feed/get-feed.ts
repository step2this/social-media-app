/* eslint-disable max-lines-per-function, max-statements */
/**
 * GET /feed - Hybrid Materialized Feed Handler
 *
 * Implements hybrid feed system that combines:
 * - Materialized feed items (pre-computed for normal users)
 * - Query-time feed items (fetched on-demand for celebrities ≥5000 followers)
 *
 * Architecture:
 * 1. Fetch materialized feed items from user's feed
 * 2. Get list of users the current user follows
 * 3. For each followed user, check if they're a celebrity
 * 4. If celebrity, fetch their posts in real-time
 * 5. Merge and sort all items by createdAt (newest first)
 * 6. Apply pagination limit
 *
 * Performance:
 * - Materialized items: O(1) DynamoDB query
 * - Celebrity detection: O(n) where n = number of followed users
 * - Celebrity posts: O(m) where m = number of celebrities
 *
 * @see FeedService.getMaterializedFeedItems for materialized feed
 * @see FollowService for following list and follower counts
 * @see PostService.getUserPosts for celebrity posts
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { FeedService, FollowService, PostService, ProfileService } from '@social-media-app/dal';
import type { FeedPostItem } from '@social-media-app/shared';
import { errorResponse, successResponse, verifyAccessToken } from '../../utils/index.js';
import { createDynamoDBClient, getTableName, createS3Client, getS3BucketName, getCloudFrontDomain } from '../../utils/dynamodb.js';

// Constants
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const CELEBRITY_THRESHOLD = 5000;

// Initialize services at container scope for Lambda warm starts
const dynamoClient = createDynamoDBClient();
const s3Client = createS3Client();
const tableName = getTableName();
const bucketName = getS3BucketName();
const cloudFrontDomain = getCloudFrontDomain();

const feedService = new FeedService(dynamoClient, tableName);
const followService = new FollowService(dynamoClient, tableName);
const postService = new PostService(dynamoClient, tableName, s3Client, bucketName, cloudFrontDomain);
const profileService = new ProfileService(dynamoClient, tableName, s3Client, bucketName, cloudFrontDomain);

/**
 * UUID validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate UUID format
 */
const isValidUUID = (value: string): boolean => {
  return UUID_REGEX.test(value);
};

/**
 * Parse and validate limit parameter
 */
const parseLimit = (limitParam?: string): number => {
  if (!limitParam) {
    return DEFAULT_LIMIT;
  }

  const parsed = parseInt(limitParam, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsed, MAX_LIMIT);
};

/**
 * Convert Post to FeedPostItem with query-time source
 */
const convertPostToFeedItem = (post: any): FeedPostItem => {
  return {
    id: post.id,
    userId: post.userId,
    userHandle: post.userHandle,
    authorId: post.userId,
    authorHandle: post.userHandle,
    authorFullName: post.authorFullName,
    authorProfilePictureUrl: post.authorProfilePictureUrl,
    imageUrl: post.imageUrl,
    caption: post.caption,
    likesCount: post.likesCount ?? 0,
    commentsCount: post.commentsCount ?? 0,
    createdAt: post.createdAt,
    isLiked: post.isLiked ?? false,
    source: 'query-time' as const
  };
};

/**
 * Fetch posts for celebrity users in real-time
 */
const fetchCelebrityPosts = async (
  userId: string,
  limit: number
): Promise<FeedPostItem[]> => {
  const celebrityPosts: FeedPostItem[] = [];

  // Get list of users the current user follows
  const followingList = await followService.getFollowingList(userId);

  if (followingList.length === 0) {
    return [];
  }

  // Check each followed user for celebrity status
  for (const followedUserId of followingList) {
    const followerCount = await followService.getFollowerCount(followedUserId);

    // If celebrity (≥5000 followers), fetch their posts in real-time
    if (followerCount >= CELEBRITY_THRESHOLD) {
      const { posts } = await postService.getUserPosts(followedUserId, limit, undefined);

      // Convert posts to FeedPostItem format with source='query-time'
      const feedItems = posts.map(convertPostToFeedItem);
      celebrityPosts.push(...feedItems);
    }
  }

  return celebrityPosts;
};

/**
 * Merge and sort materialized + query-time items
 */
const mergeAndSortFeedItems = (
  materializedItems: FeedPostItem[],
  celebrityItems: FeedPostItem[],
  limit: number
): FeedPostItem[] => {
  // Combine all items
  const combined = [...materializedItems, ...celebrityItems];

  // Sort by createdAt (newest first)
  const sorted = combined.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Apply limit
  return sorted.slice(0, limit);
};

/**
 * Determine feed source type
 */
const determineFeedSource = (
  materializedCount: number,
  celebrityCount: number
): 'materialized' | 'query-time' | 'hybrid' => {
  if (celebrityCount === 0) {
    return 'materialized';
  }
  if (materializedCount === 0) {
    return 'query-time';
  }
  return 'hybrid';
};

/**
 * Lambda handler
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // 1. Validate authentication
    const userId = event.requestContext.authorizer?.userId as string | undefined;
    const authHeader = event.headers?.authorization || event.headers?.Authorization;

    // Check for explicitly empty string (validation error)
    if (userId === '') {
      return errorResponse(400, 'Invalid user ID', {
        message: 'User ID cannot be empty'
      });
    }

    // Check for missing/undefined userId (authentication error)
    if (!userId) {
      return errorResponse(401, 'Missing authorization', {
        message: 'User authentication required'
      });
    }

    // Validate UUID format
    if (!isValidUUID(userId)) {
      return errorResponse(400, 'invalid user ID format', {
        message: 'User ID must be a valid UUID'
      });
    }

    // Verify JWT token for defense in depth
    if (authHeader) {
      try {
        await verifyAccessToken(authHeader.replace('Bearer ', ''));
      } catch (error) {
        return errorResponse(401, 'Invalid or expired token', {
          message: error instanceof Error ? error.message : 'Token verification failed'
        });
      }
    }

    // 2. Parse pagination parameters
    const limit = parseLimit(event.queryStringParameters?.limit);
    const cursor = event.queryStringParameters?.cursor;

    // 3. Fetch materialized feed items
    const materializedResult = await feedService.getMaterializedFeedItems({
      userId,
      limit,
      cursor
    });

    // 4. Fetch celebrity posts in real-time
    const celebrityItems = await fetchCelebrityPosts(userId, limit);

    // 5. Merge and sort all items
    const materializedItemsCount = materializedResult.items.length;
    const celebrityItemsCount = celebrityItems.length;

    const mergedItems = mergeAndSortFeedItems(
      materializedResult.items,
      celebrityItems,
      limit
    );

    // 6. Determine feed source
    const feedSource = determineFeedSource(materializedItemsCount, celebrityItemsCount);

    // 7. Build response
    const response = {
      posts: mergedItems,
      hasMore: !!materializedResult.nextCursor || celebrityItems.length >= limit,
      ...(materializedResult.nextCursor && { nextCursor: materializedResult.nextCursor }),
      source: feedSource
    };

    return successResponse(200, response);
  } catch (error) {
    console.error('[GetFeed] Handler error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return errorResponse(500, 'Failed to fetch feed', {
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};
