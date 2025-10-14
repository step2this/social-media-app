/**
 * GraphQL Schema TDD Tests
 *
 * Comprehensive test suite for GraphQL schema validation.
 * Following TDD: These tests will FAIL initially (RED phase),
 * then pass once we implement the schema (GREEN phase).
 *
 * Tests validate:
 * - Schema compilation
 * - Root types (Query, Mutation)
 * - Type definitions
 * - Field types and nullability
 * - Enums
 * - Input types
 * - Connection/pagination types
 */

import { describe, it, expect } from 'vitest';
import { buildSchema, GraphQLObjectType, GraphQLNonNull, GraphQLList, GraphQLID, GraphQLString, GraphQLInt, GraphQLBoolean, GraphQLEnumType, GraphQLInputObjectType } from 'graphql';
import { typeDefs } from '../src/schema/typeDefs.js';

describe('GraphQL Schema Validation', () => {
  let schema: ReturnType<typeof buildSchema>;

  describe('Schema Compilation', () => {
    it('should compile without GraphQL syntax errors', () => {
      expect(() => {
        schema = buildSchema(typeDefs);
      }).not.toThrow();
    });

    it('should have a valid schema object', () => {
      schema = buildSchema(typeDefs);
      expect(schema).toBeDefined();
    });
  });

  describe('Root Types', () => {
    it('should have Query type', () => {
      schema = buildSchema(typeDefs);
      const queryType = schema.getQueryType();
      expect(queryType).toBeDefined();
      expect(queryType?.name).toBe('Query');
    });

    it('should have Mutation type', () => {
      schema = buildSchema(typeDefs);
      const mutationType = schema.getMutationType();
      expect(mutationType).toBeDefined();
      expect(mutationType?.name).toBe('Mutation');
    });
  });

  describe('Query Type Fields', () => {
    beforeEach(() => {
      schema = buildSchema(typeDefs);
    });

    describe('Authentication Queries', () => {
      it('should have me field returning Profile!', () => {
        const queryType = schema.getQueryType();
        const fields = queryType?.getFields();
        const meField = fields?.me;

        expect(meField).toBeDefined();
        expect(meField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((meField?.type as any).ofType.name).toBe('Profile');
      });
    });

    describe('Profile Queries', () => {
      it('should have profile field with handle argument returning Profile', () => {
        const queryType = schema.getQueryType();
        const fields = queryType?.getFields();
        const profileField = fields?.profile;

        expect(profileField).toBeDefined();
        expect((profileField?.type as any).name).toBe('Profile');

        const args = profileField?.args;
        expect(args).toBeDefined();
        expect(args?.length).toBeGreaterThan(0);

        const handleArg = args?.find(arg => arg.name === 'handle');
        expect(handleArg).toBeDefined();
        expect(handleArg?.type).toBeInstanceOf(GraphQLNonNull);
        expect((handleArg?.type as any).ofType).toBe(GraphQLString);
      });
    });

    describe('Post Queries', () => {
      it('should have post field with id argument returning Post', () => {
        const queryType = schema.getQueryType();
        const fields = queryType?.getFields();
        const postField = fields?.post;

        expect(postField).toBeDefined();
        expect((postField?.type as any).name).toBe('Post');

        const args = postField?.args;
        const idArg = args?.find(arg => arg.name === 'id');
        expect(idArg).toBeDefined();
        expect(idArg?.type).toBeInstanceOf(GraphQLNonNull);
        expect((idArg?.type as any).ofType).toBe(GraphQLID);
      });

      it('should have userPosts field with handle argument returning PostConnection!', () => {
        const queryType = schema.getQueryType();
        const fields = queryType?.getFields();
        const userPostsField = fields?.userPosts;

        expect(userPostsField).toBeDefined();
        expect(userPostsField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((userPostsField?.type as any).ofType.name).toBe('PostConnection');

        const args = userPostsField?.args;
        const handleArg = args?.find(arg => arg.name === 'handle');
        expect(handleArg).toBeDefined();
        expect(handleArg?.type).toBeInstanceOf(GraphQLNonNull);
      });

      it('should have userPosts with pagination arguments (limit, cursor)', () => {
        const queryType = schema.getQueryType();
        const fields = queryType?.getFields();
        const userPostsField = fields?.userPosts;

        const args = userPostsField?.args;
        const limitArg = args?.find(arg => arg.name === 'limit');
        const cursorArg = args?.find(arg => arg.name === 'cursor');

        expect(limitArg).toBeDefined();
        expect(limitArg?.type).toBe(GraphQLInt);
        expect(cursorArg).toBeDefined();
        expect((cursorArg?.type as any)).toBe(GraphQLString);
      });
    });

    describe('Feed Queries', () => {
      it('should have feed field returning FeedConnection!', () => {
        const queryType = schema.getQueryType();
        const fields = queryType?.getFields();
        const feedField = fields?.feed;

        expect(feedField).toBeDefined();
        expect(feedField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((feedField?.type as any).ofType.name).toBe('FeedConnection');
      });

      it('should have feed with pagination arguments', () => {
        const queryType = schema.getQueryType();
        const fields = queryType?.getFields();
        const feedField = fields?.feed;

        const args = feedField?.args;
        const limitArg = args?.find(arg => arg.name === 'limit');
        const cursorArg = args?.find(arg => arg.name === 'cursor');

        expect(limitArg).toBeDefined();
        expect(cursorArg).toBeDefined();
      });
    });

    describe('Social Queries', () => {
      it('should have postLikeStatus field returning LikeStatus!', () => {
        const queryType = schema.getQueryType();
        const fields = queryType?.getFields();
        const likeStatusField = fields?.postLikeStatus;

        expect(likeStatusField).toBeDefined();
        expect(likeStatusField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((likeStatusField?.type as any).ofType.name).toBe('LikeStatus');

        const args = likeStatusField?.args;
        const postIdArg = args?.find(arg => arg.name === 'postId');
        expect(postIdArg).toBeDefined();
        expect(postIdArg?.type).toBeInstanceOf(GraphQLNonNull);
      });

      it('should have followStatus field returning FollowStatus!', () => {
        const queryType = schema.getQueryType();
        const fields = queryType?.getFields();
        const followStatusField = fields?.followStatus;

        expect(followStatusField).toBeDefined();
        expect(followStatusField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((followStatusField?.type as any).ofType.name).toBe('FollowStatus');

        const args = followStatusField?.args;
        const userIdArg = args?.find(arg => arg.name === 'userId');
        expect(userIdArg).toBeDefined();
        expect(userIdArg?.type).toBeInstanceOf(GraphQLNonNull);
      });
    });

    describe('Comment Queries', () => {
      it('should have comments field returning CommentConnection!', () => {
        const queryType = schema.getQueryType();
        const fields = queryType?.getFields();
        const commentsField = fields?.comments;

        expect(commentsField).toBeDefined();
        expect(commentsField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((commentsField?.type as any).ofType.name).toBe('CommentConnection');

        const args = commentsField?.args;
        const postIdArg = args?.find(arg => arg.name === 'postId');
        expect(postIdArg).toBeDefined();
        expect(postIdArg?.type).toBeInstanceOf(GraphQLNonNull);
      });
    });

    describe('Notification Queries', () => {
      it('should have notifications field returning NotificationConnection!', () => {
        const queryType = schema.getQueryType();
        const fields = queryType?.getFields();
        const notificationsField = fields?.notifications;

        expect(notificationsField).toBeDefined();
        expect(notificationsField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((notificationsField?.type as any).ofType.name).toBe('NotificationConnection');
      });

      it('should have unreadNotificationsCount field returning Int!', () => {
        const queryType = schema.getQueryType();
        const fields = queryType?.getFields();
        const unreadCountField = fields?.unreadNotificationsCount;

        expect(unreadCountField).toBeDefined();
        expect(unreadCountField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((unreadCountField?.type as any).ofType).toBe(GraphQLInt);
      });
    });
  });

  describe('Mutation Type Fields', () => {
    beforeEach(() => {
      schema = buildSchema(typeDefs);
    });

    describe('Authentication Mutations', () => {
      it('should have register mutation with input returning AuthPayload!', () => {
        const mutationType = schema.getMutationType();
        const fields = mutationType?.getFields();
        const registerField = fields?.register;

        expect(registerField).toBeDefined();
        expect(registerField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((registerField?.type as any).ofType.name).toBe('AuthPayload');

        const args = registerField?.args;
        const inputArg = args?.find(arg => arg.name === 'input');
        expect(inputArg).toBeDefined();
        expect(inputArg?.type).toBeInstanceOf(GraphQLNonNull);
        expect((inputArg?.type as any).ofType.name).toBe('RegisterInput');
      });

      it('should have login mutation with input returning AuthPayload!', () => {
        const mutationType = schema.getMutationType();
        const fields = mutationType?.getFields();
        const loginField = fields?.login;

        expect(loginField).toBeDefined();
        expect(loginField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((loginField?.type as any).ofType.name).toBe('AuthPayload');

        const args = loginField?.args;
        const inputArg = args?.find(arg => arg.name === 'input');
        expect(inputArg).toBeDefined();
        expect(inputArg?.type).toBeInstanceOf(GraphQLNonNull);
        expect((inputArg?.type as any).ofType.name).toBe('LoginInput');
      });

      it('should have logout mutation returning LogoutResponse!', () => {
        const mutationType = schema.getMutationType();
        const fields = mutationType?.getFields();
        const logoutField = fields?.logout;

        expect(logoutField).toBeDefined();
        expect(logoutField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((logoutField?.type as any).ofType.name).toBe('LogoutResponse');
      });

      it('should have refreshToken mutation returning AuthPayload!', () => {
        const mutationType = schema.getMutationType();
        const fields = mutationType?.getFields();
        const refreshField = fields?.refreshToken;

        expect(refreshField).toBeDefined();
        expect(refreshField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((refreshField?.type as any).ofType.name).toBe('AuthPayload');
      });
    });

    describe('Profile Mutations', () => {
      it('should have updateProfile mutation returning Profile!', () => {
        const mutationType = schema.getMutationType();
        const fields = mutationType?.getFields();
        const updateProfileField = fields?.updateProfile;

        expect(updateProfileField).toBeDefined();
        expect(updateProfileField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((updateProfileField?.type as any).ofType.name).toBe('Profile');

        const args = updateProfileField?.args;
        const inputArg = args?.find(arg => arg.name === 'input');
        expect(inputArg).toBeDefined();
        expect(inputArg?.type).toBeInstanceOf(GraphQLNonNull);
        expect((inputArg?.type as any).ofType.name).toBe('UpdateProfileInput');
      });

      it('should have getPresignedUrl mutation for profile picture upload', () => {
        const mutationType = schema.getMutationType();
        const fields = mutationType?.getFields();
        const presignedUrlField = fields?.getProfilePictureUploadUrl;

        expect(presignedUrlField).toBeDefined();
        expect(presignedUrlField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((presignedUrlField?.type as any).ofType.name).toBe('PresignedUrlResponse');

        const args = presignedUrlField?.args;
        const fileTypeArg = args?.find(arg => arg.name === 'fileType');
        expect(fileTypeArg).toBeDefined();
      });
    });

    describe('Post Mutations', () => {
      it('should have createPost mutation returning CreatePostPayload!', () => {
        const mutationType = schema.getMutationType();
        const fields = mutationType?.getFields();
        const createPostField = fields?.createPost;

        expect(createPostField).toBeDefined();
        expect(createPostField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((createPostField?.type as any).ofType.name).toBe('CreatePostPayload');

        const args = createPostField?.args;
        const inputArg = args?.find(arg => arg.name === 'input');
        expect(inputArg).toBeDefined();
        expect(inputArg?.type).toBeInstanceOf(GraphQLNonNull);
        expect((inputArg?.type as any).ofType.name).toBe('CreatePostInput');
      });

      it('should have updatePost mutation returning Post!', () => {
        const mutationType = schema.getMutationType();
        const fields = mutationType?.getFields();
        const updatePostField = fields?.updatePost;

        expect(updatePostField).toBeDefined();
        expect(updatePostField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((updatePostField?.type as any).ofType.name).toBe('Post');

        const args = updatePostField?.args;
        const idArg = args?.find(arg => arg.name === 'id');
        const inputArg = args?.find(arg => arg.name === 'input');

        expect(idArg).toBeDefined();
        expect(idArg?.type).toBeInstanceOf(GraphQLNonNull);
        expect(inputArg).toBeDefined();
        expect(inputArg?.type).toBeInstanceOf(GraphQLNonNull);
      });

      it('should have deletePost mutation returning DeleteResponse!', () => {
        const mutationType = schema.getMutationType();
        const fields = mutationType?.getFields();
        const deletePostField = fields?.deletePost;

        expect(deletePostField).toBeDefined();
        expect(deletePostField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((deletePostField?.type as any).ofType.name).toBe('DeleteResponse');

        const args = deletePostField?.args;
        const idArg = args?.find(arg => arg.name === 'id');
        expect(idArg).toBeDefined();
        expect(idArg?.type).toBeInstanceOf(GraphQLNonNull);
      });
    });

    describe('Social Mutations', () => {
      it('should have likePost mutation returning LikeResponse!', () => {
        const mutationType = schema.getMutationType();
        const fields = mutationType?.getFields();
        const likePostField = fields?.likePost;

        expect(likePostField).toBeDefined();
        expect(likePostField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((likePostField?.type as any).ofType.name).toBe('LikeResponse');

        const args = likePostField?.args;
        const postIdArg = args?.find(arg => arg.name === 'postId');
        expect(postIdArg).toBeDefined();
        expect(postIdArg?.type).toBeInstanceOf(GraphQLNonNull);
      });

      it('should have unlikePost mutation returning LikeResponse!', () => {
        const mutationType = schema.getMutationType();
        const fields = mutationType?.getFields();
        const unlikePostField = fields?.unlikePost;

        expect(unlikePostField).toBeDefined();
        expect(unlikePostField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((unlikePostField?.type as any).ofType.name).toBe('LikeResponse');

        const args = unlikePostField?.args;
        const postIdArg = args?.find(arg => arg.name === 'postId');
        expect(postIdArg).toBeDefined();
        expect(postIdArg?.type).toBeInstanceOf(GraphQLNonNull);
      });

      it('should have followUser mutation returning FollowResponse!', () => {
        const mutationType = schema.getMutationType();
        const fields = mutationType?.getFields();
        const followUserField = fields?.followUser;

        expect(followUserField).toBeDefined();
        expect(followUserField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((followUserField?.type as any).ofType.name).toBe('FollowResponse');

        const args = followUserField?.args;
        const userIdArg = args?.find(arg => arg.name === 'userId');
        expect(userIdArg).toBeDefined();
        expect(userIdArg?.type).toBeInstanceOf(GraphQLNonNull);
      });

      it('should have unfollowUser mutation returning FollowResponse!', () => {
        const mutationType = schema.getMutationType();
        const fields = mutationType?.getFields();
        const unfollowUserField = fields?.unfollowUser;

        expect(unfollowUserField).toBeDefined();
        expect(unfollowUserField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((unfollowUserField?.type as any).ofType.name).toBe('FollowResponse');

        const args = unfollowUserField?.args;
        const userIdArg = args?.find(arg => arg.name === 'userId');
        expect(userIdArg).toBeDefined();
        expect(userIdArg?.type).toBeInstanceOf(GraphQLNonNull);
      });
    });

    describe('Comment Mutations', () => {
      it('should have createComment mutation returning Comment!', () => {
        const mutationType = schema.getMutationType();
        const fields = mutationType?.getFields();
        const createCommentField = fields?.createComment;

        expect(createCommentField).toBeDefined();
        expect(createCommentField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((createCommentField?.type as any).ofType.name).toBe('Comment');

        const args = createCommentField?.args;
        const inputArg = args?.find(arg => arg.name === 'input');
        expect(inputArg).toBeDefined();
        expect(inputArg?.type).toBeInstanceOf(GraphQLNonNull);
        expect((inputArg?.type as any).ofType.name).toBe('CreateCommentInput');
      });

      it('should have deleteComment mutation returning DeleteResponse!', () => {
        const mutationType = schema.getMutationType();
        const fields = mutationType?.getFields();
        const deleteCommentField = fields?.deleteComment;

        expect(deleteCommentField).toBeDefined();
        expect(deleteCommentField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((deleteCommentField?.type as any).ofType.name).toBe('DeleteResponse');

        const args = deleteCommentField?.args;
        const idArg = args?.find(arg => arg.name === 'id');
        expect(idArg).toBeDefined();
        expect(idArg?.type).toBeInstanceOf(GraphQLNonNull);
      });
    });

    describe('Notification Mutations', () => {
      it('should have markNotificationAsRead mutation returning Notification!', () => {
        const mutationType = schema.getMutationType();
        const fields = mutationType?.getFields();
        const markReadField = fields?.markNotificationAsRead;

        expect(markReadField).toBeDefined();
        expect(markReadField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((markReadField?.type as any).ofType.name).toBe('Notification');

        const args = markReadField?.args;
        const idArg = args?.find(arg => arg.name === 'id');
        expect(idArg).toBeDefined();
        expect(idArg?.type).toBeInstanceOf(GraphQLNonNull);
      });

      it('should have markAllNotificationsAsRead mutation returning MarkAllReadResponse!', () => {
        const mutationType = schema.getMutationType();
        const fields = mutationType?.getFields();
        const markAllReadField = fields?.markAllNotificationsAsRead;

        expect(markAllReadField).toBeDefined();
        expect(markAllReadField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((markAllReadField?.type as any).ofType.name).toBe('MarkAllReadResponse');
      });

      it('should have deleteNotification mutation returning DeleteResponse!', () => {
        const mutationType = schema.getMutationType();
        const fields = mutationType?.getFields();
        const deleteNotificationField = fields?.deleteNotification;

        expect(deleteNotificationField).toBeDefined();
        expect(deleteNotificationField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((deleteNotificationField?.type as any).ofType.name).toBe('DeleteResponse');

        const args = deleteNotificationField?.args;
        const idArg = args?.find(arg => arg.name === 'id');
        expect(idArg).toBeDefined();
        expect(idArg?.type).toBeInstanceOf(GraphQLNonNull);
      });
    });

    describe('Feed Mutations', () => {
      it('should have markFeedItemsAsRead mutation returning MarkFeedReadResponse!', () => {
        const mutationType = schema.getMutationType();
        const fields = mutationType?.getFields();
        const markFeedReadField = fields?.markFeedItemsAsRead;

        expect(markFeedReadField).toBeDefined();
        expect(markFeedReadField?.type).toBeInstanceOf(GraphQLNonNull);
        expect((markFeedReadField?.type as any).ofType.name).toBe('MarkFeedReadResponse');

        const args = markFeedReadField?.args;
        const postIdsArg = args?.find(arg => arg.name === 'postIds');
        expect(postIdsArg).toBeDefined();
        expect(postIdsArg?.type).toBeInstanceOf(GraphQLNonNull);
      });
    });
  });

  describe('Type Definitions - Profile', () => {
    beforeEach(() => {
      schema = buildSchema(typeDefs);
    });

    it('should have Profile type', () => {
      const profileType = schema.getType('Profile');
      expect(profileType).toBeDefined();
      expect(profileType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have Profile with required id field (ID!)', () => {
      const profileType = schema.getType('Profile') as GraphQLObjectType;
      const fields = profileType.getFields();
      const idField = fields.id;

      expect(idField).toBeDefined();
      expect(idField.type).toBeInstanceOf(GraphQLNonNull);
      expect((idField.type as any).ofType).toBe(GraphQLID);
    });

    it('should have Profile with required handle field (String!)', () => {
      const profileType = schema.getType('Profile') as GraphQLObjectType;
      const fields = profileType.getFields();
      const handleField = fields.handle;

      expect(handleField).toBeDefined();
      expect(handleField.type).toBeInstanceOf(GraphQLNonNull);
      expect((handleField.type as any).ofType).toBe(GraphQLString);
    });

    it('should have Profile with username field (String!)', () => {
      const profileType = schema.getType('Profile') as GraphQLObjectType;
      const fields = profileType.getFields();
      const usernameField = fields.username;

      expect(usernameField).toBeDefined();
      expect(usernameField.type).toBeInstanceOf(GraphQLNonNull);
      expect((usernameField.type as any).ofType).toBe(GraphQLString);
    });

    it('should have Profile with optional fullName field (String)', () => {
      const profileType = schema.getType('Profile') as GraphQLObjectType;
      const fields = profileType.getFields();
      const fullNameField = fields.fullName;

      expect(fullNameField).toBeDefined();
      expect((fullNameField.type as any)).toBe(GraphQLString);
    });

    it('should have Profile with optional bio field (String)', () => {
      const profileType = schema.getType('Profile') as GraphQLObjectType;
      const fields = profileType.getFields();
      const bioField = fields.bio;

      expect(bioField).toBeDefined();
      expect((bioField.type as any)).toBe(GraphQLString);
    });

    it('should have Profile with optional profilePictureUrl field (String)', () => {
      const profileType = schema.getType('Profile') as GraphQLObjectType;
      const fields = profileType.getFields();
      const pictureField = fields.profilePictureUrl;

      expect(pictureField).toBeDefined();
      expect((pictureField.type as any)).toBe(GraphQLString);
    });

    it('should have Profile with count fields (followersCount, followingCount, postsCount as Int!)', () => {
      const profileType = schema.getType('Profile') as GraphQLObjectType;
      const fields = profileType.getFields();

      const followersCountField = fields.followersCount;
      const followingCountField = fields.followingCount;
      const postsCountField = fields.postsCount;

      expect(followersCountField).toBeDefined();
      expect(followersCountField.type).toBeInstanceOf(GraphQLNonNull);
      expect((followersCountField.type as any).ofType).toBe(GraphQLInt);

      expect(followingCountField).toBeDefined();
      expect(followingCountField.type).toBeInstanceOf(GraphQLNonNull);
      expect((followingCountField.type as any).ofType).toBe(GraphQLInt);

      expect(postsCountField).toBeDefined();
      expect(postsCountField.type).toBeInstanceOf(GraphQLNonNull);
      expect((postsCountField.type as any).ofType).toBe(GraphQLInt);
    });

    it('should have Profile with optional isFollowing field (Boolean)', () => {
      const profileType = schema.getType('Profile') as GraphQLObjectType;
      const fields = profileType.getFields();
      const isFollowingField = fields.isFollowing;

      expect(isFollowingField).toBeDefined();
      expect((isFollowingField.type as any)).toBe(GraphQLBoolean);
    });

    it('should have Profile with createdAt field (String!)', () => {
      const profileType = schema.getType('Profile') as GraphQLObjectType;
      const fields = profileType.getFields();
      const createdAtField = fields.createdAt;

      expect(createdAtField).toBeDefined();
      expect(createdAtField.type).toBeInstanceOf(GraphQLNonNull);
      expect((createdAtField.type as any).ofType).toBe(GraphQLString);
    });
  });

  describe('Type Definitions - Post', () => {
    beforeEach(() => {
      schema = buildSchema(typeDefs);
    });

    it('should have Post type', () => {
      const postType = schema.getType('Post');
      expect(postType).toBeDefined();
      expect(postType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have Post with required id field (ID!)', () => {
      const postType = schema.getType('Post') as GraphQLObjectType;
      const fields = postType.getFields();
      const idField = fields.id;

      expect(idField).toBeDefined();
      expect(idField.type).toBeInstanceOf(GraphQLNonNull);
      expect((idField.type as any).ofType).toBe(GraphQLID);
    });

    it('should have Post with userId field (ID!)', () => {
      const postType = schema.getType('Post') as GraphQLObjectType;
      const fields = postType.getFields();
      const userIdField = fields.userId;

      expect(userIdField).toBeDefined();
      expect(userIdField.type).toBeInstanceOf(GraphQLNonNull);
      expect((userIdField.type as any).ofType).toBe(GraphQLID);
    });

    it('should have Post with author field (Profile!)', () => {
      const postType = schema.getType('Post') as GraphQLObjectType;
      const fields = postType.getFields();
      const authorField = fields.author;

      expect(authorField).toBeDefined();
      expect(authorField.type).toBeInstanceOf(GraphQLNonNull);
      expect((authorField.type as any).ofType.name).toBe('Profile');
    });

    it('should have Post with imageUrl and thumbnailUrl fields (String!)', () => {
      const postType = schema.getType('Post') as GraphQLObjectType;
      const fields = postType.getFields();

      const imageUrlField = fields.imageUrl;
      const thumbnailUrlField = fields.thumbnailUrl;

      expect(imageUrlField).toBeDefined();
      expect(imageUrlField.type).toBeInstanceOf(GraphQLNonNull);
      expect((imageUrlField.type as any).ofType).toBe(GraphQLString);

      expect(thumbnailUrlField).toBeDefined();
      expect(thumbnailUrlField.type).toBeInstanceOf(GraphQLNonNull);
      expect((thumbnailUrlField.type as any).ofType).toBe(GraphQLString);
    });

    it('should have Post with optional caption field (String)', () => {
      const postType = schema.getType('Post') as GraphQLObjectType;
      const fields = postType.getFields();
      const captionField = fields.caption;

      expect(captionField).toBeDefined();
      expect((captionField.type as any)).toBe(GraphQLString);
    });

    it('should have Post with count fields (likesCount, commentsCount as Int!)', () => {
      const postType = schema.getType('Post') as GraphQLObjectType;
      const fields = postType.getFields();

      const likesCountField = fields.likesCount;
      const commentsCountField = fields.commentsCount;

      expect(likesCountField).toBeDefined();
      expect(likesCountField.type).toBeInstanceOf(GraphQLNonNull);
      expect((likesCountField.type as any).ofType).toBe(GraphQLInt);

      expect(commentsCountField).toBeDefined();
      expect(commentsCountField.type).toBeInstanceOf(GraphQLNonNull);
      expect((commentsCountField.type as any).ofType).toBe(GraphQLInt);
    });

    it('should have Post with optional isLiked field (Boolean)', () => {
      const postType = schema.getType('Post') as GraphQLObjectType;
      const fields = postType.getFields();
      const isLikedField = fields.isLiked;

      expect(isLikedField).toBeDefined();
      expect((isLikedField.type as any)).toBe(GraphQLBoolean);
    });

    it('should have Post with timestamp fields (createdAt, updatedAt as String!)', () => {
      const postType = schema.getType('Post') as GraphQLObjectType;
      const fields = postType.getFields();

      const createdAtField = fields.createdAt;
      const updatedAtField = fields.updatedAt;

      expect(createdAtField).toBeDefined();
      expect(createdAtField.type).toBeInstanceOf(GraphQLNonNull);
      expect((createdAtField.type as any).ofType).toBe(GraphQLString);

      expect(updatedAtField).toBeDefined();
      expect(updatedAtField.type).toBeInstanceOf(GraphQLNonNull);
      expect((updatedAtField.type as any).ofType).toBe(GraphQLString);
    });
  });

  describe('Type Definitions - Comment', () => {
    beforeEach(() => {
      schema = buildSchema(typeDefs);
    });

    it('should have Comment type', () => {
      const commentType = schema.getType('Comment');
      expect(commentType).toBeDefined();
      expect(commentType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have Comment with required fields (id, postId, userId, content)', () => {
      const commentType = schema.getType('Comment') as GraphQLObjectType;
      const fields = commentType.getFields();

      expect(fields.id).toBeDefined();
      expect(fields.id.type).toBeInstanceOf(GraphQLNonNull);

      expect(fields.postId).toBeDefined();
      expect(fields.postId.type).toBeInstanceOf(GraphQLNonNull);

      expect(fields.userId).toBeDefined();
      expect(fields.userId.type).toBeInstanceOf(GraphQLNonNull);

      expect(fields.content).toBeDefined();
      expect(fields.content.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.content.type as any).ofType).toBe(GraphQLString);
    });

    it('should have Comment with author field (Profile!)', () => {
      const commentType = schema.getType('Comment') as GraphQLObjectType;
      const fields = commentType.getFields();
      const authorField = fields.author;

      expect(authorField).toBeDefined();
      expect(authorField.type).toBeInstanceOf(GraphQLNonNull);
      expect((authorField.type as any).ofType.name).toBe('Profile');
    });

    it('should have Comment with timestamp fields (createdAt as String!)', () => {
      const commentType = schema.getType('Comment') as GraphQLObjectType;
      const fields = commentType.getFields();
      const createdAtField = fields.createdAt;

      expect(createdAtField).toBeDefined();
      expect(createdAtField.type).toBeInstanceOf(GraphQLNonNull);
      expect((createdAtField.type as any).ofType).toBe(GraphQLString);
    });
  });

  describe('Type Definitions - Notification', () => {
    beforeEach(() => {
      schema = buildSchema(typeDefs);
    });

    it('should have Notification type', () => {
      const notificationType = schema.getType('Notification');
      expect(notificationType).toBeDefined();
      expect(notificationType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have Notification with required fields (id, userId, type, status, title, message)', () => {
      const notificationType = schema.getType('Notification') as GraphQLObjectType;
      const fields = notificationType.getFields();

      expect(fields.id).toBeDefined();
      expect(fields.id.type).toBeInstanceOf(GraphQLNonNull);

      expect(fields.userId).toBeDefined();
      expect(fields.userId.type).toBeInstanceOf(GraphQLNonNull);

      expect(fields.type).toBeDefined();
      expect(fields.type.type).toBeInstanceOf(GraphQLNonNull);

      expect(fields.status).toBeDefined();
      expect(fields.status.type).toBeInstanceOf(GraphQLNonNull);

      expect(fields.title).toBeDefined();
      expect(fields.title.type).toBeInstanceOf(GraphQLNonNull);

      expect(fields.message).toBeDefined();
      expect(fields.message.type).toBeInstanceOf(GraphQLNonNull);
    });

    it('should have Notification with optional actor field (NotificationActor)', () => {
      const notificationType = schema.getType('Notification') as GraphQLObjectType;
      const fields = notificationType.getFields();
      const actorField = fields.actor;

      expect(actorField).toBeDefined();
      expect((actorField.type as any).name).toBe('NotificationActor');
    });

    it('should have Notification with timestamp fields (createdAt as String!)', () => {
      const notificationType = schema.getType('Notification') as GraphQLObjectType;
      const fields = notificationType.getFields();
      const createdAtField = fields.createdAt;

      expect(createdAtField).toBeDefined();
      expect(createdAtField.type).toBeInstanceOf(GraphQLNonNull);
      expect((createdAtField.type as any).ofType).toBe(GraphQLString);
    });
  });

  describe('Enum Types', () => {
    beforeEach(() => {
      schema = buildSchema(typeDefs);
    });

    it('should have NotificationType enum', () => {
      const notificationTypeEnum = schema.getType('NotificationType');
      expect(notificationTypeEnum).toBeDefined();
      expect(notificationTypeEnum).toBeInstanceOf(GraphQLEnumType);
    });

    it('should have NotificationType enum with correct values', () => {
      const notificationTypeEnum = schema.getType('NotificationType') as GraphQLEnumType;
      const values = notificationTypeEnum.getValues().map(v => v.name);

      expect(values).toContain('LIKE');
      expect(values).toContain('COMMENT');
      expect(values).toContain('FOLLOW');
      expect(values).toContain('MENTION');
      expect(values).toContain('SYSTEM');
    });

    it('should have NotificationStatus enum', () => {
      const notificationStatusEnum = schema.getType('NotificationStatus');
      expect(notificationStatusEnum).toBeDefined();
      expect(notificationStatusEnum).toBeInstanceOf(GraphQLEnumType);
    });

    it('should have NotificationStatus enum with correct values', () => {
      const notificationStatusEnum = schema.getType('NotificationStatus') as GraphQLEnumType;
      const values = notificationStatusEnum.getValues().map(v => v.name);

      expect(values).toContain('UNREAD');
      expect(values).toContain('READ');
      expect(values).toContain('ARCHIVED');
    });
  });

  describe('Input Types', () => {
    beforeEach(() => {
      schema = buildSchema(typeDefs);
    });

    it('should have RegisterInput type', () => {
      const registerInput = schema.getType('RegisterInput');
      expect(registerInput).toBeDefined();
      expect(registerInput).toBeInstanceOf(GraphQLInputObjectType);
    });

    it('should have RegisterInput with required fields (email, password, username)', () => {
      const registerInput = schema.getType('RegisterInput') as GraphQLInputObjectType;
      const fields = registerInput.getFields();

      expect(fields.email).toBeDefined();
      expect(fields.email.type).toBeInstanceOf(GraphQLNonNull);

      expect(fields.password).toBeDefined();
      expect(fields.password.type).toBeInstanceOf(GraphQLNonNull);

      expect(fields.username).toBeDefined();
      expect(fields.username.type).toBeInstanceOf(GraphQLNonNull);
    });

    it('should have LoginInput type', () => {
      const loginInput = schema.getType('LoginInput');
      expect(loginInput).toBeDefined();
      expect(loginInput).toBeInstanceOf(GraphQLInputObjectType);
    });

    it('should have LoginInput with required fields (email, password)', () => {
      const loginInput = schema.getType('LoginInput') as GraphQLInputObjectType;
      const fields = loginInput.getFields();

      expect(fields.email).toBeDefined();
      expect(fields.email.type).toBeInstanceOf(GraphQLNonNull);

      expect(fields.password).toBeDefined();
      expect(fields.password.type).toBeInstanceOf(GraphQLNonNull);
    });

    it('should have UpdateProfileInput type', () => {
      const updateProfileInput = schema.getType('UpdateProfileInput');
      expect(updateProfileInput).toBeDefined();
      expect(updateProfileInput).toBeInstanceOf(GraphQLInputObjectType);
    });

    it('should have UpdateProfileInput with optional fields (handle, fullName, bio)', () => {
      const updateProfileInput = schema.getType('UpdateProfileInput') as GraphQLInputObjectType;
      const fields = updateProfileInput.getFields();

      expect(fields.handle).toBeDefined();
      expect(fields.fullName).toBeDefined();
      expect(fields.bio).toBeDefined();
    });

    it('should have CreatePostInput type', () => {
      const createPostInput = schema.getType('CreatePostInput');
      expect(createPostInput).toBeDefined();
      expect(createPostInput).toBeInstanceOf(GraphQLInputObjectType);
    });

    it('should have CreatePostInput with required fileType and optional caption', () => {
      const createPostInput = schema.getType('CreatePostInput') as GraphQLInputObjectType;
      const fields = createPostInput.getFields();

      expect(fields.fileType).toBeDefined();
      expect(fields.fileType.type).toBeInstanceOf(GraphQLNonNull);

      expect(fields.caption).toBeDefined();
      // Caption is optional
    });

    it('should have UpdatePostInput type', () => {
      const updatePostInput = schema.getType('UpdatePostInput');
      expect(updatePostInput).toBeDefined();
      expect(updatePostInput).toBeInstanceOf(GraphQLInputObjectType);
    });

    it('should have CreateCommentInput type', () => {
      const createCommentInput = schema.getType('CreateCommentInput');
      expect(createCommentInput).toBeDefined();
      expect(createCommentInput).toBeInstanceOf(GraphQLInputObjectType);
    });

    it('should have CreateCommentInput with required fields (postId, content)', () => {
      const createCommentInput = schema.getType('CreateCommentInput') as GraphQLInputObjectType;
      const fields = createCommentInput.getFields();

      expect(fields.postId).toBeDefined();
      expect(fields.postId.type).toBeInstanceOf(GraphQLNonNull);

      expect(fields.content).toBeDefined();
      expect(fields.content.type).toBeInstanceOf(GraphQLNonNull);
    });
  });

  describe('Connection Types - Cursor Pagination', () => {
    beforeEach(() => {
      schema = buildSchema(typeDefs);
    });

    it('should have PageInfo type', () => {
      const pageInfoType = schema.getType('PageInfo');
      expect(pageInfoType).toBeDefined();
      expect(pageInfoType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have PageInfo with required fields (hasNextPage, endCursor)', () => {
      const pageInfoType = schema.getType('PageInfo') as GraphQLObjectType;
      const fields = pageInfoType.getFields();

      expect(fields.hasNextPage).toBeDefined();
      expect(fields.hasNextPage.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.hasNextPage.type as any).ofType).toBe(GraphQLBoolean);

      expect(fields.endCursor).toBeDefined();
      // endCursor can be nullable when no more pages
    });

    it('should have PostConnection type', () => {
      const postConnectionType = schema.getType('PostConnection');
      expect(postConnectionType).toBeDefined();
      expect(postConnectionType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have PostConnection with edges and pageInfo', () => {
      const postConnectionType = schema.getType('PostConnection') as GraphQLObjectType;
      const fields = postConnectionType.getFields();

      expect(fields.edges).toBeDefined();
      expect(fields.edges.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.edges.type as any).ofType).toBeInstanceOf(GraphQLList);

      expect(fields.pageInfo).toBeDefined();
      expect(fields.pageInfo.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.pageInfo.type as any).ofType.name).toBe('PageInfo');
    });

    it('should have PostEdge type', () => {
      const postEdgeType = schema.getType('PostEdge');
      expect(postEdgeType).toBeDefined();
      expect(postEdgeType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have PostEdge with node and cursor', () => {
      const postEdgeType = schema.getType('PostEdge') as GraphQLObjectType;
      const fields = postEdgeType.getFields();

      expect(fields.node).toBeDefined();
      expect(fields.node.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.node.type as any).ofType.name).toBe('Post');

      expect(fields.cursor).toBeDefined();
      expect(fields.cursor.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.cursor.type as any).ofType).toBe(GraphQLString);
    });

    it('should have CommentConnection type', () => {
      const commentConnectionType = schema.getType('CommentConnection');
      expect(commentConnectionType).toBeDefined();
      expect(commentConnectionType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have CommentEdge type', () => {
      const commentEdgeType = schema.getType('CommentEdge');
      expect(commentEdgeType).toBeDefined();
      expect(commentEdgeType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have NotificationConnection type', () => {
      const notificationConnectionType = schema.getType('NotificationConnection');
      expect(notificationConnectionType).toBeDefined();
      expect(notificationConnectionType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have NotificationEdge type', () => {
      const notificationEdgeType = schema.getType('NotificationEdge');
      expect(notificationEdgeType).toBeDefined();
      expect(notificationEdgeType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have FeedConnection type', () => {
      const feedConnectionType = schema.getType('FeedConnection');
      expect(feedConnectionType).toBeDefined();
      expect(feedConnectionType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have FeedEdge type', () => {
      const feedEdgeType = schema.getType('FeedEdge');
      expect(feedEdgeType).toBeDefined();
      expect(feedEdgeType).toBeInstanceOf(GraphQLObjectType);
    });
  });

  describe('Response Types', () => {
    beforeEach(() => {
      schema = buildSchema(typeDefs);
    });

    it('should have AuthPayload type', () => {
      const authPayloadType = schema.getType('AuthPayload');
      expect(authPayloadType).toBeDefined();
      expect(authPayloadType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have AuthPayload with user and tokens', () => {
      const authPayloadType = schema.getType('AuthPayload') as GraphQLObjectType;
      const fields = authPayloadType.getFields();

      expect(fields.user).toBeDefined();
      expect(fields.user.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.user.type as any).ofType.name).toBe('Profile');

      expect(fields.tokens).toBeDefined();
      expect(fields.tokens.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.tokens.type as any).ofType.name).toBe('AuthTokens');
    });

    it('should have AuthTokens type', () => {
      const authTokensType = schema.getType('AuthTokens');
      expect(authTokensType).toBeDefined();
      expect(authTokensType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have AuthTokens with accessToken and refreshToken', () => {
      const authTokensType = schema.getType('AuthTokens') as GraphQLObjectType;
      const fields = authTokensType.getFields();

      expect(fields.accessToken).toBeDefined();
      expect(fields.accessToken.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.accessToken.type as any).ofType).toBe(GraphQLString);

      expect(fields.refreshToken).toBeDefined();
      expect(fields.refreshToken.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.refreshToken.type as any).ofType).toBe(GraphQLString);

      expect(fields.expiresIn).toBeDefined();
      expect(fields.expiresIn.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.expiresIn.type as any).ofType).toBe(GraphQLInt);
    });

    it('should have CreatePostPayload type', () => {
      const createPostPayloadType = schema.getType('CreatePostPayload');
      expect(createPostPayloadType).toBeDefined();
      expect(createPostPayloadType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have CreatePostPayload with post and upload URLs', () => {
      const createPostPayloadType = schema.getType('CreatePostPayload') as GraphQLObjectType;
      const fields = createPostPayloadType.getFields();

      expect(fields.post).toBeDefined();
      expect(fields.post.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.post.type as any).ofType.name).toBe('Post');

      expect(fields.uploadUrl).toBeDefined();
      expect(fields.uploadUrl.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.uploadUrl.type as any).ofType).toBe(GraphQLString);

      expect(fields.thumbnailUploadUrl).toBeDefined();
      expect(fields.thumbnailUploadUrl.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.thumbnailUploadUrl.type as any).ofType).toBe(GraphQLString);
    });

    it('should have LikeResponse type', () => {
      const likeResponseType = schema.getType('LikeResponse');
      expect(likeResponseType).toBeDefined();
      expect(likeResponseType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have LikeResponse with success, likesCount, and isLiked', () => {
      const likeResponseType = schema.getType('LikeResponse') as GraphQLObjectType;
      const fields = likeResponseType.getFields();

      expect(fields.success).toBeDefined();
      expect(fields.success.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.success.type as any).ofType).toBe(GraphQLBoolean);

      expect(fields.likesCount).toBeDefined();
      expect(fields.likesCount.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.likesCount.type as any).ofType).toBe(GraphQLInt);

      expect(fields.isLiked).toBeDefined();
      expect(fields.isLiked.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.isLiked.type as any).ofType).toBe(GraphQLBoolean);
    });

    it('should have FollowResponse type', () => {
      const followResponseType = schema.getType('FollowResponse');
      expect(followResponseType).toBeDefined();
      expect(followResponseType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have FollowResponse with success and counts', () => {
      const followResponseType = schema.getType('FollowResponse') as GraphQLObjectType;
      const fields = followResponseType.getFields();

      expect(fields.success).toBeDefined();
      expect(fields.success.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.success.type as any).ofType).toBe(GraphQLBoolean);

      expect(fields.followersCount).toBeDefined();
      expect(fields.followersCount.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.followersCount.type as any).ofType).toBe(GraphQLInt);

      expect(fields.isFollowing).toBeDefined();
      expect(fields.isFollowing.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.isFollowing.type as any).ofType).toBe(GraphQLBoolean);
    });

    it('should have DeleteResponse type', () => {
      const deleteResponseType = schema.getType('DeleteResponse');
      expect(deleteResponseType).toBeDefined();
      expect(deleteResponseType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have DeleteResponse with success field', () => {
      const deleteResponseType = schema.getType('DeleteResponse') as GraphQLObjectType;
      const fields = deleteResponseType.getFields();

      expect(fields.success).toBeDefined();
      expect(fields.success.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.success.type as any).ofType).toBe(GraphQLBoolean);
    });

    it('should have LikeStatus type', () => {
      const likeStatusType = schema.getType('LikeStatus');
      expect(likeStatusType).toBeDefined();
      expect(likeStatusType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have FollowStatus type', () => {
      const followStatusType = schema.getType('FollowStatus');
      expect(followStatusType).toBeDefined();
      expect(followStatusType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have LogoutResponse type', () => {
      const logoutResponseType = schema.getType('LogoutResponse');
      expect(logoutResponseType).toBeDefined();
      expect(logoutResponseType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have MarkAllReadResponse type', () => {
      const markAllReadResponseType = schema.getType('MarkAllReadResponse');
      expect(markAllReadResponseType).toBeDefined();
      expect(markAllReadResponseType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have MarkAllReadResponse with updatedCount', () => {
      const markAllReadResponseType = schema.getType('MarkAllReadResponse') as GraphQLObjectType;
      const fields = markAllReadResponseType.getFields();

      expect(fields.updatedCount).toBeDefined();
      expect(fields.updatedCount.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.updatedCount.type as any).ofType).toBe(GraphQLInt);
    });

    it('should have MarkFeedReadResponse type', () => {
      const markFeedReadResponseType = schema.getType('MarkFeedReadResponse');
      expect(markFeedReadResponseType).toBeDefined();
      expect(markFeedReadResponseType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have PresignedUrlResponse type', () => {
      const presignedUrlResponseType = schema.getType('PresignedUrlResponse');
      expect(presignedUrlResponseType).toBeDefined();
      expect(presignedUrlResponseType).toBeInstanceOf(GraphQLObjectType);
    });
  });

  describe('Nested Types', () => {
    beforeEach(() => {
      schema = buildSchema(typeDefs);
    });

    it('should have NotificationActor type', () => {
      const notificationActorType = schema.getType('NotificationActor');
      expect(notificationActorType).toBeDefined();
      expect(notificationActorType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have NotificationActor with required fields', () => {
      const notificationActorType = schema.getType('NotificationActor') as GraphQLObjectType;
      const fields = notificationActorType.getFields();

      expect(fields.userId).toBeDefined();
      expect(fields.userId.type).toBeInstanceOf(GraphQLNonNull);

      expect(fields.handle).toBeDefined();
      expect(fields.handle.type).toBeInstanceOf(GraphQLNonNull);

      expect(fields.displayName).toBeDefined();
      // displayName is optional

      expect(fields.avatarUrl).toBeDefined();
      // avatarUrl is optional
    });

    it('should have NotificationTarget type', () => {
      const notificationTargetType = schema.getType('NotificationTarget');
      expect(notificationTargetType).toBeDefined();
      expect(notificationTargetType).toBeInstanceOf(GraphQLObjectType);
    });
  });
});
