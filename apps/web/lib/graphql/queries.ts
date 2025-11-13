import { gql } from 'graphql-request';

/**
 * Feed Queries
 */

export const GET_FOLLOWING_FEED = gql`
  query GetFollowingFeed($first: Int, $after: String) {
    followingFeed(first: $first, after: $after) {
      edges {
        node {
          id
          userId
          caption
          imageUrl
          thumbnailUrl
          likesCount
          commentsCount
          createdAt
          updatedAt
          author {
            id
            username
            handle
            fullName
            bio
            profilePictureUrl
          }
          isLiked
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

export const GET_EXPLORE_FEED = gql`
  query GetExploreFeed($first: Int, $after: String) {
    exploreFeed(first: $first, after: $after) {
      edges {
        node {
          id
          userId
          caption
          imageUrl
          thumbnailUrl
          likesCount
          commentsCount
          createdAt
          updatedAt
          author {
            id
            username
            handle
            fullName
            bio
            profilePictureUrl
          }
          isLiked
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

/**
 * Post Queries
 */

export const GET_POST = gql`
  query GetPost($id: ID!) {
    post(id: $id) {
      id
      userId
      caption
      imageUrl
      thumbnailUrl
      likesCount
      commentsCount
      createdAt
      updatedAt
      author {
        id
        username
        handle
        fullName
        bio
        profilePictureUrl
      }
      isLiked
      comments(first: 20) {
        edges {
          node {
            id
            content
            createdAt
            author {
              id
              username
              handle
              profilePictureUrl
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

/**
 * Profile Queries
 */

export const GET_PROFILE = gql`
  query GetProfile($handle: String!) {
    profile(handle: $handle) {
      id
      username
      handle
      fullName
      bio
      profilePictureUrl
      postsCount
      followersCount
      followingCount
    }
  }
`;

export const FOLLOW_USER = gql`
  mutation FollowUser($userId: ID!) {
    followUser(userId: $userId) {
      success
      followersCount
      followingCount
      isFollowing
    }
  }
`;

export const UNFOLLOW_USER = gql`
  mutation UnfollowUser($userId: ID!) {
    unfollowUser(userId: $userId) {
      success
      followersCount
      followingCount
      isFollowing
    }
  }
`;

export const GET_FOLLOW_STATUS = gql`
  query GetFollowStatus($userId: ID!) {
    followStatus(userId: $userId) {
      isFollowing
      followersCount
      followingCount
    }
  }
`;

export const GET_ME = gql`
  query GetMe {
    me {
      id
      username
      handle
      email
      fullName
      bio
      profilePictureUrl
      postsCount
      followersCount
      followingCount
    }
  }
`;

/**
 * Mutations
 */

export const LIKE_POST = gql`
  mutation LikePost($postId: ID!) {
    likePost(postId: $postId) {
      success
      likesCount
      isLiked
    }
  }
`;

export const UNLIKE_POST = gql`
  mutation UnlikePost($postId: ID!) {
    unlikePost(postId: $postId) {
      success
      likesCount
      isLiked
    }
  }
`;

export const CREATE_POST = gql`
  mutation CreatePost($fileType: String!, $caption: String) {
    createPost(fileType: $fileType, caption: $caption) {
      post {
        id
        userId
        caption
        imageUrl
        thumbnailUrl
        likesCount
        commentsCount
        createdAt
        updatedAt
      }
      uploadUrls {
        imageUploadUrl
        thumbnailUploadUrl
      }
    }
  }
`;
