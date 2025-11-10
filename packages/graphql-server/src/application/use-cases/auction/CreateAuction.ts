/**
 * CreateAuction Use Case
 *
 * Creates a new auction with comprehensive validation.
 *
 * Business Rules (validated with Zod):
 * - Title: 3-200 characters, trimmed
 * - Description: max 2000 characters, trimmed, optional
 * - StartingPrice: positive, max 2 decimal places
 * - ReservePrice: positive, max 2 decimal places, >= startingPrice (optional)
 * - Times: endTime must be after startTime
 * - FileType: valid image MIME type (optional)
 *
 * Benefits:
 * - Validation in business logic layer (not resolver)
 * - Detailed validation errors returned via Result type
 * - Consistent with other use cases
 */

import { AsyncResult, UserId } from '../../../shared/types/index.js';
import { CreateAuctionRequestSchema } from '@social-media-app/shared';
import type { z } from 'zod';

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
      // ✅ Validate input with Zod schema (business rules)
      // Validates: title, description, prices, times, fileType
      // Business rules: endTime > startTime, reservePrice >= startingPrice
      const validationResult = CreateAuctionRequestSchema.safeParse({
        title: input.title,
        description: input.description,
        startPrice: input.startingPrice,
        reservePrice: input.reservePrice,
        startTime: input.startTime,
        endTime: input.endTime,
        fileType: input.fileType,
      });

      if (!validationResult.success) {
        // Return validation errors as a Result failure
        const errorMessage = this.formatValidationErrors(validationResult.error);
        return {
          success: false,
          error: new Error(`Validation failed: ${errorMessage}`),
        };
      }

      // Use validated data (with Zod transformations applied, e.g., trim)
      const validatedInput = validationResult.data;

      // Generate S3 presigned URL for auction image upload (if fileType provided)
      let uploadUrl: string | undefined;
      let publicUrl: string | undefined;

      if (validatedInput.fileType) {
        const imageUploadData = await this.services.profileService.generatePresignedUrl(
          input.userId,
          {
            fileType: validatedInput.fileType as ImageFileType,
            purpose: 'auction-image',
          }
        );

        uploadUrl = imageUploadData.uploadUrl;
        publicUrl = imageUploadData.publicUrl;
      }

      // Create auction with public URL and validated data
      const auction = await this.services.auctionService.createAuction(
        input.userId,
        {
          title: validatedInput.title,
          description: validatedInput.description ?? '',
          startingPrice: validatedInput.startPrice,
          reservePrice: validatedInput.reservePrice,
          startTime: validatedInput.startTime,
          endTime: validatedInput.endTime,
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

  /**
   * Format Zod validation errors into a readable string
   */
  private formatValidationErrors(error: z.ZodError): string {
    return error.errors
      .map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
  }
}
