import { GraphQLResolveInfo } from 'graphql';
import { PostParent, CommentParent, AuctionParent, BidParent, CreatePostPayloadParent, PlaceBidPayloadParent, AuthPayloadParent, AuthTokensParent } from '../../infrastructure/resolvers/helpers/resolverTypes.js';
import { GraphQLContext } from '../../context.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type Auction = {
  __typename?: 'Auction';
  bidCount: Scalars['Int']['output'];
  createdAt: Scalars['String']['output'];
  currentPrice: Scalars['Float']['output'];
  description?: Maybe<Scalars['String']['output']>;
  endTime: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  imageUrl: Scalars['String']['output'];
  reservePrice?: Maybe<Scalars['Float']['output']>;
  seller: PublicProfile;
  startPrice: Scalars['Float']['output'];
  startTime: Scalars['String']['output'];
  status: AuctionStatus;
  title: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
  winner?: Maybe<PublicProfile>;
  winnerId?: Maybe<Scalars['ID']['output']>;
};

export type AuctionConnection = {
  __typename?: 'AuctionConnection';
  edges: Array<AuctionEdge>;
  pageInfo: PageInfo;
};

export type AuctionEdge = {
  __typename?: 'AuctionEdge';
  cursor: Scalars['String']['output'];
  node: Auction;
};

export enum AuctionStatus {
  Active = 'ACTIVE',
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  Pending = 'PENDING'
}

export type Bid = {
  __typename?: 'Bid';
  amount: Scalars['Float']['output'];
  auctionId: Scalars['ID']['output'];
  bidder: PublicProfile;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  userId: Scalars['ID']['output'];
};

export type BidConnection = {
  __typename?: 'BidConnection';
  bids: Array<Bid>;
  total: Scalars['Int']['output'];
};

export type Comment = {
  __typename?: 'Comment';
  author: PublicProfile;
  content: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  postId: Scalars['ID']['output'];
  userId: Scalars['ID']['output'];
};

export type CommentConnection = {
  __typename?: 'CommentConnection';
  edges: Array<CommentEdge>;
  pageInfo: PageInfo;
};

export type CommentEdge = {
  __typename?: 'CommentEdge';
  cursor: Scalars['String']['output'];
  node: Comment;
};

export type CreateAuctionInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  endTime: Scalars['String']['input'];
  fileType: Scalars['String']['input'];
  reservePrice?: InputMaybe<Scalars['Float']['input']>;
  startPrice: Scalars['Float']['input'];
  startTime: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type CreateAuctionPayload = {
  __typename?: 'CreateAuctionPayload';
  auction: Auction;
  uploadUrl: Scalars['String']['output'];
};

export type CreateCommentInput = {
  content: Scalars['String']['input'];
  postId: Scalars['ID']['input'];
};

export type DeleteResponse = {
  __typename?: 'DeleteResponse';
  success: Scalars['Boolean']['output'];
};

export type FollowResponse = {
  __typename?: 'FollowResponse';
  followersCount: Scalars['Int']['output'];
  followingCount: Scalars['Int']['output'];
  isFollowing: Scalars['Boolean']['output'];
  success: Scalars['Boolean']['output'];
};

export type FollowStatus = {
  __typename?: 'FollowStatus';
  followersCount: Scalars['Int']['output'];
  followingCount: Scalars['Int']['output'];
  isFollowing: Scalars['Boolean']['output'];
};

export type LikeResponse = {
  __typename?: 'LikeResponse';
  isLiked: Scalars['Boolean']['output'];
  likesCount: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type LikeStatus = {
  __typename?: 'LikeStatus';
  isLiked: Scalars['Boolean']['output'];
  likesCount: Scalars['Int']['output'];
};

export type MarkAllReadResponse = {
  __typename?: 'MarkAllReadResponse';
  updatedCount: Scalars['Int']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  activateAuction: Auction;
  createAuction: CreateAuctionPayload;
  createComment: Comment;
  deleteComment: DeleteResponse;
  deleteNotification: DeleteResponse;
  followUser: FollowResponse;
  getProfilePictureUploadUrl: PresignedUrlResponse;
  likePost: LikeResponse;
  markAllNotificationsAsRead: MarkAllReadResponse;
  markNotificationAsRead: Notification;
  placeBid: PlaceBidPayload;
  unfollowUser: FollowResponse;
  unlikePost: LikeResponse;
  updateProfile: Profile;
};


export type MutationActivateAuctionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCreateAuctionArgs = {
  input: CreateAuctionInput;
};


export type MutationCreateCommentArgs = {
  input: CreateCommentInput;
};


export type MutationDeleteCommentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteNotificationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationFollowUserArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationGetProfilePictureUploadUrlArgs = {
  fileType?: InputMaybe<Scalars['String']['input']>;
};


export type MutationLikePostArgs = {
  postId: Scalars['ID']['input'];
};


export type MutationMarkNotificationAsReadArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPlaceBidArgs = {
  input: PlaceBidInput;
};


export type MutationUnfollowUserArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationUnlikePostArgs = {
  postId: Scalars['ID']['input'];
};


export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput;
};

