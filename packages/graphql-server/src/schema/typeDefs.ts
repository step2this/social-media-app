/**
 * GraphQL Schema Type Definitions
 *
 * This file contains the complete GraphQL schema definition for the social media app.
 * It defines types for Profile, Post, Comment, Notification, and all queries/mutations.
 */

export const typeDefs = `
  # ============================================================================
  # Root Types
  # ============================================================================

  type Query {
    # Authentication
    me: Profile!

    # Profile
    profile(handle: String!): Profile

    # Posts
    post(id: ID!): Post
    userPosts(handle: String!, limit: Int, cursor: String): PostConnection!

    # Feed
    feed(limit: Int, cursor: String): FeedConnection!

    # Social
    postLikeStatus(postId: ID!): LikeStatus!
    followStatus(userId: ID!): FollowStatus!

    # Comments
    comments(postId: ID!, limit: Int, cursor: String): CommentConnection!

    # Notifications
    notifications(limit: Int, cursor: String): NotificationConnection!
    unreadNotificationsCount: Int!
  }

  type Mutation {
    # Authentication
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    logout: LogoutResponse!
    refreshToken(refreshToken: String!): AuthPayload!

    # Profile
    updateProfile(input: UpdateProfileInput!): Profile!
    getProfilePictureUploadUrl(fileType: String): PresignedUrlResponse!

    # Posts
    createPost(input: CreatePostInput!): CreatePostPayload!
    updatePost(id: ID!, input: UpdatePostInput!): Post!
    deletePost(id: ID!): DeleteResponse!

    # Social
    likePost(postId: ID!): LikeResponse!
    unlikePost(postId: ID!): LikeResponse!
    followUser(userId: ID!): FollowResponse!
    unfollowUser(userId: ID!): FollowResponse!

    # Comments
    createComment(input: CreateCommentInput!): Comment!
    deleteComment(id: ID!): DeleteResponse!

    # Notifications
    markNotificationAsRead(id: ID!): Notification!
    markAllNotificationsAsRead: MarkAllReadResponse!
    deleteNotification(id: ID!): DeleteResponse!

    # Feed
    markFeedItemsAsRead(postIds: [ID!]!): MarkFeedReadResponse!
  }

  # ============================================================================
  # Core Types
  # ============================================================================

  type Profile {
    id: ID!
    handle: String!
    username: String!
    email: String!
    displayName: String
    fullName: String
    bio: String
    profilePictureUrl: String
    followersCount: Int!
    followingCount: Int!
    postsCount: Int!
    isFollowing: Boolean
    createdAt: String!
  }

  type Post {
    id: ID!
    userId: ID!
    author: Profile!
    caption: String
    imageUrl: String!
    thumbnailUrl: String!
    likesCount: Int!
    commentsCount: Int!
    isLiked: Boolean
    createdAt: String!
    updatedAt: String!
  }

  type Comment {
    id: ID!
    postId: ID!
    userId: ID!
    author: Profile!
    content: String!
    createdAt: String!
  }

  type Notification {
    id: ID!
    userId: ID!
    type: NotificationType!
    title: String!
    message: String!
    status: NotificationStatus!
    actor: NotificationActor
    target: NotificationTarget
    createdAt: String!
    readAt: String
  }

  type NotificationActor {
    userId: ID!
    handle: String!
    displayName: String
    avatarUrl: String
  }

  type NotificationTarget {
    type: String!
    id: ID!
    url: String
    preview: String
  }

  type FeedItem {
    id: ID!
    post: Post!
    readAt: String
    createdAt: String!
  }

  # ============================================================================
  # Enums
  # ============================================================================

  enum NotificationType {
    LIKE
    COMMENT
    FOLLOW
    MENTION
    SYSTEM
  }

  enum NotificationStatus {
    UNREAD
    READ
    ARCHIVED
  }

  # ============================================================================
  # Input Types
  # ============================================================================

  input RegisterInput {
    email: String!
    password: String!
    username: String!
    handle: String!
    fullName: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input UpdateProfileInput {
    handle: String
    displayName: String
    fullName: String
    bio: String
  }

  input CreatePostInput {
    fileType: String!
    caption: String
  }

  input UpdatePostInput {
    caption: String
  }

  input CreateCommentInput {
    postId: ID!
    content: String!
  }

  # ============================================================================
  # Connection Types (Cursor Pagination)
  # ============================================================================

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type PostConnection {
    edges: [PostEdge!]!
    pageInfo: PageInfo!
  }

  type PostEdge {
    cursor: String!
    node: Post!
  }

  type CommentConnection {
    edges: [CommentEdge!]!
    pageInfo: PageInfo!
  }

  type CommentEdge {
    cursor: String!
    node: Comment!
  }

  type NotificationConnection {
    edges: [NotificationEdge!]!
    pageInfo: PageInfo!
  }

  type NotificationEdge {
    cursor: String!
    node: Notification!
  }

  type FeedConnection {
    edges: [FeedEdge!]!
    pageInfo: PageInfo!
  }

  type FeedEdge {
    cursor: String!
    node: FeedItem!
  }

  # ============================================================================
  # Response Types
  # ============================================================================

  type AuthPayload {
    user: Profile!
    tokens: AuthTokens!
  }

  type AuthTokens {
    accessToken: String!
    refreshToken: String!
    expiresIn: Int!
  }

  type CreatePostPayload {
    post: Post!
    uploadUrl: String!
    thumbnailUploadUrl: String!
  }

  type LikeResponse {
    success: Boolean!
    likesCount: Int!
    isLiked: Boolean!
  }

  type FollowResponse {
    success: Boolean!
    followersCount: Int!
    followingCount: Int!
    isFollowing: Boolean!
  }

  type DeleteResponse {
    success: Boolean!
  }

  type LikeStatus {
    postId: ID!
    isLiked: Boolean!
  }

  type FollowStatus {
    userId: ID!
    isFollowing: Boolean!
    isFollowedBy: Boolean!
  }

  type LogoutResponse {
    success: Boolean!
  }

  type MarkAllReadResponse {
    updatedCount: Int!
  }

  type MarkFeedReadResponse {
    updatedCount: Int!
  }

  type PresignedUrlResponse {
    uploadUrl: String!
  }
`;
