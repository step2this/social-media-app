/**
 * Fake Service Implementations for Auth Use Case Testing
 *
 * Provides in-memory implementations of auth and profile services
 * for testing without mocks.
 *
 * Principles:
 * ✅ No mocks or spies - real implementations with in-memory storage
 * ✅ Behavioral testing - services behave like real implementations
 * ✅ Type-safe throughout
 * ✅ Stateful - can test sequences of operations
 *
 * Benefits over mocks:
 * - Test realistic workflows (register → login → logout)
 * - Catch integration issues between use cases
 * - More maintainable (no mock setup/teardown)
 * - Better error simulation (realistic error paths)
 */

import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * In-memory user storage
 */
interface StoredUser {
  id: string;
  email: string;
  password: string; // In real app, this would be hashed
  username: string;
  handle: string;
  fullName: string | null;
  bio: string | null;
  profilePictureUrl: string | null;
  profilePictureThumbnailUrl: string | null;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  createdAt: string;
  updatedAt: string;
  emailVerified: boolean;
}

/**
 * In-memory token storage
 */
interface StoredToken {
  refreshToken: string;
  userId: string;
  expiresAt: number; // Unix timestamp
}

/**
 * FakeAuthService - In-memory auth service for testing
 *
 * Maintains user and token storage, validates credentials, etc.
 */
export class FakeAuthService {
  private users: Map<string, StoredUser> = new Map();
  private usersByEmail: Map<string, string> = new Map(); // email -> userId
  private usersByUsername: Map<string, string> = new Map(); // username -> userId
  private tokens: Map<string, StoredToken> = new Map(); // refreshToken -> token data
  private userIdCounter = 1;
  private tokenCounter = 0; // Ensures unique tokens even with same timestamp

  /**
   * Generate a unique token
   * Uses timestamp + counter to ensure uniqueness even in rapid succession
   */
  private generateUniqueToken(type: 'access' | 'refresh', userId: string): string {
    return `${type}_${userId}_${Date.now()}_${this.tokenCounter++}`;
  }

