import { z } from 'zod';
import {
  UUIDField,
  TimestampField,
  PaginationRequestSchema,
  PaginationResponseSchema,
  SuccessResponseSchema,
} from './base.schema.js';

/**
 * Auction-specific field validators
 */
export const AuctionTitleField = z
  .string()
  .min(3, 'Title must be at least 3 characters')
  .max(200, 'Title must not exceed 200 characters')
  .trim();

export const AuctionDescriptionField = z
  .string()
  .max(2000, 'Description must not exceed 2000 characters')
  .trim()
  .optional();

export const PriceField = z
  .number()
  .positive('Price must be positive')
  .multipleOf(0.01, 'Price must have at most 2 decimal places');

export const OptionalPriceField = PriceField.optional();

export const AuctionStatusField = z.enum(['pending', 'active', 'completed', 'cancelled']);

/**
 * Auction entity schema
 */
export const AuctionSchema = z.object({
  id: UUIDField,
  userId: z.string().min(1, 'User ID is required'), // References DynamoDB USER# key
  title: AuctionTitleField,
  description: AuctionDescriptionField,
  startPrice: PriceField,
  reservePrice: OptionalPriceField,
  currentPrice: PriceField,
  startTime: TimestampField,
  endTime: TimestampField,
  status: AuctionStatusField,
  winnerId: z.string().optional(),
  bidCount: z.number().int().nonnegative().default(0),
  createdAt: TimestampField,
  updatedAt: TimestampField,
});

/**
 * Bid entity schema
 */
export const BidSchema = z.object({
  id: UUIDField,
  auctionId: UUIDField,
  userId: z.string().min(1, 'User ID is required'), // References DynamoDB USER# key
  amount: PriceField,
  createdAt: TimestampField,
});

/**
 * Request schemas
 */
export const CreateAuctionRequestSchema = z
  .object({
    title: AuctionTitleField,
    description: AuctionDescriptionField,
    startPrice: PriceField,
    reservePrice: OptionalPriceField,
    startTime: TimestampField,
    endTime: TimestampField,
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: 'End time must be after start time',
    path: ['endTime'],
  })
  .refine(
    (data) => {
      if (data.reservePrice !== undefined) {
        return data.reservePrice >= data.startPrice;
      }
      return true;
    },
    {
      message: 'Reserve price must be greater than or equal to start price',
      path: ['reservePrice'],
    }
  );

export const PlaceBidRequestSchema = z.object({
  auctionId: UUIDField,
  amount: PriceField,
});

export const GetAuctionRequestSchema = z.object({
  auctionId: UUIDField,
});

export const ListAuctionsRequestSchema = PaginationRequestSchema.extend({
  status: AuctionStatusField.optional(),
  userId: z.string().optional(),
});

export const GetBidHistoryRequestSchema = z.object({
  auctionId: UUIDField,
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
});

/**
 * Response schemas
 */
export const AuctionResponseSchema = z.object({
  auction: AuctionSchema,
});

export const CreateAuctionResponseSchema = AuctionResponseSchema;

export const PlaceBidResponseSchema = z.object({
  bid: BidSchema,
  auction: AuctionSchema,
});

export const GetAuctionResponseSchema = AuctionResponseSchema;

export const ListAuctionsResponseSchema = PaginationResponseSchema.extend({
  auctions: z.array(AuctionSchema),
});

export const GetBidHistoryResponseSchema = z.object({
  bids: z.array(BidSchema),
  total: z.number().int().nonnegative(),
});

export const ActivateAuctionResponseSchema = AuctionResponseSchema;

export const CancelAuctionResponseSchema = SuccessResponseSchema;

/**
 * Type exports
 */
export type Auction = z.infer<typeof AuctionSchema>;
export type Bid = z.infer<typeof BidSchema>;
export type CreateAuctionRequest = z.infer<typeof CreateAuctionRequestSchema>;
export type PlaceBidRequest = z.infer<typeof PlaceBidRequestSchema>;
export type GetAuctionRequest = z.infer<typeof GetAuctionRequestSchema>;
export type ListAuctionsRequest = z.infer<typeof ListAuctionsRequestSchema>;
export type GetBidHistoryRequest = z.infer<typeof GetBidHistoryRequestSchema>;
export type AuctionResponse = z.infer<typeof AuctionResponseSchema>;
export type CreateAuctionResponse = z.infer<typeof CreateAuctionResponseSchema>;
export type PlaceBidResponse = z.infer<typeof PlaceBidResponseSchema>;
export type GetAuctionResponse = z.infer<typeof GetAuctionResponseSchema>;
export type ListAuctionsResponse = z.infer<typeof ListAuctionsResponseSchema>;
export type GetBidHistoryResponse = z.infer<typeof GetBidHistoryResponseSchema>;
export type ActivateAuctionResponse = z.infer<typeof ActivateAuctionResponseSchema>;
export type CancelAuctionResponse = z.infer<typeof CancelAuctionResponseSchema>;
