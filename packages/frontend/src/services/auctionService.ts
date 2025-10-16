import { apiClient } from './apiClient.js';
import type {
  Auction,
  Bid,
  CreateAuctionRequest,
  ListAuctionsResponse,
  AuctionResponse,
  CreateAuctionResponse,
  PlaceBidResponse,
  GetBidHistoryResponse
} from '@social-media-app/shared';
import { ImageFileTypeField } from '@social-media-app/shared';

/**
 * Options for listing auctions
 */
export interface ListAuctionsOptions {
  limit?: number;
  cursor?: string;
  status?: 'pending' | 'active' | 'completed' | 'cancelled';
  userId?: string;
}

/**
 * Options for fetching bid history
 */
export interface GetBidHistoryOptions {
  limit?: number;
  offset?: number;
}

/**
 * Auction service for frontend API calls
 */
export const auctionService = {
  /**
   * List auctions with optional filtering
   */
  async listAuctions(options: ListAuctionsOptions = {}): Promise<ListAuctionsResponse> {
    const { limit = 20, cursor, status, userId } = options;

    const params = new URLSearchParams();
    params.append('limit', limit.toString());

    if (cursor) {
      params.append('cursor', cursor);
    }
    if (status) {
      params.append('status', status);
    }
    if (userId) {
      params.append('userId', userId);
    }

    const response = await apiClient.get<ListAuctionsResponse>(
      `/auctions?${params.toString()}`
    );
    return response;
  },

  /**
   * Get a single auction by ID
   */
  async getAuction(auctionId: string): Promise<Auction> {
    const response = await apiClient.get<AuctionResponse>(`/auctions/${auctionId}`);
    return response.auction;
  },

  /**
   * Create a new auction
   */
  async createAuction(
    data: CreateAuctionRequest & { fileType?: string },
    imageFile: File
  ): Promise<Auction> {
    // Validate file type
    const fileTypeValidation = ImageFileTypeField.safeParse(imageFile.type);
    if (!fileTypeValidation.success) {
      throw new Error(
        `Unsupported file type: ${imageFile.type}. Please use JPEG, PNG, GIF, or WebP.`
      );
    }

    // First create the auction to get upload URL
    const requestWithFileType = {
      ...data,
      fileType: fileTypeValidation.data
    };
    const response = await apiClient.post<CreateAuctionResponse>('/auctions', requestWithFileType);

    // Upload the image to S3
    if (response.uploadUrl) {
      await fetch(response.uploadUrl, {
        method: 'PUT',
        body: imageFile,
        headers: {
          'Content-Type': imageFile.type
        }
      });
    }

    return response.auction;
  },

  /**
   * Place a bid on an auction
   */
  async placeBid(auctionId: string, amount: number): Promise<PlaceBidResponse> {
    const response = await apiClient.post<PlaceBidResponse>(
      `/auctions/${auctionId}/bids`,
      {
        auctionId,
        amount
      }
    );
    return response;
  },

  /**
   * Get bid history for an auction
   */
  async getBidHistory(
    auctionId: string,
    options: GetBidHistoryOptions = {}
  ): Promise<GetBidHistoryResponse> {
    const { limit = 50, offset = 0 } = options;

    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const response = await apiClient.get<GetBidHistoryResponse>(
      `/auctions/${auctionId}/bids?${params.toString()}`
    );
    return response;
  }
};