  /**
   * Register a new user
   */
  async register(input: {
    email: string;
    password: string;
    username: string;
  }): Promise<{
    user: { id: string };
    tokens?: { accessToken: string; refreshToken: string };
  }> {
    // Check if email already exists
    if (this.usersByEmail.has(input.email)) {
      throw new Error('Email already registered');
    }

    // Check if username already taken
    if (this.usersByUsername.has(input.username)) {
      throw new Error('Username already taken');
    }

    // Create user
    const userId = `user-${this.userIdCounter++}`;
    const user: StoredUser = {
      id: userId,
      email: input.email,
      password: input.password, // In real app: hash password
      username: input.username,
      handle: `@${input.username}`,
      fullName: null,
      bio: null,
      profilePictureUrl: null,
      profilePictureThumbnailUrl: null,
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      emailVerified: false,
    };

    // Store user
    this.users.set(userId, user);
    this.usersByEmail.set(input.email, userId);
    this.usersByUsername.set(input.username, userId);

    // Generate tokens
    const accessToken = this.generateUniqueToken('access', userId);
    const refreshToken = this.generateUniqueToken('refresh', userId);

    // Store refresh token
    this.tokens.set(refreshToken, {
      refreshToken,
      userId,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return {
      user: { id: userId },
      tokens: { accessToken, refreshToken },
    };
  }

  /**
   * Login user with email and password
   */
  async login(input: {
    email: string;
    password: string;
  }): Promise<{
    user: { id: string };
    tokens: { accessToken: string; refreshToken: string };
  }> {
    // Find user by email
    const userId = this.usersByEmail.get(input.email);
    if (!userId) {
      throw new Error('Invalid email or password');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check password
    if (user.password !== input.password) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const accessToken = this.generateUniqueToken('access', userId);
    const refreshToken = this.generateUniqueToken('refresh', userId);

    // Store refresh token
    this.tokens.set(refreshToken, {
      refreshToken,
      userId,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return {
      user: { id: userId },
      tokens: { accessToken, refreshToken },
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(input: {
    refreshToken: string;
  }): Promise<{
    tokens: { accessToken: string; refreshToken: string };
    userId?: string; // Optional userId for fallback scenarios
  }> {
    // Find token
    const tokenData = this.tokens.get(input.refreshToken);
    if (!tokenData) {
      throw new Error('Invalid refresh token');
    }

    // Check expiration
    if (tokenData.expiresAt < Date.now()) {
      this.tokens.delete(input.refreshToken);
      throw new Error('Refresh token expired');
    }

    // Generate new tokens
    const accessToken = this.generateUniqueToken('access', tokenData.userId);
    const newRefreshToken = this.generateUniqueToken('refresh', tokenData.userId);

    // Delete old token, store new one
    this.tokens.delete(input.refreshToken);
    this.tokens.set(newRefreshToken, {
      refreshToken: newRefreshToken,
      userId: tokenData.userId,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    return {
      tokens: { accessToken, refreshToken: newRefreshToken },
      userId: tokenData.userId, // Include userId for fallback in tests
    };
  }

  /**
   * Get userId from refresh token (helper for tests)
   */
  getUserIdFromToken(refreshToken: string): string | undefined {
    return this.tokens.get(refreshToken)?.userId;
  }

  /**
   * Clear all data (for test cleanup)
   */
  clear(): void {
    this.users.clear();
    this.usersByEmail.clear();
    this.usersByUsername.clear();
    this.tokens.clear();
    this.userIdCounter = 1;
    this.tokenCounter = 0;
  }

  /**
   * Seed a user (helper for tests)
   */
  seedUser(user: Partial<StoredUser> & { email: string; password: string; username: string }): StoredUser {
    const userId = user.id || `user-${this.userIdCounter++}`;
    const fullUser: StoredUser = {
      id: userId,
      handle: user.handle || `@${user.username}`,
      fullName: user.fullName || null,
      bio: user.bio || null,
      profilePictureUrl: user.profilePictureUrl || null,
      profilePictureThumbnailUrl: user.profilePictureThumbnailUrl || null,
      postsCount: user.postsCount || 0,
      followersCount: user.followersCount || 0,
      followingCount: user.followingCount || 0,
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
      emailVerified: user.emailVerified || false,
      ...user,
    };

    this.users.set(userId, fullUser);
    this.usersByEmail.set(user.email, userId);
    this.usersByUsername.set(user.username, userId);

    return fullUser;
  }
}

/**
 * FakeProfileService - In-memory profile service for testing
 */
export class FakeProfileService {
  private profiles: Map<string, StoredUser> = new Map();

  /**
   * Get profile by user ID
   * SECURITY: Never returns password field
   */
  async getProfileById(userId: string): Promise<{
    id: string;
    email: string;
    username: string;
    handle: string;
    fullName: string | null;
    bio: string | null;
    profilePictureUrl: string | null;
    profilePictureThumbnailUrl: string | null;
    postsCount: number;
    followersCount: number;
    followingCount: number;
    createdAt: string;
    updatedAt: string;
    emailVerified: boolean;
  } | null> {
    const storedUser = this.profiles.get(userId);
    if (!storedUser) {
      return null;
    }

    // SECURITY: Exclude password from profile response
    const { password, ...profileWithoutPassword } = storedUser;
    return profileWithoutPassword;
  }

  /**
   * Seed a profile (usually called after auth service creates user)
   */
  seedProfile(profile: StoredUser): void {
    this.profiles.set(profile.id, profile);
  }

  /**
   * Clear all data (for test cleanup)
   */
  clear(): void {
    this.profiles.clear();
  }
}

/**
 * FakeDynamoClient - In-memory DynamoDB client for RefreshToken tests
 */
export class FakeDynamoClient {
  private items: Map<string, any> = new Map();

  /**
   * Mock send method for DynamoDB operations
   */
  async send(command: any): Promise<any> {
    // Handle QueryCommand for refresh token lookup
    if (command.input?.IndexName === 'GSI1') {
      const tokenPK = command.input.ExpressionAttributeValues[':tokenPK'];
      const refreshToken = tokenPK.replace('REFRESH_TOKEN#', '');

      // Return mock token item
      const item = this.items.get(refreshToken);
      return {
        Items: item ? [item] : [],
      };
    }

    return { Items: [] };
  }

  /**
   * Seed a token item (for testing)
   */
  seedToken(refreshToken: string, userId: string): void {
    this.items.set(refreshToken, {
      GSI1PK: `REFRESH_TOKEN#${refreshToken}`,
      userId,
    });
  }

  /**
   * Clear all data (for test cleanup)
   */
  clear(): void {
    this.items.clear();
  }
}

/**
 * In-memory post storage
 */
interface StoredPost {
  id: string;
  userId: string;
  content?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentsCount: number;
}

/**
 * In-memory comment storage
 */
interface StoredComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * In-memory like storage
 */
interface StoredLike {
  userId: string;
  postId: string;
  createdAt: string;
}

/**
 * In-memory follow storage
 */
interface StoredFollow {
  followerId: string;
  followeeId: string;
  createdAt: string;
}

/**
 * FakePostService - In-memory post service for testing
 */
export class FakePostService {
  private posts: Map<string, StoredPost> = new Map();
  private postIdCounter = 1;

  async getPostById(postId: string): Promise<{ userId: string; createdAt: string; id: string } | null> {
    const post = this.posts.get(postId);
    return post ? { userId: post.userId, createdAt: post.createdAt, id: post.id } : null;
  }

  seedPost(post: Partial<StoredPost> & { userId: string }): StoredPost {
    const postId = post.id || `post-${this.postIdCounter++}`;
    const fullPost: StoredPost = {
      id: postId,
      content: post.content || 'Test post content',
      imageUrl: post.imageUrl || null,
      createdAt: post.createdAt || new Date().toISOString(),
      updatedAt: post.updatedAt || new Date().toISOString(),
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0,
      ...post,
    };

    this.posts.set(postId, fullPost);
    return fullPost;
  }

  clear(): void {
    this.posts.clear();
    this.postIdCounter = 1;
  }
}

/**
 * FakeCommentService - In-memory comment service for testing
 */
export class FakeCommentService {
  private comments: Map<string, StoredComment> = new Map();
  private commentIdCounter = 1;

  async createComment(
    userId: string,
    postId: string,
    handle: string,
    content: string,
    postUserId: string,
    postSK: string
  ): Promise<{
    id: string;
    postId: string;
    userId: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  }> {
    const commentId = `comment-${this.commentIdCounter++}`;
    const comment: StoredComment = {
      id: commentId,
      postId,
      userId,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.comments.set(commentId, comment);
    return comment;
  }

  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    const comment = this.comments.get(commentId);
    if (!comment) {
      return false; // Comment not found
    }

    if (comment.userId !== userId) {
      return false; // Unauthorized
    }

    this.comments.delete(commentId);
    return true;
  }

  clear(): void {
    this.comments.clear();
    this.commentIdCounter = 1;
  }
}

/**
 * FakeLikeService - In-memory like service for testing
 */
export class FakeLikeService {
  private likes: Map<string, StoredLike> = new Map();
  private postLikeCounts: Map<string, number> = new Map();

  private getLikeKey(userId: string, postId: string): string {
    return `${userId}#${postId}`;
  }

  async likePost(
    userId: string,
    postId: string,
    postUserId: string,
    postSK: string
  ): Promise<{
    success: boolean;
    isLiked: boolean;
    likesCount: number;
  }> {
    const key = this.getLikeKey(userId, postId);

    // Check if already liked
    if (this.likes.has(key)) {
      const count = this.postLikeCounts.get(postId) || 0;
      return {
        success: true,
        isLiked: true,
        likesCount: count,
      };
    }

    // Add like
    this.likes.set(key, {
      userId,
      postId,
      createdAt: new Date().toISOString(),
    });

    // Increment count
    const currentCount = this.postLikeCounts.get(postId) || 0;
    const newCount = currentCount + 1;
    this.postLikeCounts.set(postId, newCount);

    return {
      success: true,
      isLiked: true,
      likesCount: newCount,
    };
  }

  async unlikePost(
    userId: string,
    postId: string,
    postUserId: string,
    postSK: string
  ): Promise<{
    success: boolean;
    isLiked: boolean;
    likesCount: number;
  }> {
    const key = this.getLikeKey(userId, postId);

    // Check if not liked
    if (!this.likes.has(key)) {
      const count = this.postLikeCounts.get(postId) || 0;
      return {
        success: true,
        isLiked: false,
        likesCount: count,
      };
    }

    // Remove like
    this.likes.delete(key);

    // Decrement count
    const currentCount = this.postLikeCounts.get(postId) || 0;
    const newCount = Math.max(0, currentCount - 1);
    this.postLikeCounts.set(postId, newCount);

    return {
      success: true,
      isLiked: false,
      likesCount: newCount,
    };
  }

  clear(): void {
    this.likes.clear();
    this.postLikeCounts.clear();
  }
}

/**
 * FakeFollowService - In-memory follow service for testing
 */
export class FakeFollowService {
  private follows: Map<string, StoredFollow> = new Map();
  private followerCounts: Map<string, number> = new Map();
  private followingCounts: Map<string, number> = new Map();

  private getFollowKey(followerId: string, followeeId: string): string {
    return `${followerId}#${followeeId}`;
  }

  async followUser(
    followerId: string,
    followeeId: string
  ): Promise<{
    success: boolean;
    isFollowing: boolean;
    followersCount: number;
    followingCount: number;
  }> {
    const key = this.getFollowKey(followerId, followeeId);

    // Check if already following
    if (this.follows.has(key)) {
      return {
        success: true,
        isFollowing: true,
        followersCount: this.followerCounts.get(followeeId) || 0,
        followingCount: this.followingCounts.get(followerId) || 0,
      };
    }

    // Add follow
    this.follows.set(key, {
      followerId,
      followeeId,
      createdAt: new Date().toISOString(),
    });

    // Update counts
    const followersCount = (this.followerCounts.get(followeeId) || 0) + 1;
    const followingCount = (this.followingCounts.get(followerId) || 0) + 1;
    this.followerCounts.set(followeeId, followersCount);
    this.followingCounts.set(followerId, followingCount);

    return {
      success: true,
      isFollowing: true,
      followersCount,
      followingCount,
    };
  }

  async unfollowUser(
    followerId: string,
    followeeId: string
  ): Promise<{
    success: boolean;
    isFollowing: boolean;
    followersCount: number;
    followingCount: number;
  }> {
    const key = this.getFollowKey(followerId, followeeId);

    // Check if not following
    if (!this.follows.has(key)) {
      return {
        success: true,
        isFollowing: false,
        followersCount: this.followerCounts.get(followeeId) || 0,
        followingCount: this.followingCounts.get(followerId) || 0,
      };
    }

    // Remove follow
    this.follows.delete(key);

    // Update counts
    const followersCount = Math.max(0, (this.followerCounts.get(followeeId) || 0) - 1);
    const followingCount = Math.max(0, (this.followingCounts.get(followerId) || 0) - 1);
    this.followerCounts.set(followeeId, followersCount);
    this.followingCounts.set(followerId, followingCount);

    return {
      success: true,
      isFollowing: false,
      followersCount,
      followingCount,
    };
  }

  clear(): void {
    this.follows.clear();
    this.followerCounts.clear();
    this.followingCounts.clear();
  }
}

/**
 * Create linked fake services
 *
 * Creates auth and profile services that share user data.
 * When auth service creates a user, profile service can find it.
 */
export function createFakeServices() {
  const authService = new FakeAuthService();
  const profileService = new FakeProfileService();
  const postService = new FakePostService();
  const commentService = new FakeCommentService();
  const likeService = new FakeLikeService();
  const followService = new FakeFollowService();
  const dynamoClient = new FakeDynamoClient();

  // Link services: when auth creates user, add to profile service
  const originalRegister = authService.register.bind(authService);
  authService.register = async (input) => {
    const result = await originalRegister(input);
    // Seed profile with the new user
    const user = (authService as any).users.get(result.user.id);
    if (user) {
      profileService.seedProfile(user);
    }
    return result;
  };

  return {
    authService,
    profileService,
    postService,
    commentService,
    likeService,
    followService,
    dynamoClient: dynamoClient as any as DynamoDBDocumentClient,
    tableName: 'test-table',
    clear: () => {
      authService.clear();
      profileService.clear();
      postService.clear();
      commentService.clear();
      likeService.clear();
      followService.clear();
      dynamoClient.clear();
    },
  };
}
