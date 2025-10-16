import type { Post, Comment, FeedPostItem, User, PublicProfile, Profile, Auction, Bid } from '@social-media-app/shared';

/**
 * Create a mock Post for testing
 * @param overrides - Partial Post to override defaults
 * @returns A complete Post object with sensible defaults
 */
export const createMockPost = (overrides?: Partial<Post>): Post => ({
  id: 'test-post-123',
  userId: 'test-user-123',
  userHandle: 'testuser',
  imageUrl: 'https://example.com/test.jpg',
  thumbnailUrl: 'https://example.com/test-thumb.jpg',
  caption: 'Test post caption',
  tags: ['test'],
  likesCount: 0,
  commentsCount: 0,
  isPublic: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides
});

/**
 * Create a mock User for testing
 * @param overrides - Partial User to override defaults
 * @returns A complete User object with sensible defaults
 */
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'test-user-123',
  email: 'test@example.com',
  username: 'testuser',
  emailVerified: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides
});

/**
 * Create a mock Comment for testing
 * @param overrides - Partial Comment to override defaults
 * @returns A complete Comment object with sensible defaults
 */
export const createMockComment = (overrides?: Partial<Comment>): Comment => ({
  id: 'test-comment-123',
  postId: 'test-post-123',
  userId: 'test-user-123',
  userHandle: 'testuser',
  content: 'Test comment',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides
});

/**
 * Create a mock FeedPostItem for testing
 * @param overrides - Partial FeedPostItem to override defaults
 * @returns A complete FeedPostItem object with sensible defaults
 */
export const createMockFeedPostItem = (overrides?: Partial<FeedPostItem>): FeedPostItem => ({
  id: 'test-post-123',
  userId: 'test-user-123',
  userHandle: 'testuser',
  imageUrl: 'https://example.com/test.jpg',
  caption: 'Test post caption',
  likesCount: 0,
  commentsCount: 0,
  createdAt: '2024-01-01T00:00:00Z',
  authorId: 'test-user-123',
  authorHandle: 'testuser',
  authorFullName: 'Test User',
  authorProfilePictureUrl: 'https://example.com/profile.jpg',
  isLiked: false,
  source: 'materialized',
  isRead: false,
  ...overrides
});

/**
 * Create a mock PublicProfile for testing
 * @param overrides - Partial PublicProfile to override defaults
 * @returns A complete PublicProfile object with sensible defaults
 */
export const createMockPublicProfile = (overrides?: Partial<PublicProfile>): PublicProfile => ({
  id: 'test-user-123',
  handle: 'testuser',
  username: 'testuser',
  fullName: 'Test User',
  bio: 'Test bio',
  profilePictureUrl: 'https://example.com/avatar.jpg',
  profilePictureThumbnailUrl: 'https://example.com/avatar-thumb.jpg',
  postsCount: 0,
  followersCount: 0,
  followingCount: 0,
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides
});

/**
 * Create a mock Profile for testing (includes User fields)
 * @param overrides - Partial Profile to override defaults
 * @returns A complete Profile object with sensible defaults
 */
export const createMockProfile = (overrides?: Partial<Profile>): Profile => ({
  id: 'test-user-123',
  email: 'test@example.com',
  username: 'testuser',
  emailVerified: true,
  handle: 'testuser',
  fullName: 'Test User',
  bio: 'Test bio',
  profilePictureUrl: 'https://example.com/avatar.jpg',
  profilePictureThumbnailUrl: 'https://example.com/avatar-thumb.jpg',
  postsCount: 0,
  followersCount: 0,
  followingCount: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides
});

/**
 * Create a mock Auction for testing
 * @param overrides - Partial Auction to override defaults
 * @returns A complete Auction object with sensible defaults
 */
export const createMockAuction = (overrides?: Partial<Auction>): Auction => {
  const now = new Date();
  const startTime = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
  const endTime = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 24 hours from now

  return {
    id: 'test-auction-123',
    userId: 'test-user-123',
    title: 'Test Auction Item',
    description: 'This is a test auction description',
    imageUrl: 'https://example.com/auction-image.jpg',
    startPrice: 10.00,
    reservePrice: 50.00,
    currentPrice: 10.00,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    status: 'active',
    winnerId: undefined,
    bidCount: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides
  };
};

/**
 * Create a mock Bid for testing
 * @param overrides - Partial Bid to override defaults
 * @returns A complete Bid object with sensible defaults
 */
export const createMockBid = (overrides?: Partial<Bid>): Bid => ({
  id: 'test-bid-123',
  auctionId: 'test-auction-123',
  userId: 'test-user-123',
  amount: 15.00,
  createdAt: new Date().toISOString(),
  ...overrides
});
