/**
 * TypeMapper
 *
 * Utility class for transforming domain types from @social-media-app/shared
 * to GraphQL schema types. This isolates type transformation logic and makes
 * it easy to test.
 *
 * Key responsibilities:
 * - Transform domain entities to GraphQL types
 * - Build GraphQL Connection structures (edges, pageInfo, cursors)
 * - Generate stable cursors for pagination
 *
 * @example
 * ```typescript
 * // Transform a single comment
 * const graphqlComment = TypeMapper.toGraphQLComment(domainComment);
 *
 * // Transform paginated comments
 * const connection = TypeMapper.toGraphQLConnection(
 *   domainComments,
 *   TypeMapper.toGraphQLComment,
 *   { first: 10, hasNextPage: true }
 * );
 * ```
 */

import type {
  Comment as DomainComment,
  Post as DomainPost,
  PostGridItem as DomainPostGridItem,
  PostWithAuthor as DomainPostWithAuthor,
  Profile as DomainProfile,
  PublicProfile as DomainPublicProfile,
  Notification as DomainNotification,
} from '@social-media-app/shared';
import type {
  Comment as GraphQLComment,
  PageInfo,
  Post as GraphQLPost,
  Profile as GraphQLProfile,
  Notification as GraphQLNotification,
} from '../../../schema/generated/types';
import { CursorCodec } from '../../pagination/CursorCodec';

/**
 * TypeMapper - Static utility class for type transformations
 *
 * This class provides methods to transform domain types to GraphQL types.
 * All methods are static, making it easy to use without instantiation.
 */
export class TypeMapper {
  /**
   * Transform domain Comment to GraphQL Comment
   *
   * Domain Comment has a flat structure with userHandle, while GraphQL Comment
   * requires a nested author object with id, handle, and username.
   *
   * @param domain - The domain Comment from @social-media-app/shared
   * @returns GraphQL Comment type compatible with schema
   *
   * @example
   * ```typescript
   * const domainComment = {
   *   id: 'comment-1',
   *   userId: 'user-1',
   *   userHandle: 'johndoe',
   *   content: 'Great post!',
   *   ...
   * };
   *
   * const graphqlComment = TypeMapper.toGraphQLComment(domainComment);
   * // {
   * //   id: 'comment-1',
   * //   userId: 'user-1',
   * //   author: { id: 'user-1', handle: 'johndoe', username: 'johndoe' },
   * //   content: 'Great post!',
   * //   ...
   * // }
   * ```
   */
  static toGraphQLComment(domain: DomainComment): GraphQLComment {
    // Build the author object from flat domain fields
    const author: GraphQLProfile = {
      id: domain.userId,
      handle: domain.userHandle,
      username: domain.userHandle, // Use handle as fallback for username
    } as GraphQLProfile; // Type assertion needed because Profile has more required fields

    return {
      id: domain.id,
      postId: domain.postId,
      userId: domain.userId,
      content: domain.content,
      createdAt: domain.createdAt,
      author,
    };
  }

  /**
   * Transform array of domain items to GraphQL Connection
   *
   * This is a truly generic method that works with any domain/GraphQL type pair
   * and any Connection type. It builds the standard GraphQL Connection structure
   * with edges, cursors, and pageInfo.
   *
   * Cursors are generated using CursorCodec with { id, timestamp } for stable
   * pagination across requests.
   *
   * @param items - Array of domain items to transform
   * @param transformer - Function to transform each domain item to GraphQL type
   * @param options - Pagination metadata
   * @param options.first - Number of items requested
   * @param options.after - Cursor for pagination (optional)
   * @param options.hasNextPage - Whether there are more items
   * @param options.hasPreviousPage - Whether there are previous items
   * @returns GraphQL Connection with edges and pageInfo
   *
   * @example
   * ```typescript
   * // For Comments
   * const commentConnection = TypeMapper.toGraphQLConnection<Comment, GraphQLComment, CommentConnection>(
   *   domainComments,
   *   TypeMapper.toGraphQLComment,
   *   { hasNextPage: true }
   * );
   *
   * // For Posts
   * const postConnection = TypeMapper.toGraphQLConnection<Post, GraphQLPost, PostConnection>(
   *   domainPosts,
   *   TypeMapper.toGraphQLPost,
   *   { hasNextPage: false }
   * );
   * ```
   */
  static toGraphQLConnection<TDomain, TGraphQL, TConnection>(
    items: TDomain[],
    transformer: (item: TDomain) => TGraphQL,
    options: {
      first?: number;
      after?: string;
      hasNextPage?: boolean;
      hasPreviousPage?: boolean;
    }
  ): TConnection {
    // Transform each item and create edges with cursors
    const edges = items.map((item) => {
      // Transform domain item to GraphQL type
      const node = transformer(item);

      // Generate stable cursor using id and timestamp
      // Type assertion: we know the node has id and createdAt
      const nodeWithCursor = node as any;
      const cursorData = {
        id: nodeWithCursor.id,
        sortKey: nodeWithCursor.createdAt,
      };

      const codec = new CursorCodec();
      const cursor = codec.encode(cursorData);

      return {
        node,
        cursor,
      };
    });

    // Build PageInfo
    const pageInfo: PageInfo = {
      hasNextPage: options.hasNextPage ?? false,
      hasPreviousPage: options.hasPreviousPage ?? false,
      startCursor: edges.length > 0 ? edges[0].cursor : null,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    };

    return {
      edges,
      pageInfo,
    } as TConnection;
  }

