/**
 * Test data builders for integration tests
 * Extends existing patterns from backend test factories
 */

import { randomUUID } from 'crypto';
import type {
  User,
  Profile,
  Post,
  LoginRequest,
  RegisterRequest,
  CreatePostRequest,
  GetPresignedUrlRequest
} from '@social-media-app/shared';

/**
 * User Test Builder
 */
export class UserTestBuilder {
  private user: Partial<User> = {
    id: randomUUID(),
    email: 'testuser@tamafriends.local',
    username: 'testuser',
    emailVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  withId(id: string): UserTestBuilder {
    this.user.id = id;
    return this;
  }

  withEmail(email: string): UserTestBuilder {
    this.user.email = email;
    return this;
  }

  withUsername(username: string): UserTestBuilder {
    this.user.username = username;
    return this;
  }

  asUnverified(): UserTestBuilder {
    this.user.emailVerified = false;
    return this;
  }

  asVerified(): UserTestBuilder {
    this.user.emailVerified = true;
    return this;
  }

  build(): User {
    return this.user as User;
  }
}

/**
 * Profile Test Builder
 */
export class ProfileTestBuilder {
  private profile: Partial<Profile> = {
    id: randomUUID(),
    email: 'testuser@tamafriends.local',
    username: 'testuser',
    handle: 'testuser',
    fullName: 'Test User',
    bio: 'A test user profile',
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
    emailVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  withId(id: string): ProfileTestBuilder {
    this.profile.id = id;
    return this;
  }

  withEmail(email: string): ProfileTestBuilder {
    this.profile.email = email;
    return this;
  }

  withUsername(username: string): ProfileTestBuilder {
    this.profile.username = username;
    return this;
  }

  withHandle(handle: string): ProfileTestBuilder {
    this.profile.handle = handle;
    return this;
  }

  withFullName(fullName: string): ProfileTestBuilder {
    this.profile.fullName = fullName;
    return this;
  }

  withBio(bio: string): ProfileTestBuilder {
    this.profile.bio = bio;
    return this;
  }

  withPostsCount(count: number): ProfileTestBuilder {
    this.profile.postsCount = count;
    return this;
  }

  withFollowersCount(count: number): ProfileTestBuilder {
    this.profile.followersCount = count;
    return this;
  }

  withFollowingCount(count: number): ProfileTestBuilder {
    this.profile.followingCount = count;
    return this;
  }

  withProfilePicture(url: string, thumbnailUrl?: string): ProfileTestBuilder {
    this.profile.profilePictureUrl = url;
    if (thumbnailUrl) {
      this.profile.profilePictureThumbnailUrl = thumbnailUrl;
    }
    return this;
  }

  build(): Profile {
    return this.profile as Profile;
  }
}

/**
 * Post Test Builder
 */
export class PostTestBuilder {
  private post: Partial<Post> = {
    id: randomUUID(),
    userId: randomUUID(),
    userHandle: 'testuser',
    imageUrl: 'http://localhost:4566/tamafriends-media-local/test-image.jpg',
    thumbnailUrl: 'http://localhost:4566/tamafriends-media-local/test-thumb.jpg',
    caption: 'Test post caption',
    tags: ['test', 'integration'],
    likesCount: 0,
    commentsCount: 0,
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  withId(id: string): PostTestBuilder {
    this.post.id = id;
    return this;
  }

  withUserId(userId: string): PostTestBuilder {
    this.post.userId = userId;
    return this;
  }

  withUserHandle(userHandle: string): PostTestBuilder {
    this.post.userHandle = userHandle;
    return this;
  }

  withCaption(caption: string): PostTestBuilder {
    this.post.caption = caption;
    return this;
  }

  withTags(tags: string[]): PostTestBuilder {
    this.post.tags = tags;
    return this;
  }

  withImages(imageUrl: string, thumbnailUrl?: string): PostTestBuilder {
    this.post.imageUrl = imageUrl;
    this.post.thumbnailUrl = thumbnailUrl || imageUrl.replace('.jpg', '_thumb.jpg');
    return this;
  }

  withLikes(count: number): PostTestBuilder {
    this.post.likesCount = count;
    return this;
  }

  withComments(count: number): PostTestBuilder {
    this.post.commentsCount = count;
    return this;
  }

  asPrivate(): PostTestBuilder {
    this.post.isPublic = false;
    return this;
  }

  asPublic(): PostTestBuilder {
    this.post.isPublic = true;
    return this;
  }

  build(): Post {
    return this.post as Post;
  }
}

/**
 * Login Request Builder
 */
export class LoginRequestBuilder {
  private request: LoginRequest = {
    email: 'testuser@tamafriends.local',
    password: 'TestPassword123!'
  };

