/**
 * Test fixtures for Profile objects
 * 
 * Provides factory functions for creating mock Profile objects with sensible defaults.
 * Reduces test boilerplate and ensures consistency across tests.
 * 
 * @example
 * ```typescript
 * // Basic profile
 * const profile = createMockProfile();
 * 
 * // Profile with overrides
 * const seller = createMockProfile({ id: 'user-1', handle: 'seller' });
 * 
 * // Use specialized helpers
 * const seller = createMockSeller();
 * const bidder = createMockBidder({ id: 'user-2' });
 * ```
 */

import type { Profile } from '../../../graphql/operations/auctions.js';

/**
 * Create a mock Profile with sensible defaults
 * 
 * All fields can be overridden by passing partial Profile object.
 * 
 * @param overrides - Partial Profile to override defaults
 * @returns Complete Profile object
 */
export function createMockProfile(
  overrides: Partial<Profile> = {}
): Profile {
  return {
    id: 'profile-1',
    handle: 'testuser',
    username: 'testuser',
    displayName: null,
    profilePictureUrl: null,
    ...overrides,
  };
}

/**
 * Create a seller profile (common pattern in auction tests)
 * 
 * @param overrides - Partial Profile to override defaults
 * @returns Profile configured as a seller
 */
export function createMockSeller(
  overrides: Partial<Profile> = {}
): Profile {
  return createMockProfile({
    id: 'seller-1',
    handle: 'seller',
    username: 'seller',
    ...overrides,
  });
}

/**
 * Create a bidder profile (common pattern in bid tests)
 * 
 * @param overrides - Partial Profile to override defaults
 * @returns Profile configured as a bidder
 */
export function createMockBidder(
  overrides: Partial<Profile> = {}
): Profile {
  return createMockProfile({
    id: 'bidder-1',
    handle: 'bidder',
    username: 'bidder',
    ...overrides,
  });
}

/**
 * Create a winner profile (common pattern in completed auction tests)
 * 
 * @param overrides - Partial Profile to override defaults
 * @returns Profile configured as a winner
 */
export function createMockWinner(
  overrides: Partial<Profile> = {}
): Profile {
  return createMockProfile({
    id: 'winner-1',
    handle: 'winner',
    username: 'winner',
    ...overrides,
  });
}
