/**
 * Shared Adapter Utilities
 *
 * DRY helpers for all service adapters.
 * Eliminates repetitive error handling and response mapping.
 *
 * All adapters follow the same pattern:
 * 1. Wrap service calls in try/catch
 * 2. Convert throwing errors → Result<T, Error>
 * 3. Map property names (comments/notifications/auctions → items)
 */

import { success, failure, type Result } from '../../../shared/types/result.js';
import type { PaginatedResult } from '../../../shared/types/pagination.js';

/**
 * Generic adapter helper for wrapping service calls with error handling.
 * Converts throwing service methods to Result-returning domain methods.
 *
 * @example
 * ```typescript
 * return adaptServiceCall(async () => {
 *   const data = await this.service.getData();
 *   return data;
 * });
 * ```
 */
export async function adaptServiceCall<T>(
  serviceCall: () => Promise<T>
): Promise<Result<T, Error>> {
  try {
    const data = await serviceCall();
    return success(data);
  } catch (error) {
    return failure(error as Error);
  }
}

/**
 * Adapts paginated service responses to domain pagination format.
 * Handles common property name differences from DAL services.
 *
 * DAL services return: { comments?, notifications?, auctions?, bids?, hasMore, nextCursor }
 * Domain expects: { items, hasMore, nextCursor }
 *
 * @param serviceResponse - The response from the DAL service
 * @param mapItem - Optional mapper function to transform items
 * @returns Paginated result in domain format
 *
 * @example
 * ```typescript
 * return adaptServiceCall(async () => {
 *   const result = await this.service.getComments();
 *   return adaptPaginatedResponse(result);
 * });
 * ```
 */
export function adaptPaginatedResponse<TService, TDomain = TService>(
  serviceResponse: {
    comments?: TService[];
    notifications?: TService[];
    auctions?: TService[];
    bids?: TService[];
    hasMore: boolean;
    nextCursor?: string | null;
  },
  mapItem?: (item: TService) => TDomain
): PaginatedResult<TDomain> {
  const items = (
    serviceResponse.comments ||
    serviceResponse.notifications ||
    serviceResponse.auctions ||
    serviceResponse.bids ||
    []
  ) as TService[];

  return {
    items: mapItem ? items.map(mapItem) : (items as unknown as TDomain[]),
    hasMore: serviceResponse.hasMore,
    cursor: serviceResponse.nextCursor ?? undefined, // Map nextCursor → cursor
  };
}
