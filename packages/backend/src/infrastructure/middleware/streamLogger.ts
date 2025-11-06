/**
 * Stream Handler Logging Utility
 *
 * Provides structured logging utilities for DynamoDB Stream and Kinesis Stream handlers.
 * Enhances observability with correlation tracking, metrics, and performance monitoring.
 *
 * Features:
 * - Structured JSON logging for CloudWatch Logs Insights
 * - Processing metrics (records processed, errors, duration)
 * - Per-record error tracking (no stream poisoning)
 * - Performance monitoring (latency, throughput)
 *
 * Usage:
 * ```typescript
 * const logger = createStreamLogger('FeedFanout');
 *
 * export const handler = async (event: DynamoDBStreamEvent) => {
 *   const context = logger.startBatch(event.Records.length);
 *
 *   const results = await Promise.all(
 *     event.Records.map((record) =>
 *       logger.processRecord(record, async () => {
 *         // Your record processing logic
 *       })
 *     )
 *   );
 *
 *   logger.endBatch(context, results);
 * };
 * ```
 */

import type { DynamoDBRecord, KinesisStreamRecord } from 'aws-lambda';

/**
 * Batch processing context for tracking metrics
 */
export interface BatchContext {
  batchId: string;
  recordCount: number;
  startTime: number;
  handlerName: string;
}

/**
 * Processing result for individual records
 */
export interface ProcessingResult {
  success: boolean;
  recordId: string;
  error?: Error;
  duration: number;
}

/**
 * Stream logger instance
 */
export interface StreamLogger {
  startBatch: (recordCount: number) => BatchContext;
  processRecord: <T>(
    record: DynamoDBRecord | KinesisStreamRecord,
    processor: () => Promise<T>
  ) => Promise<ProcessingResult>;
  endBatch: (context: BatchContext, results: ProcessingResult[]) => void;
  logInfo: (message: string, metadata?: Record<string, any>) => void;
  logWarn: (message: string, metadata?: Record<string, any>) => void;
  logError: (message: string, error?: Error, metadata?: Record<string, any>) => void;
}

/**
 * Create a stream logger for a specific handler
 *
 * @param handlerName - Name of the stream handler (e.g., 'FeedFanout', 'LikeCounter')
 * @returns Stream logger instance with logging utilities
 *
 * @example
 * ```typescript
 * const logger = createStreamLogger('LikeCounter');
 *
 * export const handler = async (event: DynamoDBStreamEvent) => {
 *   const context = logger.startBatch(event.Records.length);
 *
 *   const results = await Promise.all(
 *     event.Records.map((record) =>
 *       logger.processRecord(record, async () => {
 *         // Update like count logic
 *       })
 *     )
 *   );
 *
 *   logger.endBatch(context, results);
 * };
 * ```
 */
export function createStreamLogger(handlerName: string): StreamLogger {
  /**
   * Start batch processing
   */
  function startBatch(recordCount: number): BatchContext {
    const batchId = crypto.randomUUID();
    const startTime = Date.now();

    console.log(JSON.stringify({
      level: 'INFO',
      type: 'BATCH_START',
      handler: handlerName,
      batchId,
      recordCount,
      timestamp: new Date().toISOString()
    }));

    return {
      batchId,
      recordCount,
      startTime,
      handlerName
    };
  }

  /**
   * Process a single record with error handling and timing
   */
  async function processRecord<T>(
    record: DynamoDBRecord | KinesisStreamRecord,
    processor: () => Promise<T>
  ): Promise<ProcessingResult> {
    const recordId = 'eventID' in record ? record.eventID : record.kinesis.sequenceNumber;
    const startTime = Date.now();

    try {
      await processor();
      const duration = Date.now() - startTime;

      return {
        success: true,
        recordId: recordId || 'unknown',
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      console.error(JSON.stringify({
        level: 'ERROR',
        type: 'RECORD_PROCESSING_ERROR',
        handler: handlerName,
        recordId,
        duration,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : String(error),
        timestamp: new Date().toISOString()
      }));

      return {
        success: false,
        recordId: recordId || 'unknown',
        error: error instanceof Error ? error : new Error(String(error)),
        duration
      };
    }
  }

  /**
   * End batch processing and log metrics
   */
  function endBatch(context: BatchContext, results: ProcessingResult[]): void {
    const duration = Date.now() - context.startTime;
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    const avgRecordDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

    console.log(JSON.stringify({
      level: errorCount > 0 ? 'WARN' : 'INFO',
      type: 'BATCH_COMPLETE',
      handler: handlerName,
      batchId: context.batchId,
      metrics: {
        totalRecords: context.recordCount,
        processedRecords: results.length,
        successCount,
        errorCount,
        successRate: ((successCount / results.length) * 100).toFixed(2) + '%',
        batchDuration: duration,
        avgRecordDuration: Math.round(avgRecordDuration),
        throughput: (results.length / (duration / 1000)).toFixed(2) + ' records/sec'
      },
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Log info message
   */
  function logInfo(message: string, metadata: Record<string, any> = {}): void {
    console.log(JSON.stringify({
      level: 'INFO',
      handler: handlerName,
      message,
      ...metadata,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Log warning message
   */
  function logWarn(message: string, metadata: Record<string, any> = {}): void {
    console.warn(JSON.stringify({
      level: 'WARN',
      handler: handlerName,
      message,
      ...metadata,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Log error message
   */
  function logError(message: string, error?: Error, metadata: Record<string, any> = {}): void {
    console.error(JSON.stringify({
      level: 'ERROR',
      handler: handlerName,
      message,
      error: error ? {
        message: error.message,
        stack: error.stack
      } : undefined,
      ...metadata,
      timestamp: new Date().toISOString()
    }));
  }

  return {
    startBatch,
    processRecord,
    endBatch,
    logInfo,
    logWarn,
    logError
  };
}
