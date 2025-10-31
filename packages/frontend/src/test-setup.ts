import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Mock localStorage for Zustand and other stores
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }

  get length(): number {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

// Mock window.matchMedia for responsive components
// This is required for components that use media queries or responsive hooks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated but some libraries still use it
    removeListener: vi.fn(), // deprecated but some libraries still use it
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
});

// Mock localStorage
global.localStorage = new LocalStorageMock() as Storage;

// Add Jest-compatible globals for relay-test-utils
// relay-test-utils expects Jest mocking functions to be available
global.jest = {
  fn: vi.fn,
  spyOn: vi.spyOn,
  mock: vi.mock,
  clearAllMocks: vi.clearAllMocks,
  resetAllMocks: vi.resetAllMocks,
  restoreAllMocks: vi.restoreAllMocks,
} as any;

// Clean up after each test
afterEach(() => {
  cleanup();
  global.localStorage.clear();
});