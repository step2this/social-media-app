/**
 * PlaceBid Use Case
 *
 * Places a bid on an auction with validation.
 *
 * Business Rules (validated with Zod):
 * - AuctionId: valid UUID format
 * - Amount: positive number, max 2 decimal places
 *
 * Benefits:
 * - Validation in business logic layer (not resolver)
 * - Detailed validation errors returned via Result type
 * - Consistent with other use cases
 */

import { AsyncResult, UserId } from '../../../shared/types/index.js';
import { PlaceBidRequestSchema } from '@social-media-app/shared';
import type { z } from 'zod';

export interface PlaceBidInput {
  userId: UserId;
  auctionId: string;
  amount: number;
}

export interface PlaceBidOutput {
  bid: {
    id: string;
    auctionId: string;
    userId: string;
    amount: number;
    createdAt: string;
  };
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
}

export interface PlaceBidServices {
  auctionService: {
    placeBid(
      userId: string,
      input: { auctionId: string; amount: number }
    ): Promise<PlaceBidOutput>;
  };
}

export class PlaceBid {
  constructor(private readonly services: PlaceBidServices) {}

  async execute(input: PlaceBidInput): AsyncResult<PlaceBidOutput> {
    try {
      // ✅ Validate input with Zod schema (business rules)
      // Validates: auctionId (UUID format), amount (positive, 2 decimals)
      const validationResult = PlaceBidRequestSchema.safeParse({
        auctionId: input.auctionId,
        amount: input.amount,
      });

      if (!validationResult.success) {
        // Return validation errors as a Result failure
        const errorMessage = this.formatValidationErrors(validationResult.error);
        return {
          success: false,
          error: new Error(`Validation failed: ${errorMessage}`),
        };
      }

      // Use validated data (with Zod transformations applied)
      const validatedInput = validationResult.data;

      const result = await this.services.auctionService.placeBid(
        input.userId,
        {
          auctionId: validatedInput.auctionId,
          amount: validatedInput.amount,
        }
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to place bid'),
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