  withEmail(email: string): LoginRequestBuilder {
    this.request.email = email;
    return this;
  }

  withPassword(password: string): LoginRequestBuilder {
    this.request.password = password;
    return this;
  }

  build(): LoginRequest {
    return this.request;
  }
}

/**
 * Register Request Builder
 */
export class RegisterRequestBuilder {
  private request: RegisterRequest = {
    email: 'newuser@tamafriends.local',
    password: 'TestPassword123!',
    username: 'newuser'
  };

  withEmail(email: string): RegisterRequestBuilder {
    this.request.email = email;
    return this;
  }

  withPassword(password: string): RegisterRequestBuilder {
    this.request.password = password;
    return this;
  }

  withUsername(username: string): RegisterRequestBuilder {
    this.request.username = username;
    return this;
  }

  build(): RegisterRequest {
    return this.request;
  }
}

/**
 * Create Post Request Builder
 */
export class CreatePostRequestBuilder {
  private request: CreatePostRequest = {
    caption: 'Test post caption',
    tags: ['test', 'integration'],
    isPublic: true,
    fileType: 'image/jpeg'
  };

  withFileType(fileType: string): CreatePostRequestBuilder {
    this.request.fileType = fileType;
    return this;
  }

  withCaption(caption: string): CreatePostRequestBuilder {
    this.request.caption = caption;
    return this;
  }

  withTags(tags: string[]): CreatePostRequestBuilder {
    this.request.tags = tags;
    return this;
  }

  asPrivate(): CreatePostRequestBuilder {
    this.request.isPublic = false;
    return this;
  }

  asPublic(): CreatePostRequestBuilder {
    this.request.isPublic = true;
    return this;
  }

  build(): CreatePostRequest {
    return this.request;
  }
}

/**
 * Get Presigned URL Request Builder
 */
export class PresignedUrlRequestBuilder {
  private request: GetPresignedUrlRequest = {
    fileType: 'image/jpeg',
    purpose: 'post-image'
  };

  withFileType(fileType: string): PresignedUrlRequestBuilder {
    this.request.fileType = fileType;
    return this;
  }

  forProfilePicture(): PresignedUrlRequestBuilder {
    this.request.purpose = 'profile-picture';
    return this;
  }

  forPostImage(): PresignedUrlRequestBuilder {
    this.request.purpose = 'post-image';
    return this;
  }

  build(): GetPresignedUrlRequest {
    return this.request;
  }
}

/**
 * Factory functions for creating test builders
 */
export const createTestUser = () => new UserTestBuilder();
export const createTestProfile = () => new ProfileTestBuilder();
export const createTestPost = () => new PostTestBuilder();
export const createLoginRequest = () => new LoginRequestBuilder();
export const createRegisterRequest = () => new RegisterRequestBuilder();
export const createPostRequest = () => new CreatePostRequestBuilder();
export const createPresignedUrlRequest = () => new PresignedUrlRequestBuilder();

/**
 * Predefined test data sets
 */
export const TestUsers = {
  /**
   * Default test user for LocalStack testing
   */
  localstackUser: createTestUser()
    .withEmail('localstacktest@tamafriends.local')
    .withUsername('localstacktest')
    .build(),

  /**
   * Debug user with known credentials
   */
  debugUser: createTestUser()
    .withEmail('debuguser@example.com')
    .withUsername('debuguser')
    .build(),

  /**
   * Regular test user
   */
  regularUser: createTestUser()
    .withEmail('testuser@tamafriends.local')
    .withUsername('testuser')
    .build()
};

export const TestProfiles = {
  /**
   * Profile for LocalStack test user
   */
  localstackProfile: createTestProfile()
    .withEmail('localstacktest@tamafriends.local')
    .withUsername('localstacktest')
    .withHandle('localstacktest')
    .withFullName('LocalStack Test User')
    .withBio('Test user for LocalStack integration testing')
    .build(),

  /**
   * Profile for debug user
   */
  debugProfile: createTestProfile()
    .withEmail('debuguser@example.com')
    .withUsername('debuguser')
    .withHandle('debuguser')
    .withFullName('Debug User')
    .withBio('Debug user for testing')
    .build()
};

export const TestCredentials = {
  /**
   * Credentials for LocalStack test user
   */
  localstackUser: createLoginRequest()
    .withEmail('localstacktest@tamafriends.local')
    .withPassword('TestPassword123!')
    .build(),

  /**
   * Credentials for debug user
   */
  debugUser: createLoginRequest()
    .withEmail('debuguser@example.com')
    .withPassword('TestPassword123!')
    .build()
};