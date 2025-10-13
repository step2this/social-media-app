import { useRef, useEffect } from 'react';
import './DevApiLogger.css';

/**
 * API log entry structure
 */
export interface ApiLogEntry {
  id: string;
  timestamp: Date;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  status: 'success' | 'error';
  statusCode?: number;
  responseTime?: number;
}

/**
 * Props for DevApiLogger component
 */
export interface DevApiLoggerProps {
  logs: ApiLogEntry[];
  onClear?: () => void;
}

/**
 * Format a timestamp to HH:MM:SS format
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * DevApiLogger Component
 *
 * Real-time API call logging with timestamps, HTTP methods, and status indicators.
 * Displays the most recent 50 API calls with auto-scroll to latest entry.
 *
 * @param props - Component props
 * @returns React component
 */
export function DevApiLogger({ logs, onClear }: DevApiLoggerProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Limit to 50 most recent entries, newest first
  const displayLogs = logs.slice(-50).reverse();

  return (
    <div className="dev-api-logger">
      <div className="dev-api-logger__header">
        <h3>API Call Log</h3>
        {onClear && (
          <button
            type="button"
            className="dev-api-logger__clear-button"
            onClick={onClear}
          >
            Clear
          </button>
        )}
      </div>

      <div className="dev-api-logger__log" ref={logContainerRef}>
        {displayLogs.length === 0 ? (
          <p className="dev-api-logger__empty">No API calls yet</p>
        ) : (
          displayLogs.map((log) => (
            <div
              key={log.id}
              className={`dev-api-logger__entry dev-api-logger__entry--${log.status}`}
            >
              <span
                className={`dev-api-logger__method-badge dev-api-logger__method-badge--${log.method}`}
              >
                {log.method}
              </span>

              <span className="dev-api-logger__endpoint">{log.endpoint}</span>

              {log.statusCode && (
                <span className="dev-api-logger__status-code">
                  {log.statusCode}
                </span>
              )}

              <span className="dev-api-logger__timestamp">
                {formatTime(log.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}