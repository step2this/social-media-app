/**
 * Resolver Parent Types
 *
 * Type definitions for resolver return values that will be completed by field resolvers.
 *
 * GraphQL field resolvers allow mutations to return partial objects that are then
 * completed by field-level resolvers. These types represent the "parent" objects
 * that mutations return, before field resolvers add computed fields.
 *
 * Why These Types Exist:
 * - GraphQL codegen generates strict types that include all fields (even field resolver fields)
 * - Use cases and services return "base" data without computed/relational fields
 * - Field resolvers add missing fields (author, isLiked, seller, winner, etc.)
 * - These types bridge the gap, providing type safety for the base data
 *
 * Pattern:
 * 1. Mutation returns a "parent" object (using these types)
 * 2. GraphQL invokes field resolvers to complete the object
 * 3. Client receives fully populated object
 *
 * @see Post field resolvers - adds author, isLiked
 * @see Comment field resolvers - adds author
 * @see Auction field resolvers - adds seller, winner
 */

/**
 * Post parent type for mutations
 *
 * Represents a Post object as returned by mutations, before field resolvers
 * add the `author` and `isLiked` fields.
 *
 * Field Resolvers Complete:
 * - author: PublicProfile! (Post.author resolver)
 * - isLiked: Boolean (Post.isLiked resolver)
 */
export interface PostParent {
  id: string;
  userId: string;
  imageUrl: string;
  thumbnailUrl: string;
  caption: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Comment parent type for mutations
 *
 * Represents a Comment object as returned by mutations, before field resolvers
 * add the `author` field.
 *
 * Field Resolvers Complete:
 * - author: PublicProfile! (Comment.author resolver)
 */
export interface CommentParent {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Auction parent type for mutations
 *
 * Represents an Auction object as returned by mutations, before field resolvers
 * add the `seller` and `winner` fields.
 *
 * Field Resolvers Complete:
 * - seller: PublicProfile! (Auction.seller resolver)
 * - winner: PublicProfile (Auction.winner resolver)
 */
export interface AuctionParent {
  id: string;
  userId: string;
  title: string;
  description: string;
  startingPrice: number;
  reservePrice: number | null;
  currentPrice: number;
  imageUrl: string | null;
  status: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Bid parent type for mutations
 *
 * Represents a Bid object as returned by mutations.
 * Currently has no field resolvers, but included for consistency.
 */
export interface BidParent {
  id: string;
  auctionId: string;
  userId: string;
  amount: number;
  createdAt: string;
}

/**
 * CreatePostPayload parent type
 *
 * Represents the CreatePostPayload as returned by createPost mutation,
 * with a PostParent (partial Post) that will be completed by field resolvers.
 */
export interface CreatePostPayloadParent {
  post: PostParent;
  uploadUrl: string;
  thumbnailUploadUrl: string;
}

/**
 * PlaceBidPayload parent type
 *
 * Represents the PlaceBidPayload as returned by placeBid mutation,
 * with an AuctionParent (partial Auction) that will be completed by field resolvers.
 */
export interface PlaceBidPayloadParent {
  bid: BidParent;
  auction: AuctionParent;
}
