import { useState, useEffect, useCallback, useMemo } from 'react';
import './DevKinesisMonitor.css';

/**
 * Kinesis record structure
 */
interface KinesisRecord {
  sequenceNumber: string;
  approximateArrivalTimestamp: string;
  data: {
    eventType?: string;
    postId?: string;
    userId?: string;
    userHandle?: string;
    authorId?: string;
    authorHandle?: string;
    caption?: string;
    [key: string]: any;
  };
  partitionKey: string;
}

/**
 * Kinesis records API response
 */
interface KinesisRecordsResponse {
  streamName: string;
  records: KinesisRecord[];
  totalRecords: number;
  millisBehindLatest: number;
}

/**
 * Props for DevKinesisMonitor component
 */
export interface DevKinesisMonitorProps {
  /**
   * Polling interval in milliseconds
   * @default 10000 (10 seconds)
   */
  pollingInterval?: number;

  /**
   * Maximum number of records to fetch
   * @default 50
   */
  limit?: number;
}

// Maximum events to display (memory limit)
const MAX_DISPLAYED_EVENTS = 50;
// Maximum event age in milliseconds (5 minutes)
const MAX_EVENT_AGE_MS = 5 * 60 * 1000;

/**
 * Prune old records using hybrid approach:
 * Keep last 50 events OR last 5 minutes, whichever is LESS
 */
