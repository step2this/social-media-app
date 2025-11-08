/**
 * CreateAuction Use Case
 */

import { AsyncResult, UserId } from '../../../shared/types/index.js';

export type ImageFileType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

export interface CreateAuctionInput {
  userId: UserId;
  title: string;
  description: string;
  startingPrice: number;
  reservePrice?: number;
  startTime: string;
  endTime: string;
  fileType?: ImageFileType;
}

export interface CreateAuctionOutput {
  auction: {
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
  };
  uploadUrl?: string;
}

export interface CreateAuctionServices {
  profileService: {
    generatePresignedUrl(
      userId: string,
      options: { fileType: ImageFileType; purpose: string }
    ): Promise<{
      uploadUrl: string;
      publicUrl: string;
      thumbnailUrl?: string;
    }>;
  };
  auctionService: {
    createAuction(
      userId: string,
      input: Omit<CreateAuctionInput, 'userId' | 'fileType'>,
      publicUrl?: string
    ): Promise<CreateAuctionOutput['auction']>;
  };
}

export class CreateAuction {
  constructor(private readonly services: CreateAuctionServices) {}

  async execute(input: CreateAuctionInput): AsyncResult<CreateAuctionOutput> {
    try {
      // Generate S3 presigned URL for auction image upload (if fileType provided)
      let uploadUrl: string | undefined;
      let publicUrl: string | undefined;

      if (input.fileType) {
        const imageUploadData = await this.services.profileService.generatePresignedUrl(
          input.userId,
          {
            fileType: input.fileType,
            purpose: 'auction-image',
          }
        );

        uploadUrl = imageUploadData.uploadUrl;
        publicUrl = imageUploadData.publicUrl;
      }

      // Create auction with public URL
      const auction = await this.services.auctionService.createAuction(
        input.userId,
        {
          title: input.title,
          description: input.description,
          startingPrice: input.startingPrice,
          reservePrice: input.reservePrice,
          startTime: input.startTime,
          endTime: input.endTime,
        },
        publicUrl
      );

      return {
        success: true,
        data: {
          auction,
          uploadUrl,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to create auction'),
      };
    }
  }
}
