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
      isFollowing
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
      message
    }
  }
`;

export const UNLIKE_POST = gql`
  mutation UnlikePost($postId: ID!) {
    unlikePost(postId: $postId) {
      success
      message
    }
  }
`;