function pruneOldRecords(records: KinesisRecord[]): KinesisRecord[] {
  const now = Date.now();
  const cutoffTime = now - MAX_EVENT_AGE_MS;

  // Filter by time (last 5 minutes)
  const recentByTime = records.filter(record => {
    const recordTime = new Date(record.approximateArrivalTimestamp).getTime();
    return !isNaN(recordTime) && recordTime >= cutoffTime;
  });

  // Take last 50 events
  const recentByCount = records.slice(-MAX_DISPLAYED_EVENTS);

  // Return whichever has FEWER events (more aggressive pruning)
  return recentByTime.length < recentByCount.length
    ? recentByTime
    : recentByCount;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Get emoji for event type
 */
function getEventEmoji(eventType: string): string {
  switch (eventType) {
    case 'POST_CREATED':
      return '📝';
    case 'POST_READ':
      return '👁️';
    case 'POST_LIKED':
      return '❤️';
    case 'POST_UNLIKED':
      return '💔';
    case 'POST_DELETED':
      return '🗑️';
    case 'COMMENT_CREATED':
      return '💬';
    default:
      return '📦';
  }
}

/**
 * DevKinesisMonitor Component
 *
 * Real-time monitoring of Kinesis stream events for debugging.
 * Displays feed events (POST_CREATED, POST_READ, POST_LIKED, etc.)
 * with filtering and auto-refresh capabilities.
 *
 * @example
 * ```tsx
 * <DevKinesisMonitor pollingInterval={10000} limit={50} />
 * ```
 *
 * @param props - Component props
 * @returns React component
 */
export function DevKinesisMonitor({
  pollingInterval = 10000,
  limit = 50
}: DevKinesisMonitorProps = {}) {
  const [records, setRecords] = useState<KinesisRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<KinesisRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [streamName, setStreamName] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  /**
   * Fetch Kinesis records from backend
   */
  const fetchRecords = useCallback(async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(
        `${apiUrl}/dev/kinesis-records?limit=${limit}&iteratorType=TRIM_HORIZON`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: KinesisRecordsResponse = await response.json();
      const prunedRecords = pruneOldRecords(data.records);
      setRecords(prunedRecords);
      setStreamName(data.streamName);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[DevKinesisMonitor] Failed to fetch records:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  /**
   * Clear all records from the display
   */
  const clearRecords = useCallback(() => {
    setRecords([]);
    setFilteredRecords([]);
  }, []);

  /**
   * Filter records by event type
   */
  useEffect(() => {
    if (eventTypeFilter === 'all') {
      setFilteredRecords(records);
    } else {
      setFilteredRecords(
        records.filter((record) => record.data.eventType === eventTypeFilter)
      );
    }
  }, [records, eventTypeFilter]);

  /**
   * Display records in reverse chronological order (newest first)
   * Memoized to avoid recreating array on every render
   */
  const displayRecords = useMemo(() => {
    return filteredRecords.slice().reverse();
  }, [filteredRecords]);

  /**
   * Initial fetch
   */
  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  /**
   * Auto-refresh polling
   */
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      fetchRecords();
    }, pollingInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, pollingInterval, fetchRecords]);

  /**
   * Get unique event types for filter dropdown
   */
  const eventTypes = Array.from(
    new Set(records.map((r) => r.data.eventType).filter(Boolean))
  ).sort();

  return (
    <div className="dev-kinesis-monitor">
      <div className="dev-kinesis-monitor__header">
        <h3 className="dev-kinesis-monitor__title">Kinesis Stream Monitor</h3>
        <div className="dev-kinesis-monitor__controls">
          <label className="dev-kinesis-monitor__auto-refresh">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button
            onClick={fetchRecords}
            className="dev-kinesis-monitor__refresh-btn"
            disabled={loading}
          >
            🔄 Refresh
          </button>
          <button
            onClick={clearRecords}
            className="dev-kinesis-monitor__clear-btn"
            disabled={records.length === 0}
            title="Clear all events from display"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      <div className="dev-kinesis-monitor__meta">
        <div className="dev-kinesis-monitor__stream-name">
          Stream: <strong>{streamName || 'Loading...'}</strong>
        </div>
        <div className="dev-kinesis-monitor__last-updated">
          Updated: {formatTimestamp(lastUpdated.toISOString())}
        </div>
      </div>

      {error && (
        <div className="dev-kinesis-monitor__error">
          ⚠️ Error: {error}
        </div>
      )}

      <div className="dev-kinesis-monitor__filters">
        <label>
          Event Type:
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="dev-kinesis-monitor__filter-select"
          >
            <option value="all">All ({records.length})</option>
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {getEventEmoji(type)} {type} (
                {records.filter((r) => r.data.eventType === type).length})
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && records.length === 0 ? (
        <div className="dev-kinesis-monitor__loading">Loading records...</div>
      ) : displayRecords.length === 0 ? (
        <div className="dev-kinesis-monitor__empty">
          {records.length === 0
            ? 'No records in stream yet. Perform some actions to generate events!'
            : `No ${eventTypeFilter} events found.`}
        </div>
      ) : (
        <div className="dev-kinesis-monitor__records">
          {displayRecords.map((record) => (
            <div key={record.sequenceNumber} className="dev-kinesis-monitor__record">
              <div className="dev-kinesis-monitor__record-header">
                <span className="dev-kinesis-monitor__event-type">
                  {getEventEmoji(record.data.eventType || 'UNKNOWN')}{' '}
                  {record.data.eventType || 'UNKNOWN'}
                </span>
                <span className="dev-kinesis-monitor__timestamp">
                  {formatTimestamp(record.approximateArrivalTimestamp)}
                </span>
              </div>
              <div className="dev-kinesis-monitor__record-data">
                <div className="dev-kinesis-monitor__data-row">
                  <span className="dev-kinesis-monitor__label">Post ID:</span>
                  <span className="dev-kinesis-monitor__value">
                    {record.data.postId?.slice(0, 8) || 'N/A'}...
                  </span>
                </div>
                {(record.data.userHandle || record.data.userId) && (
                  <div className="dev-kinesis-monitor__data-row">
                    <span className="dev-kinesis-monitor__label">User:</span>
                    <span className="dev-kinesis-monitor__value">
                      {record.data.userHandle
                        ? `@${record.data.userHandle}`
                        : `${record.data.userId?.slice(0, 8)}...`
                      }
                    </span>
                  </div>
                )}
                {record.data.authorHandle && (
                  <div className="dev-kinesis-monitor__data-row">
                    <span className="dev-kinesis-monitor__label">Author:</span>
                    <span className="dev-kinesis-monitor__value">
                      @{record.data.authorHandle}
                    </span>
                  </div>
                )}
                {record.data.caption && (
                  <div className="dev-kinesis-monitor__data-row">
                    <span className="dev-kinesis-monitor__label">Caption:</span>
                    <span className="dev-kinesis-monitor__value">
                      {record.data.caption.slice(0, 50)}
                      {record.data.caption.length > 50 ? '...' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
