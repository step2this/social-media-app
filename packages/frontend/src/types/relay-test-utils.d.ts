/**
 * Type definitions for relay-test-utils
 * 
 * relay-test-utils doesn't ship with TypeScript definitions,
 * so we provide minimal types here for our usage.
 */

declare module 'relay-test-utils' {
  import type { Environment } from 'relay-runtime';

  export interface MockEnvironment extends Environment {
    mock: {
      getMostRecentOperation(): any;
      getAllOperations(): any[];
      resolveMostRecentOperation(response: any): void;
      rejectMostRecentOperation(error: Error): void;
    };
  }

  export interface MockResolvers {
    Query?: () => Record<string, any>;
    Mutation?: () => Record<string, any>;
    [key: string]: any;
  }

  export function createMockEnvironment(config?: any): MockEnvironment;
  
  export const MockPayloadGenerator: {
    generate(operation: any, mockResolvers?: MockResolvers): any;
  };
}
