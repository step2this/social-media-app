/**
 * GraphQL Auction Schema TDD Tests
 *
 * Test suite for auction-related GraphQL schema validation.
 * Following TDD: These tests will FAIL initially (RED phase),
 * then pass once we implement the schema (GREEN phase).
 *
 * Tests validate:
 * - Auction and Bid types
 * - AuctionStatus enum
 * - Query fields for auctions
 * - Mutation fields for auction operations
 * - Input types for creating auctions and placing bids
 * - Connection/pagination types
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { buildSchema, GraphQLObjectType, GraphQLNonNull, GraphQLList, GraphQLID, GraphQLString, GraphQLInt, GraphQLFloat, GraphQLEnumType, GraphQLInputObjectType } from 'graphql';
import { typeDefs } from '../src/schema/typeDefs.js';

describe('GraphQL Auction Schema Validation', () => {
  let schema: ReturnType<typeof buildSchema>;

  beforeEach(() => {
    schema = buildSchema(typeDefs);
  });

  describe('Schema Compilation with Auctions', () => {
    it('should compile without GraphQL syntax errors', () => {
      expect(() => {
        schema = buildSchema(typeDefs);
      }).not.toThrow();
    });
  });

  describe('Auction Type Definition', () => {
    it('should have Auction type', () => {
      const auctionType = schema.getType('Auction');
      expect(auctionType).toBeDefined();
      expect(auctionType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have Auction with required id field (ID!)', () => {
      const auctionType = schema.getType('Auction') as GraphQLObjectType;
      const fields = auctionType.getFields();
      const idField = fields.id;

      expect(idField).toBeDefined();
      expect(idField.type).toBeInstanceOf(GraphQLNonNull);
      expect((idField.type as any).ofType).toBe(GraphQLID);
    });

    it('should have Auction with userId field (ID!)', () => {
      const auctionType = schema.getType('Auction') as GraphQLObjectType;
      const fields = auctionType.getFields();
      const userIdField = fields.userId;

      expect(userIdField).toBeDefined();
      expect(userIdField.type).toBeInstanceOf(GraphQLNonNull);
      expect((userIdField.type as any).ofType).toBe(GraphQLID);
    });

    it('should have Auction with seller field (PublicProfile!)', () => {
      const auctionType = schema.getType('Auction') as GraphQLObjectType;
      const fields = auctionType.getFields();
      const sellerField = fields.seller;

      expect(sellerField).toBeDefined();
      expect(sellerField.type).toBeInstanceOf(GraphQLNonNull);
      expect((sellerField.type as any).ofType.name).toBe('PublicProfile');
    });

    it('should have Auction with title field (String!)', () => {
      const auctionType = schema.getType('Auction') as GraphQLObjectType;
      const fields = auctionType.getFields();
      const titleField = fields.title;

      expect(titleField).toBeDefined();
      expect(titleField.type).toBeInstanceOf(GraphQLNonNull);
      expect((titleField.type as any).ofType).toBe(GraphQLString);
    });

    it('should have Auction with optional description field (String)', () => {
      const auctionType = schema.getType('Auction') as GraphQLObjectType;
      const fields = auctionType.getFields();
      const descriptionField = fields.description;

      expect(descriptionField).toBeDefined();
      expect((descriptionField.type as any)).toBe(GraphQLString);
    });

    it('should have Auction with imageUrl field (String!)', () => {
      const auctionType = schema.getType('Auction') as GraphQLObjectType;
      const fields = auctionType.getFields();
      const imageUrlField = fields.imageUrl;

      expect(imageUrlField).toBeDefined();
      expect(imageUrlField.type).toBeInstanceOf(GraphQLNonNull);
      expect((imageUrlField.type as any).ofType).toBe(GraphQLString);
    });

    it('should have Auction with price fields (startPrice, reservePrice, currentPrice as Float!)', () => {
      const auctionType = schema.getType('Auction') as GraphQLObjectType;
      const fields = auctionType.getFields();

      const startPriceField = fields.startPrice;
      const reservePriceField = fields.reservePrice;
      const currentPriceField = fields.currentPrice;

      expect(startPriceField).toBeDefined();
      expect(startPriceField.type).toBeInstanceOf(GraphQLNonNull);
      expect((startPriceField.type as any).ofType.name).toBe('Float');

      expect(reservePriceField).toBeDefined();
      // reservePrice is optional
      expect((reservePriceField.type as any).name).toBe('Float');

      expect(currentPriceField).toBeDefined();
      expect(currentPriceField.type).toBeInstanceOf(GraphQLNonNull);
      expect((currentPriceField.type as any).ofType.name).toBe('Float');
    });

    it('should have Auction with time fields (startTime, endTime as String!)', () => {
      const auctionType = schema.getType('Auction') as GraphQLObjectType;
      const fields = auctionType.getFields();

      const startTimeField = fields.startTime;
      const endTimeField = fields.endTime;

      expect(startTimeField).toBeDefined();
      expect(startTimeField.type).toBeInstanceOf(GraphQLNonNull);
      expect((startTimeField.type as any).ofType).toBe(GraphQLString);

      expect(endTimeField).toBeDefined();
      expect(endTimeField.type).toBeInstanceOf(GraphQLNonNull);
      expect((endTimeField.type as any).ofType).toBe(GraphQLString);
    });

    it('should have Auction with status field (AuctionStatus!)', () => {
      const auctionType = schema.getType('Auction') as GraphQLObjectType;
      const fields = auctionType.getFields();
      const statusField = fields.status;

      expect(statusField).toBeDefined();
      expect(statusField.type).toBeInstanceOf(GraphQLNonNull);
      expect((statusField.type as any).ofType.name).toBe('AuctionStatus');
    });

    it('should have Auction with optional winnerId field (ID)', () => {
      const auctionType = schema.getType('Auction') as GraphQLObjectType;
      const fields = auctionType.getFields();
      const winnerIdField = fields.winnerId;

      expect(winnerIdField).toBeDefined();
      expect((winnerIdField.type as any)).toBe(GraphQLID);
    });

    it('should have Auction with optional winner field (PublicProfile)', () => {
      const auctionType = schema.getType('Auction') as GraphQLObjectType;
      const fields = auctionType.getFields();
      const winnerField = fields.winner;

      expect(winnerField).toBeDefined();
      expect((winnerField.type as any).name).toBe('PublicProfile');
    });

    it('should have Auction with bidCount field (Int!)', () => {
      const auctionType = schema.getType('Auction') as GraphQLObjectType;
      const fields = auctionType.getFields();
      const bidCountField = fields.bidCount;

      expect(bidCountField).toBeDefined();
      expect(bidCountField.type).toBeInstanceOf(GraphQLNonNull);
      expect((bidCountField.type as any).ofType).toBe(GraphQLInt);
    });

    it('should have Auction with timestamp fields (createdAt, updatedAt as String!)', () => {
      const auctionType = schema.getType('Auction') as GraphQLObjectType;
      const fields = auctionType.getFields();

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

  describe('Bid Type Definition', () => {
    it('should have Bid type', () => {
      const bidType = schema.getType('Bid');
      expect(bidType).toBeDefined();
      expect(bidType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have Bid with required id field (ID!)', () => {
      const bidType = schema.getType('Bid') as GraphQLObjectType;
      const fields = bidType.getFields();
      const idField = fields.id;

      expect(idField).toBeDefined();
      expect(idField.type).toBeInstanceOf(GraphQLNonNull);
      expect((idField.type as any).ofType).toBe(GraphQLID);
    });

    it('should have Bid with auctionId field (ID!)', () => {
      const bidType = schema.getType('Bid') as GraphQLObjectType;
      const fields = bidType.getFields();
      const auctionIdField = fields.auctionId;

      expect(auctionIdField).toBeDefined();
      expect(auctionIdField.type).toBeInstanceOf(GraphQLNonNull);
      expect((auctionIdField.type as any).ofType).toBe(GraphQLID);
    });

    it('should have Bid with userId field (ID!)', () => {
      const bidType = schema.getType('Bid') as GraphQLObjectType;
      const fields = bidType.getFields();
      const userIdField = fields.userId;

      expect(userIdField).toBeDefined();
      expect(userIdField.type).toBeInstanceOf(GraphQLNonNull);
      expect((userIdField.type as any).ofType).toBe(GraphQLID);
    });

    it('should have Bid with bidder field (PublicProfile!)', () => {
      const bidType = schema.getType('Bid') as GraphQLObjectType;
      const fields = bidType.getFields();
      const bidderField = fields.bidder;

      expect(bidderField).toBeDefined();
      expect(bidderField.type).toBeInstanceOf(GraphQLNonNull);
      expect((bidderField.type as any).ofType.name).toBe('PublicProfile');
    });

    it('should have Bid with amount field (Float!)', () => {
      const bidType = schema.getType('Bid') as GraphQLObjectType;
      const fields = bidType.getFields();
      const amountField = fields.amount;

      expect(amountField).toBeDefined();
      expect(amountField.type).toBeInstanceOf(GraphQLNonNull);
      expect((amountField.type as any).ofType.name).toBe('Float');
    });

    it('should have Bid with createdAt field (String!)', () => {
      const bidType = schema.getType('Bid') as GraphQLObjectType;
      const fields = bidType.getFields();
      const createdAtField = fields.createdAt;

      expect(createdAtField).toBeDefined();
      expect(createdAtField.type).toBeInstanceOf(GraphQLNonNull);
      expect((createdAtField.type as any).ofType).toBe(GraphQLString);
    });
  });

  describe('AuctionStatus Enum', () => {
    it('should have AuctionStatus enum', () => {
      const auctionStatusEnum = schema.getType('AuctionStatus');
      expect(auctionStatusEnum).toBeDefined();
      expect(auctionStatusEnum).toBeInstanceOf(GraphQLEnumType);
    });

    it('should have AuctionStatus enum with correct values', () => {
      const auctionStatusEnum = schema.getType('AuctionStatus') as GraphQLEnumType;
      const values = auctionStatusEnum.getValues().map(v => v.name);

      expect(values).toContain('PENDING');
      expect(values).toContain('ACTIVE');
      expect(values).toContain('COMPLETED');
      expect(values).toContain('CANCELLED');
    });
  });

  describe('Auction Query Fields', () => {
    it('should have auction field with id argument returning Auction', () => {
      const queryType = schema.getQueryType();
      const fields = queryType?.getFields();
      const auctionField = fields?.auction;

      expect(auctionField).toBeDefined();
      expect((auctionField?.type as any).name).toBe('Auction');

      const args = auctionField?.args;
      const idArg = args?.find(arg => arg.name === 'id');
      expect(idArg).toBeDefined();
      expect(idArg?.type).toBeInstanceOf(GraphQLNonNull);
      expect((idArg?.type as any).ofType).toBe(GraphQLID);
    });

    it('should have auctions field returning AuctionConnection!', () => {
      const queryType = schema.getQueryType();
      const fields = queryType?.getFields();
      const auctionsField = fields?.auctions;

      expect(auctionsField).toBeDefined();
      expect(auctionsField?.type).toBeInstanceOf(GraphQLNonNull);
      expect((auctionsField?.type as any).ofType.name).toBe('AuctionConnection');
    });

    it('should have auctions with pagination and filter arguments', () => {
      const queryType = schema.getQueryType();
      const fields = queryType?.getFields();
      const auctionsField = fields?.auctions;

      const args = auctionsField?.args;
      const limitArg = args?.find(arg => arg.name === 'limit');
      const cursorArg = args?.find(arg => arg.name === 'cursor');
      const statusArg = args?.find(arg => arg.name === 'status');
      const userIdArg = args?.find(arg => arg.name === 'userId');

      expect(limitArg).toBeDefined();
      expect(limitArg?.type).toBe(GraphQLInt);

      expect(cursorArg).toBeDefined();
      expect((cursorArg?.type as any)).toBe(GraphQLString);

      expect(statusArg).toBeDefined();
      expect((statusArg?.type as any).name).toBe('AuctionStatus');

      expect(userIdArg).toBeDefined();
      expect((userIdArg?.type as any)).toBe(GraphQLID);
    });

    it('should have bids field returning BidConnection!', () => {
      const queryType = schema.getQueryType();
      const fields = queryType?.getFields();
      const bidsField = fields?.bids;

      expect(bidsField).toBeDefined();
      expect(bidsField?.type).toBeInstanceOf(GraphQLNonNull);
      expect((bidsField?.type as any).ofType.name).toBe('BidConnection');
    });

    it('should have bids with auctionId and pagination arguments', () => {
      const queryType = schema.getQueryType();
      const fields = queryType?.getFields();
      const bidsField = fields?.bids;

      const args = bidsField?.args;
      const auctionIdArg = args?.find(arg => arg.name === 'auctionId');
      const limitArg = args?.find(arg => arg.name === 'limit');
      const offsetArg = args?.find(arg => arg.name === 'offset');

      expect(auctionIdArg).toBeDefined();
      expect(auctionIdArg?.type).toBeInstanceOf(GraphQLNonNull);
      expect((auctionIdArg?.type as any).ofType).toBe(GraphQLID);

      expect(limitArg).toBeDefined();
      expect(limitArg?.type).toBe(GraphQLInt);

      expect(offsetArg).toBeDefined();
      expect(offsetArg?.type).toBe(GraphQLInt);
    });
  });

  describe('Auction Mutation Fields', () => {
    it('should have createAuction mutation returning CreateAuctionPayload!', () => {
      const mutationType = schema.getMutationType();
      const fields = mutationType?.getFields();
      const createAuctionField = fields?.createAuction;

      expect(createAuctionField).toBeDefined();
      expect(createAuctionField?.type).toBeInstanceOf(GraphQLNonNull);
      expect((createAuctionField?.type as any).ofType.name).toBe('CreateAuctionPayload');

      const args = createAuctionField?.args;
      const inputArg = args?.find(arg => arg.name === 'input');
      expect(inputArg).toBeDefined();
      expect(inputArg?.type).toBeInstanceOf(GraphQLNonNull);
      expect((inputArg?.type as any).ofType.name).toBe('CreateAuctionInput');
    });

    it('should have activateAuction mutation returning Auction!', () => {
      const mutationType = schema.getMutationType();
      const fields = mutationType?.getFields();
      const activateAuctionField = fields?.activateAuction;

      expect(activateAuctionField).toBeDefined();
      expect(activateAuctionField?.type).toBeInstanceOf(GraphQLNonNull);
      expect((activateAuctionField?.type as any).ofType.name).toBe('Auction');

      const args = activateAuctionField?.args;
      const idArg = args?.find(arg => arg.name === 'id');
      expect(idArg).toBeDefined();
      expect(idArg?.type).toBeInstanceOf(GraphQLNonNull);
      expect((idArg?.type as any).ofType).toBe(GraphQLID);
    });

    it('should have placeBid mutation returning PlaceBidPayload!', () => {
      const mutationType = schema.getMutationType();
      const fields = mutationType?.getFields();
      const placeBidField = fields?.placeBid;

      expect(placeBidField).toBeDefined();
      expect(placeBidField?.type).toBeInstanceOf(GraphQLNonNull);
      expect((placeBidField?.type as any).ofType.name).toBe('PlaceBidPayload');

      const args = placeBidField?.args;
      const inputArg = args?.find(arg => arg.name === 'input');
      expect(inputArg).toBeDefined();
      expect(inputArg?.type).toBeInstanceOf(GraphQLNonNull);
      expect((inputArg?.type as any).ofType.name).toBe('PlaceBidInput');
    });
  });

  describe('Auction Input Types', () => {
    it('should have CreateAuctionInput type', () => {
      const createAuctionInput = schema.getType('CreateAuctionInput');
      expect(createAuctionInput).toBeDefined();
      expect(createAuctionInput).toBeInstanceOf(GraphQLInputObjectType);
    });

    it('should have CreateAuctionInput with required fields', () => {
      const createAuctionInput = schema.getType('CreateAuctionInput') as GraphQLInputObjectType;
      const fields = createAuctionInput.getFields();

      expect(fields.title).toBeDefined();
      expect(fields.title.type).toBeInstanceOf(GraphQLNonNull);

      expect(fields.description).toBeDefined();
      // description is optional

      expect(fields.fileType).toBeDefined();
      expect(fields.fileType.type).toBeInstanceOf(GraphQLNonNull);

      expect(fields.startPrice).toBeDefined();
      expect(fields.startPrice.type).toBeInstanceOf(GraphQLNonNull);

      expect(fields.reservePrice).toBeDefined();
      // reservePrice is optional

      expect(fields.startTime).toBeDefined();
      expect(fields.startTime.type).toBeInstanceOf(GraphQLNonNull);

      expect(fields.endTime).toBeDefined();
      expect(fields.endTime.type).toBeInstanceOf(GraphQLNonNull);
    });

    it('should have PlaceBidInput type', () => {
      const placeBidInput = schema.getType('PlaceBidInput');
      expect(placeBidInput).toBeDefined();
      expect(placeBidInput).toBeInstanceOf(GraphQLInputObjectType);
    });

    it('should have PlaceBidInput with required fields', () => {
      const placeBidInput = schema.getType('PlaceBidInput') as GraphQLInputObjectType;
      const fields = placeBidInput.getFields();

      expect(fields.auctionId).toBeDefined();
      expect(fields.auctionId.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.auctionId.type as any).ofType).toBe(GraphQLID);

      expect(fields.amount).toBeDefined();
      expect(fields.amount.type).toBeInstanceOf(GraphQLNonNull);
    });
  });

  describe('Auction Connection Types', () => {
    it('should have AuctionConnection type', () => {
      const auctionConnectionType = schema.getType('AuctionConnection');
      expect(auctionConnectionType).toBeDefined();
      expect(auctionConnectionType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have AuctionConnection with edges and pageInfo', () => {
      const auctionConnectionType = schema.getType('AuctionConnection') as GraphQLObjectType;
      const fields = auctionConnectionType.getFields();

      expect(fields.edges).toBeDefined();
      expect(fields.edges.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.edges.type as any).ofType).toBeInstanceOf(GraphQLList);

      expect(fields.pageInfo).toBeDefined();
      expect(fields.pageInfo.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.pageInfo.type as any).ofType.name).toBe('PageInfo');
    });

    it('should have AuctionEdge type', () => {
      const auctionEdgeType = schema.getType('AuctionEdge');
      expect(auctionEdgeType).toBeDefined();
      expect(auctionEdgeType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have AuctionEdge with node and cursor', () => {
      const auctionEdgeType = schema.getType('AuctionEdge') as GraphQLObjectType;
      const fields = auctionEdgeType.getFields();

      expect(fields.node).toBeDefined();
      expect(fields.node.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.node.type as any).ofType.name).toBe('Auction');

      expect(fields.cursor).toBeDefined();
      expect(fields.cursor.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.cursor.type as any).ofType).toBe(GraphQLString);
    });

    it('should have BidConnection type', () => {
      const bidConnectionType = schema.getType('BidConnection');
      expect(bidConnectionType).toBeDefined();
      expect(bidConnectionType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have BidConnection with bids and total', () => {
      const bidConnectionType = schema.getType('BidConnection') as GraphQLObjectType;
      const fields = bidConnectionType.getFields();

      expect(fields.bids).toBeDefined();
      expect(fields.bids.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.bids.type as any).ofType).toBeInstanceOf(GraphQLList);

      expect(fields.total).toBeDefined();
      expect(fields.total.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.total.type as any).ofType).toBe(GraphQLInt);
    });
  });

  describe('Auction Response Types', () => {
    it('should have CreateAuctionPayload type', () => {
      const createAuctionPayloadType = schema.getType('CreateAuctionPayload');
      expect(createAuctionPayloadType).toBeDefined();
      expect(createAuctionPayloadType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have CreateAuctionPayload with auction and uploadUrl', () => {
      const createAuctionPayloadType = schema.getType('CreateAuctionPayload') as GraphQLObjectType;
      const fields = createAuctionPayloadType.getFields();

      expect(fields.auction).toBeDefined();
      expect(fields.auction.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.auction.type as any).ofType.name).toBe('Auction');

      expect(fields.uploadUrl).toBeDefined();
      expect(fields.uploadUrl.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.uploadUrl.type as any).ofType).toBe(GraphQLString);
    });

    it('should have PlaceBidPayload type', () => {
      const placeBidPayloadType = schema.getType('PlaceBidPayload');
      expect(placeBidPayloadType).toBeDefined();
      expect(placeBidPayloadType).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have PlaceBidPayload with bid and auction', () => {
      const placeBidPayloadType = schema.getType('PlaceBidPayload') as GraphQLObjectType;
      const fields = placeBidPayloadType.getFields();

      expect(fields.bid).toBeDefined();
      expect(fields.bid.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.bid.type as any).ofType.name).toBe('Bid');

      expect(fields.auction).toBeDefined();
      expect(fields.auction.type).toBeInstanceOf(GraphQLNonNull);
      expect((fields.auction.type as any).ofType.name).toBe('Auction');
    });
  });
});
