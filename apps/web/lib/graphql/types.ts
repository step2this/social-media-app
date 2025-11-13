/**
 * GraphQL Response Types
 * Based on the GraphQL server schema
 */

export interface Author {
  id: string;
  username: string;
  handle: string;
  fullName?: string;
  bio?: string;
  profilePictureUrl?: string;
}

export interface Post {
  id: string;
  userId: string;
  caption?: string;
  imageUrl: string;
  thumbnailUrl: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  author: Author;
  isLiked?: boolean | null;
}

export interface PostEdge {
  node: Post;
  cursor: string;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

export interface PostConnection {
  edges: PostEdge[];
  pageInfo: PageInfo;
}

export interface FeedQueryResponse {
  followingFeed?: PostConnection;
  exploreFeed?: PostConnection;
}

export interface Profile {
  id: string;
  username: string;
  handle: string;
  email?: string;
  fullName?: string;
  bio?: string;
  profilePictureUrl?: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
}

export interface ProfileQueryResponse {
  profile: Profile;
}

export interface MeQueryResponse {
  me: Profile;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
}

export interface CommentEdge {
  node: Comment;
}

export interface CommentConnection {
  edges: CommentEdge[];
  pageInfo: PageInfo;
}

export interface PostWithComments extends Post {
  comments: CommentConnection;
}

export interface PostQueryResponse {
  post: PostWithComments;
}

export interface CreatePostPayload {
  post: Omit<Post, 'author'> & { author?: Author };
  uploadUrl: string;
  thumbnailUploadUrl: string;
}

export interface CreatePostResponse {
  createPost: CreatePostPayload;
}

export interface LikePostPayload {
  success: boolean;
  likesCount: number;
  isLiked: boolean;
  error?: string;
}

export interface LikePostResponse {
  likePost: LikePostPayload;
}

export interface UnlikePostPayload {
  success: boolean;
  likesCount: number;
  isLiked: boolean;
  error?: string;
}

export interface UnlikePostResponse {
  unlikePost: UnlikePostPayload;
}