  /**
   * Transform domain Post to GraphQL Post
   *
   * Transforms a full Post from the domain layer to GraphQL Post type.
   * Note: Author field will be resolved by Post.author field resolver.
   *
   * @param domain - The domain Post from @social-media-app/shared
   * @returns GraphQL Post type compatible with schema
   */
  static toGraphQLPost(domain: DomainPost): GraphQLPost {
    return {
      id: domain.id,
      userId: domain.userId,
      imageUrl: domain.imageUrl,
      thumbnailUrl: domain.thumbnailUrl,
      caption: domain.caption ?? null,
      likesCount: domain.likesCount,
      commentsCount: domain.commentsCount,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    } as GraphQLPost;
  }

  /**
   * Transform domain PostGridItem to GraphQL Post
   *
   * Transforms a minimal PostGridItem (for grid views) to GraphQL Post type.
   * Uses thumbnailUrl for imageUrl to optimize grid loading.
   *
   * @param domain - The domain PostGridItem from @social-media-app/shared
   * @returns GraphQL Post type compatible with schema
   */
  static toGraphQLPostGridItem(domain: DomainPostGridItem): GraphQLPost {
    return {
      id: domain.id,
      userId: domain.userId,
      imageUrl: domain.thumbnailUrl,
      thumbnailUrl: domain.thumbnailUrl,
      caption: domain.caption ?? null,
      likesCount: domain.likesCount,
      commentsCount: domain.commentsCount,
      createdAt: domain.createdAt,
      updatedAt: domain.createdAt,
    } as GraphQLPost;
  }

  /**
   * Transform domain PostWithAuthor to GraphQL Post
   *
   * Transforms a PostWithAuthor (feed post with embedded author info) to GraphQL Post.
   * Includes author profile and isLiked status for feed display.
   *
   * @param domain - The domain PostWithAuthor from @social-media-app/shared
   * @returns GraphQL Post type compatible with schema
   */
  static toGraphQLFeedPost(domain: DomainPostWithAuthor): GraphQLPost {
    const author: GraphQLProfile = {
      id: domain.authorId,
      handle: domain.authorHandle,
      username: domain.authorHandle,
      fullName: domain.authorFullName ?? null,
      profilePictureUrl: domain.authorProfilePictureUrl ?? null,
    } as GraphQLProfile;

    return {
      id: domain.id,
      userId: domain.userId,
      imageUrl: domain.imageUrl,
      thumbnailUrl: domain.imageUrl,
      caption: domain.caption ?? null,
      likesCount: domain.likesCount,
      commentsCount: domain.commentsCount,
      isLiked: domain.isLiked ?? null,
      createdAt: domain.createdAt,
      updatedAt: domain.createdAt,
      author,
    } as GraphQLPost;
  }

  /**
   * Transform domain Profile to GraphQL Profile
   *
   * Transforms a full Profile from the domain layer to GraphQL Profile type.
   * Used for authenticated user's own profile.
   *
   * @param domain - The domain Profile from @social-media-app/shared
   * @returns GraphQL Profile type compatible with schema
   */
  static toGraphQLProfile(domain: DomainProfile): GraphQLProfile {
    return {
      id: domain.id,
      handle: domain.handle,
      username: domain.handle,
      fullName: domain.fullName ?? null,
      bio: domain.bio ?? null,
      profilePictureUrl: domain.profilePictureUrl ?? null,
      postsCount: domain.postsCount ?? 0,
      followersCount: domain.followersCount ?? 0,
      followingCount: domain.followingCount ?? 0,
    } as GraphQLProfile;
  }

  /**
   * Transform domain PublicProfile to GraphQL Profile
   *
   * Transforms a PublicProfile (viewed by others) to GraphQL Profile type.
   * May have limited fields compared to full Profile.
   *
   * @param domain - The domain PublicProfile from @social-media-app/shared
   * @returns GraphQL Profile type compatible with schema
   */
  static toGraphQLPublicProfile(domain: DomainPublicProfile): GraphQLProfile {
    return {
      id: domain.id,
      handle: domain.handle,
      username: domain.handle,
      fullName: domain.fullName ?? null,
      bio: domain.bio ?? null,
      profilePictureUrl: domain.profilePictureUrl ?? null,
      postsCount: domain.postsCount ?? 0,
      followersCount: domain.followersCount ?? 0,
      followingCount: domain.followingCount ?? 0,
    } as GraphQLProfile;
  }

  /**
   * Transform domain Notification to GraphQL Notification
   *
   * Transforms a Notification from the domain layer to GraphQL Notification type.
   * The domain Notification already has the correct structure matching GraphQL schema.
   *
   * @param domain - The domain Notification from @social-media-app/shared
   * @returns GraphQL Notification type compatible with schema
   */
  static toGraphQLNotification(domain: DomainNotification): GraphQLNotification {
    return {
      id: domain.id,
      userId: domain.userId,
      type: domain.type,
      title: domain.title,
      message: domain.message,
      status: domain.status,
      actor: domain.actor ?? null,
      target: domain.target ?? null,
      createdAt: domain.createdAt,
      readAt: domain.readAt ?? null,
    } as GraphQLNotification;
  }
}
