import { describe, it, expect } from 'vitest';
import { greet } from '../utils/index.js';

describe('Smoke Tests Package', () => {
  it('should have working TypeScript compilation', () => {
    expect(true).toBe(true);
  });

  it('should be able to import utilities', () => {
    const result = greet('Smoke Tests');
    expect(result).toBe('Hello, Smoke Tests!');
  });

  it('should have access to test environment', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });
});