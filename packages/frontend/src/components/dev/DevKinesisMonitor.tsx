import { useState, useEffect, useCallback } from 'react';
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
      setRecords(data.records);
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
      ) : filteredRecords.length === 0 ? (
        <div className="dev-kinesis-monitor__empty">
          {records.length === 0
            ? 'No records in stream yet. Perform some actions to generate events!'
            : `No ${eventTypeFilter} events found.`}
        </div>
      ) : (
        <div className="dev-kinesis-monitor__records">
          {filteredRecords.map((record) => (
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
                {record.data.userId && (
                  <div className="dev-kinesis-monitor__data-row">
                    <span className="dev-kinesis-monitor__label">User ID:</span>
                    <span className="dev-kinesis-monitor__value">
                      {record.data.userId.slice(0, 8)}...
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
