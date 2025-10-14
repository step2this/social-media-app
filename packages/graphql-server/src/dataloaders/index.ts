/**
 * DataLoader Factory
 *
 * Creates DataLoader instances for batching and caching database queries.
 * Solves the N+1 query problem by batching multiple field resolver requests
 * into single database calls.
 *
 * @module dataloaders
 */

import DataLoader from 'dataloader';
import type {
  ProfileService,
  PostService,
  LikeService
} from '@social-media-app/dal';
import type {
  PublicProfile,
  Post
} from '@social-media-app/shared';

/**
 * Like status information for a post
 *
 * @interface LikeStatus
 * @property {boolean} isLiked - Whether the current user has liked the post
 * @property {number} likesCount - Total number of likes for the post
 */
export interface LikeStatus {
  isLiked: boolean;
  likesCount: number;
}

/**
 * Collection of DataLoader instances for the GraphQL context
 *
 * @interface DataLoaders
 * @property {DataLoader} profileLoader - Batches profile fetches by ID
 * @property {DataLoader} postLoader - Batches post fetches by ID
 * @property {DataLoader} likeStatusLoader - Batches like status fetches by post ID
 */
export interface DataLoaders {
  profileLoader: DataLoader<string, PublicProfile | null>;
  postLoader: DataLoader<string, Post | null>;
  likeStatusLoader: DataLoader<string, LikeStatus | null>;
}

/**
 * DAL service instances required for data loading
 *
 * @interface Services
 * @property {ProfileService} profileService - Profile data access service
 * @property {PostService} postService - Post data access service
 * @property {LikeService} likeService - Like data access service
 */
export interface Services {
  profileService: ProfileService;
  postService: PostService;
  likeService: LikeService;
}

/**
 * Create DataLoader instances for batching database queries
 *
 * Each DataLoader:
 * - Batches multiple requests within a 10ms window
 * - Caches results within the same GraphQL request
 * - Returns results in the same order as input keys
 * - Handles missing data by returning null
 *
 * @param {Services} services - DAL service instances
 * @param {string | null} userId - Current authenticated user ID (null if unauthenticated)
 * @returns {DataLoaders} DataLoaders object with batching/caching enabled
 *
 * @example
 * ```typescript
 * const loaders = createLoaders(services, userId);
 *
 * // These will be batched into a single database call
 * const profile1 = await loaders.profileLoader.load('user1');
 * const profile2 = await loaders.profileLoader.load('user2');
 * ```
 */
export function createLoaders(services: Services, userId: string | null): DataLoaders {
  return {
    /**
     * Profile loader - batches profile fetches by user ID
     *
     * Performance characteristics:
     * - Batch window: 10ms
     * - Caching: Enabled for request duration
     * - Handles missing profiles gracefully (returns null)
     */
    profileLoader: new DataLoader<string, PublicProfile | null>(
      async (ids) => {
        // Convert readonly array to mutable array for service call
        const profiles = await services.profileService.getProfilesByIds([...ids]);

        // DataLoader requires results in same order as input keys
        return ids.map(id => profiles.get(id) || null);
      },
      {
        cache: true, // Enable caching to prevent duplicate requests
        batchScheduleFn: (callback) => setTimeout(callback, 10), // 10ms batch window
      }
    ),

    /**
     * Post loader - batches post fetches by post ID
     *
     * Performance characteristics:
     * - Batch window: 10ms
     * - Caching: Enabled for request duration
     * - Handles missing posts gracefully (returns null)
     */
    postLoader: new DataLoader<string, Post | null>(
      async (ids) => {
        // Convert readonly array to mutable array for service call
        const posts = await services.postService.getPostsByIds([...ids]);

        // DataLoader requires results in same order as input keys
        return ids.map(id => posts.get(id) || null);
      },
      {
        cache: true, // Enable caching to prevent duplicate requests
        batchScheduleFn: (callback) => setTimeout(callback, 10), // 10ms batch window
      }
    ),

    /**
     * Like status loader - batches like status fetches by post ID
     *
     * Performance characteristics:
     * - Batch window: 10ms
     * - Caching: Enabled for request duration
     * - Returns null for all posts if user is unauthenticated
     * - Handles missing like data gracefully (returns null)
     */
    likeStatusLoader: new DataLoader<string, LikeStatus | null>(
      async (postIds) => {
        if (!userId) {
          // Unauthenticated users get null for all like statuses
          return postIds.map(() => null);
        }

        // Convert readonly array to mutable array for service call
        const statuses = await services.likeService.getLikeStatusesByPostIds(userId, [...postIds]);

        // DataLoader requires results in same order as input keys
        return postIds.map(postId => statuses.get(postId) || null);
      },
      {
        cache: true, // Enable caching to prevent duplicate requests
        batchScheduleFn: (callback) => setTimeout(callback, 10), // 10ms batch window
      }
    ),
  };
}