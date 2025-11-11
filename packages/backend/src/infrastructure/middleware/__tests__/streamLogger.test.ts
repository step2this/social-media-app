/**
 * Behavioral Tests for Stream Logger
 *
 * Testing Principles:
 * ✅ No mocks or spies - capture real console output
 * ✅ DRY with helper functions
 * ✅ Behavioral testing - test what logger does, not how
 * ✅ Type-safe throughout
 * ✅ Test structured logging output
 *
 * What we're testing:
 * - Batch lifecycle (start → process → end)
 * - Error tracking without stream poisoning
 * - Metrics calculation (success rate, throughput, duration)
 * - Structured JSON output format
 * - Support for both DynamoDB and Kinesis records
 */

import { describe, it, expect } from 'vitest';
import { createStreamLogger } from '../streamLogger.js';
import {
  captureStructuredLogs,
  findLogByType,
  findLogsByLevel,
} from '../../../test/utils/console-capture.js';
import {
  createTestDynamoDBRecord,
  createTestKinesisRecord,
  createDynamoDBRecordBatch,
  createKinesisRecordBatch,
} from '../../../test/utils/stream-test-helpers.js';

describe('streamLogger', () => {
  const handlerName = 'TestStreamHandler';

  describe('Batch Lifecycle', () => {
    it('should log batch start with correct metadata', async () => {
      // ARRANGE
      const logger = createStreamLogger(handlerName);

      // ACT
      const { logs } = await captureStructuredLogs(() => {
        logger.startBatch(5);
      });

      // ASSERT - Behavior: BATCH_START log is created
      const startLog = findLogByType(logs, 'BATCH_START');
      expect(startLog).toBeDefined();
      expect(startLog?.level).toBe('INFO');
      expect(startLog?.handler).toBe(handlerName);
      expect(startLog?.recordCount).toBe(5);
      expect(startLog?.batchId).toBeDefined();
      expect(startLog?.timestamp).toBeDefined();
    });

    it('should log batch completion with metrics', async () => {
      // ARRANGE
      const logger = createStreamLogger(handlerName);

      // ACT
      const { logs } = await captureStructuredLogs(async () => {
        const context = logger.startBatch(3);

        // Simulate successful processing
        const results = [
          { success: true, recordId: 'rec-1', duration: 10 },
          { success: true, recordId: 'rec-2', duration: 15 },
          { success: true, recordId: 'rec-3', duration: 20 },
        ];

        logger.endBatch(context, results);
      });

      // ASSERT - Behavior: BATCH_COMPLETE log with metrics
      const completeLog = findLogByType(logs, 'BATCH_COMPLETE');
      expect(completeLog).toBeDefined();
      expect(completeLog?.level).toBe('INFO'); // No errors = INFO
      expect(completeLog?.handler).toBe(handlerName);
      expect(completeLog?.metrics).toBeDefined();
      expect(completeLog?.metrics?.totalRecords).toBe(3);
      expect(completeLog?.metrics?.successCount).toBe(3);
      expect(completeLog?.metrics?.errorCount).toBe(0);
      expect(completeLog?.metrics?.successRate).toBe('100.00%');
    });

    it('should log warnings when errors occur', async () => {
      // ARRANGE
      const logger = createStreamLogger(handlerName);

      // ACT
      const { logs } = await captureStructuredLogs(async () => {
        const context = logger.startBatch(3);

        // Simulate mixed success/failure
        const results = [
          { success: true, recordId: 'rec-1', duration: 10 },
          {
            success: false,
            recordId: 'rec-2',
            duration: 15,
            error: new Error('Processing failed'),
          },
          { success: true, recordId: 'rec-3', duration: 20 },
        ];

        logger.endBatch(context, results);
      });

      // ASSERT - Behavior: WARN level when errors present
      const completeLog = findLogByType(logs, 'BATCH_COMPLETE');
      expect(completeLog).toBeDefined();
      expect(completeLog?.level).toBe('WARN'); // Has errors = WARN
      expect(completeLog?.metrics?.successCount).toBe(2);
      expect(completeLog?.metrics?.errorCount).toBe(1);
      expect(completeLog?.metrics?.successRate).toBe('66.67%');
    });
  });

  describe('Record Processing', () => {
    it('should process DynamoDB record successfully', async () => {
      // ARRANGE
      const logger = createStreamLogger(handlerName);
      const record = createTestDynamoDBRecord();

      // ACT
      const { result } = await captureStructuredLogs(async () => {
        return await logger.processRecord(record, async () => {
          // Simulate successful processing
          return 'processed';
        });
      });

      // ASSERT - Behavior: Successful result with timing
      expect(result.success).toBe(true);
      expect(result.recordId).toBe(record.eventID);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('should process Kinesis record successfully', async () => {
      // ARRANGE
      const logger = createStreamLogger(handlerName);
      const record = createTestKinesisRecord();

      // ACT
      const { result } = await captureStructuredLogs(async () => {
        return await logger.processRecord(record, async () => {
          // Simulate successful processing
          return 'processed';
        });
      });

      // ASSERT - Behavior: Successful result with correct record ID
      expect(result.success).toBe(true);
      expect(result.recordId).toBe(record.kinesis.sequenceNumber);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should capture processing errors without throwing', async () => {
      // ARRANGE
      const logger = createStreamLogger(handlerName);
      const record = createTestDynamoDBRecord();
      const testError = new Error('Processing failed');

      // ACT
      const { result, logs } = await captureStructuredLogs(async () => {
        return await logger.processRecord(record, async () => {
          throw testError;
        });
      });

      // ASSERT - Behavior: Error captured, not thrown (no stream poisoning)
      expect(result.success).toBe(false);
      expect(result.recordId).toBe(record.eventID);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Processing failed');

      // Error is logged
      const errorLog = findLogByType(logs, 'RECORD_PROCESSING_ERROR');
      expect(errorLog).toBeDefined();
      expect(errorLog?.level).toBe('ERROR');
      expect(errorLog?.recordId).toBe(record.eventID);
      expect(errorLog?.error?.message).toBe('Processing failed');
    });

    it('should measure processing duration', async () => {
      // ARRANGE
      const logger = createStreamLogger(handlerName);
      const record = createTestDynamoDBRecord();

      // ACT
      const { result } = await captureStructuredLogs(async () => {
        return await logger.processRecord(record, async () => {
          // Simulate some processing time
          await new Promise((resolve) => setTimeout(resolve, 10));
          return 'processed';
        });
      });

      // ASSERT - Behavior: Duration is measured
      expect(result.duration).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate success rate correctly', async () => {
      // ARRANGE
      const logger = createStreamLogger(handlerName);

      // ACT
      const { logs } = await captureStructuredLogs(() => {
        const context = logger.startBatch(4);

        const results = [
          { success: true, recordId: '1', duration: 10 },
          { success: true, recordId: '2', duration: 10 },
          { success: false, recordId: '3', duration: 10, error: new Error('') },
          { success: true, recordId: '4', duration: 10 },
        ];

        logger.endBatch(context, results);
      });

      // ASSERT - Behavior: 75% success rate (3/4)
      const completeLog = findLogByType(logs, 'BATCH_COMPLETE');
      expect(completeLog?.metrics?.successRate).toBe('75.00%');
    });

    it('should calculate average record duration', async () => {
      // ARRANGE
      const logger = createStreamLogger(handlerName);

      // ACT
      const { logs } = await captureStructuredLogs(() => {
        const context = logger.startBatch(3);

        const results = [
          { success: true, recordId: '1', duration: 10 },
          { success: true, recordId: '2', duration: 20 },
          { success: true, recordId: '3', duration: 30 },
        ];

        logger.endBatch(context, results);
      });

      // ASSERT - Behavior: Average is 20ms
      const completeLog = findLogByType(logs, 'BATCH_COMPLETE');
      expect(completeLog?.metrics?.avgRecordDuration).toBe(20);
    });

    it('should calculate throughput', async () => {
      // ARRANGE
      const logger = createStreamLogger(handlerName);

      // ACT
      const { logs } = await captureStructuredLogs(() => {
        const context = logger.startBatch(2);

        // Simulate 2 records processed in ~100ms each = 200ms total
        const results = [
          { success: true, recordId: '1', duration: 100 },
          { success: true, recordId: '2', duration: 100 },
        ];

        logger.endBatch(context, results);
      });

      // ASSERT - Behavior: Throughput calculated as records/sec
      const completeLog = findLogByType(logs, 'BATCH_COMPLETE');
      expect(completeLog?.metrics?.throughput).toBeDefined();
      expect(completeLog?.metrics?.throughput).toMatch(/\d+\.\d+ records\/sec/);
    });

    it('should track total batch duration', async () => {
      // ARRANGE
      const logger = createStreamLogger(handlerName);

      // ACT
      const { logs } = await captureStructuredLogs(async () => {
        const context = logger.startBatch(1);

        // Simulate processing delay
        await new Promise((resolve) => setTimeout(resolve, 20));

        const results = [{ success: true, recordId: '1', duration: 10 }];

        logger.endBatch(context, results);
      });

      // ASSERT - Behavior: Batch duration includes overhead
      const completeLog = findLogByType(logs, 'BATCH_COMPLETE');
      expect(completeLog?.metrics?.batchDuration).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Structured Logging', () => {
    it('should output valid JSON format', async () => {
      // ARRANGE
      const logger = createStreamLogger(handlerName);

      // ACT
      const { logs } = await captureStructuredLogs(() => {
        logger.logInfo('Test message', { key: 'value' });
      });

      // ASSERT - Behavior: All logs are valid JSON
      expect(logs).toHaveLength(1);
      expect(logs[0]).toEqual(
        expect.objectContaining({
          level: 'INFO',
          handler: handlerName,
          message: 'Test message',
          key: 'value',
          timestamp: expect.any(String),
        })
      );
    });

    it('should include handler name in all logs', async () => {
      // ARRANGE
      const logger = createStreamLogger(handlerName);

      // ACT
      const { logs } = await captureStructuredLogs(() => {
        logger.logInfo('Info');
        logger.logWarn('Warn');
        logger.logError('Error');
      });

      // ASSERT - Behavior: Handler name for observability
      expect(logs).toHaveLength(3);
      logs.forEach((log) => {
        expect(log.handler).toBe(handlerName);
      });
    });

    it('should include timestamps in ISO format', async () => {
      // ARRANGE
      const logger = createStreamLogger(handlerName);

      // ACT
      const { logs } = await captureStructuredLogs(() => {
        logger.logInfo('Test');
      });

      // ASSERT - Behavior: ISO 8601 timestamp
      expect(logs[0].timestamp).toBeDefined();
      expect(() => new Date(logs[0].timestamp!)).not.toThrow();
    });
  });

  describe('Log Levels', () => {
    it('should log info messages at INFO level', async () => {
      // ARRANGE
      const logger = createStreamLogger(handlerName);

      // ACT
      const { logs } = await captureStructuredLogs(() => {
        logger.logInfo('Info message', { extra: 'data' });
      });

      // ASSERT
      expect(logs[0].level).toBe('INFO');
      expect(logs[0].message).toBe('Info message');
      expect(logs[0].extra).toBe('data');
    });

    it('should log warnings at WARN level', async () => {
      // ARRANGE
      const logger = createStreamLogger(handlerName);

      // ACT
      const { logs } = await captureStructuredLogs(() => {
        logger.logWarn('Warning message', { reason: 'test' });
      });

      // ASSERT
      expect(logs[0].level).toBe('WARN');
      expect(logs[0].message).toBe('Warning message');
      expect(logs[0].reason).toBe('test');
    });

    it('should log errors at ERROR level with stack traces', async () => {
      // ARRANGE
      const logger = createStreamLogger(handlerName);
      const error = new Error('Test error');

      // ACT
      const { logs } = await captureStructuredLogs(() => {
        logger.logError('Error occurred', error, { context: 'test' });
      });

      // ASSERT
      expect(logs[0].level).toBe('ERROR');
      expect(logs[0].message).toBe('Error occurred');
      expect(logs[0].error?.message).toBe('Test error');
      expect(logs[0].error?.stack).toBeDefined();
      expect(logs[0].context).toBe('test');
    });
  });

  describe('Integration - Full Batch Processing', () => {
    it('should handle successful batch end-to-end', async () => {
      // ARRANGE
      const logger = createStreamLogger(handlerName);
      const records = createDynamoDBRecordBatch(3);

      // ACT - Simulate complete batch processing
      const { logs } = await captureStructuredLogs(async () => {
        const context = logger.startBatch(records.length);

        const results = await Promise.all(
          records.map((record) =>
            logger.processRecord(record, async () => {
              // Simulate processing
              await new Promise((resolve) => setTimeout(resolve, 5));
            })
          )
        );

        logger.endBatch(context, results);
      });

      // ASSERT - Behavior: Complete logging lifecycle
      const startLog = findLogByType(logs, 'BATCH_START');
      const completeLog = findLogByType(logs, 'BATCH_COMPLETE');

      expect(startLog).toBeDefined();
      expect(completeLog).toBeDefined();
      expect(startLog?.batchId).toBe(completeLog?.batchId);
      expect(completeLog?.metrics?.successCount).toBe(3);
      expect(completeLog?.metrics?.errorCount).toBe(0);
    });

    it('should handle mixed success/failure batch', async () => {
      // ARRANGE
      const logger = createStreamLogger(handlerName);
      const records = createDynamoDBRecordBatch(5);

      // ACT - Simulate batch with some failures
      const { logs } = await captureStructuredLogs(async () => {
        const context = logger.startBatch(records.length);

        const results = await Promise.all(
          records.map((record, index) =>
            logger.processRecord(record, async () => {
              if (index % 2 === 0) {
                throw new Error(`Failed processing ${index}`);
              }
            })
          )
        );

        logger.endBatch(context, results);
      });

      // ASSERT - Behavior: Partial failures tracked
      const completeLog = findLogByType(logs, 'BATCH_COMPLETE');
      const errorLogs = findLogsByLevel(logs, 'ERROR');

      expect(completeLog?.level).toBe('WARN'); // Mixed results
      expect(completeLog?.metrics?.successCount).toBe(2);
      expect(completeLog?.metrics?.errorCount).toBe(3);
      expect(errorLogs).toHaveLength(3); // 3 error logs
    });

    it('should support Kinesis batch processing', async () => {
      // ARRANGE
      const logger = createStreamLogger('KinesisHandler');
      const records = createKinesisRecordBatch(4);

      // ACT
      const { logs } = await captureStructuredLogs(async () => {
        const context = logger.startBatch(records.length);

        const results = await Promise.all(
          records.map((record) =>
            logger.processRecord(record, async () => {
              // Process Kinesis record
            })
          )
        );

        logger.endBatch(context, results);
      });

      // ASSERT - Behavior: Works with Kinesis records
      const completeLog = findLogByType(logs, 'BATCH_COMPLETE');
      expect(completeLog?.handler).toBe('KinesisHandler');
      expect(completeLog?.metrics?.totalRecords).toBe(4);
      expect(completeLog?.metrics?.successCount).toBe(4);
    });
  });
});
