/**
 * exploreFeedResolver - Get Explore Feed
 *
 * Returns paginated posts for discovery.
 * Supports both anonymous and authenticated users (with optional personalization).
 * Public operation - no authentication required.
 */

import { ConnectionResolver } from '../../infrastructure/resolvers/ConnectionResolver.js';
import { Container } from '../../infrastructure/di/Container.js';
import type { GetExploreFeed } from '../../application/use-cases/feed/GetExploreFeed.js';
import type { QueryResolvers } from '../../../generated/types.js';

/**
 * Create the exploreFeed resolver with DI container.
 *
 * @param container - DI container for resolving use cases
 * @returns GraphQL resolver for Query.exploreFeed
 *
 * @example
 * ```typescript
 * const container = new Container();
 * registerServices(container, context);
 * const exploreFeedResolver = createExploreFeedResolver(container);
 * ```
 */
export const createExploreFeedResolver = (container: Container): QueryResolvers['exploreFeed'] =>
  async (_parent, args, context) => {
    const useCase = container.resolve<GetExploreFeed>('GetExploreFeed');

    const resolver = new ConnectionResolver((pagination) =>
      useCase.execute({ pagination, viewerId: context.userId })
    );

    const { first, after } = args;
    return resolver.resolve({ first, after });
  };
