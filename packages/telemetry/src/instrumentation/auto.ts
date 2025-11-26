import type { Instrumentation } from '@opentelemetry/instrumentation';
import { createNodeAutoInstrumentations } from './http.js';
import { createGraphQLInstrumentation } from './graphql.js';
import { createAWSInstrumentation } from './aws-sdk.js';

/**
 * Get all auto-instrumentations for the application
 *
 * Combines Node.js auto-instrumentations with custom GraphQL and AWS SDK instrumentation.
 * This provides comprehensive tracing for Node.js applications with GraphQL and AWS services.
 *
 * @param environment - Deployment environment (affects GraphQL variable logging)
 * @returns Array of configured instrumentations
 *
 * @example
 * ```typescript
 * const instrumentations = getAutoInstrumentations('production');
 * // Returns: [HTTP, DNS, net, GraphQL, AWS SDK, ...]
 * ```
 */
export function getAutoInstrumentations(environment: string): Instrumentation[] {
  return [
    ...createNodeAutoInstrumentations(),
    createGraphQLInstrumentation(environment),
    createAWSInstrumentation(),
  ];
}
