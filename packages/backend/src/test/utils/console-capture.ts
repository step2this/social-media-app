/**
 * Console Output Capture Utilities
 *
 * Provides utilities to capture console output during tests without mocking.
 * Useful for testing structured logging behavior.
 *
 * Principles:
 * - No mocks - actually capture real console output
 * - Type-safe structured log parsing
 * - Easy to use in tests
 */

/**
 * Captured console output
 */
export interface CapturedLog {
  type: 'log' | 'warn' | 'error';
  message: string;
  timestamp: number;
}

/**
 * Parsed structured log entry (JSON format)
 */
export interface StructuredLog {
  level?: string;
  type?: string;
  handler?: string;
  message?: string;
  batchId?: string;
  recordId?: string;
  recordCount?: number;
  metrics?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
  };
  timestamp?: string;
  [key: string]: any;
}

/**
 * Console capture result
 */
export interface CaptureResult<T> {
  result: T;
  logs: CapturedLog[];
  structuredLogs: StructuredLog[];
}

/**
 * Capture console output during function execution
 *
 * Intercepts console.log, console.warn, console.error and returns
 * both the function result and captured output.
 *
 * @param fn - Function to execute while capturing output
 * @returns Result and captured logs
 *
 * @example
 * ```typescript
 * const { result, logs, structuredLogs } = await captureConsoleOutput(async () => {
 *   logger.logInfo('Test message');
 *   return 'done';
 * });
 *
 * expect(result).toBe('done');
 * expect(structuredLogs[0].message).toBe('Test message');
 * ```
 */
export async function captureConsoleOutput<T>(
  fn: () => T | Promise<T>
): Promise<CaptureResult<T>> {
  const logs: CapturedLog[] = [];

  // Store original console methods
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  // Intercept console methods
  console.log = (...args: any[]) => {
    logs.push({
      type: 'log',
      message: args.join(' '),
      timestamp: Date.now(),
    });
  };

  console.warn = (...args: any[]) => {
    logs.push({
      type: 'warn',
      message: args.join(' '),
      timestamp: Date.now(),
    });
  };

  console.error = (...args: any[]) => {
    logs.push({
      type: 'error',
      message: args.join(' '),
      timestamp: Date.now(),
    });
  };

  try {
    // Execute function
    const result = await fn();

    // Parse structured logs (JSON format)
    const structuredLogs = logs
      .map((log) => {
        try {
          return JSON.parse(log.message) as StructuredLog;
        } catch {
          // Not JSON, return null
          return null;
        }
      })
      .filter((log): log is StructuredLog => log !== null);

    return { result, logs, structuredLogs };
  } finally {
    // Restore original console methods
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
}

/**
 * Capture only structured JSON logs
 *
 * Convenience wrapper that only returns parsed JSON logs
 */
export async function captureStructuredLogs<T>(
  fn: () => T | Promise<T>
): Promise<{ result: T; logs: StructuredLog[] }> {
  const { result, structuredLogs } = await captureConsoleOutput(fn);
  return { result, logs: structuredLogs };
}

/**
 * Find log by type in structured logs
 */
export function findLogByType(
  logs: StructuredLog[],
  type: string
): StructuredLog | undefined {
  return logs.find((log) => log.type === type);
}

/**
 * Find all logs by level
 */
export function findLogsByLevel(
  logs: StructuredLog[],
  level: string
): StructuredLog[] {
  return logs.filter((log) => log.level === level);
}

/**
 * Find log by batch ID
 */
export function findLogByBatchId(
  logs: StructuredLog[],
  batchId: string
): StructuredLog[] {
  return logs.filter((log) => log.batchId === batchId);
}

/**
 * Assert that log contains expected fields
 */
export function assertLogHasFields(
  log: StructuredLog,
  expectedFields: Partial<StructuredLog>
): void {
  for (const [key, value] of Object.entries(expectedFields)) {
    if (typeof value === 'object' && value !== null) {
      // Deep comparison for objects
      expect(log[key]).toEqual(value);
    } else {
      expect(log[key]).toBe(value);
    }
  }
}

/**
 * Simple expect helper (for use in test files)
 */
function expect(value: any) {
  return {
    toBe: (expected: any) => {
      if (value !== expected) {
        throw new Error(`Expected ${value} to be ${expected}`);
      }
    },
    toEqual: (expected: any) => {
      if (JSON.stringify(value) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`);
      }
    },
  };
}
