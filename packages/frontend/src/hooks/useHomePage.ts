import type { RefObject } from 'react';
import type { IFeedService } from '../services/interfaces/IFeedService';
import { useFeed, type UseFeedReturn } from './useFeed';
import { useFeedInfiniteScroll } from './useFeedInfiniteScroll';

/**
 * Return type for useHomePage hook
 * Combines useFeed and useFeedInfiniteScroll
 */
export type UseHomePageReturn = UseFeedReturn & {
  readonly sentinelRef: RefObject<HTMLDivElement>;
};

/**
 * Composite hook for HomePage
 * 
 * Combines feed data management (useFeed) with infinite scroll
 * functionality (useFeedInfiniteScroll) to provide a complete
 * solution for displaying paginated feed content.
 * 
 * @param feedService - Feed service implementation
 * @param feedType - Type of feed to display ('following' | 'explore')
 * @returns Feed state, actions, and sentinel ref for infinite scroll
 * 
 * @example
 * ```tsx
 * const HomePage = () => {
 *   const { feedService } = useServices();
 *   const {
 *     posts,
 *     loading,
 *     error,
 *     hasMore,
 *     loadingMore,
 *     retry,
 *     sentinelRef
 *   } = useHomePage(feedService, 'following');
 * 
 *   if (loading) return <FeedLoading />;
 *   if (error) return <FeedError message={error} onRetry={retry} />;
 *   if (posts.length === 0) return <FeedEmpty />;
 * 
 *   return (
 *     <div>
 *       <FeedList posts={posts} />
 *       {hasMore && (
 *         <div ref={sentinelRef}>
 *           <FeedLoadingMore loading={loadingMore} />
 *         </div>
 *       )}
 *       {!hasMore && <FeedEndMessage />}
 *     </div>
 *   );
 * };
 * ```
 */
export const useHomePage = (
  feedService: IFeedService,
  feedType: 'following' | 'explore' = 'following'
): UseHomePageReturn => {
  const feedHook = useFeed(feedService, feedType);
  
  const sentinelRef = useFeedInfiniteScroll(
    feedHook.loadMore,
    feedHook.hasMore,
    feedHook.loadingMore
  );

  return {
    ...feedHook,
    sentinelRef,
  };
};
