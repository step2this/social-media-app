/**
 * GraphQL-based Auction Service Implementation
 *
 * Uses IGraphQLClient to communicate with GraphQL server.
 * Returns AsyncState for all operations (no throwing).
 * Handles S3 upload for auction images.
 *
 * Design patterns:
 * ✅ Dependency Injection - depends on IGraphQLClient interface
 * ✅ AsyncState pattern - all methods return AsyncState<T>
 * ✅ Error propagation - passes through GraphQL errors
 * ✅ Response transformation - converts GraphQL types to service types
 */

import type { IGraphQLClient } from '../../graphql/interfaces/IGraphQLClient.js';
import type { IAuctionService, ListAuctionsOptions, AuctionsList, GetBidHistoryOptions, BidHistory, CreateAuctionInput, CreateAuctionResult, PlaceBidResult, Auction } from '../interfaces/IAuctionService.js';
import type { AsyncState } from '../../graphql/types.js';
import { isSuccess } from '../../graphql/types.js';
import { safeUnwrapConnection, safeGetPageInfo } from '../../graphql/helpers.js';
import {
    GET_AUCTION,
    LIST_AUCTIONS,
    GET_BIDS,
    CREATE_AUCTION,
    PLACE_BID,
    type GetAuctionResponse,
    type ListAuctionsResponse,
    type GetBidsResponse,
    type CreateAuctionResponse,
    type PlaceBidResponse,
} from '../../graphql/operations/auctions.js';

/**
 * Helper to transform successful GraphQL responses
 * Reduces boilerplate in service methods
 */
function transformResponse<TResponse, TData>(
    result: AsyncState<TResponse>,
    transformer: (response: TResponse) => TData
): AsyncState<TData> {
    if (isSuccess(result)) {
        return {
            status: 'success',
            data: transformer(result.data),
        };
    }
    return result;
}

/**
 * Helper to create error states
 */
function createErrorState(message: string, code: string): AsyncState<never> {
    return {
        status: 'error',
        error: {
            message,
            extensions: { code },
        },
    };
}

/**
 * GraphQL-based Auction Service
 *
 * @example
 * ```typescript
 * const client = createGraphQLClient();
 * const service = new AuctionServiceGraphQL(client);
 *
 * const result = await service.listAuctions({ limit: 20 });
 * if (isSuccess(result)) {
 *   console.log(`Found ${result.data.auctions.length} auctions`);
 * }
 * ```
 */
export class AuctionServiceGraphQL implements IAuctionService {
    constructor(private readonly client: IGraphQLClient) { }

    /**
     * List auctions with optional filtering and pagination
     */
    async listAuctions(
        options: ListAuctionsOptions = {}
    ): Promise<AsyncState<AuctionsList>> {
        const result = await this.client.query<ListAuctionsResponse>(
            LIST_AUCTIONS,
            {
                limit: options.limit,
                cursor: options.cursor,
                status: options.status,
                userId: options.userId,
            }
        );

        // Use safe helpers to handle potentially null/undefined connections
        return transformResponse(result, (data) => {
            const pageInfo = safeGetPageInfo(data.auctions);
            return {
                auctions: safeUnwrapConnection(data.auctions),
                nextCursor: pageInfo.endCursor,
                hasMore: pageInfo.hasNextPage,
            };
        });
    }

    /**
     * Get a single auction by ID
     */
    async getAuction(auctionId: string): Promise<AsyncState<Auction>> {
        const result = await this.client.query<GetAuctionResponse>(GET_AUCTION, {
            id: auctionId,
        });

        if (isSuccess(result)) {
            // Handle null auction (not found)
            if (result.data.auction === null) {
                return {
                    status: 'error',
                    error: {
                        message: 'Auction not found',
                        extensions: { code: 'NOT_FOUND' },
                    },
                };
            }

            return { status: 'success', data: result.data.auction };
        }

        return result;
    }

    /**
     * Create a new auction
     */
    async createAuction(
        input: CreateAuctionInput,
        imageFile: File
    ): Promise<AsyncState<CreateAuctionResult>> {
        // 1. Call GraphQL mutation to create auction
        const result = await this.client.mutate<CreateAuctionResponse>(
            CREATE_AUCTION,
            { input }
        );

        if (!isSuccess(result)) {
            return result;
        }

        // 2. Upload image to S3 using presigned URL
        try {
            const response = await fetch(result.data.createAuction.uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': imageFile.type,
                },
                body: imageFile,
            });

            if (!response.ok) {
                return {
                    status: 'error',
                    error: {
                        message: `Failed to upload image: ${response.statusText}`,
                        extensions: { code: 'UPLOAD_FAILED', status: response.status },
                    },
                };
            }

            // 3. Return auction and upload URL
            return {
                status: 'success',
                data: {
                    auction: result.data.createAuction.auction,
                    uploadUrl: result.data.createAuction.uploadUrl,
                },
            };
        } catch (error) {
            return {
                status: 'error',
                error: {
                    message: `Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    extensions: { code: 'UPLOAD_ERROR' },
                },
            };
        }
    }

    /**
     * Place a bid on an auction
     */
    async placeBid(
        auctionId: string,
        amount: number
    ): Promise<AsyncState<PlaceBidResult>> {
        const result = await this.client.mutate<PlaceBidResponse>(PLACE_BID, {
            input: { auctionId, amount },
        });

        return transformResponse(result, (data) => ({
            bid: data.placeBid.bid,
            auction: data.placeBid.auction,
        }));
    }

    /**
     * Get bid history for an auction
     */
    async getBidHistory(
        auctionId: string,
        options: GetBidHistoryOptions = {}
    ): Promise<AsyncState<BidHistory>> {
        const result = await this.client.query<GetBidsResponse>(GET_BIDS, {
            auctionId,
            limit: options.limit,
            offset: options.offset,
        });

        return transformResponse(result, (data) => ({
            bids: data.bids.bids,
            total: data.bids.total,
        }));
    }
}