export type Notification = {
  __typename?: 'Notification';
  actor?: Maybe<NotificationActor>;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  message: Scalars['String']['output'];
  readAt?: Maybe<Scalars['String']['output']>;
  status: NotificationStatus;
  target?: Maybe<NotificationTarget>;
  title: Scalars['String']['output'];
  type: NotificationType;
  userId: Scalars['ID']['output'];
};

export type NotificationActor = {
  __typename?: 'NotificationActor';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  handle: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
};

export type NotificationConnection = {
  __typename?: 'NotificationConnection';
  edges: Array<NotificationEdge>;
  pageInfo: PageInfo;
};

export type NotificationEdge = {
  __typename?: 'NotificationEdge';
  cursor: Scalars['String']['output'];
  node: Notification;
};

export enum NotificationStatus {
  Archived = 'ARCHIVED',
  Read = 'READ',
  Unread = 'UNREAD'
}

export type NotificationTarget = {
  __typename?: 'NotificationTarget';
  id: Scalars['ID']['output'];
  preview?: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
  url?: Maybe<Scalars['String']['output']>;
};

export enum NotificationType {
  Comment = 'COMMENT',
  Follow = 'FOLLOW',
  Like = 'LIKE',
  Mention = 'MENTION',
  System = 'SYSTEM'
}

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type PlaceBidInput = {
  amount: Scalars['Float']['input'];
  auctionId: Scalars['ID']['input'];
};

export type PlaceBidPayload = {
  __typename?: 'PlaceBidPayload';
  auction: Auction;
  bid: Bid;
};

export type PresignedUrlResponse = {
  __typename?: 'PresignedUrlResponse';
  uploadUrl: Scalars['String']['output'];
};

export type Profile = {
  __typename?: 'Profile';
  bio?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  email: Scalars['String']['output'];
  emailVerified: Scalars['Boolean']['output'];
  followersCount: Scalars['Int']['output'];
  followingCount: Scalars['Int']['output'];
  fullName?: Maybe<Scalars['String']['output']>;
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  postsCount: Scalars['Int']['output'];
  profilePictureThumbnailUrl?: Maybe<Scalars['String']['output']>;
  profilePictureUrl?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  username: Scalars['String']['output'];
};

export type PublicProfile = {
  __typename?: 'PublicProfile';
  bio?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  followersCount: Scalars['Int']['output'];
  followingCount: Scalars['Int']['output'];
  fullName?: Maybe<Scalars['String']['output']>;
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isFollowing?: Maybe<Scalars['Boolean']['output']>;
  postsCount: Scalars['Int']['output'];
  profilePictureUrl?: Maybe<Scalars['String']['output']>;
  username: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  auction?: Maybe<Auction>;
  auctions: AuctionConnection;
  bids: BidConnection;
  comments: CommentConnection;
  followStatus: FollowStatus;
  notifications: NotificationConnection;
  postLikeStatus: LikeStatus;
  unreadNotificationsCount: Scalars['Int']['output'];
};


export type QueryAuctionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryAuctionsArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<AuctionStatus>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryBidsArgs = {
  auctionId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCommentsArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  postId: Scalars['ID']['input'];
};


export type QueryFollowStatusArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryNotificationsArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPostLikeStatusArgs = {
  postId: Scalars['ID']['input'];
};

