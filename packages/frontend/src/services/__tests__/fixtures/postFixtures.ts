/**
 * Post Test Fixtures
 *
 * Factory functions for creating test data for posts.
 * Follows the DRY principle with sensible defaults.
 */

import type { Post } from '../../interfaces/IPostService';
import { createMockProfile } from './profileFixtures';

/**
 * Create a mock Post with sensible defaults
 *
 * @param overrides - Partial Post properties to override defaults
 * @returns Complete Post object
 */
export function createMockPost(overrides: Partial<Post> = {}): Post {
    const now = new Date().toISOString();
    const profile = createMockProfile({ id: 'user-1' });
    return {
        id: 'post-1',
        userId: 'user-1',
        author: {
            id: profile.id,
            handle: profile.handle,
            username: profile.username,
            fullName: profile.fullName || null,
            profilePictureUrl: profile.profilePictureUrl || null,
        },
        caption: 'Test post caption',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

/**
 * Create multiple mock posts
 *
 * @param count - Number of posts to create
 * @param overrides - Common overrides for all posts
 * @returns Array of Post objects
 */
export function createMockPosts(
    count: number,
    overrides: Partial<Post> = {}
): Post[] {
    return Array.from({ length: count }, (_, index) => {
        const profile = createMockProfile({
            id: `user-${index + 1}`,
            handle: `user${index + 1}`,
        });
        return createMockPost({
            id: `post-${index + 1}`,
            userId: `user-${index + 1}`,
            author: {
                id: profile.id,
                handle: profile.handle,
                username: profile.username,
                fullName: profile.fullName || null,
                profilePictureUrl: profile.profilePictureUrl || null,
            },
            caption: `Test post ${index + 1}`,
            ...overrides,
        });
    });
}

/**
 * Create a mock post with likes
 *
 * @param likesCount - Number of likes
 * @param isLiked - Whether current user has liked
 * @returns Post object with likes
 */
export function createMockPostWithLikes(
    likesCount: number = 10,
    isLiked: boolean = false
): Post {
    return createMockPost({ likesCount, isLiked });
}

/**
 * Create a mock post with comments
 *
 * @param commentsCount - Number of comments
 * @returns Post object with comments
 */
export function createMockPostWithComments(commentsCount: number = 5): Post {
    return createMockPost({ commentsCount });
}

/**
 * Create a mock post by a specific user
 *
 * @param userId - User ID
 * @param handle - User handle
 * @returns Post object by the specified user
 */
export function createMockPostByUser(userId: string, handle: string): Post {
    const profile = createMockProfile({ id: userId, handle });
    return createMockPost({
        userId,
        author: {
            id: profile.id,
            handle: profile.handle,
            username: profile.username,
            fullName: profile.fullName ?? null,
            profilePictureUrl: profile.profilePictureUrl ?? null,
        },
    });
}

/**
 * Create test data for CreatePostInput
 */
export function createMockCreatePostInput(
    overrides: Partial<{ fileType: string; caption?: string }> = {}
) {
    return {
        fileType: 'image/jpeg',
        caption: 'New post caption',
        ...overrides,
    };
}

/**
 * Create test data for UpdatePostInput
 */
export function createMockUpdatePostInput(
    overrides: Partial<{ caption?: string }> = {}
) {
    return {
        caption: 'Updated post caption',
        ...overrides,
    };
}

/**
 * Create a mock CreatePostPayload
 */
export function createMockCreatePostPayload(
    overrides: Partial<{
        post: Post;
        uploadUrl: string;
        thumbnailUploadUrl: string;
    }> = {}
) {
    return {
        post: createMockPost(),
        uploadUrl: 'https://s3.amazonaws.com/upload/post-image',
        thumbnailUploadUrl: 'https://s3.amazonaws.com/upload/post-thumbnail',
        ...overrides,
    };
}

/**
 * Create a mock PostConnection for pagination
 */
export function createMockPostConnection(
    posts: Post[] = [],
    hasNextPage: boolean = false
) {
    return {
        edges: posts.map((post, index) => ({
            cursor: Buffer.from(`cursor-${index}`).toString('base64'),
            node: post,
        })),
        pageInfo: {
            hasNextPage,
            hasPreviousPage: false,
            startCursor: posts.length > 0 ? Buffer.from('cursor-0').toString('base64') : null,
            endCursor:
                posts.length > 0
                    ? Buffer.from(`cursor-${posts.length - 1}`).toString('base64')
                    : null,
        },
    };
}
