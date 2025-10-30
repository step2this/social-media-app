/**
 * Auction Service Singleton
 *
 * Provides a singleton instance of the auction service using lazy initialization.
 * Uses Proxy pattern to delegate all calls to the underlying service implementation.
 *
 * This singleton pattern allows for:
 * - Easy testing via dependency injection (setAuctionService)
 * - Single point of initialization
 * - Consistent service access across the application
 */

import { AuctionServiceGraphQL } from './implementations/AuctionService.graphql.js';
import { createGraphQLClient } from '../graphql/client.js';
import type { IAuctionService } from './interfaces/IAuctionService.js';

/**
 * Internal singleton instance (null until first access)
 */
let _auctionService: IAuctionService | null = null;

/**
 * Get or create the auction service singleton instance
 * @returns The auction service instance
 */
function getAuctionService(): IAuctionService {
  if (!_auctionService) {
    _auctionService = new AuctionServiceGraphQL(createGraphQLClient());
  }
  return _auctionService;
}

/**
 * Auction service singleton export
 * Uses Proxy to delegate all property access and method calls to the underlying implementation
 */
export const auctionService = new Proxy({} as IAuctionService, {
  get(_target, prop) {
    const instance = getAuctionService();
    const value = instance[prop as keyof IAuctionService];
    
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});

/**
 * Set a custom auction service instance (for testing)
 * @param service - The auction service instance to use
 */
export function setAuctionService(service: IAuctionService): void {
  _auctionService = service;
}

/**
 * Reset the auction service singleton (for testing cleanup)
 */
export function resetAuctionService(): void {
  _auctionService = null;
}
