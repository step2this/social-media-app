import { useState, useEffect, useRef } from 'react';
import './DevCacheStatusIndicator.css';

/**
 * Cache status data structure from backend
 */
interface CacheStatus {
  redis: {
    connected: boolean;
    latency?: number;
    error?: string;
  };
  stats: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  kinesis: {
    streamName: string;
    status: 'ACTIVE' | 'CREATING' | 'DELETING' | 'UPDATING' | 'UNKNOWN';
    error?: string;
  };
  environment: string;
}

/**
 * Props for DevCacheStatusIndicator component
 */
export interface DevCacheStatusIndicatorProps {
  /**
   * Polling interval in milliseconds
   * @default 5000
   */
  pollingInterval?: number;
}

/**
 * Format time ago from milliseconds
 */
function formatTimeAgo(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

/**
 * Get status emoji for Kinesis stream
 */
function getKinesisStatusEmoji(status: CacheStatus['kinesis']['status']): string {
  switch (status) {
    case 'ACTIVE':
      return '🟢';
    case 'CREATING':
      return '🟡';
    case 'DELETING':
      return '🔴';
    case 'UPDATING':
      return '🟠';
    default:
      return '⚪';
  }
}

/**
 * DevCacheStatusIndicator Component
 *
 * Real-time monitoring of Redis cache and Kinesis streaming status.
 * Polls the backend /api/dev/cache-status endpoint every 5 seconds.
 *
 * Features:
 * - Redis connection status with latency measurement
 * - Cache hit/miss statistics with hit rate percentage
 * - Kinesis stream status with visual indicators
 * - Automatic polling with configurable interval
 * - Error handling for disconnections
 *
 * @example
 * ```tsx
 * <DevCacheStatusIndicator />
 * ```
 *
 * @param props - Component props
 * @returns React component
 */
export function DevCacheStatusIndicator({
  pollingInterval = 5000
}: DevCacheStatusIndicatorProps = {}) {
  const [status, setStatus] = useState<CacheStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<number>(0);
  const pollingIntervalRef = useRef<number>();
  const clockIntervalRef = useRef<number>();

  /**
   * Fetch cache status from backend
   */
  const fetchStatus = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/dev/cache-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: CacheStatus = await response.json();
      setStatus(data);
      setError(null);
      setLastUpdated(Date.now());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[DevCacheStatusIndicator] Failed to fetch cache status:', err);
    }
  };

  /**
   * Update time since last update every second
   */
  useEffect(() => {
    clockIntervalRef.current = window.setInterval(() => {
      setTimeSinceUpdate(Date.now() - lastUpdated);
    }, 1000);

    return () => {
      if (clockIntervalRef.current !== undefined) {
        clearInterval(clockIntervalRef.current);
      }
    };
  }, [lastUpdated]);

  /**
   * Set up polling for status updates
   */
  useEffect(() => {
    // Fetch immediately on mount
    fetchStatus();

    // Set up polling interval
    pollingIntervalRef.current = window.setInterval(fetchStatus, pollingInterval);

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current !== undefined) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [pollingInterval]);

  /**
   * Calculate hit rate percentage for display
   */
  const hitRatePercentage = status
    ? (status.stats.hitRate * 100).toFixed(1)
    : '0.0';

  const totalRequests = status
    ? status.stats.hits + status.stats.misses
    : 0;

  return (
    <div className="dev-cache-status">
      <div className="dev-cache-status__header">
        <h3>Cache & Streaming Status</h3>
      </div>

      {error ? (
        <div className="dev-cache-status__error">
          <p>Failed to fetch status</p>
          <p className="dev-cache-status__error-message">{error}</p>
        </div>
      ) : !status ? (
        <div className="dev-cache-status__loading">
          <p>Loading status...</p>
        </div>
      ) : (
        <div className="dev-cache-status__content">
          {/* Redis Status */}
          <div className="dev-cache-status__section">
            <div className="dev-cache-status__row">
              <span className="dev-cache-status__label">Redis:</span>
              <span className={`dev-cache-status__value ${
                status.redis.connected
                  ? 'dev-cache-status__value--success'
                  : 'dev-cache-status__value--error'
              }`}>
                {status.redis.connected ? '✅ Connected' : '❌ Disconnected'}
                {status.redis.connected && status.redis.latency !== undefined && (
                  <span className="dev-cache-status__latency">
                    {' '}({status.redis.latency}ms latency)
                  </span>
                )}
              </span>
            </div>

            {status.redis.error && (
              <div className="dev-cache-status__row">
                <span className="dev-cache-status__error-inline">
                  Error: {status.redis.error}
                </span>
              </div>
            )}

            <div className="dev-cache-status__row">
              <span className="dev-cache-status__label">Hit Rate:</span>
              <span className="dev-cache-status__value">
                {hitRatePercentage}% ({status.stats.hits}/{totalRequests} requests)
              </span>
            </div>
          </div>

          {/* Kinesis Status */}
          <div className="dev-cache-status__section">
            <div className="dev-cache-status__row">
              <span className="dev-cache-status__label">Kinesis:</span>
              <span className="dev-cache-status__value">
                {getKinesisStatusEmoji(status.kinesis.status)} {status.kinesis.status}
              </span>
            </div>

            <div className="dev-cache-status__row">
              <span className="dev-cache-status__label">Stream:</span>
              <span className="dev-cache-status__value dev-cache-status__stream-name">
                {status.kinesis.streamName}
              </span>
            </div>

            {status.kinesis.error && (
              <div className="dev-cache-status__row">
                <span className="dev-cache-status__error-inline">
                  Error: {status.kinesis.error}
                </span>
              </div>
            )}
          </div>

          {/* Footer with last updated time */}
          <div className="dev-cache-status__footer">
            <span className="dev-cache-status__timestamp">
              Last Updated: {formatTimeAgo(timeSinceUpdate)}
            </span>
            <span className="dev-cache-status__environment">
              {status.environment}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
