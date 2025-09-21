import { describe, it, expect } from 'vitest';
import { HelloRequestSchema, HelloResponseSchema } from './hello.schema';

describe('HelloRequestSchema', () => {
  it('should validate valid request with name', () => {
    const input = { name: 'John' };
    const result = HelloRequestSchema.parse(input);
    expect(result.name).toBe('John');
  });

  it('should use default name when not provided', () => {
    const input = {};
    const result = HelloRequestSchema.parse(input);
    expect(result.name).toBe('World');
  });

  it('should validate request with timestamp', () => {
    const timestamp = new Date().toISOString();
    const input = { name: 'John', timestamp };
    const result = HelloRequestSchema.parse(input);
    expect(result.timestamp).toBe(timestamp);
  });

  it('should reject invalid name length', () => {
    const input = { name: 'a'.repeat(101) };
    expect(() => HelloRequestSchema.parse(input)).toThrow();
  });
});

describe('HelloResponseSchema', () => {
  it('should validate valid response', () => {
    const response = {
      message: 'Hello John!',
      name: 'John',
      timestamp: new Date().toISOString(),
      serverTime: new Date().toISOString()
    };
    const result = HelloResponseSchema.parse(response);
    expect(result.message).toBe('Hello John!');
    expect(result.name).toBe('John');
  });

  it('should reject response without required fields', () => {
    const response = { message: 'Hello!' };
    expect(() => HelloResponseSchema.parse(response)).toThrow();
  });

  it('should reject response with invalid datetime', () => {
    const response = {
      message: 'Hello John!',
      name: 'John',
      timestamp: 'invalid-date',
      serverTime: 'invalid-date'
    };
    expect(() => HelloResponseSchema.parse(response)).toThrow();
  });
});