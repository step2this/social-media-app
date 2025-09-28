import { describe, it, expect } from 'vitest';
import { generateTestId } from './test-id.js';

describe('Test ID Generation', () => {
  it('should generate a test ID', () => {
    const testId = generateTestId();
    expect(testId).toBeDefined();
    expect(typeof testId).toBe('string');
    expect(testId.length).toBeGreaterThan(0);
  });

  it('should generate unique test IDs', () => {
    const id1 = generateTestId();
    const id2 = generateTestId();
    expect(id1).not.toBe(id2);
  });

  it('should include timestamp for chronological ordering', () => {
    const testId = generateTestId();
    // Should start with "smoke-test-" followed by timestamp
    expect(testId).toMatch(/^smoke-test-\d+/);
  });

  it('should include random component for parallel safety', () => {
    const testId = generateTestId();
    // Should have format: smoke-test-{timestamp}-{random}
    const parts = testId.split('-');
    expect(parts).toHaveLength(4); // ["smoke", "test", "{timestamp}", "{random}"]
    expect(parts[0]).toBe('smoke');
    expect(parts[1]).toBe('test');
    expect(parseInt(parts[2])).toBeGreaterThan(0); // timestamp
    expect(parts[3]).toMatch(/^[a-z0-9]+$/); // random string
  });

  it('should be safe for use in email addresses', () => {
    const testId = generateTestId();
    const testEmail = `test-${testId}@example.com`;
    // Should be a valid email format
    expect(testEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });
});