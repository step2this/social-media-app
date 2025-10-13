import './DevFeedSourceBadge.css';

/**
 * Feed source type
 */
export type FeedSource = 'materialized' | 'query-time';

/**
 * Props for DevFeedSourceBadge component
 */
export interface DevFeedSourceBadgeProps {
  feedSource: FeedSource;
}

/**
 * DevFeedSourceBadge Component
 *
 * Visual badge overlay showing whether a post comes from materialized feed or query-time.
 * Displays as a circular badge in the top-right corner of the post card.
 *
 * - M = Materialized (blue) - pre-computed feed
 * - Q = Query-time (yellow) - dynamically generated feed
 *
 * @param props - Component props
 * @returns React component
 */
export function DevFeedSourceBadge({ feedSource }: DevFeedSourceBadgeProps) {
  return (
    <div
      className={`dev-feed-source-badge dev-feed-source-badge--${feedSource}`}
    >
      {feedSource === 'materialized' ? 'M' : 'Q'}
    </div>
  );
}