export type UpdateProfileInput = {
  bio?: InputMaybe<Scalars['String']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  fullName?: InputMaybe<Scalars['String']['input']>;
  handle?: InputMaybe<Scalars['String']['input']>;
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Auction: ResolverTypeWrapper<AuctionParent>;
  AuctionConnection: ResolverTypeWrapper<Omit<AuctionConnection, 'edges'> & { edges: Array<ResolversTypes['AuctionEdge']> }>;
  AuctionEdge: ResolverTypeWrapper<Omit<AuctionEdge, 'node'> & { node: ResolversTypes['Auction'] }>;
  AuctionStatus: AuctionStatus;
  Bid: ResolverTypeWrapper<BidParent>;
  BidConnection: ResolverTypeWrapper<Omit<BidConnection, 'bids'> & { bids: Array<ResolversTypes['Bid']> }>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Comment: ResolverTypeWrapper<CommentParent>;
  CommentConnection: ResolverTypeWrapper<Omit<CommentConnection, 'edges'> & { edges: Array<ResolversTypes['CommentEdge']> }>;
  CommentEdge: ResolverTypeWrapper<Omit<CommentEdge, 'node'> & { node: ResolversTypes['Comment'] }>;
  CreateAuctionInput: CreateAuctionInput;
  CreateAuctionPayload: ResolverTypeWrapper<Omit<CreateAuctionPayload, 'auction'> & { auction: ResolversTypes['Auction'] }>;
  CreateCommentInput: CreateCommentInput;
  DeleteResponse: ResolverTypeWrapper<DeleteResponse>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  FollowResponse: ResolverTypeWrapper<FollowResponse>;
  FollowStatus: ResolverTypeWrapper<FollowStatus>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  LikeResponse: ResolverTypeWrapper<LikeResponse>;
  LikeStatus: ResolverTypeWrapper<LikeStatus>;
  MarkAllReadResponse: ResolverTypeWrapper<MarkAllReadResponse>;
  Mutation: ResolverTypeWrapper<{}>;
  Notification: ResolverTypeWrapper<Notification>;
  NotificationActor: ResolverTypeWrapper<NotificationActor>;
  NotificationConnection: ResolverTypeWrapper<NotificationConnection>;
  NotificationEdge: ResolverTypeWrapper<NotificationEdge>;
  NotificationStatus: NotificationStatus;
  NotificationTarget: ResolverTypeWrapper<NotificationTarget>;
  NotificationType: NotificationType;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PlaceBidInput: PlaceBidInput;
  PlaceBidPayload: ResolverTypeWrapper<PlaceBidPayloadParent>;
  PresignedUrlResponse: ResolverTypeWrapper<PresignedUrlResponse>;
  Profile: ResolverTypeWrapper<Profile>;
  PublicProfile: ResolverTypeWrapper<PublicProfile>;
  Query: ResolverTypeWrapper<{}>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  UpdateProfileInput: UpdateProfileInput;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Auction: AuctionParent;
  AuctionConnection: Omit<AuctionConnection, 'edges'> & { edges: Array<ResolversParentTypes['AuctionEdge']> };
  AuctionEdge: Omit<AuctionEdge, 'node'> & { node: ResolversParentTypes['Auction'] };
  Bid: BidParent;
  BidConnection: Omit<BidConnection, 'bids'> & { bids: Array<ResolversParentTypes['Bid']> };
  Boolean: Scalars['Boolean']['output'];
  Comment: CommentParent;
  CommentConnection: Omit<CommentConnection, 'edges'> & { edges: Array<ResolversParentTypes['CommentEdge']> };
  CommentEdge: Omit<CommentEdge, 'node'> & { node: ResolversParentTypes['Comment'] };
  CreateAuctionInput: CreateAuctionInput;
  CreateAuctionPayload: Omit<CreateAuctionPayload, 'auction'> & { auction: ResolversParentTypes['Auction'] };
  CreateCommentInput: CreateCommentInput;
  DeleteResponse: DeleteResponse;
  Float: Scalars['Float']['output'];
  FollowResponse: FollowResponse;
  FollowStatus: FollowStatus;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  LikeResponse: LikeResponse;
  LikeStatus: LikeStatus;
  MarkAllReadResponse: MarkAllReadResponse;
  Mutation: {};
  Notification: Notification;
  NotificationActor: NotificationActor;
  NotificationConnection: NotificationConnection;
  NotificationEdge: NotificationEdge;
  NotificationTarget: NotificationTarget;
  PageInfo: PageInfo;
  PlaceBidInput: PlaceBidInput;
  PlaceBidPayload: PlaceBidPayloadParent;
  PresignedUrlResponse: PresignedUrlResponse;
  Profile: Profile;
  PublicProfile: PublicProfile;
  Query: {};
  String: Scalars['String']['output'];
  UpdateProfileInput: UpdateProfileInput;
}>;

export type AuctionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Auction'] = ResolversParentTypes['Auction']> = ResolversObject<{
  bidCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  currentPrice?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  endTime?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reservePrice?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  seller?: Resolver<ResolversTypes['PublicProfile'], ParentType, ContextType>;
  startPrice?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  startTime?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['AuctionStatus'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  winner?: Resolver<Maybe<ResolversTypes['PublicProfile']>, ParentType, ContextType>;
  winnerId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AuctionConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AuctionConnection'] = ResolversParentTypes['AuctionConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['AuctionEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AuctionEdgeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AuctionEdge'] = ResolversParentTypes['AuctionEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Auction'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BidResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Bid'] = ResolversParentTypes['Bid']> = ResolversObject<{
  amount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  auctionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  bidder?: Resolver<ResolversTypes['PublicProfile'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BidConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BidConnection'] = ResolversParentTypes['BidConnection']> = ResolversObject<{
  bids?: Resolver<Array<ResolversTypes['Bid']>, ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CommentResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Comment'] = ResolversParentTypes['Comment']> = ResolversObject<{
  author?: Resolver<ResolversTypes['PublicProfile'], ParentType, ContextType>;
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  postId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CommentConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CommentConnection'] = ResolversParentTypes['CommentConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CommentEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CommentEdgeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CommentEdge'] = ResolversParentTypes['CommentEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Comment'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CreateAuctionPayloadResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CreateAuctionPayload'] = ResolversParentTypes['CreateAuctionPayload']> = ResolversObject<{
  auction?: Resolver<ResolversTypes['Auction'], ParentType, ContextType>;
  uploadUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DeleteResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteResponse'] = ResolversParentTypes['DeleteResponse']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FollowResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FollowResponse'] = ResolversParentTypes['FollowResponse']> = ResolversObject<{
  followersCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  followingCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  isFollowing?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FollowStatusResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FollowStatus'] = ResolversParentTypes['FollowStatus']> = ResolversObject<{
  followersCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  followingCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  isFollowing?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LikeResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['LikeResponse'] = ResolversParentTypes['LikeResponse']> = ResolversObject<{
  isLiked?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  likesCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LikeStatusResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['LikeStatus'] = ResolversParentTypes['LikeStatus']> = ResolversObject<{
  isLiked?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  likesCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MarkAllReadResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MarkAllReadResponse'] = ResolversParentTypes['MarkAllReadResponse']> = ResolversObject<{
  updatedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  activateAuction?: Resolver<ResolversTypes['Auction'], ParentType, ContextType, RequireFields<MutationActivateAuctionArgs, 'id'>>;
  createAuction?: Resolver<ResolversTypes['CreateAuctionPayload'], ParentType, ContextType, RequireFields<MutationCreateAuctionArgs, 'input'>>;
  createComment?: Resolver<ResolversTypes['Comment'], ParentType, ContextType, RequireFields<MutationCreateCommentArgs, 'input'>>;
  deleteComment?: Resolver<ResolversTypes['DeleteResponse'], ParentType, ContextType, RequireFields<MutationDeleteCommentArgs, 'id'>>;
  deleteNotification?: Resolver<ResolversTypes['DeleteResponse'], ParentType, ContextType, RequireFields<MutationDeleteNotificationArgs, 'id'>>;
  followUser?: Resolver<ResolversTypes['FollowResponse'], ParentType, ContextType, RequireFields<MutationFollowUserArgs, 'userId'>>;
  getProfilePictureUploadUrl?: Resolver<ResolversTypes['PresignedUrlResponse'], ParentType, ContextType, Partial<MutationGetProfilePictureUploadUrlArgs>>;
  likePost?: Resolver<ResolversTypes['LikeResponse'], ParentType, ContextType, RequireFields<MutationLikePostArgs, 'postId'>>;
  markAllNotificationsAsRead?: Resolver<ResolversTypes['MarkAllReadResponse'], ParentType, ContextType>;
  markNotificationAsRead?: Resolver<ResolversTypes['Notification'], ParentType, ContextType, RequireFields<MutationMarkNotificationAsReadArgs, 'id'>>;
  placeBid?: Resolver<ResolversTypes['PlaceBidPayload'], ParentType, ContextType, RequireFields<MutationPlaceBidArgs, 'input'>>;
  unfollowUser?: Resolver<ResolversTypes['FollowResponse'], ParentType, ContextType, RequireFields<MutationUnfollowUserArgs, 'userId'>>;
  unlikePost?: Resolver<ResolversTypes['LikeResponse'], ParentType, ContextType, RequireFields<MutationUnlikePostArgs, 'postId'>>;
  updateProfile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType, RequireFields<MutationUpdateProfileArgs, 'input'>>;
}>;

export type NotificationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Notification'] = ResolversParentTypes['Notification']> = ResolversObject<{
  actor?: Resolver<Maybe<ResolversTypes['NotificationActor']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  readAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['NotificationStatus'], ParentType, ContextType>;
  target?: Resolver<Maybe<ResolversTypes['NotificationTarget']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['NotificationType'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationActorResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['NotificationActor'] = ResolversParentTypes['NotificationActor']> = ResolversObject<{
  avatarUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  displayName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['NotificationConnection'] = ResolversParentTypes['NotificationConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['NotificationEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationEdgeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['NotificationEdge'] = ResolversParentTypes['NotificationEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Notification'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationTargetResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['NotificationTarget'] = ResolversParentTypes['NotificationTarget']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  preview?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PlaceBidPayloadResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PlaceBidPayload'] = ResolversParentTypes['PlaceBidPayload']> = ResolversObject<{
  auction?: Resolver<ResolversTypes['Auction'], ParentType, ContextType>;
  bid?: Resolver<ResolversTypes['Bid'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PresignedUrlResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PresignedUrlResponse'] = ResolversParentTypes['PresignedUrlResponse']> = ResolversObject<{
  uploadUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProfileResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Profile'] = ResolversParentTypes['Profile']> = ResolversObject<{
  bio?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  emailVerified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  followersCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  followingCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  fullName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  postsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  profilePictureThumbnailUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  profilePictureUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  username?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PublicProfileResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PublicProfile'] = ResolversParentTypes['PublicProfile']> = ResolversObject<{
  bio?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  followersCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  followingCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  fullName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isFollowing?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  postsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  profilePictureUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  username?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  auction?: Resolver<Maybe<ResolversTypes['Auction']>, ParentType, ContextType, RequireFields<QueryAuctionArgs, 'id'>>;
  auctions?: Resolver<ResolversTypes['AuctionConnection'], ParentType, ContextType, Partial<QueryAuctionsArgs>>;
  bids?: Resolver<ResolversTypes['BidConnection'], ParentType, ContextType, RequireFields<QueryBidsArgs, 'auctionId'>>;
  comments?: Resolver<ResolversTypes['CommentConnection'], ParentType, ContextType, RequireFields<QueryCommentsArgs, 'postId'>>;
  followStatus?: Resolver<ResolversTypes['FollowStatus'], ParentType, ContextType, RequireFields<QueryFollowStatusArgs, 'userId'>>;
  notifications?: Resolver<ResolversTypes['NotificationConnection'], ParentType, ContextType, Partial<QueryNotificationsArgs>>;
  postLikeStatus?: Resolver<ResolversTypes['LikeStatus'], ParentType, ContextType, RequireFields<QueryPostLikeStatusArgs, 'postId'>>;
  unreadNotificationsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type Resolvers<ContextType = GraphQLContext> = ResolversObject<{
  Auction?: AuctionResolvers<ContextType>;
  AuctionConnection?: AuctionConnectionResolvers<ContextType>;
  AuctionEdge?: AuctionEdgeResolvers<ContextType>;
  Bid?: BidResolvers<ContextType>;
  BidConnection?: BidConnectionResolvers<ContextType>;
  Comment?: CommentResolvers<ContextType>;
  CommentConnection?: CommentConnectionResolvers<ContextType>;
  CommentEdge?: CommentEdgeResolvers<ContextType>;
  CreateAuctionPayload?: CreateAuctionPayloadResolvers<ContextType>;
  DeleteResponse?: DeleteResponseResolvers<ContextType>;
  FollowResponse?: FollowResponseResolvers<ContextType>;
  FollowStatus?: FollowStatusResolvers<ContextType>;
  LikeResponse?: LikeResponseResolvers<ContextType>;
  LikeStatus?: LikeStatusResolvers<ContextType>;
  MarkAllReadResponse?: MarkAllReadResponseResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Notification?: NotificationResolvers<ContextType>;
  NotificationActor?: NotificationActorResolvers<ContextType>;
  NotificationConnection?: NotificationConnectionResolvers<ContextType>;
  NotificationEdge?: NotificationEdgeResolvers<ContextType>;
  NotificationTarget?: NotificationTargetResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  PlaceBidPayload?: PlaceBidPayloadResolvers<ContextType>;
  PresignedUrlResponse?: PresignedUrlResponseResolvers<ContextType>;
  Profile?: ProfileResolvers<ContextType>;
  PublicProfile?: PublicProfileResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
}>;

